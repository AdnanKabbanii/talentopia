# Talentopia V4: a realistic single-aisle airliner (A320-class proportions), modelled procedurally in Blender.
# blender -b -P airliner.py -- OUT.glb
# Blender Z up; nose points -Y (becomes +Z in three.js). Origin = fuselage centreline at the wing. Metres.
import bpy, bmesh, math, sys, os
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1]
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)
MATS = {}
def mat(name, color, metal=0.0, rough=0.4):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(color); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    MATS[name] = m; return m
PAINT = mat('Paint', '#f4f6f9', 0.0, 0.25); BELLY = mat('Belly', '#c9ced6', 0.0, 0.35); VIOLET = mat('Livery', '#7b5cf0', 0.0, 0.3)
METAL = mat('Metal', '#b8bec6', 1.0, 0.25); DARK = mat('Dark', '#15181d', 0.2, 0.5); GLASS = mat('Window', '#0d1218', 0.6, 0.08)
TYRE = mat('Tyre', '#1a1a1a', 0.0, 0.85); GEAR = mat('Gear', '#9aa1a8', 0.9, 0.35)

objs = []
def new_obj(name, bm, mats, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = smooth
    objs.append(ob); return ob

# ---------------------------------------------------------------- fuselage: lofted rings along Y
L_NOSE, L_TAIL = -18.6, 19.0; R = 1.98; SEG = 40
def profile(y):
    """radius and centreline height (z) along the body: ogive nose, constant barrel, upswept tail cone"""
    if y < -12.5:  # nose
        t = (y - L_NOSE) / (-12.5 - L_NOSE); r = R * math.sqrt(max(0, 1 - (1 - t) ** 2.2)); z = -0.35 * (1 - t) ** 1.5
        return r, z, 1.0
    if y < 9.0: return R, 0.0, 1.0
    t = (y - 9.0) / (L_TAIL - 9.0)  # tail cone: shrinks, centreline rises, flattens
    return R * (1 - 0.86 * t ** 1.15), 0.95 * t ** 1.3, 1 - 0.25 * t
bm = bmesh.new(); rings = []
ys = [L_NOSE + 0.02] + [L_NOSE + (i / 30) ** 1.6 * 6.1 for i in range(1, 31)] + [-12.5 + i * 0.75 for i in range(1, 29)] + [9 + i * 0.5 for i in range(1, 21)]
for y in ys:
    r, zc, fl = profile(y); ring = []
    for k in range(SEG):
        a = k / SEG * 2 * math.pi; ring.append(bm.verts.new((r * math.sin(a), y, zc + r * fl * math.cos(a))))
    rings.append(ring)
for i in range(len(rings) - 1):
    for k in range(SEG):
        a, b = rings[i][k], rings[i][(k + 1) % SEG]; c, d = rings[i + 1][(k + 1) % SEG], rings[i + 1][k]
        f = bm.faces.new((a, d, c, b)); cy = (a.co.y + c.co.y) / 2; cz = (a.co.z + c.co.z + b.co.z + d.co.z) / 4 - profile(cy)[1]
        ang = (k + 0.5) / SEG * 2 * math.pi
        # cockpit windscreen band on the nose
        if -16.9 < cy < -15.2 and 0.25 < cz < 1.25 and abs(math.sin(ang)) < 0.8: f.material_index = 2
        elif cz < -R * 0.55: f.material_index = 1  # grey belly
tip = bm.verts.new((0, L_NOSE, profile(L_NOSE + 0.02)[1])); [bm.faces.new((tip, rings[0][(k + 1) % SEG], rings[0][k])) for k in range(SEG)]
end = bm.verts.new((0, L_TAIL + 0.15, profile(L_TAIL)[1])); [bm.faces.new((rings[-1][k], rings[-1][(k + 1) % SEG], end)) for k in range(SEG)]
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
new_obj('Fuselage', bm, [PAINT, BELLY, GLASS])

# cabin windows + doors: thin dark patches just proud of the skin
bm = bmesh.new()
def patch(y, z, side, w, h, m=0):
    r = R + 0.012; x = side * math.sqrt(max(0, r * r - z * z)); n = Vector((x, 0, z)).normalized(); t = Vector((0, 1, 0)); up = n.cross(t) * -side
    c = Vector((x, y, z)); A = t * (w / 2); B = (Vector((0, 0, 1)) - n * n.z).normalized() * (h / 2)
    vs = [bm.verts.new(c - A - B), bm.verts.new(c + A - B), bm.verts.new(c + A + B), bm.verts.new(c - A + B)]
    f = bm.faces.new(vs if side > 0 else vs[::-1]); f.material_index = m
for side in (-1, 1):
    for i in range(32):
        y = -10.6 + i * 0.53
        if abs(y - 0.6) < 0.5: continue  # over-wing exit gap
        patch(y, 0.42, side, 0.24, 0.34)
    for y in (-12.3, 8.3): patch(y, 0.05, side, 0.85, 1.9, 1)  # doors (outlined darker)
new_obj('Windows', bm, [GLASS, BELLY], smooth=False)

# ---------------------------------------------------------------- lifting surfaces: lofted airfoil sections
def airfoil(chord, thick, n=14):
    up, lo = [], []
    for i in range(n + 1):
        x = (1 - math.cos(i / n * math.pi)) / 2
        yt = 5 * thick * (0.2969 * math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4)
        up.append((x * chord, yt * chord)); lo.append((x * chord, -yt * chord))
    return up + lo[::-1][1:-1]  # closed loop
def loft(name, sections, material, vertical=False, cap=True):
    """sections: list of (origin Vector of leading edge, chord, thickness)"""
    bm = bmesh.new(); rings = []
    for (le, chord, th) in sections:
        pts = airfoil(chord, th); ring = []
        for (x, t) in pts:
            if vertical: ring.append(bm.verts.new((le.x + t, le.y + x, le.z)))
            else: ring.append(bm.verts.new((le.x, le.y + x, le.z + t)))
        rings.append(ring)
    n = len(rings[0])
    for i in range(len(rings) - 1):
        for k in range(n): bm.faces.new((rings[i][k], rings[i][(k + 1) % n], rings[i + 1][(k + 1) % n], rings[i + 1][k]))
    if cap:
        for r in (rings[0], rings[-1]): bm.faces.new(r)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm, [material])

sweep = math.radians(25); dih = math.radians(5.5)
for s in (-1, 1):
    secs = []
    for (span, chord, th) in ((0.0, 7.2, 0.15), (2.0, 6.4, 0.14), (6.0, 4.4, 0.12), (17.0, 1.6, 0.10)):
        secs.append((Vector((s * span, -2.8 + span * math.tan(sweep) + (7.2 - chord) * 0.2, -1.05 + span * math.tan(dih))), chord, th))
    if s < 0: secs = secs[::-1]
    loft('Wing' + ('L' if s < 0 else 'R'), secs, PAINT)
    # sharklet: rises from the tip
    tip = Vector((s * 17.0, -2.8 + 17 * math.tan(sweep) + 1.12, -1.05 + 17 * math.tan(dih)))
    loft('Sharklet' + str(s), [(tip, 1.6, 0.08), (tip + Vector((s * 0.35, 1.1, 2.3)), 0.6, 0.08)], VIOLET, vertical=True)
    # horizontal stabiliser
    hs = [(Vector((s * sp, 13.6 + sp * math.tan(math.radians(29)) + (3.8 - c) * 0.1, 0.55 + sp * 0.07)), c, 0.1) for sp, c in ((0, 3.8), (6.1, 1.5))]
    loft('Stab' + str(s), hs if s > 0 else hs[::-1], PAINT)
# vertical fin
fin = [(Vector((0, 12.6 + h * 0.62 + (5.8 - c) * 0.15, 1.5 + h)), c, 0.11) for h, c in ((0, 5.8), (2.0, 4.6), (6.3, 1.9))]
loft('Fin', fin, VIOLET, vertical=True)
# dorsal fairing: white root band so the livery reads as a painted tail
loft('FinRoot', [(Vector((0, 12.4, 1.2)), 6.2, 0.11), (Vector((0, 12.9, 2.0)), 5.6, 0.11)], PAINT, vertical=True)

# ---------------------------------------------------------------- engines: lathed nacelles + pylons
def lathe(name, prof, cx, cy, cz, mats_idx, materials, seg=32):
    bm = bmesh.new(); rings = []
    for (y, r) in prof:
        rings.append([bm.verts.new((cx + r * math.sin(k / seg * 2 * math.pi), cy + y, cz + r * math.cos(k / seg * 2 * math.pi))) for k in range(seg)])
    for i in range(len(rings) - 1):
        for k in range(seg):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k])); f.material_index = mats_idx[i]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm, materials)
for s in (-1, 1):
    ex, ey, ez = s * 5.75, -5.4, -2.05
    lathe('Nacelle' + str(s), [(0, 0.95), (-0.05, 1.05), (0.1, 1.12), (0.9, 1.1), (2.6, 0.98), (3.6, 0.78), (3.62, 0.6), (4.3, 0.3), (4.5, 0.05)], ex, ey, ez,
          [1, 0, 0, 0, 0, 2, 1, 1], [PAINT, METAL, DARK])
    lathe('Fan' + str(s), [(0.35, 0.0), (0.35, 0.93), (0.36, 0.0)], ex, ey, ez, [2, 2], [PAINT, METAL, DARK])
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=(0.3, 3.4, 0.62), verts=bm.verts); bmesh.ops.translate(bm, vec=(ex, ey + 2.4, ez + 1.02), verts=bm.verts)
    new_obj('Pylon' + str(s), bm, [PAINT], smooth=False)

# ---------------------------------------------------------------- landing gear (parked aircraft sit on it)
def wheel(x, y, z, r=0.56, w=0.36):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=r, radius2=r, depth=w)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__('mathutils').Matrix.Rotation(math.pi / 2, 3, 'Y')); bmesh.ops.translate(bm, vec=(x, y, z), verts=bm.verts)
    new_obj('Wheel', bm, [TYRE])
def strut(x, y, z0, z1, rad=0.12):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=rad, radius2=rad, depth=z1 - z0); bmesh.ops.translate(bm, vec=(x, y, (z0 + z1) / 2), verts=bm.verts)
    new_obj('Strut', bm, [GEAR])
GROUND = -3.4
strut(0, -14.6, GROUND + 0.4, -1.6, 0.1); wheel(-0.25, -14.6, GROUND + 0.4, 0.38, 0.25); wheel(0.25, -14.6, GROUND + 0.4, 0.38, 0.25)
for s in (-1, 1):
    strut(s * 3.8, 0.9, GROUND + 0.56, -1.1, 0.16); wheel(s * 3.55, 0.9, GROUND + 0.56); wheel(s * 4.05, 0.9, GROUND + 0.56)

# join per material into one object, export
for o in bpy.context.scene.objects: o.select_set(o.type == 'MESH')
bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join()
j = bpy.context.view_layer.objects.active; j.name = 'Airliner'
bpy.ops.object.shade_auto_smooth(angle=math.radians(40)) if hasattr(bpy.ops.object, 'shade_auto_smooth') else None
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True, export_normals=True, export_texcoords=False,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
tris = sum(len(p.vertices) - 2 for p in j.data.polygons)
print('EXPORTED', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB tris', tris)
