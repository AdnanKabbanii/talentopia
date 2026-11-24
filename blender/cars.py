# Talentopia V4: realistic city cars (sedan, NYC taxi, SUV, delivery van), modelled procedurally in Blender.
# blender -b -P cars.py -- OUT.glb
# Blender Z up, nose points -Y (becomes +Z in three.js). Origin = ground, centre of the car. Metres.
# Each car is one object with four materials:
#   Paint  - body colour (tinted per car in three.js)
#   Detail - glass, black trim, chrome, lamps, plates: vertex colours; alpha encodes roughness/metalness
#            (a < 0.5: roughness = 2a, dielectric; a >= 0.5: roughness = 2(a - 0.5), metal)
#   Tail   - rear lamps (glow when braking)
#   Wheel  - tyres, rims, brake discs: vertex colours, same alpha encoding (spun in a shader)
# A "_lo" copy of each car (no subdivision, coarser wheels) is exported for distant traffic.
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

OUT = sys.argv[sys.argv.index('--') + 1]
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
def enc(hexc, rough, metal=False):
    a = 0.5 + rough * 0.5 if metal else rough * 0.5
    return tuple(lin(hexc) + [min(0.999, a)])
C = {
    'glass': enc('#0a0e13', 0.04), 'trim': enc('#141518', 0.62), 'grille': enc('#0c0d0f', 0.45),
    'chrome': enc('#d4d8dc', 0.12, True), 'lamp': enc('#eef3f8', 0.06, True), 'lampIn': enc('#9aa3ad', 0.2, True),
    'plate': enc('#f1f0ea', 0.5), 'plateNY': enc('#f1e7cc', 0.5), 'tyre': enc('#17171a', 0.88), 'wall': enc('#222226', 0.8),
    'rim': enc('#c3c8ce', 0.28, True), 'rimDark': enc('#3a3d42', 0.35, True), 'disc': enc('#5b5e62', 0.45, True),
    'caliper': enc('#8a2a2a', 0.4), 'sign': enc('#fbf4cf', 0.45), 'amber': enc('#ff9a1f', 0.2), 'white': (1, 1, 1, 1),
}

def mat(name, rgb, rough, metal=0.0, vcol=False):
    m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree; b = t.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = tuple(rgb) + (1,); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if vcol:
        n = t.nodes.new('ShaderNodeVertexColor'); n.layer_name = 'Col'; t.links.new(n.outputs['Color'], b.inputs['Base Color'])
    return m
PAINT = mat('Paint', lin('#c9ccd1'), 0.3, 0.5); DETAIL = mat('Detail', (1, 1, 1), 0.5, vcol=True)
TAIL = mat('Tail', lin('#b0121a'), 0.25); WHEEL = mat('Wheel', (1, 1, 1), 0.6, vcol=True)
MI = {'paint': 0, 'detail': 1, 'tail': 2, 'wheel': 3}

def orient(f, want):
    f.normal_update()
    if f.normal.dot(want) < 0: f.normal_flip()
def lerp(a, b, t): return a + (b - a) * t
def sstep(a, b, x): t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def table(tb, u):
    if u <= tb[0][0]: return tb[0][1]
    for (u0, v0), (u1, v1) in zip(tb, tb[1:]):
        if u <= u1: t = (u - u0) / (u1 - u0); t = t * t * (3 - 2 * t); return lerp(v0, v1, t)
    return tb[-1][1]

class Builder:
    """collects faces with material + colour, writes one mesh with a 'Col' corner colour attribute"""
    def __init__(s): s.bm = bmesh.new(); s.col = s.bm.loops.layers.float_color.new('Col')
    def face(s, vs, m='detail', c='white'):
        f = s.bm.faces.new([s.bm.verts.new(v) if not isinstance(v, bmesh.types.BMVert) else v for v in vs]); f.material_index = MI[m]
        for l in f.loops: l[s.col] = C[c]
        return f
    def obj(s, name):
        me = bpy.data.meshes.new(name); s.bm.to_mesh(me); s.bm.free()
        for m in (PAINT, DETAIL, TAIL, WHEEL): me.materials.append(m)
        ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
        for p in me.polygons: p.use_smooth = True
        return ob

# ---------------------------------------------------------------- car specs (u = 0 front .. 1 rear)
SPECS = {
    'sedan': dict(L=4.75, hw=0.915, rw=0.70, zb=0.30, r=0.335, ax=(0.195, 0.79), rn=(0.42, 0.36),
                  zt=[(0, 0.70), (0.05, 0.80), (0.14, 0.88), (0.31, 0.97), (0.47, 1.41), (0.66, 1.44), (0.81, 1.10), (0.94, 1.05), (1, 0.98)],
                  zbelt=[(0, 0.70), (0.31, 0.95), (0.81, 1.03), (1, 0.98)],
                  side=(0.335, 0.785), pillars=[0.555], wind=(0.31, 0.47), rear=(0.66, 0.81),
                  head=(0.70, 0.62, 0.78), tail=(0.86, 1.0)),
    'suv': dict(L=4.62, hw=0.95, rw=0.79, zb=0.40, r=0.37, ax=(0.175, 0.80), rn=(0.30, 0.20), clad=True,
                zt=[(0, 1.0), (0.05, 1.12), (0.22, 1.2), (0.38, 1.66), (0.52, 1.71), (0.78, 1.66), (0.92, 1.56), (1, 1.44)],
                zbelt=[(0, 1.0), (0.22, 1.17), (0.6, 1.22), (0.88, 1.32), (1, 1.28)],
                side=(0.375, 0.875), pillars=[0.585, 0.77], wind=(0.21, 0.37), rear=(0.88, 0.985),
                head=(1.0, 0.93, 1.08), tail=(1.1, 1.3)),
    'van': dict(L=5.95, hw=1.0, rw=0.93, zb=0.38, r=0.36, ax=(0.14, 0.72), rn=(0.34, 0.12),
                zt=[(0, 0.92), (0.05, 1.04), (0.12, 1.22), (0.25, 2.42), (0.3, 2.52), (1, 2.54)],
                zbelt=[(0, 0.92), (0.12, 1.18), (0.25, 1.26), (1, 1.26)],
                side=(0.15, 0.30), pillars=[], wind=(0.12, 0.25), rear=None,
                head=(0.92, 0.86, 1.0), tail=(0.55, 1.25)),
}

def build(kind, lo=False):
    S = SPECS[kind]; L, hw0, zb0, r = S['L'], S['hw'], S['zb'], S['r']
    B = Builder(); N = 34 if lo else 52
    axY = [(-L / 2 + a * L) for a in S['ax']]; R = r + 0.045
    def arch(y):
        z = 0.0
        for ay in axY:
            d = y - ay
            if abs(d) < R: z = max(z, r + math.sqrt(R * R - d * d))
        return z
    rings, info = [], []
    for i in range(N + 1):
        u = 0.5 - 0.5 * math.cos(math.pi * i / N); y = -L / 2 + u * L
        zt, zbelt = table(S['zt'], u), table(S['zbelt'], u); zbelt = min(zbelt, zt - 0.005)
        dF, dR = u * L, (1 - u) * L
        k = 1.0
        for d, rn in ((dF, S['rn'][0]), (dR, S['rn'][1])):
            if d < rn: t = 1 - d / rn; k = min(k, (1 - t ** 3) ** (1 / 3))
        hw = hw0 * (0.80 + 0.20 * k); zb = zb0 + (1 - k) * 0.06
        zc = (zb + zt) / 2; zt_ = zc + (zt - zc) * (0.9 + 0.1 * k); zbelt = min(zbelt, zt_ - 0.004); zt = zt_
        gh = zt - zbelt; rw = lerp(hw * 0.93, S['rw'] * (0.8 + 0.2 * k), sstep(0.05, 0.35, gh))
        za = max(zb, arch(y))
        pts = [(0, zb), (hw - 0.36, zb), (hw - 0.15, za), (hw - 0.025, za + 0.045), (hw, za + 0.1),
               (hw + 0.012, lerp(zb, zbelt, 0.72)), (hw * 0.995, zbelt - 0.025), (hw * 0.975, zbelt),
               (lerp(hw * 0.962, rw, 0.36), zbelt + gh * 0.36), (lerp(hw * 0.962, rw, 0.74), zbelt + gh * 0.74),
               (rw, zt - min(0.07, gh * 0.12 + 0.01)), (rw * 0.82, zt - 0.014), (rw * 0.42, zt - 0.002), (0, zt)]
        for j in range(1, len(pts)):  # keep the profile climbing
            if pts[j][1] < pts[j - 1][1] + 0.004 and j > 1: pts[j] = (pts[j][0], pts[j - 1][1] + 0.004)
        # order around: start at top centre going down the left, across the bottom, up the right
        ring = list(reversed([(-x, z) for (x, z) in pts]))[:-1] + pts[:-1]
        rings.append([B.bm.verts.new((x, y, z)) for (x, z) in ring]); info.append((u, y, gh, za > zb + 0.01))
    nP = len(rings[0]); half = nP // 2  # ring index j: 0..half-1 left side top->bottom, half.. right side bottom->top
    def rowcat(j):  # profile segment index (0 = bottom centre segment ... 12 = roof centre segment)
        return (half - 1 - j) if j < half else (j - half)
    for i in range(N):
        u0, y0, gh0, a0 = info[i]; u1, y1, gh1, a1 = info[i + 1]; um = (u0 + u1) / 2; gh = (gh0 + gh1) / 2
        for j in range(nP):
            a, b = rings[i][j], rings[i][(j + 1) % nP]; c, d = rings[i + 1][(j + 1) % nP], rings[i + 1][j]
            seg = rowcat(j) if j != half - 1 else 0
            m, col = 'paint', 'white'
            if seg <= 0: m, col = 'detail', 'trim'                      # underbody
            elif seg in (1, 2) and (a0 or a1): m, col = 'detail', 'trim'  # wheel-well liner
            elif S.get('clad') and seg in (2, 3) and (a0 or a1 or um < 0.12 or um > 0.9 or seg == 2): m, col = 'detail', 'trim'  # SUV cladding
            elif seg in (1, 2, 3) and (um < 0.09 or um > 0.92): m, col = 'detail', 'trim'  # lower bumpers
            elif seg in (7, 8, 9) and gh > 0.12:
                sd = S['side']; inP = any(abs(um - p) < 0.011 for p in S['pillars'])
                if sd[0] < um < sd[1]: m, col = ('detail', 'trim') if inP else ('detail', 'glass')
            elif seg in (10, 11, 12):
                w, rr = S['wind'], S['rear']
                if w[0] + 0.012 < um < w[1] - 0.006 or (rr and rr[0] + 0.01 < um < rr[1] - 0.012): m, col = 'detail', 'glass'
            if seg == 6 and gh > 0.12 and S['side'][0] < um < S['side'][1]: m, col = 'detail', 'chrome'  # belt-line trim
            f = B.bm.faces.new((a, d, c, b)); f.material_index = MI[m]
            for l in f.loops: l[B.col] = C[col]
    for ring, sign_ in ((rings[0], -1), (rings[-1], 1)):  # fan caps
        cx = sum((v.co for v in ring), Vector()) / len(ring); cx.y += sign_ * 0.02; cv = B.bm.verts.new(cx)
        for j in range(nP):
            vs = (ring[j], ring[(j + 1) % nP], cv) if sign_ > 0 else (ring[(j + 1) % nP], ring[j], cv)
            f = B.bm.faces.new(vs); f.material_index = 0
            for l in f.loops: l[B.col] = C['white']
    bmesh.ops.recalc_face_normals(B.bm, faces=B.bm.faces)
    body = B.obj(kind + ('_lo' if lo else '') + '_body')
    if not lo:
        m = body.modifiers.new('sub', 'SUBSURF'); m.levels = 1; m.render_levels = 1; m.quality = 2
        bpy.context.view_layer.objects.active = body; bpy.ops.object.modifier_apply(modifier='sub')
    # ---- stick-on details, raycast onto the finished body
    bm = bmesh.new(); bm.from_mesh(body.data); bvh = BVHTree.FromBMesh(bm); bm.free()
    D = Builder(); parts = [body]
    def hit(o, dvec):
        loc, n, _, _ = bvh.ray_cast(Vector(o), Vector(dvec).normalized(), 20)
        return (loc, n) if loc else (None, None)
    def patch(corners, axis, m, col, nu=4, nv=2, off=0.009):
        """corners: 4 points in the patch plane coords; axis: 'F' front, 'R' rear, '+X'/'-X' side. Raycast a grid onto the body."""
        grid = []
        for iv in range(nv + 1):
            row = []
            for iu in range(nu + 1):
                s, t = iu / nu, iv / nv
                p = [lerp(lerp(corners[0][k], corners[1][k], s), lerp(corners[3][k], corners[2][k], s), t) for k in range(2)]
                if axis == 'F': o, dv = (p[0], -L, p[1]), (0, 1, 0)
                elif axis == 'R': o, dv = (p[0], L, p[1]), (0, -1, 0)
                else: sg = 1 if axis == '+X' else -1; o, dv = (sg * 3, p[0], p[1]), (-sg, 0, 0)
                loc, n = hit(o, dv)
                if loc is None: return
                row.append((loc + n * off, n))
            grid.append(row)
        for iv in range(nv):
            for iu in range(nu):
                q = [grid[iv][iu], grid[iv][iu + 1], grid[iv + 1][iu + 1], grid[iv + 1][iu]]
                orient(D.face([p_[0] for p_ in q], m, col), sum((p_[1] for p_ in q), Vector()))
        return grid
    def both(fn): fn(1); fn(-1)
    hy, hz0, hz1 = S['head']
    zF = hz0  # head-lamp band centre height
    # headlamps: chrome reflector with a clear lens rim, angled outer edge
    both(lambda s: patch([(s * hw0 * 0.40, hz0 - 0.02), (s * hw0 * 0.86, hz0 + 0.02), (s * hw0 * 0.84, hz1), (s * hw0 * 0.42, hz1 - 0.035)][::s], 'F', 'detail', 'lamp', 5, 2))
    both(lambda s: patch([(s * hw0 * 0.50, hz0 + 0.01), (s * hw0 * 0.62, hz0 + 0.02), (s * hw0 * 0.62, hz1 - 0.03), (s * hw0 * 0.50, hz1 - 0.04)][::s], 'F', 'detail', 'lampIn', 1, 1, 0.012))
    # grille + chrome surround, lower intake
    gz0, gz1 = (hz0 - 0.16, hz0 + 0.04) if kind == 'sedan' else (hz0 - 0.2, hz1 - 0.02)
    patch([(-hw0 * 0.36, gz0 - 0.02), (hw0 * 0.36, gz0 - 0.02), (hw0 * 0.38, gz1 + 0.02), (-hw0 * 0.38, gz1 + 0.02)], 'F', 'detail', 'chrome', 6, 2)
    patch([(-hw0 * 0.33, gz0), (hw0 * 0.33, gz0), (hw0 * 0.35, gz1), (-hw0 * 0.35, gz1)], 'F', 'detail', 'grille', 6, 2, 0.012)
    patch([(-hw0 * 0.55, zb0 + 0.08), (hw0 * 0.55, zb0 + 0.08), (hw0 * 0.6, zb0 + 0.2), (-hw0 * 0.6, zb0 + 0.2)], 'F', 'detail', 'grille', 6, 1)
    # plates
    patch([(-0.26, gz0 - 0.2), (0.26, gz0 - 0.2), (0.26, gz0 - 0.08), (-0.26, gz0 - 0.08)], 'F', 'detail', 'plate', 2, 1, 0.014)
    tz0, tz1 = S['tail']
    patch([(-0.26, tz0 - 0.24), (0.26, tz0 - 0.24), (0.26, tz0 - 0.1), (-0.26, tz0 - 0.1)], 'R', 'detail', 'plateNY', 2, 1, 0.014)
    # rear lamps (Tail material) wrapping the corners; vans get tall vertical lamps
    if kind == 'van':
        both(lambda s: patch([(s * hw0 * 0.86, tz0), (s * hw0 * 0.98, tz0), (s * hw0 * 0.98, tz1), (s * hw0 * 0.86, tz1)][::s], 'R', 'tail', 'white', 1, 4))
    else:
        both(lambda s: patch([(s * hw0 * 0.38, tz0 + 0.02), (s * hw0 * 0.985, tz0), (s * hw0 * 0.985, tz1 - 0.01), (s * hw0 * 0.40, tz1 - 0.02)][::s], 'R', 'tail', 'white', 6, 2))
        patch([(-hw0 * 0.38, tz0 + 0.05), (hw0 * 0.38, tz0 + 0.05), (hw0 * 0.38, tz1 - 0.05), (-hw0 * 0.38, tz1 - 0.05)], 'R', 'detail', 'chrome', 4, 1)
    patch([(-hw0 * 0.6, zb0 + 0.06), (hw0 * 0.6, zb0 + 0.06), (hw0 * 0.6, zb0 + 0.16), (-hw0 * 0.6, zb0 + 0.16)], 'R', 'detail', 'trim', 6, 1)
    # SUV / van: rear glass on the near-vertical tailgate; van: rear-door split
    if kind in ('suv', 'van'):
        g0 = (S['zbelt'][-1][1] + 0.05, S['zt'][-1][1] - 0.12)
        if kind == 'suv': patch([(-hw0 * 0.7, g0[0]), (hw0 * 0.7, g0[0]), (hw0 * 0.62, g0[1]), (-hw0 * 0.62, g0[1])], 'R', 'detail', 'glass', 4, 2)
        else:
            for s in (1, -1): patch([(s * 0.06, 1.45), (s * hw0 * 0.8, 1.45), (s * hw0 * 0.8, 2.25), (s * 0.06, 2.25)][::s], 'R', 'detail', 'glass', 2, 2)
            patch([(-0.008, zb0 + 0.12), (0.008, zb0 + 0.12), (0.008, 2.4), (-0.008, 2.4)], 'R', 'detail', 'trim', 1, 6, 0.013)
    # side: door seams, handles, mirrors, side markers
    sd = S['side']; yS0, yS1 = -L / 2 + sd[0] * L, -L / 2 + sd[1] * L; zbl = table(S['zbelt'], 0.5)
    seams = [sd[0] + 0.005] + S['pillars'][:1] + ([sd[1] - 0.006] if kind != 'van' else [])
    if kind == 'van': seams += [0.34, 0.62]
    for s in ('+X', '-X'):
        for us in seams:
            yy = -L / 2 + us * L; zlo = arch(yy) + 0.1 if arch(yy) > 0 else zb0 + 0.12
            patch([(yy - 0.004, zlo), (yy + 0.004, zlo), (yy + 0.004, zbl - 0.01), (yy - 0.004, zbl - 0.01)], s, 'detail', 'trim', 1, 5, 0.006)
        doors = [(sd[0] + (S['pillars'][0] if S['pillars'] else sd[1])) / 2 + 0.05]
        if kind != 'van' and S['pillars']: doors.append((S['pillars'][0] + sd[1]) / 2 + 0.05)
        if kind == 'van': doors.append(0.6)
        for ud in doors:
            yy = -L / 2 + ud * L; zh = zbl - 0.1
            patch([(yy - 0.11, zh - 0.022), (yy + 0.11, zh - 0.022), (yy + 0.11, zh + 0.022), (yy - 0.11, zh + 0.022)], s, 'detail', 'chrome', 2, 1, 0.012)
    for sg in (1, -1):  # mirrors: small housings at the base of the A-pillar
        yy = -L / 2 + (S['wind'][0] + 0.03) * L; loc, n = hit((sg * 3, yy, zbl + 0.1), (-sg, 0, 0))
        if loc:
            bm2 = bmesh.new(); bmesh.ops.create_cube(bm2, size=1); bmesh.ops.scale(bm2, vec=(0.2, 0.09, 0.13), verts=bm2.verts)
            bmesh.ops.bevel(bm2, geom=bm2.edges[:], offset=0.03, segments=2, affect='EDGES')
            bmesh.ops.translate(bm2, vec=(loc.x + sg * 0.11, loc.y + 0.02, loc.z + 0.02), verts=bm2.verts)
            bm2.normal_update()
            for f in bm2.faces:
                f.material_index = 0 if f.normal.y < 0.5 else 1
            me = bpy.data.meshes.new('mirror'); bm2.to_mesh(me); bm2.free()
            for mm in (PAINT, DETAIL, TAIL, WHEEL): me.materials.append(mm)
            ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
            for p in me.polygons:
                for li in p.loop_indices: ca.data[li].color = C['white'] if p.material_index == 0 else C['glass']
            mo = bpy.data.objects.new('mirror', me); bpy.context.scene.collection.objects.link(mo); parts.append(mo)
    # amber side markers near the front corners
    for s in ('+X', '-X'):
        yy = -L / 2 + 0.14 * L * (0.6 if kind == 'van' else 1); zz = hz0
        patch([(yy - 0.05, zz - 0.02), (yy + 0.05, zz - 0.02), (yy + 0.05, zz + 0.02), (yy - 0.05, zz + 0.02)], s, 'detail', 'amber', 1, 1, 0.01)
    if kind == 'van':  # roof-height marker, step and black side rubbing strip
        for s in ('+X', '-X'):
            patch([(-L / 2 + 0.3 * L, zb0 + 0.28), (L / 2 - 0.25, zb0 + 0.28), (L / 2 - 0.25, zb0 + 0.38), (-L / 2 + 0.3 * L, zb0 + 0.38)], s, 'detail', 'trim', 12, 1)
    # taxi: roof sign
    if kind == 'sedan' and 'taxi' in build.flags:
        yy = -L / 2 + 0.565 * L; zr = table(S['zt'], 0.565)
        bm2 = bmesh.new(); bmesh.ops.create_cube(bm2, size=1); bmesh.ops.scale(bm2, vec=(0.78, 0.26, 0.26), verts=bm2.verts)
        bmesh.ops.bevel(bm2, geom=bm2.edges[:], offset=0.04, segments=2, affect='EDGES'); bmesh.ops.translate(bm2, vec=(0, yy, zr + 0.16), verts=bm2.verts)
        bmesh.ops.create_cube(bm2, size=1, matrix=Matrix.Translation((0, yy, zr + 0.025)) @ Matrix.Diagonal((0.5, 0.18, 0.05, 1)))
        me = bpy.data.meshes.new('sign'); bm2.to_mesh(me); bm2.free()
        for mm in (PAINT, DETAIL, TAIL, WHEEL): me.materials.append(mm)
        ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
        for p in me.polygons:
            p.material_index = 1
            for li in p.loop_indices: ca.data[li].color = C['sign'] if p.center.z > zr + 0.06 else C['trim']
        mo = bpy.data.objects.new('sign', me); bpy.context.scene.collection.objects.link(mo); parts.append(mo)
    if D.bm.faces: parts.append(D.obj(kind + '_detail'))
    # ---------------------------------------------------------------- wheels
    W = Builder(); seg = 14 if lo else 28; tw = 0.215 if kind != 'van' else 0.205; rr = r * 0.64
    def lathe(prof, cols, cx, cy, sgn, mode='out'):
        rings_ = []
        for (a, rad) in prof:
            rad = max(rad, 0.002)
            rings_.append([W.bm.verts.new((cx + sgn * a, cy + rad * math.sin(k / seg * 2 * math.pi), r + rad * math.cos(k / seg * 2 * math.pi))) for k in range(seg)])
        for i in range(len(rings_) - 1):
            for k in range(seg):
                q = (rings_[i][k], rings_[i][(k + 1) % seg], rings_[i + 1][(k + 1) % seg], rings_[i + 1][k])
                f = W.face(q, 'wheel', cols[i]); fc = f.calc_center_median(); radial = Vector((0, fc.y - cy, fc.z - r))
                ru = radial.normalized() if radial.length > 1e-6 else Vector((0, 0, 1))
                if mode == 'tyre': want = fc - (Vector((cx, cy, r)) + ru * ((r + rr) / 2))
                elif mode == 'in': want = -ru
                else: want = Vector((sgn, 0, 0))
                orient(f, want)
    for ay in axY:
        for sgn in (1, -1):
            cx = sgn * (hw0 - 0.08 - tw / 2 + 0.03)
            h = tw / 2
            lathe([(-h, rr * 0.98), (-h - 0.006, rr + 0.04), (-h - 0.012, r - 0.06), (-h + 0.004, r - 0.012), (-h + 0.035, r), (h - 0.035, r),
                   (h - 0.004, r - 0.012), (h + 0.012, r - 0.06), (h + 0.006, rr + 0.04), (h, rr * 0.98)],
                  ['wall', 'wall', 'tyre', 'tyre', 'tyre', 'tyre', 'tyre', 'wall', 'wall'], cx, ay, sgn, 'tyre')
            # rim lip + dish + dark barrel + brake disc
            lathe([(h, rr * 0.98), (h - 0.012, rr * 0.95), (h - 0.03, rr * 0.9)], ['rim', 'rim'], cx, ay, sgn)
            lathe([(h - 0.03, rr * 0.9), (-h + 0.02, rr * 0.9)], ['rimDark'], cx, ay, sgn, 'in')
            lathe([(-0.01, rr * 0.82), (-0.01, rr * 0.25)], ['disc'], cx, ay, sgn)
            lathe([(-0.005, rr * 0.25), (-0.005, 0.0)], ['rimDark'], cx, ay, sgn)
            # five (or ten on the van) spokes + hub
            nsp = 5; sa = h - 0.028
            for k in range(nsp):
                ang = k / nsp * 2 * math.pi
                for (w0, w1, d0) in ((0.055, 0.03, 0.0),):
                    def P(rad, wdt, a_):
                        dirv = Vector((0, math.sin(ang), math.cos(ang))); perp = Vector((0, math.cos(ang), -math.sin(ang)))
                        return Vector((cx + sgn * a_, ay, r)) + dirv * rad + perp * wdt
                    a1, a2 = sa, sa - 0.035
                    fr = [P(0.06, w0 / 2, a1), P(rr * 0.9, w1 / 2, a1 - 0.02), P(rr * 0.9, -w1 / 2, a1 - 0.02), P(0.06, -w0 / 2, a1)]
                    bk = [P(0.06, w0 / 2, a2), P(rr * 0.9, w1 / 2, a2 - 0.02), P(rr * 0.9, -w1 / 2, a2 - 0.02), P(0.06, -w0 / 2, a2)]
                    vf = [W.bm.verts.new(v) for v in fr]; vb = [W.bm.verts.new(v) for v in bk]
                    cen = sum(fr + bk, Vector()) / 8
                    f = W.face(vf, 'wheel', 'rim'); orient(f, f.calc_center_median() - cen)
                    for i in range(4):
                        f = W.face((vf[i], vf[(i + 1) % 4], vb[(i + 1) % 4], vb[i]), 'wheel', 'rim'); orient(f, f.calc_center_median() - cen)
            lathe([(sa + 0.008, 0.0), (sa + 0.008, 0.045), (sa - 0.01, 0.07), (sa - 0.04, 0.075)], ['rim', 'chrome', 'rim'], cx, ay, sgn)
            # brake caliper peeking through the spokes
            cb = [Vector((cx + sgn * (-0.01 + dx), ay + dy, r + dz)) for dx, dy, dz in
                  ((0.03, -0.09, rr * 0.55), (0.03, 0.09, rr * 0.55), (0.03, 0.06, rr * 0.8), (0.03, -0.06, rr * 0.8))]
            orient(W.face(cb, 'wheel', 'caliper'), Vector((sgn, 0, 0)))
    parts.append(W.obj(kind + '_wheels'))
    # join
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = body; bpy.ops.object.join()
    body.name = (build.flags.get('name') or kind) + ('_lo' if lo else '')
    for p in body.data.polygons: p.use_smooth = True
    return body
build.flags = {}

made = []
for kind, name, flags in (('sedan', 'sedan', {}), ('sedan', 'taxi', {'taxi': 1}), ('suv', 'suv', {}), ('van', 'van', {})):
    for lo in (False, True):
        build.flags = dict(flags, name=name); ob = build(kind, lo); made.append(ob)
# lay them out side by side for previews (three.js resets positions)
for i, ob in enumerate(made): ob.location.x = (i // 2) * 3.0; ob.location.y = (i % 2) * 7.0
bpy.ops.object.select_all(action='DESELECT')
for ob in made:
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    if hasattr(bpy.ops.object, 'shade_auto_smooth'): bpy.ops.object.shade_auto_smooth(angle=math.radians(35))
    ob.select_set(False)
for ob in made:
    ob.select_set(True); ca = ob.data.color_attributes
    for a in list(ca):
        if a.name != 'Col': ca.remove(a)
    ca.active_color = ca['Col']; ca.render_color_index = ca.active_color_index
    print('COLS', ob.name, [(a.name, a.domain, a.data_type) for a in ca], len(set(tuple(round(x, 2) for x in d.color) for d in ca['Col'].data)))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_normals=True,
                          export_texcoords=False, export_vertex_color='ACTIVE',
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
for ob in made:
    ob.data.calc_loop_triangles(); print('CAR', ob.name, 'tris', len(ob.data.loop_triangles))
print('EXPORTED', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB')
