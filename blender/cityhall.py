# Talentopia City Hall (V4), modelled from the approved concept art: a glass rotunda with a white sign band, champagne wave,
# lit canopy, revolving door and glass dome, flanked by terraced curved wings with planters, hanging greenery, sweeping fins,
# violet banners, lit steps and purple flower beds.
# blender -b -P cityhall.py -- OUT.glb
# Convention: Z up, front faces -Y (south / +Z in three.js). Metres. Origin = rotunda centre at plaza level.
# Angles (th) are measured from the front: point(th, r) = (r sin th, -r cos th).
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index('--') + 1]
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
D = math.radians

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)
MATS = {}
def mat(name, color, metal=0.0, rough=0.5, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(color); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit: b.inputs['Emission Color'].default_value = srgb(emit); b.inputs['Emission Strength'].default_value = strength
    MATS[name] = m; return m
WHITE = mat('WhitePanel', '#f4f2ee', 0.05, 0.28)       # glossy white cladding
STONE = mat('PearlStone', '#ebe6de', 0.0, 0.5)         # podium, steps, planters
MULL = mat('Mullion', '#e7e3db', 0.4, 0.3)
GLASS = mat('glass_drum', '#9fb4c6', 0.2, 0.04)        # rotunda glass: see-through (three.js makes it transparent)
ROOMS = mat('glass_rooms', '#5a6f84', 0.9, 0.05)        # wing glass: lit offices behind (interior-mapped in three.js)
GOLD = mat('Champagne', '#d8b98a', 1.0, 0.25)
TEXT = mat('SignText', '#2b2f36', 0.6, 0.35)
GLOW = mat('glow_warm', '#fff1d6', 0.0, 0.5, '#ffe9c4', 4.0)
GLOWV = mat('glow_violet', '#a58cff', 0.0, 0.5, '#9a7dff', 5.0)
LEAF = mat('Planting', '#4c7a3a', 0.0, 0.85)
VINE = mat('Vines', '#5d8f45', 0.0, 0.85)
FLOW = mat('Flowers', '#8d5fd8', 0.0, 0.7)
FLOW2 = mat('FlowersLilac', '#c3a6f2', 0.0, 0.7)
SOIL = mat('Soil', '#3b2f27', 0.0, 1.0)
BANNER = mat('banner', '#5b3fc4', 0.0, 0.6)
DOOR = mat('DoorMetal', '#c9ccd1', 1.0, 0.25)

class G:
    """one bmesh per material (few draw calls); optional metre UVs"""
    def __init__(s): s.b = {}
    def bm(s, m):
        if m.name not in s.b:
            bm = bmesh.new(); s.b[m.name] = (m, bm, bm.loops.layers.uv.new('UVMap'))
        return s.b[m.name]
    def face(s, m, pts, uvs=None):
        _, bm, uv = s.bm(m); f = bm.faces.new([bm.verts.new(p) for p in pts])
        if uvs:
            for l, t in zip(f.loops, uvs): l[uv].uv = t
        return f
    def box(s, m, c, size, rz=0.0):
        _, bm, _ = s.bm(m); M = Matrix.Translation(c) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Diagonal((*size, 1))
        bmesh.ops.create_cube(bm, size=1.0, matrix=M)
    def cyl(s, m, c, r, h, seg=24, r2=None):
        _, bm, _ = s.bm(m); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=Matrix.Translation((c[0], c[1], c[2] + h / 2)))
    def ico(s, m, c, r, sub=1, sz=1.0):
        _, bm, _ = s.bm(m); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r, matrix=Matrix.Translation(c) @ Matrix.Diagonal((1, 1, sz, 1)))
g = G()

def P(th, r, z): return (r * math.sin(th), -r * math.cos(th), z)
def arcs(a0, a1, step=D(3)): n = max(1, int(abs(a1 - a0) / step + 0.5)); return [a0 + (a1 - a0) * i / n for i in range(n + 1)]
def band(m, r0, r1, z0, z1, a0, a1, step=D(3), caps=True, faces=('out', 'in', 'top', 'bot')):
    """annular sector solid"""
    A = arcs(a0, a1, step); full = abs(a1 - a0) >= 2 * math.pi - 1e-6
    for i in range(len(A) - 1):
        t0, t1 = A[i], A[i + 1]
        if 'out' in faces: g.face(m, [P(t0, r1, z0), P(t1, r1, z0), P(t1, r1, z1), P(t0, r1, z1)])
        if 'in' in faces and r0 > 0.01: g.face(m, [P(t1, r0, z0), P(t0, r0, z0), P(t0, r0, z1), P(t1, r0, z1)])
        if 'top' in faces: g.face(m, [P(t0, r0, z1), P(t0, r1, z1), P(t1, r1, z1), P(t1, r0, z1)] if r0 > 0.01 else [P(t0, r1, z1), P(t1, r1, z1), (0, 0, z1)])
        if 'bot' in faces: g.face(m, [P(t1, r0, z0), P(t1, r1, z0), P(t0, r1, z0), P(t0, r0, z0)] if r0 > 0.01 else [P(t1, r1, z0), P(t0, r1, z0), (0, 0, z0)])
    if caps and not full:
        g.face(m, [P(a0, r0, z0), P(a0, r1, z0), P(a0, r1, z1), P(a0, r0, z1)][::-1]); g.face(m, [P(a1, r0, z0), P(a1, r1, z0), P(a1, r1, z1), P(a1, r0, z1)])
def wall(m, r, z0, z1, a0, a1, step=D(3), uv=False, inward=False):
    """single surface on a cylinder; metre UVs (arc length, height) for interior-mapped glass"""
    A = arcs(a0, a1, step)
    for i in range(len(A) - 1):
        t0, t1 = A[i], A[i + 1]; pts = [P(t0, r, z0), P(t1, r, z0), P(t1, r, z1), P(t0, r, z1)]
        uvs = [(r * t0, z0), (r * t1, z0), (r * t1, z1), (r * t0, z1)] if uv else None
        if inward: pts, uvs = pts[::-1], (uvs[::-1] if uvs else None)
        g.face(m, pts, uvs)
def post(m, th, r, z0, z1, w=0.1, d=0.16): c = P(th, r, (z0 + z1) / 2); g.box(m, c, (w, d, z1 - z0), rz=th)
def tube(m, pts, rad=0.05, seg=8):
    _, bm, _ = g.bm(m); rings = []
    for i, p in enumerate(pts):
        p = Vector(p); t = (Vector(pts[min(i + 1, len(pts) - 1)]) - Vector(pts[max(i - 1, 0)])).normalized()
        a = t.cross(Vector((0, 0, 1))); a = a.normalized() if a.length > 1e-4 else Vector((1, 0, 0)); b = t.cross(a).normalized()
        rings.append([bm.verts.new(p + (a * math.cos(k / seg * 6.283) + b * math.sin(k / seg * 6.283)) * rad) for k in range(seg)])
    for i in range(len(rings) - 1):
        for k in range(seg): bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))

R0 = 12.2       # ground-floor glass radius (lobby is 24 m across)
FL = 0.6        # lobby floor above plaza
# ---------------------------------------------------------------- podium + lit steps
band(STONE, 0, R0 + 0.6, 0, FL, 0, 2 * math.pi, D(4))
for i, (top, ra, rb) in enumerate([(0.45, R0 + 0.6, R0 + 1.45), (0.30, R0 + 1.45, R0 + 2.3), (0.15, R0 + 2.3, R0 + 3.15)]):
    band(STONE, ra - 0.1, rb, 0, top, D(-48), D(48), D(3))
    band(GLOW, rb - 0.02, rb + 0.004, top - 0.07, top - 0.03, D(-47), D(47), D(3), caps=False, faces=('out',))
# ---------------------------------------------------------------- rotunda ground floor: glass, mullions, transom, columns, revolving door
DOORG = D(12.5)
wall(GLASS, R0, FL, 6.6, DOORG, 2 * math.pi - DOORG, D(3))
for t in arcs(DOORG, 2 * math.pi - DOORG, D(7.5)): post(MULL, t, R0 + 0.04, FL, 6.6)
band(MULL, R0 - 0.02, R0 + 0.1, 3.55, 3.68, DOORG, 2 * math.pi - DOORG, D(4))
for t in (D(-17), D(17), D(-41), D(41)): c = P(t, R0 + 0.55, FL); g.cyl(WHITE, c, 0.42, 6.0, 20)
# revolving door: glass drum, metal crown and base; the four wings (DoorMetal + glass) spin in three.js
dc = P(0, R0, FL)
_, bm, _ = g.bm(GLASS); bmesh.ops.create_cone(bm, cap_ends=False, segments=24, radius1=1.9, radius2=1.9, depth=2.9, matrix=Matrix.Translation((dc[0], dc[1], FL + 1.45)))
g.cyl(DOOR, (dc[0], dc[1], FL + 2.9), 2.0, 0.35, 24); g.cyl(DOOR, (dc[0], dc[1], FL), 2.0, 0.04, 24)
g.box(WHITE, P(0, R0 + 0.05, FL + 4.9), (5.6, 0.25, 3.4))   # panel above the door (behind the canopy)
# ---------------------------------------------------------------- mezzanine ring + glass balustrade (atrium open to the dome)
band(STONE, 7.6, R0, 6.6, 7.1, 0, 2 * math.pi, D(4))
band(GLOW, 7.58, 7.62, 6.55, 6.62, 0, 2 * math.pi, D(4), faces=('in', 'bot'))
wall(GLASS, 7.68, 7.1, 8.15, 0, 2 * math.pi, D(6), inward=False)
band(MULL, 7.62, 7.74, 8.15, 8.22, 0, 2 * math.pi, D(6))
# ---------------------------------------------------------------- sign band (front), drum base ring (rest), canopy
band(WHITE, R0, R0 + 0.8, 6.6, 9.8, D(-62), D(62), D(2))
band(WHITE, 11.0, R0 + 0.2, 6.6, 9.8, D(62), D(298), D(4))
band(WHITE, R0, R0 + 2.5, 6.25, 6.62, D(-58), D(58), D(2))
band(GLOW, R0 + 2.48, R0 + 2.52, 6.27, 6.36, D(-57), D(57), D(2), caps=False, faces=('out',))
band(GLOW, R0 + 1.25, R0 + 1.32, 6.23, 6.25, D(-56), D(56), D(2), caps=False, faces=('bot',))
band(GLOW, R0 + 0.79, R0 + 0.81, 9.62, 9.72, D(-61), D(61), D(2), caps=False, faces=('out',))   # light line on top of the band
# 3D lettering wrapped onto the band (Blender's built-in font)
def wrapped_text(s, size, zc, r, depth=0.07, spacing=1.08):
    cu = bpy.data.curves.new('t', 'FONT'); cu.body = s; cu.size = size; cu.extrude = depth / 2; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.space_character = spacing
    ob = bpy.data.objects.new('t', cu); bpy.context.scene.collection.objects.link(ob); bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get(); me = ob.evaluated_get(dg).to_mesh(); tmp = bmesh.new(); tmp.from_mesh(me)
    _, bm, _ = g.bm(TEXT); vm = {}
    for v in tmp.verts: x, y, z = v.co; th = x / r; rr = r + depth / 2 + z; vm[v] = bm.verts.new(P(th, rr, zc + y))
    for f in tmp.faces:
        try: bm.faces.new([vm[v] for v in f.verts])
        except ValueError: pass
    tmp.free(); ob.evaluated_get(dg).to_mesh_clear(); bpy.data.objects.remove(ob); bpy.data.curves.remove(cu)
wrapped_text('TALENTOPIA', 1.15, 8.55, R0 + 0.8)
wrapped_text('CITY HALL', 0.62, 7.35, R0 + 0.8, spacing=1.25)
# champagne wave above the lettering (two flowing ribbons rising over the band like the concept)
for k, (amp, ph, z) in enumerate([(0.42, 0.0, 10.15), (0.3, 0.9, 9.95)]):
    pts = []
    for i in range(61):
        u = i / 60; th = D(-26) + D(52) * u; env = math.sin(math.pi * u) ** 1.4
        pts.append(P(th, R0 + 0.55, z + amp * env * math.sin(u * math.pi * 2 + ph) + 0.25 * env))
    tube(GOLD, pts, 0.055 - k * 0.012)
# ---------------------------------------------------------------- upper drum: glass, mullion grid, cornice with light line, glass dome with ribs
RD = 11.0
wall(GLASS, RD, 9.8, 17.6, 0, 2 * math.pi, D(3))
for t in arcs(0, 2 * math.pi, D(9))[:-1]: post(MULL, t, RD + 0.05, 9.8, 17.6, 0.12, 0.18)
for z in (12.4, 15.0): band(MULL, RD - 0.02, RD + 0.12, z, z + 0.12, 0, 2 * math.pi, D(4))
band(WHITE, RD - 0.4, RD + 0.7, 17.6, 18.5, 0, 2 * math.pi, D(3))
band(GLOW, RD + 0.69, RD + 0.71, 17.95, 18.05, 0, 2 * math.pi, D(3), faces=('out',))
DOME_H = 3.0
_, bm, _ = g.bm(GLASS); rings = []
for j in range(9):
    phi = j / 8 * math.pi / 2; rr = (RD - 0.3) * math.cos(phi); z = 18.5 + DOME_H * math.sin(phi)
    rings.append([bm.verts.new(P(i / 48 * 2 * math.pi, max(rr, 0.01), z)) for i in range(48)])
for j in range(8):
    for i in range(48): bm.faces.new((rings[j][i], rings[j][(i + 1) % 48], rings[j + 1][(i + 1) % 48], rings[j + 1][i]))
for i in range(12):
    th = i / 12 * 2 * math.pi; tube(WHITE, [P(th, (RD - 0.28) * math.cos(j / 16 * math.pi / 2) + 0.02, 18.5 + DOME_H * math.sin(j / 16 * math.pi / 2) + 0.03) for j in range(17)], 0.09, 6)
g.cyl(WHITE, (0, 0, 18.5 + DOME_H - 0.05), 1.2, 0.3, 24)
# ---------------------------------------------------------------- white blades flanking the rotunda, with spires
for s in (-1, 1):
    th = s * D(66); c = P(th, R0 + 1.6, 7.75); g.box(WHITE, c, (1.1, 2.6, 15.5), rz=th)
    g.cyl(WHITE, P(th, R0 + 1.6, 15.5), 0.22, 4.5, 10, r2=0.03)
# ---------------------------------------------------------------- terraced wings (mirrored): glass faces the plaza, curving gently back,
# each floor steps back to a planted terrace with hanging greenery; white fins sweep down at the outer ends
XI, XO, YB = 12.4, 30.0, 9.0                     # inner end (at the blades), outer end, back face
def yf(x): return -5.2 + 0.0185 * (x - XI) ** 2  # front line of the ground floor (curves back toward the ends)
XS_ = [XI + (XO - XI) * i / 16 for i in range(17)]
levels = [(0.0, 4.4, 0.0), (4.9, 8.7, 1.5), (9.2, 12.6, 3.0)]    # (z0, z1, set-back of the glass)
slabs = [(4.4, 4.9, -0.4), (8.7, 9.2, 1.1), (12.6, 13.2, 2.6)]   # (z0, z1, set-back of the slab edge)
def strip_face(m, xs, y_of, z0, z1, s, uv=False):
    L = 0.0
    for i in range(len(xs) - 1):
        xa, xb = xs[i], xs[i + 1]; ya, yb = y_of(xa), y_of(xb); dl = math.hypot(xb - xa, yb - ya)
        pa, pb = (s * xa, ya), (s * xb, yb)
        pts = [(pa[0], pa[1], z0), (pb[0], pb[1], z0), (pb[0], pb[1], z1), (pa[0], pa[1], z1)]
        uvs = [(L, z0), (L + dl, z0), (L + dl, z1), (L, z1)]
        if s < 0: pts, uvs = pts[::-1], uvs[::-1]
        g.face(m, pts, uvs if uv else None); L += dl
def slab(m, xs, y_front, z0, z1, s):
    strip_face(m, xs, y_front, z0, z1, s)
    for i in range(len(xs) - 1):
        xa, xb = xs[i], xs[i + 1]; q = [(s * xa, y_front(xa)), (s * xb, y_front(xb)), (s * xb, YB), (s * xa, YB)]
        top = [(x, y, z1) for x, y in q]; bot = [(x, y, z0) for x, y in q][::-1]
        if s < 0: top, bot = top[::-1], bot[::-1]
        g.face(m, top); g.face(m, bot)
for s in (-1, 1):
    for (z0, z1, sb) in levels:
        strip_face(ROOMS, XS_, lambda x, sb=sb: yf(x) + sb, z0, z1, s, uv=True)
        for i in range(0, len(XS_), 2):                     # mullions every ~2.2 m
            x = XS_[i]; g.box(MULL, (s * x, yf(x) + sb - 0.05, (z0 + z1) / 2), (0.1, 0.14, z1 - z0))
    for (z0, z1, sb) in slabs:
        slab(WHITE, XS_, lambda x, sb=sb: yf(x) + sb, z0, z1, s)
        strip_face(GLOW, XS_, lambda x, sb=sb: yf(x) + sb - 0.012, (z0 + z1) / 2 - 0.03, (z0 + z1) / 2 + 0.03, s)
    # back wall and roof parapet
    g.box(WHITE, (s * (XI + XO) / 2, YB + 0.15, 6.6), (XO - XI, 0.3, 13.2))
    # terraces: planter troughs along the slab edges, shrubs and hanging vines
    for (zt, sb) in ((4.9, -0.4), (9.2, 1.1)):
        for i in range(len(XS_) - 1):
            xa, xb = XS_[i], XS_[i + 1]; xm = (xa + xb) / 2; ym = yf(xm) + sb + 0.45
            ang = math.atan2(yf(xb) - yf(xa), xb - xa) * s
            g.box(STONE, (s * xm, ym, zt + 0.28), (xb - xa + 0.02, 0.8, 0.55), rz=ang)
            k = (i * 7919) % 11 / 11
            g.ico(LEAF, (s * xm, ym, zt + 0.75 + 0.15 * k), 0.42 + 0.14 * k, 1, 0.8)
            g.ico(LEAF, (s * (xm + 0.5), ym + 0.1, zt + 0.7), 0.3, 1, 0.75)
            for vv in range(3):   # trailing foliage: soft clumps tapering down over the slab edge
                q = (((i * 3 + vv) * 104729) % 13) / 13; xv = xa + (xb - xa) * (0.15 + 0.35 * vv); yv = yf(xv) + sb - 0.12; n_ = 2 + int(q * 4)
                for c in range(n_):
                    r_ = 0.24 * (1 - c / (n_ + 1)) + 0.05; g.ico(VINE, (s * (xv + 0.06 * math.sin(c * 1.7 + q * 6)), yv - 0.04 * c, zt + 0.45 - 0.32 * c), r_, 1, 1.5)
    # sweeping fin at the outer end: broad white blade curving from the roof down and outward to the plaza
    outline = [(XO - 0.3, 13.2)] + [(XO + 3.2 * (1 - math.cos(u / 12 * math.pi / 2)), 13.2 * (1 - u / 12)) for u in range(13)] + [(XO - 0.3, 0.0)]
    y0, y1 = yf(XO) - 0.3, yf(XO) + 0.7
    _, bm, _ = g.bm(WHITE)
    fa = [bm.verts.new((s * x, y0, z)) for x, z in outline]; fb = [bm.verts.new((s * x, y1, z)) for x, z in outline]
    n = len(outline)
    f1 = bm.faces.new(fa if s < 0 else fa[::-1]); f2 = bm.faces.new(fb[::-1] if s < 0 else fb)
    for i in range(n):
        q = (fa[i], fa[(i + 1) % n], fb[(i + 1) % n], fb[i]); bm.faces.new(q if s > 0 else q[::-1])
# ---------------------------------------------------------------- violet banners on poles + lanterns
for s in (-1, 1):
    th = s * D(34); pc = P(th, R0 + 3.9, 0); g.cyl(DOOR, pc, 0.07, 10.2, 10)
    arm = P(th, R0 + 3.9, 9.9); g.box(DOOR, arm, (2.5, 0.06, 0.06), rz=th)
    tx = Vector((math.cos(th), math.sin(th), 0)); c = Vector(P(th, R0 + 3.95, 0))
    pts = [c - tx * 1.15 + Vector((0, 0, 3.0)), c + tx * 1.15 + Vector((0, 0, 3.0)), c + tx * 1.15 + Vector((0, 0, 9.8)), c - tx * 1.15 + Vector((0, 0, 9.8))]
    g.face(BANNER, pts[::-1] if s < 0 else pts, [(0, 0), (1, 0), (1, 1), (0, 1)][::-1] if s < 0 else [(0, 0), (1, 0), (1, 1), (0, 1)])
    for r in (R0 + 0.9, R0 + 3.6):
        lc = P(s * D(50), r, 0); g.box(STONE, (lc[0], lc[1], 0.45), (0.38, 0.38, 0.9)); g.box(GLOW, (lc[0], lc[1], 0.98), (0.3, 0.3, 0.16))
# ---------------------------------------------------------------- curved flower beds in front of the wings (replacing the north lawns)
for s in (-1, 1):
    a0, a1 = (D(34), D(60)) if s > 0 else (D(-60), D(-34))
    band(STONE, 17.0, 20.0, 0, 0.5, a0, a1, D(2.5))
    band(GLOW, 20.0, 20.012, 0.08, 0.14, a0, a1, D(2.5), caps=False, faces=('out',))
    band(SOIL, 17.15, 19.85, 0.5, 0.52, a0, a1, D(2.5), caps=False, faces=('top',))
    i = 0
    for t in arcs(a0 + D(1.5), a1 - D(1.5), D(1.6)):
        for r in (17.5, 18.2, 18.9, 19.5):
            i += 1; k = (i * 2654435761 % 1000) / 1000
            if k < 0.22: g.ico(LEAF, P(t + D(0.5) * k, r, 0.75), 0.42, 1, 0.75)
            else:
                for j in range(3):
                    q = ((i * 31 + j * 17) % 100) / 100
                    g.ico(FLOW if q < 0.6 else FLOW2, P(t + D(0.45) * (q - 0.5), r + 0.3 * (q - 0.5), 0.62 + 0.1 * j + 0.08 * q), 0.13 + 0.05 * q, 0, 1.3)
# ---------------------------------------------------------------- build: one object, one primitive per material
objs = []
for name, (m, bm, _) in g.b.items():
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    me = bpy.data.meshes.new('cityhall_' + name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    ob = bpy.data.objects.new('cityhall_' + name, me); bpy.context.scene.collection.objects.link(ob); objs.append(ob)
    smooth = name in ('Planting', 'Vines', 'Flowers', 'FlowersLilac', 'Champagne')
    for p in me.polygons: p.use_smooth = smooth
for o in bpy.context.scene.objects: o.select_set(o in objs)
bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); j = bpy.context.view_layer.objects.active; j.name = 'CityHall'
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_normals=True, export_texcoords=True,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
j.data.calc_loop_triangles(); print('EXPORTED', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB tris', len(j.data.loop_triangles))
