"""Generate the proxy console — a blockout that satisfies the asset contract.

    python3 tools/blender/console_proxy.py [out.glb]

This is NOT the hero asset. It is deliberately crude geometry with exactly the
right NAMES, so engineering can build against the contract before the real
machine exists and Michael's export replaces this file with no code change.

It is also the contract made legible: open the .blend or the .glb in Blender
and the hierarchy, the four materials, the 3 mm gap between CRT glass and CRT
display, and the collision hull are all there to look at rather than to infer
from a document.

Units are metres, up is +Z, forward is -Y (glTF export converts to Y-up).
"""
import sys, os, math
import bpy
from mathutils import Vector

OUT = sys.argv[1] if len(sys.argv) > 1 else "public/models/consoleMV-proxy.glb"

HEIGHT      = 1.05          # contract: overall height, base to top
BODY_W, BODY_D = 0.88, 0.46
BODY_H      = 0.60
CRT_W, CRT_H, CRT_D = 0.72, 0.42, 0.34
GLASS_GAP   = 0.003         # contract: 2-4 mm between glass and display

# ── clean slate ─────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, rgb, metal, rough):
    """A Principled material with an EXPLICIT metallic factor.

    Explicit because the mistake this whole room already paid for is a
    metallicRoughness texture with no factor: glTF reads the default as 1.0,
    fully metal, which is what made the reconstructed console read as liquid
    chrome under every lighting setup we tried.
    """
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1.0)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    return m


# Base colours sit at or above the 8% reflectance floor. A surface painted
# darker than that cannot return the light it is given, which is how the room
# went accidentally black for months.
# Checked against the 8% floor rather than eyeballed: the first set of these
# measured 7.7% and 7.6%, and the in-Blender contract check said so. Luminance
# is 0.2126R + 0.7152G + 0.0722B — green carries three quarters of it, which is
# why a colour that "looks" dark grey can sit either side of the line.
M_IRON    = mat("M_Iron",    (0.090, 0.080, 0.077), 0.05, 0.62)
M_BRASS   = mat("M_Brass",   (0.55,  0.40,  0.16),  0.90, 0.34)
M_GLASS   = mat("M_Glass",   (0.10,  0.11,  0.12),  0.00, 0.06)
M_DISPLAY = mat("M_Display", (0.095, 0.080, 0.055), 0.00, 0.60)


def box(name, size, loc, material, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = Vector(size)
    o.data.materials.append(material)
    if parent:
        o.parent = parent
    return o


def cyl(name, r, h, loc, material, parent=None, rot=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, vertices=16)
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = rot
    o.data.materials.append(material)
    if parent:
        o.parent = parent
    return o


# ── ConsoleRoot ─────────────────────────────────────────────────────────────
# An empty at world origin, on the base plane: the point the machine stands on.
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
root = bpy.context.active_object
root.name = "ConsoleRoot"

# ── the chassis ─────────────────────────────────────────────────────────────
body = box("Body_Iron", (BODY_W, BODY_D, BODY_H), (0, 0, BODY_H / 2), M_IRON, root)

# The sloped control deck across the front, tilted back so it faces a seated
# eye 46 cm above the bench rather than facing straight up.
deck = box("Panel_Controls", (BODY_W * 0.94, 0.26, 0.05),
           (0, -BODY_D * 0.30, BODY_H + 0.015), M_IRON, root)
deck.rotation_euler = (math.radians(-24), 0, 0)

# ── the CRT: three separate objects ─────────────────────────────────────────
# The bezel is a FRAME, not a block. The first version was a single solid box
# with the screen parked 2 cm inside it, so the render came back as a plain
# gold slab with no screen anywhere — geometrically valid, contract-compliant,
# and completely useless as a proxy. A validator cannot catch that. Rendering
# it can, which is the entire reason the proxy gets rendered rather than just
# checked.
crt_z = BODY_H + CRT_H / 2 + 0.03
APERTURE_W, APERTURE_H = CRT_W * 0.80, CRT_H * 0.74
FRAME_X = (CRT_W - APERTURE_W) / 2
FRAME_Z = (CRT_H - APERTURE_H) / 2

bezel = box("CRT_Bezel", (CRT_W, CRT_D, FRAME_Z),
            (0, 0, crt_z + (CRT_H - FRAME_Z) / 2), M_IRON, root)   # brow
box("CRT_Bezel_chin",  (CRT_W, CRT_D, FRAME_Z),
    (0, 0, crt_z - (CRT_H - FRAME_Z) / 2), M_IRON, root)
box("CRT_Bezel_left",  (FRAME_X, CRT_D, APERTURE_H),
    (-(CRT_W - FRAME_X) / 2, 0, crt_z), M_IRON, root)
box("CRT_Bezel_right", (FRAME_X, CRT_D, APERTURE_H),
    ((CRT_W - FRAME_X) / 2, 0, crt_z), M_IRON, root)
# the shell behind the tube, so the frame is not a hole through the machine
box("CRT_Bezel_back",  (CRT_W, 0.02, CRT_H), (0, CRT_D / 2 - 0.01, crt_z), M_IRON, root)

# Display first, glass in front of it. The gap between them is the whole point:
# real distance produces the parallax that makes a CRT read as a physical
# object instead of a picture of one. Both sit just PROUD of the frame's front
# face — a screen recessed behind its own bezel is a screen nobody can see.
disp_y = -CRT_D / 2 + 0.008
box("CRT_Display", (APERTURE_W, 0.004, APERTURE_H), (0, disp_y, crt_z), M_DISPLAY, root)
box("CRT_Glass",   (APERTURE_W + 0.02, 0.006, APERTURE_H + 0.02),
    (0, disp_y - GLASS_GAP, crt_z), M_GLASS, root)

# ── brass, used sparingly ───────────────────────────────────────────────────
# One material for fittings only. The old console read as a solid gold lamp
# because everything on it was brass.
for i, (x, z) in enumerate([(-CRT_W / 2, crt_z), (CRT_W / 2, crt_z)]):
    box(f"Trim_Brass{'' if i == 0 else f'_{i}'}", (0.035, CRT_D * 0.9, CRT_H * 0.96),
        (x, 0, z), M_BRASS, root)
# the plinth band
box("Trim_Brass_plinth", (BODY_W * 1.01, BODY_D * 1.01, 0.03), (0, 0, 0.02), M_BRASS, root)

# ── knobs, each its own node ────────────────────────────────────────────────
# Two rows of four. The second row steps UP THE SLOPED FACE rather than
# straight up in Z — the panel is tilted -24 degrees, so a row placed with a
# pure Z offset floats off the surface at the back and sinks into it at the
# front. This previously read `row * 0.0` on both axes, which put all eight
# knobs in four places: the proxy looked right and had half the nodes the
# contract asks for.
ROW_STEP = 0.058
for i in range(8):
    x = -0.32 + (i % 4) * 0.213
    row = i // 4
    cyl(f"Knob_{i:02d}", 0.022, 0.03,
        (x,
         -BODY_D * 0.30 + row * ROW_STEP * math.cos(math.radians(24)),
         BODY_H + 0.055 + row * ROW_STEP * math.sin(math.radians(24))),
        M_BRASS, root, rot=(math.radians(-24), 0, 0))

# ── collision + focus ───────────────────────────────────────────────────────


# Where the machine wants to be looked at: centred on the CRT, 8 cm proud of
# the glass. This is the point the fold composes around when the console is
# used as a door.
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, disp_y - 0.08, crt_z))
anchor = bpy.context.active_object
anchor.name = "FocusAnchor"
anchor.parent = root

# ── normalise height ────────────────────────────────────────────────────────
# Measured, then corrected, rather than trusted: the contract says 1.05 m and
# a blockout assembled from parts lands wherever the parts land.
bpy.context.view_layer.update()
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
zs = [(o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box]
measured = max(zs) - min(zs)
scale = HEIGHT / measured
for o in root.children:
    o.location = o.location * scale
    o.scale = o.scale * scale
bpy.context.view_layer.update()
zs = [(o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box]
print(f"height {max(zs) - min(zs):.4f} m (target {HEIGHT})")

# ── collision, built LAST ───────────────────────────────────────────────────
# Order matters here and it cost a measurement to learn. Built before the
# normalisation, the hull was included in the height that got normalised — so
# the machine was scaled until hull-plus-margin measured 1.05 m and the part
# you can see came out at 1.03. Two centimetres, invisible by eye, and a
# blockout whose whole job is to be the right size.
#
# A convex box, 12 triangles. Raycasting the full-detail mesh is wasteful and
# makes the clickable area feel unreliable where the geometry is thin.
#
# MEASURED from the machine rather than guessed alongside it. Written by hand
# as BODY_W x BODY_D it missed the plinth, which is 1% wider, and the control
# deck, which stands 38 mm proud of the chassis — and a hull that misses part
# of the console is worse than no hull, because the pointer passes straight
# through exactly the parts a visitor is most likely to aim at.
bpy.context.view_layer.update()
lo = [1e9] * 3
hi = [-1e9] * 3
for o in root.children:
    if o.type != "MESH":
        continue
    for corner in o.bound_box:
        w = o.matrix_world @ Vector(corner)
        for a in range(3):
            lo[a] = min(lo[a], w[a])
            hi[a] = max(hi[a], w[a])
MARGIN = 0.01
coll = box(
    "Collision_Console",
    tuple(hi[a] - lo[a] + MARGIN * 2 for a in range(3)),
    tuple((hi[a] + lo[a]) / 2 for a in range(3)),
    M_IRON,
    root,
)
coll.display_type = "WIRE"

# ── export ──────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    export_apply=True,          # apply modifiers, keep object transforms
    export_yup=True,            # three's convention
    export_tangents=False,      # three generates these
    export_normals=True,
    use_visible=False,
)
print(f"wrote {OUT} ({os.path.getsize(OUT)/1024:.0f} KB)")
