"""Pattern library (2026-10-25): geometry, Free/Pro gating and frontend parity.

Run with backend/.venv/Scripts/python -m unittest discover -s backend/tests -v.

- FrontendParityTests shells out to frontend/scripts/dump-template-shapes.cjs
  (needs `node` on PATH and frontend/node_modules/typescript); skipped otherwise.
- Set LITOPC_TEST_API_BASE=http://127.0.0.1:8000 to include local HTTP checks.
"""
import json
import os
import shutil
import subprocess
from pathlib import Path
import sys
import unittest
from urllib import error, request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException

from app.main import (
    ENABLED_TEMPLATES_BY_PRESET_FAMILY,
    ENTITLEMENT_VERSION,
    PRO_ONLY_TEMPLATES,
    _apply_request_policy,
    _current_entitlement_for_user,
    _plan_entitlements,
)
from app.models import SimRequest
from app.sim.templates import template_params_for_preset, template_to_shapes

REPO_ROOT = Path(__file__).resolve().parents[2]
DUMP_SCRIPT = REPO_ROOT / "frontend" / "scripts" / "dump-template-shapes.cjs"

FOV = 1100.0
NEW_TEMPLATES = ("TIP_TO_TIP", "TIP_TO_SIDE", "TOUCHING_CORNERS", "CONTACT_ARRAY")
# The DUV dense-line builder keeps its historical cd=60/pitch=140 fallbacks
# (see test_euv_template_parity.test_duv_geometry_defaults_are_unchanged); the
# page always sends explicit params there, so only the explicit comparison applies.
LEGACY_DUV_FALLBACKS = {("DENSE_LS", "DUV_193_DRY")}
FREE_TEMPLATES = {
    "DUV_193_DRY": ("ISO_LINE_DUV", "DENSE_LS", "CONTACT_RAW", "L_CORNER_RAW_DUV"),
    "EUV_LNA": ("ISO_LINE_EUV", "DENSE_LS", "CONTACT_RAW", "L_CORNER_RAW_EUV"),
}
PRESETS = ("DUV_193_DRY", "EUV_LNA")


def template_request(template, preset="DUV_193_DRY", params=None, plan="PRO"):
    return SimRequest.model_validate({
        "plan": plan, "preset_id": preset, "grid": 256, "dose": 0.5,
        "mask": {"mode": "TEMPLATE", "template_id": template, "params_nm": params or {}},
    })


def rectangles(shapes):
    return [(s.x_nm, s.y_nm, s.w_nm, s.h_nm) for s in shapes]


def backend_shapes(template, preset, params=None):
    """Shapes the API would build: preset-resolved defaults for omitted keys."""
    resolved = template_params_for_preset(template, {"fov_nm": FOV, **(params or {})}, preset)
    shapes, fov = template_to_shapes(template, resolved)
    return rectangles(shapes), fov


def assert_inside_fov(test, rects, fov, label):
    test.assertTrue(rects, f"{label}: no shapes")
    for x, y, w, h in rects:
        test.assertGreater(w, 0, f"{label}: degenerate rect")
        test.assertGreater(h, 0, f"{label}: degenerate rect")
        test.assertGreaterEqual(x, 0, f"{label}: {(x, y, w, h)} left of FOV")
        test.assertGreaterEqual(y, 0, f"{label}: {(x, y, w, h)} below FOV")
        test.assertLessEqual(x + w, fov, f"{label}: {(x, y, w, h)} right of FOV")
        test.assertLessEqual(y + h, fov, f"{label}: {(x, y, w, h)} above FOV")


class PatternGeometryTests(unittest.TestCase):
    def test_tip_to_tip_defaults(self):
        self.assertEqual(backend_shapes("TIP_TO_TIP", "DUV_193_DRY")[0], [(500, 110, 100, 380), (500, 610, 100, 380)])
        self.assertEqual(backend_shapes("TIP_TO_TIP", "EUV_LNA")[0], [(538, 384, 24, 150), (538, 566, 24, 150)])
        # The gap is centred on the FOV centre regardless of the family.
        for preset in PRESETS:
            (_, y_bottom, _, h_bottom), (_, y_top, _, _) = backend_shapes("TIP_TO_TIP", preset)[0]
            self.assertAlmostEqual((y_bottom + h_bottom + y_top) / 2, FOV / 2)

    def test_tip_to_side_defaults_and_gap(self):
        self.assertEqual(backend_shapes("TIP_TO_SIDE", "DUV_193_DRY")[0], [(500, 150, 100, 800), (10, 500, 380, 100)])
        self.assertEqual(backend_shapes("TIP_TO_SIDE", "EUV_LNA")[0], [(538, 400, 24, 300), (368, 538, 140, 24)])
        (line_x, _, _, _), (ax, _, aw, ah) = backend_shapes("TIP_TO_SIDE", "DUV_193_DRY", {"gap_nm": 60, "attacker_nm": 200})[0]
        self.assertEqual(ax + aw + 60, line_x)
        self.assertEqual(ah, 100)

    def test_touching_corners_defaults_and_independent_gaps(self):
        self.assertEqual(backend_shapes("TOUCHING_CORNERS", "DUV_193_DRY")[0], [(260, 260, 260, 260), (580, 580, 260, 260)])
        self.assertEqual(backend_shapes("TOUCHING_CORNERS", "EUV_LNA")[0], [(450, 450, 90, 90), (560, 560, 90, 90)])
        touching = backend_shapes("TOUCHING_CORNERS", "DUV_193_DRY", {"gap_x_nm": 0, "gap_y_nm": 0})[0]
        self.assertEqual(touching, [(290, 290, 260, 260), (550, 550, 260, 260)])
        x_only = backend_shapes("TOUCHING_CORNERS", "DUV_193_DRY", {"gap_x_nm": 100, "gap_y_nm": 0})[0]
        self.assertEqual(x_only, [(240, 290, 260, 260), (600, 550, 260, 260)])
        y_only = backend_shapes("TOUCHING_CORNERS", "DUV_193_DRY", {"gap_x_nm": 0, "gap_y_nm": 100})[0]
        self.assertEqual(y_only, [(290, 240, 260, 260), (550, 600, 260, 260)])

    def test_contact_array_defaults_and_clamping(self):
        duv, _ = backend_shapes("CONTACT_ARRAY", "DUV_193_DRY")
        self.assertEqual(duv, [
            (250, 250, 120, 120), (490, 250, 120, 120), (730, 250, 120, 120),
            (250, 490, 120, 120), (490, 490, 120, 120), (730, 490, 120, 120),
            (250, 730, 120, 120), (490, 730, 120, 120), (730, 730, 120, 120),
        ])
        euv, _ = backend_shapes("CONTACT_ARRAY", "EUV_LNA")
        self.assertEqual(len(euv), 9)
        self.assertEqual(euv[0], (471, 471, 30, 30))
        self.assertEqual(euv[-1], (599, 599, 30, 30))
        clamped, _ = backend_shapes("CONTACT_ARRAY", "DUV_193_DRY", {"pitch_nm": 400, "n_rows": 5, "n_cols": 5})
        self.assertEqual(len(clamped), 9)
        two_by_four, _ = backend_shapes("CONTACT_ARRAY", "DUV_193_DRY", {"n_rows": 2, "n_cols": 4})
        self.assertEqual(len(two_by_four), 8)

    def test_all_new_patterns_fit_the_fov_in_both_families(self):
        for preset in PRESETS:
            for template in NEW_TEMPLATES:
                rects, fov = backend_shapes(template, preset)
                assert_inside_fov(self, rects, fov, f"{template} ({preset})")

    def test_euv_presets_resolve_shared_defaults_like_dense_ls(self):
        resolved = template_params_for_preset("TIP_TO_TIP", {"fov_nm": 640}, "EUV_LNA")
        self.assertEqual(resolved, {"cd_nm": 24.0, "length_nm": 150.0, "gap_nm": 32.0, "fov_nm": 640})
        explicit = template_params_for_preset("TIP_TO_TIP", {"cd_nm": 40}, "EUV_LNA")
        self.assertEqual(explicit["cd_nm"], 40)
        self.assertEqual(template_params_for_preset("TIP_TO_TIP", {"fov_nm": 640}, "DUV_193_DRY"), {"fov_nm": 640})
        self.assertEqual(template_params_for_preset("CONTACT_RAW", {}, "EUV_LNA"), {"cd_nm": 60.0, "w_nm": 60.0})
        for template in NEW_TEMPLATES + ("CONTACT_RAW",):
            self.assertIn("cd_nm", template_params_for_preset(template, {}, "EUV_HNA"))

    def test_policy_keeps_explicit_params_and_fills_euv_defaults(self):
        prepared = _apply_request_policy(template_request("TOUCHING_CORNERS", preset="EUV_LNA", params={"gap_x_nm": 0}))
        self.assertEqual(prepared.mask.params_nm["gap_x_nm"], 0)
        self.assertEqual(prepared.mask.params_nm["gap_y_nm"], 20)
        self.assertEqual(prepared.mask.params_nm["cd_nm"], 90)


class PatternAccessTests(unittest.TestCase):
    def test_pro_only_set_matches_enabled_lists(self):
        self.assertEqual(PRO_ONLY_TEMPLATES, set(NEW_TEMPLATES))
        for family in ("DUV", "EUV"):
            enabled = ENABLED_TEMPLATES_BY_PRESET_FAMILY[family]
            self.assertTrue(PRO_ONLY_TEMPLATES <= enabled, family)
            self.assertIn("CONTACT_RAW", enabled)
            for legacy in ("LINE_END_RAW", "LINE_END_RAW_DUV", "LINE_END_RAW_EUV", "LINE_END_OPC_HAMMER"):
                self.assertNotIn(legacy, enabled, f"{legacy} must not be enabled for {family}")

    def test_free_plan_gets_403_for_pro_patterns(self):
        for preset in PRESETS:
            for template in NEW_TEMPLATES:
                with self.subTest(preset=preset, template=template):
                    with self.assertRaises(HTTPException) as caught:
                        _apply_request_policy(template_request(template, preset=preset, plan="FREE"))
                    self.assertEqual(caught.exception.status_code, 403)
                    self.assertEqual(caught.exception.detail, "This pattern is available on Pro.")

    def test_pro_plan_runs_pro_patterns(self):
        for preset in PRESETS:
            for template in NEW_TEMPLATES:
                with self.subTest(preset=preset, template=template):
                    prepared = _apply_request_policy(template_request(template, preset=preset, plan="PRO"))
                    self.assertEqual(prepared.mask.template_id, template)
                    self.assertEqual(prepared.preset_id, preset)
                    shapes, fov = template_to_shapes(prepared.mask.template_id, prepared.mask.params_nm)
                    assert_inside_fov(self, rectangles(shapes), fov, f"{template} ({preset})")

    def test_free_patterns_stay_open_to_both_plans(self):
        for preset, templates in FREE_TEMPLATES.items():
            for template in templates:
                for plan in ("FREE", "PRO"):
                    with self.subTest(preset=preset, template=template, plan=plan):
                        prepared = _apply_request_policy(template_request(template, preset=preset, plan=plan))
                        self.assertEqual(prepared.mask.template_id, template)

    def test_line_end_templates_are_no_longer_exposed(self):
        for template, preset in (("LINE_END_RAW_DUV", "DUV_193_DRY"), ("LINE_END_RAW_EUV", "EUV_LNA")):
            for plan in ("FREE", "PRO"):
                with self.assertRaises(HTTPException) as caught:
                    _apply_request_policy(template_request(template, preset=preset, plan=plan))
                self.assertEqual(caught.exception.status_code, 403)
        # The IDs remain valid for saved history and still build geometry.
        shapes, _ = template_to_shapes("LINE_END_RAW_EUV", {})
        self.assertEqual(len(shapes), 1)

    def test_entitlements_payload_lists_pro_only_templates(self):
        self.assertEqual(_plan_entitlements("FREE").pro_only_templates, sorted(NEW_TEMPLATES))
        self.assertEqual(_plan_entitlements("PRO").pro_only_templates, [])
        self.assertEqual(ENTITLEMENT_VERSION, "2026-10-25")
        current = _current_entitlement_for_user("cid:pattern-library-test-free")
        self.assertEqual(current.plan, "FREE")
        self.assertEqual(current.pro_only_templates, sorted(NEW_TEMPLATES))


@unittest.skipUnless(shutil.which("node") and DUMP_SCRIPT.exists(), "node and frontend/scripts/dump-template-shapes.cjs are required")
class FrontendParityTests(unittest.TestCase):
    """The backend geometry must equal frontend buildTemplateBaseShapes for every catalog pattern."""

    CASES = [
        *[{"template_id": t, "preset_id": p, "params": {}} for p in PRESETS for t in NEW_TEMPLATES],
        *[{"template_id": t, "preset_id": p, "params": {}} for p, ts in FREE_TEMPLATES.items() for t in ts],
        {"template_id": "TIP_TO_TIP", "preset_id": "DUV_193_DRY", "params": {"cd_nm": 60, "length_nm": 200, "gap_nm": 44}},
        {"template_id": "TIP_TO_TIP", "preset_id": "EUV_LNA", "params": {"gap_nm": 8, "length_nm": 240}},
        {"template_id": "TIP_TO_SIDE", "preset_id": "DUV_193_DRY", "params": {"attacker_nm": 150, "gap_nm": 40}},
        {"template_id": "TIP_TO_SIDE", "preset_id": "EUV_LNA", "params": {"cd_nm": 30, "length_nm": 200}},
        {"template_id": "TOUCHING_CORNERS", "preset_id": "DUV_193_DRY", "params": {"gap_x_nm": 0, "gap_y_nm": 120, "w_nm": 200, "h_nm": 300}},
        {"template_id": "TOUCHING_CORNERS", "preset_id": "EUV_LNA", "params": {"gap_x_nm": 40, "gap_y_nm": 0}},
        {"template_id": "CONTACT_ARRAY", "preset_id": "DUV_193_DRY", "params": {"n_rows": 2, "n_cols": 5, "pitch_nm": 200}},
        {"template_id": "CONTACT_ARRAY", "preset_id": "DUV_193_DRY", "params": {"n_rows": 5, "n_cols": 5, "pitch_nm": 400}},
        {"template_id": "CONTACT_ARRAY", "preset_id": "EUV_LNA", "params": {"n_rows": 4, "n_cols": 1, "w_nm": 40, "pitch_nm": 80}},
        {"template_id": "CONTACT_RAW", "preset_id": "EUV_LNA", "params": {"w_nm": 48}},
    ]

    @classmethod
    def setUpClass(cls):
        proc = subprocess.run(
            [shutil.which("node"), str(DUMP_SCRIPT), "-"],
            input=json.dumps(cls.CASES),
            capture_output=True,
            text=True,
            cwd=str(DUMP_SCRIPT.parent.parent),
            timeout=120,
        )
        if proc.returncode != 0:
            raise unittest.SkipTest(f"frontend dumper failed: {proc.stderr.strip()[:400]}")
        cls.frontend = json.loads(proc.stdout)

    def test_backend_matches_frontend_shapes(self):
        self.assertEqual(len(self.frontend), len(self.CASES))
        for case, fe in zip(self.CASES, self.frontend):
            label = f"{case['template_id']} ({case['preset_id']}) {case['params']}"
            with self.subTest(case=label):
                fe_rects = [tuple(float(v) for v in r) for r in fe["shapes"]]
                # (a) explicit params, exactly what the simulator page sends
                explicit, _ = template_to_shapes(case["template_id"], dict(fe["params"]))
                self.assertEqual(rectangles(explicit), fe_rects, f"explicit params differ for {label}")
                # (b) only the overrides; the API fills family defaults
                if (case["template_id"], case["preset_id"]) not in LEGACY_DUV_FALLBACKS:
                    implicit, _ = backend_shapes(case["template_id"], case["preset_id"], case["params"])
                    self.assertEqual(implicit, fe_rects, f"API-resolved defaults differ for {label}")
                assert_inside_fov(self, fe_rects, FOV, label)


@unittest.skipUnless(os.getenv("LITOPC_TEST_API_BASE"), "Set LITOPC_TEST_API_BASE to test a running local API")
class PatternLibraryHttpTests(unittest.TestCase):
    def post(self, path, payload):
        url = os.environ["LITOPC_TEST_API_BASE"].rstrip("/") + path
        call = request.Request(url, data=json.dumps(payload).encode(), headers={
            "Content-Type": "application/json", "x-litopc-user-id": "pattern-library-free-user",
        })
        try:
            with request.urlopen(call, timeout=60) as response:
                return response.status, json.load(response)
        except error.HTTPError as response:
            return response.code, json.load(response)

    def get(self, path):
        url = os.environ["LITOPC_TEST_API_BASE"].rstrip("/") + path
        with request.urlopen(request.Request(url), timeout=30) as response:
            return response.status, json.load(response)

    def test_free_user_gets_403_for_tip_to_tip(self):
        status, body = self.post("/simulate", template_request("TIP_TO_TIP", plan="PRO").model_dump())
        self.assertEqual(status, 403, body)
        self.assertEqual(body.get("detail"), "This pattern is available on Pro.")

    def test_entitlements_expose_pro_only_templates(self):
        status, body = self.get("/entitlements")
        self.assertEqual(status, 200, body)
        plans = {p["plan"]: p for p in body["plans"]}
        self.assertEqual(plans["FREE"]["pro_only_templates"], sorted(NEW_TEMPLATES))
        self.assertEqual(plans["PRO"]["pro_only_templates"], [])


if __name__ == "__main__":
    unittest.main()
