from typing import Dict, List, Tuple

from ..models import RectShape, TemplateID


def _normalize_template_id(template_id: TemplateID) -> TemplateID:
    if template_id in {"L_CORNER", "L_CORNER_RAW"}:
        return "L_CORNER_RAW_DUV"
    if template_id == "L_CORNER_OPC_SERIF":
        return "L_CORNER_OPC_DUV"
    if template_id == "ISO_LINE":
        return "ISO_LINE_DUV"
    return template_id


def _fit_dense_line_count_in_fov(cd_nm: float, pitch_nm: float, requested_n: int, fov_nm: float) -> int:
    cd = max(0.0, float(cd_nm))
    pitch = abs(float(pitch_nm))
    n_req = max(1, int(requested_n))
    fov = max(1e-6, float(fov_nm))
    if pitch < 1e-9:
        return 1
    if fov <= cd:
        return 1
    max_n = int((fov - cd) // pitch) + 1
    return max(1, min(n_req, max_n))


def _append_rect(shapes: List[RectShape], *, x_nm: float, y_nm: float, w_nm: float, h_nm: float) -> None:
    shapes.append(RectShape(x_nm=x_nm, y_nm=y_nm, w_nm=w_nm, h_nm=h_nm))


def _append_l_shape_raw(
    shapes: List[RectShape],
    p: Dict[str, float],
    cx: float,
    cy: float,
    family: str,
) -> None:
    defaults = {
        "DUV": {"cd_nm": 100.0, "length_nm": 450.0, "arm_nm": 420.0, "elbow_x_offset_nm": 160.0, "elbow_y_offset_nm": 140.0},
        "EUV": {"cd_nm": 96.0, "length_nm": 440.0, "arm_nm": 408.0, "elbow_x_offset_nm": 164.0, "elbow_y_offset_nm": 136.0},
    }[family]
    cd = float(p.get("cd_nm", defaults["cd_nm"]))
    horiz = float(p.get("length_nm", defaults["length_nm"]))
    vert = float(p.get("arm_nm", defaults["arm_nm"]))
    elbow_x = cx + float(p.get("elbow_x_offset_nm", defaults["elbow_x_offset_nm"]))
    elbow_y = cy + float(p.get("elbow_y_offset_nm", defaults["elbow_y_offset_nm"]))
    _append_rect(shapes, x_nm=elbow_x - horiz, y_nm=elbow_y - cd, w_nm=horiz, h_nm=cd)
    _append_rect(shapes, x_nm=elbow_x - cd, y_nm=elbow_y - vert, w_nm=cd, h_nm=vert)


def _append_l_shape_opc(
    shapes: List[RectShape],
    p: Dict[str, float],
    cx: float,
    cy: float,
    family: str,
) -> None:
    if all(key in p for key in ("m1_x_nm", "m1_y_nm", "m2_x_nm", "m2_y_nm")):
        cd = float(p.get("cd_nm", 120.0 if family == "DUV" else 110.0))
        horiz = float(p.get("length_nm", 350.0 if family == "DUV" else 380.0))
        vert = float(p.get("arm_nm", 320.0 if family == "DUV" else 348.0))
        _append_rect(shapes, x_nm=float(p["m1_x_nm"]), y_nm=float(p["m1_y_nm"]), w_nm=horiz, h_nm=cd)
        _append_rect(shapes, x_nm=float(p["m2_x_nm"]), y_nm=float(p["m2_y_nm"]), w_nm=cd, h_nm=vert)
        return
    if family == "DUV":
        defaults = {
            "cd_nm": 92.0,
            "length_nm": 470.0,
            "arm_nm": 432.0,
            "elbow_x_offset_nm": 170.0,
            "elbow_y_offset_nm": 132.0,
            "opc_h_ext_nm": 26.0,
            "opc_v_ext_nm": 30.0,
            "opc_bias_nm": 14.0,
            "serif_nm": 18.0,
            "left_hammer_w_nm": 28.0,
            "left_hammer_h_nm": 124.0,
            "bottom_hammer_w_nm": 146.0,
            "bottom_hammer_h_nm": 28.0,
        }
    else:
        defaults = {
            "cd_nm": 100.0,
            "length_nm": 430.0,
            "arm_nm": 396.0,
            "elbow_x_offset_nm": 164.0,
            "elbow_y_offset_nm": 136.0,
            "opc_h_ext_nm": 22.0,
            "opc_v_ext_nm": 24.0,
            "opc_bias_nm": 10.0,
            "serif_nm": 14.0,
            "left_hammer_w_nm": 22.0,
            "left_hammer_h_nm": 92.0,
            "bottom_hammer_w_nm": 96.0,
            "bottom_hammer_h_nm": 22.0,
        }
    cd = float(p.get("cd_nm", defaults["cd_nm"]))
    horiz = float(p.get("length_nm", defaults["length_nm"]))
    vert = float(p.get("arm_nm", defaults["arm_nm"]))
    elbow_x = cx + float(p.get("elbow_x_offset_nm", defaults["elbow_x_offset_nm"]))
    elbow_y = cy + float(p.get("elbow_y_offset_nm", defaults["elbow_y_offset_nm"]))
    horiz_ext = float(p.get("opc_h_ext_nm", defaults["opc_h_ext_nm"]))
    vert_ext = float(p.get("opc_v_ext_nm", defaults["opc_v_ext_nm"]))
    bias = float(p.get("opc_bias_nm", defaults["opc_bias_nm"]))
    serif = float(p.get("serif_nm", defaults["serif_nm"]))
    left_hammer_w = float(p.get("left_hammer_w_nm", defaults["left_hammer_w_nm"]))
    left_hammer_h = float(p.get("left_hammer_h_nm", defaults["left_hammer_h_nm"]))
    bottom_hammer_w = float(p.get("bottom_hammer_w_nm", defaults["bottom_hammer_w_nm"]))
    bottom_hammer_h = float(p.get("bottom_hammer_h_nm", defaults["bottom_hammer_h_nm"]))

    horiz_h = cd + bias
    vert_w = cd + bias
    xh = elbow_x - horiz - horiz_ext
    yh = elbow_y - cd - bias * 0.5
    xv = elbow_x - cd - bias * 0.5
    yv = elbow_y - vert - vert_ext
    _append_rect(shapes, x_nm=xh, y_nm=yh, w_nm=horiz + horiz_ext, h_nm=horiz_h)
    _append_rect(shapes, x_nm=xv, y_nm=yv, w_nm=vert_w, h_nm=vert + vert_ext)
    _append_rect(shapes, x_nm=xh - 22.0, y_nm=yh - 16.0, w_nm=left_hammer_w, h_nm=left_hammer_h)
    _append_rect(shapes, x_nm=xv - 18.0, y_nm=yv - 20.0, w_nm=bottom_hammer_w, h_nm=bottom_hammer_h)
    _append_rect(shapes, x_nm=elbow_x - serif * 0.28, y_nm=elbow_y - serif * 0.28, w_nm=serif, h_nm=serif)


def _append_stepped_track(
    shapes: List[RectShape],
    *,
    x_nm: float,
    y_nm: float,
    thickness_nm: float,
    run_nm: List[float],
    rise_nm: List[float],
) -> None:
    x = x_nm
    y = y_nm
    for i, seg_w in enumerate(run_nm):
        _append_rect(shapes, x_nm=x, y_nm=y, w_nm=seg_w, h_nm=thickness_nm)
        if i >= len(rise_nm):
            continue
        x = x + seg_w - thickness_nm
        rise = rise_nm[i]
        _append_rect(shapes, x_nm=x, y_nm=y - rise, w_nm=thickness_nm, h_nm=rise + thickness_nm)
        y -= rise


def _append_stepped_interconnect_raw(shapes: List[RectShape], p: Dict[str, float], cx: float, cy: float) -> None:
    run = float(p.get("step_w_nm", 180.0))
    rise = float(p.get("step_h_nm", 110.0))
    thickness = float(p.get("thickness_nm", p.get("cd_nm", 88.0)))
    _append_stepped_track(
        shapes,
        x_nm=cx - 300.0,
        y_nm=cy + 90.0,
        thickness_nm=thickness,
        run_nm=[run, run, run + 30.0],
        rise_nm=[rise, rise],
    )


def _append_stepped_interconnect_opc(shapes: List[RectShape], p: Dict[str, float], cx: float, cy: float) -> None:
    run = float(p.get("step_w_nm", 180.0))
    rise = float(p.get("step_h_nm", 110.0))
    thickness = float(p.get("thickness_nm", p.get("cd_nm", 88.0)))
    bias = float(p.get("opc_bias_nm", 12.0))
    end_ext = float(p.get("end_extension_nm", 24.0))
    serif = float(p.get("serif_nm", 18.0))
    thick = thickness + bias
    x0 = cx - 312.0 - end_ext * 0.5
    y0 = cy + 90.0
    _append_stepped_track(
        shapes,
        x_nm=x0,
        y_nm=y0,
        thickness_nm=thick,
        run_nm=[run + end_ext, run + 12.0, run + 30.0 + end_ext],
        rise_nm=[rise, rise],
    )
    _append_rect(shapes, x_nm=x0 + run - serif * 0.2, y_nm=y0 - rise + thick - serif * 0.55, w_nm=serif, h_nm=serif)
    _append_rect(shapes, x_nm=x0 + run + run - thick + 8.0, y_nm=y0 - rise - rise + thick - serif * 0.55, w_nm=serif, h_nm=serif)


def template_to_shapes(template_id: TemplateID, p: Dict[str, float]) -> Tuple[List[RectShape], float]:
    """
    Returns (shapes, fov_nm). All geometry in nm.
    Coordinate system: x right, y up. Origin at (0,0) bottom-left of FOV.
    """
    # default field of view for MVP
    fov_nm = float(p.get("fov_nm", 1100.0))
    cx = fov_nm * 0.5
    cy = fov_nm * 0.5

    shapes: List[RectShape] = []

    template_id = _normalize_template_id(template_id)

    if template_id == "ISO_LINE_DUV":
        # DUV 193 nm: cd=100 nm ≈ 1.7× Rayleigh floor (NA 0.93, floor ≈58 nm).
        cd = float(p.get("cd_nm", 100.0))
        h = float(p.get("length_nm", 900.0))
        shapes.append(RectShape(x_nm=cx - cd / 2, y_nm=cy - h / 2, w_nm=cd, h_nm=h))

    elif template_id == "ISO_LINE_EUV":
        # EUV 13.5 nm LNA: cd=24 nm ≈ 2× Rayleigh floor (NA 0.33, floor ≈12 nm).
        # Shows real EUV proximity narrowing; 500 nm length fits in the 1100 nm FOV.
        cd = float(p.get("cd_nm", 24.0))
        h = float(p.get("length_nm", 500.0))
        shapes.append(RectShape(x_nm=cx - cd / 2, y_nm=cy - h / 2, w_nm=cd, h_nm=h))

    elif template_id == "DENSE_LS":
        cd = float(p.get("cd_nm", 60.0))
        pitch = float(p.get("pitch_nm", 140.0))
        n_req = int(p.get("n_lines", 7))
        n = _fit_dense_line_count_in_fov(cd, pitch, n_req, fov_nm)
        h = float(p.get("length_nm", 900.0))
        start = cx - (n - 1) * pitch / 2
        for i in range(n):
            x = start + i * pitch - cd / 2
            shapes.append(RectShape(x_nm=x, y_nm=cy - h / 2, w_nm=cd, h_nm=h))

    elif template_id == "LINE_END_RAW":
        cd = float(p.get("cd_nm", 80.0))
        h = float(p.get("length_nm", 900.0))
        shapes.append(RectShape(x_nm=cx - cd / 2, y_nm=cy - h / 2, w_nm=cd, h_nm=h))

    elif template_id == "LINE_END_RAW_DUV":
        # DUV 193 nm: cd=100 nm ≈ 1.7× Rayleigh floor (NA 0.93, floor ≈58 nm).
        # Length 600 nm gives 6 strips at segmentNm=80 — enough to show both
        # top and bottom line-end pullback simultaneously.
        cd = float(p.get("cd_nm", 100.0))
        h = float(p.get("length_nm", 600.0))
        shapes.append(RectShape(x_nm=cx - cd / 2, y_nm=cy - h / 2, w_nm=cd, h_nm=h))

    elif template_id == "LINE_END_RAW_EUV":
        # EUV 13.5 nm LNA: cd=24 nm ≈ 2× Rayleigh floor (NA 0.33, floor ≈12 nm).
        # At 2× the floor the line-end pullback is dramatic and OPC correction
        # is clearly necessary.  Length 160 nm gives 8 strips at segmentNm=20.
        cd = float(p.get("cd_nm", 24.0))
        h = float(p.get("length_nm", 160.0))
        shapes.append(RectShape(x_nm=cx - cd / 2, y_nm=cy - h / 2, w_nm=cd, h_nm=h))

    elif template_id == "LINE_END_OPC_HAMMER":
        cd = float(p.get("cd_nm", 80.0))
        h = float(p.get("length_nm", 900.0))
        hammer_w = float(p.get("hammer_w_nm", max(1.8 * cd, cd + 40.0)))
        hammer_h = float(p.get("hammer_h_nm", max(0.35 * cd, 24.0)))
        x = cx - cd / 2
        y = cy - h / 2
        shapes.append(RectShape(x_nm=x, y_nm=y, w_nm=cd, h_nm=h))
        # top/bottom hammerheads
        shapes.append(RectShape(x_nm=cx - hammer_w / 2, y_nm=y + h - hammer_h / 2, w_nm=hammer_w, h_nm=hammer_h))
        shapes.append(RectShape(x_nm=cx - hammer_w / 2, y_nm=y - hammer_h / 2, w_nm=hammer_w, h_nm=hammer_h))

    elif template_id == "L_CORNER_RAW_DUV":
        _append_l_shape_raw(shapes, p, cx, cy, "DUV")

    elif template_id == "L_CORNER_RAW_EUV":
        _append_l_shape_raw(shapes, p, cx, cy, "EUV")

    elif template_id == "L_CORNER_OPC_DUV":
        _append_l_shape_opc(shapes, p, cx, cy, "DUV")

    elif template_id == "L_CORNER_OPC_EUV":
        _append_l_shape_opc(shapes, p, cx, cy, "EUV")

    elif template_id == "CONTACT" or template_id == "CONTACT_RAW":
        w = float(p.get("w_nm", p.get("cd_nm", 200.0)))
        shapes.append(RectShape(x_nm=cx - w / 2, y_nm=cy - w / 2, w_nm=w, h_nm=w))

    elif template_id == "CONTACT_OPC_SERIF":
        w = float(p.get("w_nm", p.get("cd_nm", 170.0)))
        serif = float(p.get("serif_nm", 112.0))
        half = w / 2
        shapes.append(RectShape(x_nm=cx - half, y_nm=cy - half, w_nm=w, h_nm=w))
        # diagonal serif pads to counter contact rounding (educational)
        shapes.append(RectShape(x_nm=cx - half - serif / 2, y_nm=cy - half - serif / 2, w_nm=serif, h_nm=serif))
        shapes.append(RectShape(x_nm=cx + half - serif / 2, y_nm=cy - half - serif / 2, w_nm=serif, h_nm=serif))
        shapes.append(RectShape(x_nm=cx - half - serif / 2, y_nm=cy + half - serif / 2, w_nm=serif, h_nm=serif))
        shapes.append(RectShape(x_nm=cx + half - serif / 2, y_nm=cy + half - serif / 2, w_nm=serif, h_nm=serif))

    elif template_id == "STAIRCASE":
        _append_stepped_interconnect_raw(shapes, p, cx, cy)

    elif template_id == "STAIRCASE_OPC":
        _append_stepped_interconnect_opc(shapes, p, cx, cy)
    else:
        # fallback: simple contact
        w = float(p.get("w_nm", p.get("cd_nm", 200.0)))
        shapes.append(RectShape(x_nm=cx - w / 2, y_nm=cy - w / 2, w_nm=w, h_nm=w))

    # Phase 1: simple rule-based SRAF appended as extra rectangles
    # (Free: on/off + size + offset)
    sraf_on = bool(p.get("sraf_on", 0.0) >= 0.5)
    if sraf_on:
        sraf_w = float(p.get("sraf_w_nm", 30.0))
        sraf_off = float(p.get("sraf_offset_nm", 80.0))
        # very simple: place two SRAFs left/right of the bounding box centerline
        shapes.append(RectShape(x_nm=cx - sraf_off - sraf_w / 2, y_nm=cy - sraf_w / 2, w_nm=sraf_w, h_nm=sraf_w))
        shapes.append(RectShape(x_nm=cx + sraf_off - sraf_w / 2, y_nm=cy - sraf_w / 2, w_nm=sraf_w, h_nm=sraf_w))

    return shapes, fov_nm
