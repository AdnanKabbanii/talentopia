# Talentopia V4: the "Signature" outfit from the approved character sheet, modelled on the MPFB avatar body so it is skinned
# to the same rig and follows every body-shape morph (masc / fem / heavy / slim / muscular).
#   cropped structured jacket with a high stand collar, rolled hem and cuffs, glowing light piping (chest panels, shoulder
#   seams down the sleeves, back yoke, hem, cuffs, centre zip); high-waisted wide-leg cargo trousers with patch pockets,
#   a belt with a metal buckle and a long hanging strap.
# blender -b asset-src/avatar_base.blend -P blender/signature_outfit.py -- assets/avatar/parts/outfit_signature01.glb
import bpy, bmesh, math, sys, os
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree

OUT = sys.argv[sys.argv.index('--') + 1]
human = bpy.data.objects['Human']; rig = bpy.data.objects['Human.rig']
KEEP = {'Basis', 'masc', 'fem', 'heavy', 'slim', 'muscular'}
BONE = {b.name: (rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local) for b in rig.data.bones}
GN = {g.index: g.name for g in human.vertex_groups}
def sstep(a, b, x): t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)

def load_body():
    bm = bmesh.new(); bm.from_mesh(human.data)
    for lay in list(bm.verts.layers.shape.keys()):
        if lay not in KEEP: bm.verts.layers.shape.remove(bm.verts.layers.shape[lay])
    bm.verts.ensure_lookup_table(); return bm
def layers(bm): return list(bm.verts.layers.shape.values())
def move(bm, v, d):
    v.co += d
    for L in layers(bm): v[L] = v[L] + d
BONES = {b.name for b in rig.data.bones}
def dominant(v, dl):  # strongest BONE influence (ignores helper groups such as 'body')
    w = {g: x for g, x in v[dl].items() if GN.get(g, '') in BONES}; best = max(w.items(), key=lambda kv: kv[1]) if w else (None, 0); return GN.get(best[0], ''), w
HAND = ('hand_', 'thumb', 'index', 'middle', 'ring', 'pinky')
def cls(v, dl):
    n, w = dominant(v, dl)
    if any(k in n for k in HAND): return 'hand'
    if 'upperarm' in n or 'lowerarm' in n: return 'arm'
    if 'head' in n or 'neck' in n or n.startswith('eye') or 'jaw' in n: return 'head'
    if any(k in n for k in ('thigh', 'calf', 'foot', 'ball')): return 'leg'
    return 'torso'

HEM_Z = 1.052
def neck_cut(v): return 1.392 + 0.4 * max(0.0, v.co.y + 0.02)
def jacket_sel(v, dl):
    c = cls(v, dl)
    if c == 'hand' or c == 'head' or c == 'leg': return False
    if v.co.z > neck_cut(v): return False
    if c == 'arm': return True
    return v.co.z >= HEM_Z
def trouser_sel(v, dl):
    c = cls(v, dl)
    if c in ('hand', 'arm', 'head'): return False
    return 0.03 < v.co.z < 1.078

def cut(bm, keep):
    dl = bm.verts.layers.deform.active
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v, dl)], context='VERTS')
    # drop tiny islands (stray bits from the selection)
    bm.verts.ensure_lookup_table(); seen = set(); comps = []
    for v in bm.verts:
        if v in seen: continue
        st = [v]; seen.add(v); comp = []
        while st:
            x = st.pop(); comp.append(x)
            for e in x.link_edges:
                y = e.other_vert(x)
                if y not in seen: seen.add(y); st.append(y)
        comps.append(comp)
    for comp in comps:
        if len(comp) < 40: bmesh.ops.delete(bm, geom=comp, context='VERTS')
    bm.normal_update()

def smooth(bm, it, k, pin=lambda v: False):
    for _ in range(it):
        new = {}
        for v in bm.verts:
            if v.is_boundary or pin(v) or not v.link_edges: continue
            avg = sum((e.other_vert(v).co for e in v.link_edges), Vector()) / len(v.link_edges); new[v] = (avg - v.co) * k
        for v, d in new.items(): move(bm, v, d)
    bm.normal_update()

def extrude_ring(bm, edges, fn):
    """extrude boundary edges; fn(vertex) -> displacement for the new copy"""
    r = bmesh.ops.extrude_edge_only(bm, edges=edges); nv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
    ne = [g for g in r['geom'] if isinstance(g, bmesh.types.BMEdge) and g.is_boundary]
    for v in nv: move(bm, v, fn(v))
    return nv, ne

def bind_like(bm_src, kd, src_verts, bm, new_verts):
    """copy deform weights and shape deltas from the nearest source vertex (same bmesh)"""
    dl = bm.verts.layers.deform.active; Ls = layers(bm); basis = bm.verts.layers.shape.get('Basis')
    for v in new_verts:
        _, i, _ = kd.find(v.co); s = src_verts[i]
        v[dl].clear()
        for g, w in s[dl].items(): v[dl][g] = w
        for L in Ls: v[L] = v.co + (s[L] - s.co)

def tube(bm, pts, rad, mat, seg=6):
    """a thin tube along pts (already on the surface); returns its verts"""
    rings = []; out = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        a = t.cross(Vector((0, 0, 1))); a = a.normalized() if a.length > 1e-3 else t.cross(Vector((1, 0, 0))).normalized(); b = t.cross(a).normalized()
        ring = [bm.verts.new(p + (a * math.cos(k / seg * 6.2832) + b * math.sin(k / seg * 6.2832)) * rad) for k in range(seg)]; rings.append(ring); out += ring
    for i in range(len(rings) - 1):
        for k in range(seg):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k])); f.material_index = mat; f.smooth = True
    return out

def ray_path(bvh, samples, lift=0.0035):
    """samples: list of (origin, direction); returns surface points lifted along the hit normal"""
    pts = []
    for o, d in samples:
        loc, n, _, _ = bvh.ray_cast(Vector(o), Vector(d).normalized(), 3.0)
        if loc is not None: pts.append(loc + n * lift)
    return pts
def resample(pts, step=0.008):
    if len(pts) < 2: return pts
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        L = (b - a).length; n = max(1, int(L / step))
        for i in range(1, n + 1): out.append(a.lerp(b, i / n))
    return out

# ================================================================ JACKET
J = load_body(); cut(J, jacket_sel)
dlJ = J.verts.layers.deform.active
# structured offset: a little fuller at the shoulders and upper arms, close at the waist
for v in J.verts:
    c = cls(v, dlJ); z, ax = v.co.z, abs(v.co.x)
    d = 0.014 + 0.006 * sstep(1.27, 1.34, z) * sstep(0.09, 0.16, ax) + (0.002 if c == 'arm' else 0.0)
    # structured front: fill the cleavage and soften the bust so the jacket reads as tailored, not skin-tight
    if c != 'arm' and v.co.y < -0.02 and 1.12 < z < 1.32: d += 0.012 * (1 - sstep(0.0, 0.11, ax)) * sstep(1.12, 1.2, z) * (1 - sstep(1.27, 1.32, z))
    move(J, v, v.normal * d)
smooth(J, 5, 0.45)
torso_front = lambda v: cls(v, dlJ) == 'arm' or v.co.y > 0.02 or not (1.1 < v.co.z < 1.34)
torso_front = lambda v: cls(v, dlJ) == 'arm' or v.co.y > 0.03 or not (1.08 < v.co.z < 1.36)
smooth(J, 40, 0.5, pin=torso_front)       # tailoring across the chest: a smooth structured front, no body detail
# collision pass: smoothing pulls convex areas inward; keep the cloth at least 8 mm outside the skin everywhere
BODY = load_body(); BODY.normal_update()
smooth(BODY, 30, 0.5, pin=lambda v: not (v.co.y < 0.03 and 1.08 < v.co.z < 1.36 and abs(v.co.x) < 0.16))   # an envelope without fine body detail
BODY.normal_update(); bvhB = BVHTree.FromBMesh(BODY)
def clearance(bm, gap):
    for v in bm.verts:
        loc, n, _, dist = bvhB.find_nearest(v.co)
        if loc is None: continue
        dd = (v.co - loc).dot(n)
        if dd < gap: move(bm, v, n * (gap - dd))
for _ in range(2): clearance(J, 0.008); smooth(J, 2, 0.3, pin=torso_front)
clearance(J, 0.007)
# body-shape morphs carry the body's fine detail too: smooth each morph's offsets across the chest the same way
def smooth_deltas(bm, it, k, pin):
    for L in layers(bm):
        if L.name == 'Basis': continue
        for _ in range(it):
            nd = {}
            for v in bm.verts:
                if v.is_boundary or pin(v) or not v.link_edges: continue
                avg = sum(((e.other_vert(v)[L] - e.other_vert(v).co) for e in v.link_edges), Vector()) / len(v.link_edges)
                nd[v] = (v[L] - v.co).lerp(avg, k)
            for v, d in nd.items(): v[L] = v.co + d
smooth_deltas(J, 40, 0.5, torso_front)
# clean, straight edges: the neckline, hem and cuffs were cut along the body's faces, so flatten them onto smooth curves
J.normal_update()
for v in J.verts:
    if not v.is_boundary: continue
    if v.co.z > 1.3 and abs(v.co.x) < 0.12: move(J, v, Vector((0, 0, neck_cut(v) + 0.012 - v.co.z)))
    elif v.co.z < HEM_Z + 0.04 and abs(v.co.x) < 0.2: move(J, v, Vector((0, 0, HEM_Z + 0.004 - v.co.z)))
for side in ('l', 'r'):
    a, b = BONE['lowerarm_' + side]; ax_ = (b - a).normalized(); cuffv = [v for v in J.verts if v.is_boundary and abs(v.co.x) > 0.25 and (v.co.x > 0) == (side == 'l')]
    if cuffv:
        tm = sum((v.co - a).dot(ax_) for v in cuffv) / len(cuffv)
        for v in cuffv: move(J, v, ax_ * (tm - (v.co - a).dot(ax_)))
J.normal_update()
bnd = [e for e in J.edges if e.is_boundary]
neck = [e for e in bnd if (e.verts[0].co.z + e.verts[1].co.z) / 2 > 1.33 and abs((e.verts[0].co.x + e.verts[1].co.x) / 2) < 0.12]
hem = [e for e in bnd if (e.verts[0].co.z + e.verts[1].co.z) / 2 < HEM_Z + 0.03 and abs((e.verts[0].co.x + e.verts[1].co.x) / 2) < 0.2]
cuffs = [e for e in bnd if e not in neck and e not in hem]
NECK_C = Vector((0.0, -0.012, 0.0))
def radial(v, c=NECK_C): d = Vector((v.co.x - c.x, v.co.y - c.y, 0)); return d.normalized() if d.length > 1e-6 else Vector((0, -1, 0))
# high stand collar: rises ~6 cm, flaring slightly, then turns back down inside for thickness
nv, ne = extrude_ring(J, neck, lambda v: Vector((0, 0, 0.034)) + radial(v) * 0.004)
nv, ne = extrude_ring(J, ne, lambda v: Vector((0, 0, 0.026)) + radial(v) * 0.003)
nv, ne = extrude_ring(J, ne, lambda v: radial(v) * -0.007)
nv, ne = extrude_ring(J, ne, lambda v: Vector((0, 0, -0.05)))
# rolled hem and cuffs (visible thickness)
nv, ne = extrude_ring(J, hem, lambda v: Vector((0, 0, -0.012)))
nv, ne = extrude_ring(J, ne, lambda v: radial(v, Vector((0, 0.0, 0))) * -0.01)
for side in (1, -1):
    cu = [e for e in cuffs if (e.verts[0].co.x + e.verts[1].co.x) * side > 0]
    if not cu: continue
    a, b = BONE['lowerarm_' + ('l' if side > 0 else 'r')]; ax = (b - a).normalized()
    def inward(v, a=a, ax=ax): p = a + ax * (v.co - a).dot(ax); return (p - v.co).normalized() * 0.01
    nv, ne = extrude_ring(J, cu, lambda v, ax=ax: ax * 0.008)
    extrude_ring(J, ne, inward)
J.normal_update()
for f in J.faces: f.material_index = 0; f.smooth = True
# ---- light piping on the jacket surface
J.verts.ensure_lookup_table(); srcJ = list(J.verts); kdJ = kdtree.KDTree(len(srcJ))
for i, v in enumerate(srcJ): kdJ.insert(v.co, i)
kdJ.balance(); bvhJ = BVHTree.FromBMesh(J)
paths = []
FRONT, BACK = (0, 1, 0), (0, -1, 0)
for s in (1, -1):
    # chest panel line (curving from the collar to the waist)
    pl = [(0.072, 1.375), (0.1, 1.31), (0.116, 1.24), (0.1, 1.16), (0.075, HEM_Z + 0.012)]
    paths.append(resample(ray_path(bvhJ, [((s * p.x, -1, p.z), FRONT) for p in resample([Vector((x, 0, z)) for x, z in pl], 0.01)])))
    # shoulder seam over the top, then down the outer sleeve
    top = ray_path(bvhJ, [((s * x, -0.015, 2.0), (0, 0, -1)) for x in [0.08 + 0.01 * i for i in range(10)]])
    a, b = BONE['upperarm_' + ('l' if s > 0 else 'r')]; d = (b - a).normalized(); o = d.cross(Vector((0, 1, 0))) * s; o = o.normalized()
    sl = ray_path(bvhJ, [((a + d * ((b - a).length * t)) + o * 0.3, -o) for t in [0.08 + 0.04 * i for i in range(23)]])
    a2, b2 = BONE['lowerarm_' + ('l' if s > 0 else 'r')]; d2 = (b2 - a2).normalized(); o2 = d2.cross(Vector((0, 1, 0))) * s; o2 = o2.normalized()
    sl2 = ray_path(bvhJ, [((a2 + d2 * ((b2 - a2).length * t)) + o2 * 0.3, -o2) for t in [0.05 + 0.05 * i for i in range(16)]])
    paths.append(resample(top + sl + sl2))
    # cuff ring
    u = d2.cross(Vector((0, 0, 1))).normalized(); w = d2.cross(u).normalized(); c0 = a2 + d2 * ((b2 - a2).length * 0.86)
    ring = ray_path(bvhJ, [(c0 + (u * math.cos(k / 24 * 6.2832) + w * math.sin(k / 24 * 6.2832)) * 0.15, -(u * math.cos(k / 24 * 6.2832) + w * math.sin(k / 24 * 6.2832))) for k in range(25)])
    paths.append(resample(ring))
# back yoke arc
paths.append(resample(ray_path(bvhJ, [((x, 1, 1.302 - 0.035 * (1 - (x / 0.16) ** 2)), BACK) for x in [-0.16 + 0.01 * i for i in range(33)]])))
# hem band (all around), centre zip
hz = HEM_Z + 0.016
paths.append(resample(ray_path(bvhJ, [((0.26 * math.sin(k / 48 * 6.2832), 0.015 - 0.26 * math.cos(k / 48 * 6.2832), hz), (-math.sin(k / 48 * 6.2832), math.cos(k / 48 * 6.2832), 0)) for k in range(49)])))
paths.append(resample(ray_path(bvhJ, [((0.0, -1, z), FRONT) for z in [1.395 - 0.01 * i for i in range(int((1.395 - HEM_Z) / 0.01))]], 0.003)))
pipe_verts = []
for p in paths:
    if len(p) >= 2: pipe_verts += tube(J, p, 0.0026, 1)
bind_like(J, kdJ, srcJ, J, pipe_verts)

# ================================================================ TROUSERS
T = load_body(); cut(T, trouser_sel)
hipL, ankL = BONE['thigh_l'][0], BONE['calf_l'][1]
for v in T.verts:
    z = v.co.z; d = v.normal * (0.0095 + 0.012 * sstep(0.7, 0.86, z) * (1 - sstep(0.98, 1.05, z)))   # roomier seat and hips
    flare = sstep(0.86, 0.66, z)                                   # 0 at the hips -> 1 below the thigh
    if flare > 0:
        s = 1 if v.co.x >= 0 else -1; a = Vector((s * hipL.x, hipL.y, hipL.z)); b = Vector((s * ankL.x, ankL.y, ankL.z))
        ax = (b - a).normalized(); p = a + ax * (v.co - a).dot(ax); r = v.co - p; r.z = 0
        r = r.normalized() if r.length > 1e-5 else Vector((s, 0, 0))
        depth = sstep(0.8, 0.05, z)                                  # wide leg: widening all the way to the hem
        d = d + r * flare * (0.006 + 0.07 * depth ** 1.3)
    move(T, v, d)
smooth(T, 3, 0.4)
seat = lambda v: not (0.66 < v.co.z < 1.04)
smooth(T, 25, 0.5, pin=seat)            # loose cut over the hips and seat: no body contours
smooth_deltas(T, 25, 0.5, seat)
clearance(T, 0.008)
for v in T.verts:                        # straight hem just above the floor
    if v.is_boundary and v.co.z < 0.2: move(T, v, Vector((0, 0, 0.018 - v.co.z)))
T.normal_update()
for f in T.faces: f.material_index = 2; f.smooth = True
T.verts.ensure_lookup_table(); srcT = list(T.verts); kdT = kdtree.KDTree(len(srcT))
for i, v in enumerate(srcT): kdT.insert(v.co, i)
kdT.balance(); bvhT = BVHTree.FromBMesh(T)
new_det = []
# belt: a band duplicated from the waist faces, standing proud
band = [f for f in T.faces if 1.004 < f.calc_center_median().z < 1.05]
dup = bmesh.ops.duplicate(T, geom=band); bverts = [g for g in dup['geom'] if isinstance(g, bmesh.types.BMVert)]
for g in dup['geom']:
    if isinstance(g, bmesh.types.BMFace): g.material_index = 3
T.normal_update()
for v in bverts: move(T, v, v.normal * 0.0055)
# buckle at the front, long strap hanging down the left front
def surf(o, d):
    loc, n, _, _ = bvhT.ray_cast(Vector(o), Vector(d).normalized(), 3.0); return (loc, n) if loc else (None, None)
def plate(c, n, w, h, t, mat, up=Vector((0, 0, 1))):
    xv = up.cross(n).normalized(); yv = n.cross(xv).normalized(); vs = []
    for dz in (0, t):
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)): vs.append(T.verts.new(c + n * (0.006 + dz) + xv * sx * w / 2 + yv * sy * h / 2))
    fs = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    for q in fs: f = T.faces.new([vs[i] for i in q]); f.material_index = mat
    return vs
loc, n = surf((0.0, -1, 1.027), FRONT)
if loc: new_det += plate(loc, n, 0.05, 0.034, 0.006, 4); new_det += plate(loc, n, 0.03, 0.016, 0.009, 4)
strap = []
for i in range(18):
    z = 1.02 - i * 0.016; l, nn = surf((0.045, -1, z), FRONT)
    if l: strap.append((l, nn))
if len(strap) > 2:
    prev = None
    for l, nn in strap:
        side = Vector((1, 0, 0)); a = T.verts.new(l + nn * 0.012 - side * 0.016); b = T.verts.new(l + nn * 0.012 + side * 0.016); new_det += [a, b]
        if prev: f = T.faces.new((prev[0], prev[1], b, a)); f.material_index = 3
        prev = (a, b)
    tip_l, tip_n = strap[-1]; new_det += plate(tip_l, tip_n, 0.034, 0.02, 0.004, 4)
# cargo patch pockets on the outer thighs, with flaps
for s in (1, -1):
    grid = []
    for iz in range(5):
        row = []
        for iy in range(5):
            z = 0.52 + 0.035 * iz; y = -0.07 + 0.033 * iy; l, nn = surf((s * 0.6, y, z), (-s, 0, 0))
            row.append((l, nn) if l else None)
        grid.append(row)
    if any(c is None for r in grid for c in r): continue
    def V(c, off): return T.verts.new(c[0] + c[1] * off)
    front = [[V(c, 0.02) for c in r] for r in grid]; new_det += [v for r in front for v in r]
    for iz in range(4):
        for iy in range(4):
            q = (front[iz][iy], front[iz][iy + 1], front[iz + 1][iy + 1], front[iz + 1][iy]); f = T.faces.new(q if s < 0 else q[::-1]); f.material_index = 2
    back = [[V(c, 0.004) for c in r] for r in grid]; new_det += [v for r in back for v in r]
    edge = [(0, i) for i in range(5)] + [(i, 4) for i in range(1, 5)] + [(4, i) for i in range(3, -1, -1)] + [(i, 0) for i in range(3, 0, -1)]
    for (a1, b1), (a2, b2) in zip(edge, edge[1:] + edge[:1]):
        q = (back[a1][b1], back[a2][b2], front[a2][b2], front[a1][b1]); f = T.faces.new(q if s > 0 else q[::-1]); f.material_index = 2
    flap = [[V(grid[4][iy], 0.027), V(grid[4][iy], 0.012)] for iy in range(5)]
    for iy in range(5):
        l, nn = grid[4][iy]; lo = T.verts.new(l + nn * 0.027 - Vector((0, 0, 0.045))); flap[iy].append(lo); new_det.append(lo); new_det += flap[iy][:2]
    for iy in range(4):
        for a, b in ((0, 2),):
            q = (flap[iy][b], flap[iy + 1][b], flap[iy + 1][a], flap[iy][a]); f = T.faces.new(q if s > 0 else q[::-1]); f.material_index = 5
bind_like(T, kdT, srcT, T, new_det + bverts)
for f in T.faces: f.smooth = True

# ================================================================ build objects, materials, export
def matl(name, col, rough, metal=0.0, emit=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = col; b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = emit; b.inputs['Emission Strength'].default_value = 3.0
    return m
MATS = [matl('SigJacket', (0.66, 0.6, 0.86, 1), 0.35, 0.1), matl('SigLight', (0.95, 0.93, 1, 1), 0.3, 0, (0.95, 0.93, 1, 1)), matl('SigTrousers', (0.86, 0.84, 0.88, 1), 0.5),
        matl('SigBelt', (0.9, 0.88, 0.84, 1), 0.45), matl('SigMetal', (0.8, 0.82, 0.86, 1), 0.2, 1.0), matl('SigFlap', (0.8, 0.78, 0.82, 1), 0.5)]
objs = []
for name, b in (('jacket', J), ('trousers', T)):
    b.verts.index_update(); keys = {L.name if hasattr(L, 'name') else nm: [v[L].copy() for v in b.verts] for nm, L in b.verts.layers.shape.items()}
    keys = {nm: [v[L].copy() for v in b.verts] for nm, L in b.verts.layers.shape.items()}
    m_ = bpy.data.meshes.new('sig_' + name); b.to_mesh(m_); b.free()
    for m in MATS: m_.materials.append(m)
    o_ = bpy.data.objects.new('sig_' + name, m_); bpy.context.scene.collection.objects.link(o_)
    for g in human.vertex_groups: o_.vertex_groups.new(name=g.name)
    o_.shape_key_add(name='Basis', from_mix=False)
    for nm in ('masc', 'fem', 'heavy', 'slim', 'muscular'):
        if nm not in keys: continue
        k = o_.shape_key_add(name=nm, from_mix=False); co = keys[nm]
        for i, d in enumerate(k.data): d.co = co[i]
    objs.append(o_)
for o in bpy.data.objects: o.select_set(False)
for o_ in objs: o_.select_set(True)
bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); ob = bpy.context.view_layer.objects.active; ob.name = 'outfit__signature01'; me = ob.data
mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = rig; ob.parent = rig
for p in me.polygons: p.use_smooth = True
print('SHAPEKEYS', [k.name for k in me.shape_keys.key_blocks] if me.shape_keys else None, 'verts', len(me.vertices), 'tris', sum(len(p.vertices) - 2 for p in me.polygons))
for o in bpy.data.objects: o.select_set(False)
rig.select_set(True); ob.select_set(True); bpy.context.view_layer.objects.active = ob
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=False, export_skins=True, export_animations=False,
                          export_morph=True, export_morph_normal=False, export_try_sparse_sk=True, export_yup=True)
print('EXPORTED', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB')
