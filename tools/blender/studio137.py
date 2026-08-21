"""137 Studio — the console asset contract, inside Blender.

Install (Blender 4.2 – 5.x):
    Edit ▸ Preferences ▸ Add-ons ▸ ▾ ▸ Install from Disk… ▸ pick this file
    Then enable "137 Studio — Console Contract".

Or, if you would rather not install anything:
    Scripting workspace ▸ Open ▸ this file ▸ Run Script.
    The panel appears in the 3D viewport sidebar (press N) under a "137" tab.

WHY THIS EXISTS

The console is being rebuilt because the old one was a single fused mesh with a
single material, and one material cannot be blackened iron AND polished brass
AND glass — so it was none of them. The engine grades the rebuild per part,
keyed by node name, which makes those names an API rather than a suggestion.

An API you cannot check is a trap. `CRT_glass` instead of `CRT_Glass` does not
error: the part quietly falls through to a generic grade and renders as painted
iron, and you find out three days later wondering why the screen looks wrong.

So: press Check before you export. It reads your scene the same way the room's
loader will, and tells you what the room will do with it.

The repo carries the same rules twice more — `tools/asset-forge/validate-console.mjs`
runs them against an exported .glb, and `src/components/studio/Props.tsx` is what
actually applies them at runtime. If the three ever disagree, Props.tsx is right.
"""

bl_info = {
    "name": "137 Studio — Console Contract",
    "author": "137 Studio",
    "version": (1, 0, 0),
    "blender": (4, 2, 0),
    "location": "View3D ▸ Sidebar (N) ▸ 137",
    "description": "Check the console against docs/console-asset-contract.md, and export it correctly.",
    "category": "Import-Export",
}

import math
import os
import re

import bpy
from mathutils import Vector

# ── the contract ────────────────────────────────────────────────────────────

REQUIRED_PARTS = [
    "Body_Iron",
    "Trim_Brass",
    "CRT_Bezel",
    "CRT_Glass",
    "CRT_Display",
    "Panel_Controls",
    "Collision_Console",
    "FocusAnchor",
]
# Not a required part — the machine can carry any number, including none in an
# early blockout — but the loader grades it, so it belongs in the name table.
OPTIONAL_PARTS = ["Knob"]

ROOT_NAME = "ConsoleRoot"
REQUIRED_MATERIALS = ["M_Iron", "M_Brass", "M_Glass", "M_Display"]

HEIGHT_M = 1.05
HEIGHT_TOLERANCE = 0.06
FOOTPRINT_W = 0.95
FOOTPRINT_D = 0.55
GAP_MIN, GAP_MAX = 0.002, 0.004
MAX_COLLISION_TRIS = 40
REFLECTANCE_FLOOR = 0.08

# Nodes that exist for the engine and are never drawn.
INVISIBLE_PARTS = {"Collision_Console", "FocusAnchor"}

# Longest first, so `Panel_Controls` is tested before anything that prefixes it.
_PART_NAMES = sorted(REQUIRED_PARTS + OPTIONAL_PARTS, key=len, reverse=True)


def normalise_part(raw):
    """Resolve an object name to a contract part, tolerating export suffixes.

    Duplicate an object in Blender and you get `Trim_Brass.001`, which is not
    the string `Trim_Brass`. Rather than ask you to hand-rename every copy —
    which you would forget, and which Blender would undo the next time you
    duplicated something — the loader strips the `.NNN` and accepts anything
    extending a contract name past a separator. So `Trim_Brass`,
    `Trim_Brass.001` and `Trim_Brass_plinth` are all brass, and
    `Trim_Brasserie` is not.
    """
    name = re.sub(r"\.\d+$", "", raw or "")
    for part in _PART_NAMES:
        if not name.startswith(part):
            continue
        rest = name[len(part):]
        if rest == "" or rest[0] in "_.":
            return part
    return None


# ── scene reading ───────────────────────────────────────────────────────────

def console_root():
    obj = bpy.data.objects.get(ROOT_NAME)
    return obj if obj else None


def hierarchy(root):
    """Root and every descendant, depth first."""
    out = []
    stack = [root]
    while stack:
        o = stack.pop()
        out.append(o)
        stack.extend(o.children)
    return out


def world_bounds(obj):
    """(min, max) of an object's bounding box IN WORLD SPACE.

    `obj.bound_box` is local, and every real dimension on a blockout lives in
    the transforms above it. Measuring the local box tells you the size of the
    primitive somebody started from, which is not a fact about the model.
    """
    if obj.type != "MESH" or not obj.data.vertices:
        return None
    m = obj.matrix_world
    pts = [m @ Vector(c) for c in obj.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def union_bounds(objs):
    boxes = [b for b in (world_bounds(o) for o in objs) if b]
    if not boxes:
        return None
    lo = Vector((min(b[0].x for b in boxes), min(b[0].y for b in boxes), min(b[0].z for b in boxes)))
    hi = Vector((max(b[1].x for b in boxes), max(b[1].y for b in boxes), max(b[1].z for b in boxes)))
    return lo, hi


def triangles(obj):
    if obj.type != "MESH":
        return 0
    return sum(max(len(p.vertices) - 2, 0) for p in obj.data.polygons)


def principled(mat):
    if not mat or not mat.use_nodes:
        return None
    for n in mat.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            return n
    return None


def luminance(rgb):
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


# ── the check ───────────────────────────────────────────────────────────────

def check_scene():
    """Returns (problems, warnings, notes) — the same three tiers the .mjs
    validator reports, because they are the same contract."""
    problems, warnings, notes = [], [], []

    root = console_root()
    if root is None:
        problems.append(
            f'No object named "{ROOT_NAME}". Everything on the machine parents to it, '
            "and the exporter uses it to decide what leaves the file."
        )
        return problems, warnings, notes

    objs = hierarchy(root)
    by_part = {}
    orphans = []
    for o in objs:
        if o is root:
            continue
        part = normalise_part(o.name)
        if part is None:
            if o.type == "MESH":
                orphans.append(o.name)
            continue
        by_part.setdefault(part, []).append(o)

    # ── names ───────────────────────────────────────────────────────────────
    for want in REQUIRED_PARTS:
        if want in by_part:
            continue
        near = next(
            (o.name for o in objs if o.name.lower().startswith(want.lower())),
            None,
        )
        problems.append(
            f'Missing "{want}" — found "{near}"' if near else f'Missing "{want}"'
        )

    knobs = by_part.get("Knob", [])
    if knobs:
        notes.append(f"{len(knobs)} knob objects")
    else:
        warnings.append("No Knob_NN objects. The contract asks for each knob as its own object.")

    if orphans:
        warnings.append(
            f"{len(orphans)} mesh object(s) match no contract part and will fall through to "
            f"the generic grade: {', '.join(sorted(orphans)[:8])}"
            + (" …" if len(orphans) > 8 else "")
            + ". Rename them, or parent them under the part they belong to."
        )

    levers = [o.name for o in objs if re.match(r"^Lever_\d+", o.name)]
    if levers:
        warnings.append(
            f"Found {len(levers)} Lever_N objects. The 4-bit lever machine was NOT adopted — "
            "navigation is objects, not a code. Check you are working from contract v1."
        )

    # ── materials ───────────────────────────────────────────────────────────
    used = []
    for o in objs:
        if o.type != "MESH":
            continue
        for slot in o.material_slots:
            if slot.material and slot.material.name not in used:
                used.append(slot.material.name)

    for want in REQUIRED_MATERIALS:
        if want not in used:
            problems.append(f'Material "{want}" is not on anything.')
    extra = [m for m in used if m not in REQUIRED_MATERIALS]
    if extra:
        warnings.append(
            f"{len(used)} materials in use, contract allows {len(REQUIRED_MATERIALS)}. "
            f"Extra: {', '.join(extra)}. Each one is a draw call."
        )

    for name in used:
        node = principled(bpy.data.materials.get(name))
        if node is None:
            warnings.append(f'Material "{name}" has no Principled BSDF. The exporter will guess.')
            continue
        metal = node.inputs["Metallic"].default_value
        if 0.2 < metal < 0.8:
            notes.append(
                f'"{name}" Metallic {metal:.2f} — real surfaces are metal or they are not; '
                "values in the middle are usually a slip."
            )
        base = node.inputs["Base Color"].default_value
        lum = luminance(base)
        if lum < REFLECTANCE_FLOOR:
            warnings.append(
                f'"{name}" base colour is {lum * 100:.1f}% reflectance, below the {REFLECTANCE_FLOOR * 100:.0f}% floor. '
                "A surface that cannot return the light it is given is how this room went black for months."
            )

    # ── size, in world space, of the parts you can see ──────────────────────
    visible = [
        o for o in objs
        if o.type == "MESH" and normalise_part(o.name) not in INVISIBLE_PARTS
    ]
    box = union_bounds(visible)
    if box:
        lo, hi = box
        h = hi.z - lo.z
        if abs(h - HEIGHT_M) > HEIGHT_TOLERANCE:
            warnings.append(
                f"Height {h:.3f} m against a contract height of {HEIGHT_M} m. The loader rescales, "
                "so this is only fatal if your units are wrong — but it means the proportions you "
                "are judging by eye are not the ones anyone will see."
            )
        else:
            notes.append(f"Height {h:.3f} m")

        if abs(lo.z) > 0.01:
            warnings.append(
                f"The base sits at z={lo.z:.3f} rather than 0. It will still be placed on the bench, "
                "but every offset in studio-data.ts is measured from a base at the origin."
            )

        w, d = hi.x - lo.x, hi.y - lo.y
        if w > FOOTPRINT_W + 0.01 or d > FOOTPRINT_D + 0.01:
            warnings.append(
                f"Footprint {w:.2f} × {d:.2f} m, contract allows {FOOTPRINT_W} × {FOOTPRINT_D} m. "
                "The bench is 0.8 m deep and the machine has to leave room to work at."
            )
        else:
            notes.append(f"Footprint {w:.2f} × {d:.2f} m")

    # ── the CRT is three objects with a real gap ────────────────────────────
    glass = union_bounds(by_part.get("CRT_Glass", []))
    disp = union_bounds(by_part.get("CRT_Display", []))
    if glass and disp:
        # Front faces, along -Y. The gap is between the surfaces you can see,
        # not between two origins that may sit anywhere inside their geometry.
        gap = abs(glass[0].y - disp[0].y)
        if gap < GAP_MIN:
            problems.append(
                f"CRT_Glass and CRT_Display are {gap * 1000:.1f} mm apart. The contract asks for "
                f"{GAP_MIN * 1000:.0f}–{GAP_MAX * 1000:.0f} mm: the parallax between them is what makes a CRT "
                "read as an object rather than a picture of one."
            )
        elif gap > GAP_MAX * 1.5:
            warnings.append(
                f"CRT glass/display gap {gap * 1000:.1f} mm — more than the contract's "
                f"{GAP_MIN * 1000:.0f}–{GAP_MAX * 1000:.0f} mm. Much more and the screen reads as recessed."
            )
        else:
            notes.append(f"CRT glass/display gap {gap * 1000:.1f} mm")

        # A screen buried inside its own bezel is contract-clean and invisible.
        #
        # The naive form of this test — "is the display behind the bezel's front
        # face" — fails every correctly built console, because a bezel IS a lip
        # in front of a recessed screen. What matters is not depth, it is
        # OCCLUSION: is there bezel geometry in the volume directly in front of
        # the screen. A frame has none there by definition; a solid block is
        # nothing but.
        #
        # So: take the slab from the display's front face to the bezel's, shrink
        # it to the middle 80% of the screen so a frame's inner lip does not
        # count, and ask whether any bezel part is inside it.
        bezel_parts = by_part.get("CRT_Bezel", [])
        bezel = union_bounds(bezel_parts)
        if bezel and disp[0].y > bezel[0].y + 0.001:
            cx, cz = (disp[0].x + disp[1].x) / 2, (disp[0].z + disp[1].z) / 2
            hx, hz = (disp[1].x - disp[0].x) * 0.4, (disp[1].z - disp[0].z) * 0.4
            slab_lo = Vector((cx - hx, bezel[0].y, cz - hz))
            slab_hi = Vector((cx + hx, disp[0].y, cz + hz))
            blocking = []
            for o in bezel_parts:
                b = world_bounds(o)
                if not b:
                    continue
                if all(b[0][a] < slab_hi[a] and b[1][a] > slab_lo[a] for a in range(3)):
                    blocking.append(o.name)
            if blocking:
                problems.append(
                    f"CRT_Display is {(disp[0].y - bezel[0].y) * 1000:.0f} mm behind the front of the bezel and "
                    f"{', '.join(blocking)} is in the way. The bezel has to be a frame with a hole in "
                    "it — as a solid block the screen is inside the machine and nobody will ever see it."
                )

    # ── collision ───────────────────────────────────────────────────────────
    hull = by_part.get("Collision_Console", [])
    if hull:
        tris = sum(triangles(o) for o in hull)
        if tris > MAX_COLLISION_TRIS:
            warnings.append(f"Collision_Console is {tris} triangles; contract asks for under {MAX_COLLISION_TRIS}.")
        else:
            notes.append(f"Collision hull {tris} triangles")

        hbox = union_bounds(hull)
        if hbox and box:
            short = sum(
                1 for a in range(3)
                if hbox[0][a] > box[0][a] + 0.02 or hbox[1][a] < box[1][a] - 0.02
            )
            if short:
                warnings.append(
                    f"Collision_Console is smaller than the console on {short} axis/axes. "
                    "Anything it misses is un-clickable — the pointer passes straight through."
                )

    # ── focus ───────────────────────────────────────────────────────────────
    anchor = by_part.get("FocusAnchor", [])
    if anchor and glass:
        a = anchor[0].matrix_world.translation
        centre = (glass[0] + glass[1]) / 2
        off = math.dist((a.x, a.z), (centre.x, centre.z))
        if off > 0.12:
            warnings.append(
                f"FocusAnchor is {off * 100:.0f} cm off the centre of the screen. It is what the "
                "camera aims at when a keyboard user tabs to this door."
            )

    # ── transforms ──────────────────────────────────────────────────────────
    unapplied = [
        o.name for o in objs
        if o.type == "MESH" and any(abs(s - 1.0) > 0.001 for s in o.scale)
    ]
    if unapplied:
        notes.append(
            f"{len(unapplied)} object(s) carry a non-unit scale. Harmless — the exporter is run "
            "with Apply Modifiers and bakes them — but Ctrl+A ▸ Scale before you texture."
        )

    return problems, warnings, notes


def report_text():
    problems, warnings, notes = check_scene()
    lines = ["", "CONSOLE CONTRACT CHECK", ""]
    for n in notes:
        lines.append(f"  ·  {n}")
    if notes:
        lines.append("")
    for w in warnings:
        lines.append(f"  !  {w}")
    if warnings:
        lines.append("")
    for p in problems:
        lines.append(f"  x  {p}")
    if problems:
        lines.append("")
        lines.append(f"  FAILS on {len(problems)} required item(s).")
    else:
        lines.append(
            "  PASSES the contract cleanly. This will drop straight in."
            if not warnings
            else f"  PASSES the contract, with {len(warnings)} thing(s) worth a look."
        )
    lines.append("")
    return "\n".join(lines)


# ── export ──────────────────────────────────────────────────────────────────

def export_console(path):
    """Export the ConsoleRoot hierarchy with the settings the contract names.

    Keyword arguments are filtered against the operator's actual signature:
    the glTF exporter gains and renames options between Blender versions, and
    an add-on that hard-codes them breaks on upgrade for no reason.
    """
    root = console_root()
    if root is None:
        raise RuntimeError(f'No "{ROOT_NAME}" in the scene.')

    bpy.ops.object.select_all(action="DESELECT")
    for o in hierarchy(root):
        o.select_set(True)
    bpy.context.view_layer.objects.active = root

    wanted = {
        "filepath": path,
        "export_format": "GLB",
        "use_selection": True,
        "export_apply": True,       # modifiers baked
        "export_yup": True,         # glTF convention; three.js expects it
        "export_tangents": False,   # three generates these itself
        "export_cameras": False,
        "export_lights": False,
        "export_extras": False,     # custom properties are not the contract
    }
    props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    kwargs = {k: v for k, v in wanted.items() if k in props}
    bpy.ops.export_scene.gltf(**kwargs)
    dropped = sorted(set(wanted) - set(kwargs))
    return path, dropped


# ── UI ──────────────────────────────────────────────────────────────────────

class STUDIO137_OT_check(bpy.types.Operator):
    bl_idname = "studio137.check"
    bl_label = "Check contract"
    bl_description = "Read the scene the way the room's loader will, and report what it finds"

    def execute(self, context):
        problems, warnings, _ = check_scene()
        text = report_text()
        print(text)

        # Into a text datablock as well as the console, because the console is
        # not open by default on Windows and a report nobody can read is not a
        # report.
        name = "137-contract-check"
        block = bpy.data.texts.get(name) or bpy.data.texts.new(name)
        block.clear()
        block.write(text)

        if problems:
            self.report({"ERROR"}, f"{len(problems)} problem(s) — see the {name} text block")
        elif warnings:
            self.report({"WARNING"}, f"Passes, with {len(warnings)} thing(s) worth a look")
        else:
            self.report({"INFO"}, "Passes the contract cleanly")
        return {"FINISHED"}


class STUDIO137_OT_export(bpy.types.Operator):
    bl_idname = "studio137.export"
    bl_label = "Export consoleMV.glb"
    bl_description = "Export the ConsoleRoot hierarchy with the contract's export settings"

    filepath: bpy.props.StringProperty(subtype="FILE_PATH", default="consoleMV.glb")

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {"RUNNING_MODAL"}

    def execute(self, context):
        problems, _, _ = check_scene()
        if problems:
            # Refusing is not politeness. An export that fails the contract
            # renders wrong without erroring, and finding out at that end costs
            # an afternoon that this costs a second.
            self.report({"ERROR"}, f"{len(problems)} contract problem(s). Run Check first.")
            return {"CANCELLED"}
        try:
            path, dropped = export_console(bpy.path.abspath(self.filepath))
        except Exception as exc:  # noqa: BLE001 — surfaced to the user, not swallowed
            self.report({"ERROR"}, str(exc))
            return {"CANCELLED"}
        if dropped:
            self.report({"WARNING"}, f"Exported. This Blender ignored: {', '.join(dropped)}")
        else:
            self.report({"INFO"}, f"Exported {os.path.basename(path)}")
        return {"FINISHED"}


class STUDIO137_PT_panel(bpy.types.Panel):
    bl_label = "Console Contract"
    bl_idname = "STUDIO137_PT_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "137"

    def draw(self, context):
        col = self.layout.column(align=True)
        root = console_root()
        if root is None:
            col.label(text=f'No "{ROOT_NAME}"', icon="ERROR")
            col.label(text="Parent everything to an empty")
            col.label(text=f'named {ROOT_NAME}.')
            return

        problems, warnings, _ = check_scene()
        if problems:
            col.label(text=f"{len(problems)} problem(s)", icon="ERROR")
        elif warnings:
            col.label(text=f"{len(warnings)} worth a look", icon="INFO")
        else:
            col.label(text="Contract clean", icon="CHECKMARK")

        col.separator()
        col.operator(STUDIO137_OT_check.bl_idname, icon="VIEWZOOM")
        col.operator(STUDIO137_OT_export.bl_idname, icon="EXPORT")


CLASSES = (STUDIO137_OT_check, STUDIO137_OT_export, STUDIO137_PT_panel)


def register():
    for c in CLASSES:
        bpy.utils.register_class(c)


def unregister():
    for c in reversed(CLASSES):
        bpy.utils.unregister_class(c)


if __name__ == "__main__":
    # Run Script in the Text Editor lands here. Re-register cleanly so you can
    # hit Run twice without Blender complaining about duplicate classes.
    try:
        unregister()
    except Exception:  # noqa: BLE001
        pass
    register()
    print(report_text())
