"""Run with backend/.venv/Scripts/python -m unittest discover -s backend/tests -v.

Set LITOPC_TEST_API_BASE=http://127.0.0.1:8000 to include local HTTP checks.
"""
import json
import os
from pathlib import Path
import sys
import unittest
from urllib import error, request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException

from app.main import _apply_request_policy
from app.models import SimRequest
from app.sim.pipeline import run_simulation
from app.sim.templates import template_to_shapes


def template_request(template="L_CORNER_RAW_EUV", preset="EUV_LNA", params=None, plan="PRO"):
    return SimRequest.model_validate({
        "plan": plan, "preset_id": preset, "grid": 256, "dose": 0.5,
        "return_intensity": True,
        "mask": {"mode": "TEMPLATE", "template_id": template, "params_nm": params or {}},
    })


def rectangles(shapes):
    return [(s.x_nm, s.y_nm, s.w_nm, s.h_nm) for s in shapes]


class EuvTemplateParityTests(unittest.TestCase):
    def test_raw_euv_l_shape_is_enabled_for_existing_plans(self):
        for plan in ("FREE", "PRO"):
            with self.subTest(plan=plan):
                source = template_request(plan=plan)
                prepared = _apply_request_policy(source)
                self.assertEqual(prepared.mask.template_id, "L_CORNER_RAW_EUV")
                self.assertEqual(prepared.preset_id, "EUV_LNA")
                self.assertEqual(source.mask.params_nm, {})

    def test_other_disabled_or_wrong_family_templates_stay_blocked(self):
        for template in ("L_CORNER_OPC_EUV", "CONTACT_RAW", "STAIRCASE", "STAIRCASE_OPC", "L_CORNER_RAW_DUV", "L_CORNER_RAW"):
            with self.subTest(template=template):
                with self.assertRaises(HTTPException) as caught:
                    _apply_request_policy(template_request(template))
                self.assertEqual(caught.exception.status_code, 403)
        with self.assertRaises(HTTPException):
            _apply_request_policy(template_request(preset="DUV_193_DRY"))

    def test_hna_entitlement_fallback_is_unchanged(self):
        for plan in ("FREE", "PRO"):
            prepared = _apply_request_policy(template_request(preset="EUV_HNA", plan=plan))
            self.assertEqual(prepared.preset_id, "EUV_LNA")

    def test_raw_euv_l_shape_defaults_match_frontend_scale(self):
        shapes, fov = template_to_shapes("L_CORNER_RAW_EUV", {"fov_nm": 640})
        self.assertEqual(fov, 640)
        self.assertEqual(rectangles(shapes), [(240, 376, 160, 24), (376, 240, 24, 160)])
        changed, _ = template_to_shapes("L_CORNER_RAW_EUV", {"fov_nm": 640, "cd_nm": 30, "arm_nm": 140})
        self.assertEqual(rectangles(changed), [(240, 370, 160, 30), (370, 260, 30, 140)])

    def test_euv_dense_omitted_params_resolve_for_api_policy(self):
        source = template_request("DENSE_LS", params={"fov_nm": 640})
        prepared = _apply_request_policy(source)
        shapes, fov = template_to_shapes(prepared.mask.template_id, prepared.mask.params_nm)
        self.assertEqual(fov, 640)
        self.assertEqual(rectangles(shapes), [(236, 160, 24, 320), (284, 160, 24, 320), (332, 160, 24, 320), (380, 160, 24, 320)])
        self.assertEqual(source.mask.params_nm, {"fov_nm": 640})

    def test_explicit_dense_dimensions_and_custom_geometry_are_preserved(self):
        params = {"fov_nm": 640, "cd_nm": 30, "pitch_nm": 72, "n_lines": 3, "length_nm": 200}
        prepared = _apply_request_policy(template_request("DENSE_LS", params=params))
        self.assertEqual({key: prepared.mask.params_nm[key] for key in params}, params)
        custom = template_request("DENSE_LS")
        custom.mask.mode = "CUSTOM"
        prepared_custom = _apply_request_policy(custom)
        self.assertNotIn("cd_nm", prepared_custom.mask.params_nm)
        self.assertNotIn("pitch_nm", prepared_custom.mask.params_nm)

    def test_duv_geometry_defaults_are_unchanged(self):
        prepared = _apply_request_policy(template_request("DENSE_LS", preset="DUV_193_DRY"))
        self.assertNotIn("cd_nm", prepared.mask.params_nm)
        dense, fov = template_to_shapes(prepared.mask.template_id, prepared.mask.params_nm)
        self.assertEqual(fov, 1100)
        self.assertEqual(len(dense), 7)
        self.assertTrue(all(s.w_nm == 60 and s.h_nm == 900 for s in dense))
        self.assertEqual(dense[1].x_nm - dense[0].x_nm, 140)
        raw, _ = template_to_shapes("L_CORNER_RAW_DUV", {"fov_nm": 1100})
        self.assertEqual(rectangles(raw), [(260, 590, 450, 100), (610, 270, 100, 420)])

    def test_implicit_euv_dense_matches_explicit_geometry_in_real_pipeline(self):
        implicit = _apply_request_policy(template_request("DENSE_LS", params={"fov_nm": 640}))
        explicit = _apply_request_policy(template_request("DENSE_LS", params={
            "fov_nm": 640, "cd_nm": 24, "pitch_nm": 48, "n_lines": 4, "length_nm": 320,
        }))
        actual = run_simulation(implicit)
        expected = run_simulation(explicit)
        self.assertGreater(len(actual.contours_nm), 0)
        self.assertEqual(actual.model_dump(), expected.model_dump())


@unittest.skipUnless(os.getenv("LITOPC_TEST_API_BASE"), "Set LITOPC_TEST_API_BASE to test a running local API")
class EuvTemplateHttpTests(unittest.TestCase):
    def post(self, payload):
        url = os.environ["LITOPC_TEST_API_BASE"].rstrip("/") + "/simulate"
        call = request.Request(url, data=json.dumps(payload).encode(), headers={
            "Content-Type": "application/json", "x-litopc-user-id": "opc-local-review",
            "x-litopc-user-email": "review@litopc.local",
        })
        try:
            with request.urlopen(call, timeout=60) as response:
                return response.status, json.load(response)
        except error.HTTPError as response:
            return response.code, json.load(response)

    def test_raw_euv_simulate_matches_custom_geometry(self):
        template = template_request(params={"fov_nm": 640}).model_dump()
        status, actual = self.post(template)
        self.assertEqual(status, 200, actual)
        self.assertTrue(actual["contours_nm"])
        shapes, _ = template_to_shapes("L_CORNER_RAW_EUV", {"fov_nm": 640})
        custom = json.loads(json.dumps(template))
        custom["mask"].update(mode="CUSTOM", shapes=[shape.model_dump() for shape in shapes])
        status, expected = self.post(custom)
        self.assertEqual(status, 200, expected)
        self.assertEqual(actual, expected)

    def test_dense_euv_default_simulate_matches_explicit_params(self):
        implicit = template_request("DENSE_LS", params={"fov_nm": 640}).model_dump()
        status, actual = self.post(implicit)
        self.assertEqual(status, 200, actual)
        self.assertTrue(actual["contours_nm"])
        explicit = json.loads(json.dumps(implicit))
        explicit["mask"]["params_nm"].update(cd_nm=24, pitch_nm=48, n_lines=4, length_nm=320)
        status, expected = self.post(explicit)
        self.assertEqual(status, 200, expected)
        self.assertEqual(actual, expected)

    def test_disabled_euv_opc_and_other_patterns_remain_403(self):
        for template in ("L_CORNER_OPC_EUV", "CONTACT_RAW", "STAIRCASE"):
            with self.subTest(template=template):
                status, response = self.post(template_request(template).model_dump())
                self.assertEqual(status, 403, response)


if __name__ == "__main__":
    unittest.main()
