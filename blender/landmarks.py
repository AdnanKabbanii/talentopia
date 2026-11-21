# Talentopia V2 landmarks: parametric Blender architecture exported as optimised GLB for Three.js.
# blender -b -P landmarks.py -- OUT_DIR [asset ...]
# Authoring convention: Z up, building front faces -Y (becomes +Z / south in three.js). Units: metres. Origin = ground centre.
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

a = sys.argv[sys.argv.index('--') + 1:]
OUT, ONLY = a[0], set(a[1:])
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- materials (V2 palette; architecture dominates, accents sparse)
def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)
MATS = {}
def mat(name, color, metal=0.0, rough=0.5, emit=None, strength=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(color); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit: b.inputs['Emission Color'].default_value = srgb(emit); b.inputs['Emission Strength'].default_value = strength
    MATS[name] = m; return m
def palette():
    MATS.clear()
    return dict(
        glass=mat('Glass', '#1f2c3a', 0.85, 0.06), glassDark=mat('GlassDark', '#141c26', 0.9, 0.05), glassWarm=mat('GlassWarm', '#2d3238', 0.8, 0.07),
        pearl=mat('PearlStone', '#ece8e1', 0.0, 0.55), stone=mat('Limestone', '#d9d0c0', 0.0, 0.7), concrete=mat('Concrete', '#bdb8b0', 0.0, 0.85),
        metal=mat('CoolMetal', '#a7b9c9', 1.0, 0.3), graphite=mat('Graphite', '#2a313d', 0.7, 0.4), gold=mat('Champagne', '#d8b98a', 1.0, 0.28),
        timber=mat('Timber', '#9a6a43', 0.0, 0.6), green=mat('Planting', '#4f7a3a', 0.0, 0.9), roofg=mat('GreenRoof', '#6f8f4f', 0.0, 1.0),
        violet=mat('VioletGlow', '#8d70ff', 0.0, 0.4, '#8d70ff', 6.0), cyan=mat('CyanGlow', '#42dbff', 0.0, 0.4, '#42dbff', 8.0),
        mint=mat('MintGlow', '#78d8b5', 0.0, 0.4, '#5fe0a8', 5.0), lamp=mat('Lamp', '#fff4e0', 0.0, 0.5, '#fff1d6', 3.0),
        white=mat('White', '#f6f8fc', 0.0, 0.45), soffit=mat('Soffit', '#f1efe9', 0.0, 0.6),
    )

# ---------------------------------------------------------------- geometry accumulator (one bmesh per material -> few draw calls)
class G:
    def __init__(self): self.b = {}
    def bm(self, m):
        if m.name not in self.b: self.b[m.name] = (m, bmesh.new())
        return self.b[m.name][1]
    def box(self, m, cx, cy, z0, sx, sy, sz, rz=0.0):
        bm = self.bm(m); M = Matrix.Translation((cx, cy, z0 + sz / 2)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Diagonal((sx, sy, sz, 1))
        bmesh.ops.create_cube(bm, size=1.0, matrix=M)
    def cyl(self, m, cx, cy, z0, r, h, seg=24, r2=None, face=None):
        bm = self.bm(m); M = Matrix.Translation((cx, cy, z0 + h / 2))
        if face is not None: M = Matrix.Translation((cx, cy, z0)) @ Matrix.Rotation(face, 4, 'Z') @ Matrix.Rotation(math.pi / 2, 4, 'X')
        bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=M)
    def sphere(self, m, cx, cy, cz, r, sub=2):
        bm = self.bm(m); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r, matrix=Matrix.Translation((cx, cy, cz)))
    def prism(self, m, pts, z0, z1):
        bm = self.bm(m); vb = [bm.verts.new((x, y, z0)) for x, y in pts]; vt = [bm.verts.new((x, y, z1)) for x, y in pts]
        bm.faces.new(list(reversed(vb))); bm.faces.new(vt); n = len(pts)
        for i in range(n): bm.faces.new((vb[i], vb[(i + 1) % n], vt[(i + 1) % n], vt[i]))
    def torus(self, m, cx, cy, cz, R, r, seg=48):
        bm = self.bm(m); ring = []
        for i in range(seg):
            a0 = i / seg * 2 * math.pi; row = []
            for k in range(8):
                b0 = k / 8 * 2 * math.pi; rr = R + r * math.cos(b0)
                row.append(bm.verts.new((cx + rr * math.cos(a0), cy + rr * math.sin(a0), cz + r * math.sin(b0))))
            ring.append(row)
        for i in range(seg):
            for k in range(8): bm.faces.new((ring[i][k], ring[(i + 1) % seg][k], ring[(i + 1) % seg][(k + 1) % 8], ring[i][(k + 1) % 8]))
    def text(self, m, s, cx, cy, z, size, depth=0.12, rz=0.0, align='CENTER'):
        cu = bpy.data.curves.new('t', 'FONT'); cu.body = s; cu.size = size; cu.extrude = depth / 2; cu.align_x = align
        try: cu.font = bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial Bold.ttf', check_existing=True)
        except Exception: pass
        ob = bpy.data.objects.new('t', cu); bpy.context.scene.collection.objects.link(ob)
        ob.rotation_euler = (math.pi / 2, 0, rz); ob.location = (cx, cy, z); bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get(); me = ob.evaluated_get(dg).to_mesh()
        me.transform(ob.matrix_world)
        bm = self.bm(m); tmp = bmesh.new(); tmp.from_mesh(me)
        vmap = {v: bm.verts.new(v.co) for v in tmp.verts}
        for f in tmp.faces:
            try: bm.faces.new([vmap[v] for v in f.verts])
            except ValueError: pass
        tmp.free(); ob.evaluated_get(dg).to_mesh_clear(); bpy.data.objects.remove(ob); bpy.data.curves.remove(cu)
    def build(self, name):
        objs = []
        for mname, (m, bm) in self.b.items():
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            me = bpy.data.meshes.new(name + '_' + mname); bm.to_mesh(me); bm.free(); me.materials.append(m)
            ob = bpy.data.objects.new(name + '_' + mname, me); bpy.context.scene.collection.objects.link(ob); objs.append(ob)
        for o in bpy.context.scene.objects: o.select_set(False)
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); j = bpy.context.view_layer.objects.active; j.name = name
        for p in j.data.polygons: p.use_smooth = False
        return j

def reset():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for me in list(bpy.data.meshes): bpy.data.meshes.remove(me)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)

def export(name):
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=False, export_apply=True, export_yup=True, export_normals=True, export_texcoords=False)
    tris = sum(len(p.vertices) - 2 for o in bpy.context.scene.objects if o.type == 'MESH' for p in o.data.polygons)
    print('EXPORTED', name, round(os.path.getsize(path) / 1e6, 2), 'MB', 'tris', tris)

def superellipse(w, d, n=4.0, seg=48, rot=0.0):
    pts = []
    for i in range(seg):
        t = i / seg * 2 * math.pi; c, s = math.cos(t), math.sin(t)
        x = (w / 2) * math.copysign(abs(c) ** (2 / n), c); y = (d / 2) * math.copysign(abs(s) ** (2 / n), s)
        pts.append((x * math.cos(rot) - y * math.sin(rot), x * math.sin(rot) + y * math.cos(rot)))
    return pts
def inset(pts, k): return [(x * k, y * k) for x, y in pts]
def rect(w, d, cx=0, cy=0): return [(cx - w / 2, cy - d / 2), (cx + w / 2, cy - d / 2), (cx + w / 2, cy + d / 2), (cx - w / 2, cy + d / 2)]

def curtain_floor(g, P, pts, z, h, glass, slab, mull, every=2, mull_w=0.12, mull_d=0.28):
    """one curtain-wall floor: slab edge, glass band and vertical mullions at polygon vertices"""
    g.prism(slab, pts, z, z + 0.4); g.prism(glass, inset(pts, 0.985), z + 0.4, z + h)
    n = len(pts)
    for i in range(0, n, every):
        x0, y0 = pts[i]; x1, y1 = pts[(i + 1) % n]; xm, ym = pts[i - 1]
        tx, ty = x1 - xm, y1 - ym; ang = math.atan2(ty, tx)
        g.box(mull, x0, y0, z + 0.4, mull_w, mull_d, h - 0.4, ang)

def rect_curtain(g, P, w, d, z0, z1, floor_h, bay, glass, frame, cx=0, cy=0, mull_d=0.25, band=None):
    """rectangular curtain wall with real mullions and floor bands on all four sides"""
    g.box(glass, cx, cy, z0, w, d, z1 - z0)
    for sx, sy, L, horiz in ((0, -1, w, True), (0, 1, w, True), (-1, 0, d, False), (1, 0, d, False)):
        n = max(1, round(L / bay))
        for i in range(n + 1):
            t = -L / 2 + i * L / n
            px = cx + (t if horiz else sx * (w / 2 + mull_d / 2)); py = cy + (sy * (d / 2 + mull_d / 2) if horiz else t)
            g.box(frame, px, py, z0, 0.12 if horiz else mull_d, mull_d if horiz else 0.12, z1 - z0)
        z = z0
        while z <= z1 + 0.01:
            px = cx + (0 if horiz else sx * (w / 2 + mull_d / 2)); py = cy + (sy * (d / 2 + mull_d / 2) if horiz else 0)
            g.box(band or frame, px, py, z - 0.2, (L + 0.3) if horiz else mull_d + 0.02, mull_d + 0.02 if horiz else (L + 0.3), 0.4)
            z += floor_h

# ================================================================ Talentopia Tower (Central Plaza landmark)
def talentopia_tower():
    reset(); P = palette(); g = G()
    # plinth + steps
    g.box(P['stone'], 0, 0, 0, 30, 30, 0.6); g.box(P['stone'], 0, -15.5, 0, 16, 1.2, 0.3)
    # glass lobby with stone fins and a gold-edged canopy
    g.box(P['glassWarm'], 0, 0, 0.6, 22, 22, 8.4)
    for i in range(12):
        t = -10.5 + i * 21 / 11
        for (x, y, rz) in ((t, -11.2, 0), (t, 11.2, 0), (-11.2, t, math.pi / 2), (11.2, t, math.pi / 2)): g.box(P['pearl'], x, y, 0.6, 0.35, 0.9, 8.4, rz)
    g.box(P['pearl'], 0, -14.5, 8.0, 14, 7, 0.45); g.box(P['gold'], 0, -18.0, 8.0, 14, 0.12, 0.45); g.box(P['lamp'], 0, -14.5, 7.98, 12, 6, 0.03)
    g.text(P['gold'], 'TALENTOPIA', 0, -18.1, 8.6, 1.5, 0.16)
    g.box(P['pearl'], 0, 0, 9.0, 23, 23, 0.6)
    # twisting, tapering curtain-wall tower with gold corner fins
    floors, fh, z = 34, 4.0, 9.6
    for i in range(floors):
        t = i / (floors - 1); s = 22 - 7 * (t * t * (3 - 2 * t)); rot = math.radians(48) * t
        zz = z + i * fh
        if i in (22, 23):  # sky garden: open terrace around a core
            pts = superellipse(s, s, 4.2, 48, rot); g.prism(P['pearl'], pts, zz, zz + 0.45); g.cyl(P['concrete'], 0, 0, zz, s * 0.22, fh)
            for k in range(10):
                ang = k / 10 * 2 * math.pi + rot; r = s * 0.38; g.box(P['timber'], r * math.cos(ang), r * math.sin(ang), zz + 0.45, 1.6, 1.6, 0.6, ang)
                g.sphere(P['green'], r * math.cos(ang), r * math.sin(ang), zz + 1.7, 0.95, 1)
            for k in range(0, 48, 3): x, y = pts[k]; g.box(P['metal'], x * 0.98, y * 0.98, zz + 0.45, 0.06, 0.06, 1.1)
            continue
        pts = superellipse(s, s, 4.2, 48, rot)
        curtain_floor(g, P, pts, zz, fh, P['glass'], P['pearl'], P['metal'], every=2)
        for k in (6, 18, 30, 42):  # corner fins (gold)
            x, y = pts[k]; ang = math.atan2(y, x); g.box(P['gold'], x + math.cos(ang) * 0.45, y + math.sin(ang) * 0.45, zz, 1.1, 0.28, fh, ang)
    top = z + floors * fh
    # crown: glass lantern, violet light ring, spire with cyan tip
    rot = math.radians(48); s = 15
    for k in range(4): g.prism(P['glass'], superellipse(s * (1 - 0.12 * k), s * (1 - 0.12 * k), 4.2, 48, rot), top + k * 3.2, top + k * 3.2 + 3.0); g.prism(P['pearl'], superellipse(s * (1 - 0.12 * k) + 0.4, s * (1 - 0.12 * k) + 0.4, 4.2, 48, rot), top + k * 3.2 + 3.0, top + k * 3.2 + 3.2)
    g.torus(P['violet'], 0, 0, top + 0.4, s * 0.53, 0.22); g.torus(P['violet'], 0, 0, top + 13.2, s * 0.33, 0.16)
    g.cyl(P['metal'], 0, 0, top + 12.8, 0.6, 26, 12, 0.12); g.sphere(P['cyan'], 0, 0, top + 39.0, 0.45, 2)
    g.build('TalentopiaTower'); export('talentopia_tower')

# ================================================================ Capital Bay Bank Headquarters
def bank_hq():
    reset(); P = palette(); g = G()
    W = 26
    # podium: stone piers, recessed glass, gold cornice
    g.box(P['glassDark'], 0, 0, 0, W - 1.2, W - 1.2, 14)
    for side in range(4):
        for i in range(10):
            t = -W / 2 + 1.3 + i * (W - 2.6) / 9
            x, y, rz = ((t, -W / 2, 0), (t, W / 2, 0), (-W / 2, t, math.pi / 2), (W / 2, t, math.pi / 2))[side]
            g.box(P['pearl'], x, y, 0, 1.0, 1.2, 14, rz)
    g.box(P['gold'], 0, 0, 13.6, W + 0.6, W + 0.6, 0.5); g.box(P['pearl'], 0, 0, 14.1, W + 1, W + 1, 0.9)
    g.box(P['graphite'], 0, -W / 2 - 2.6, 4.6, 12, 4.8, 0.35); g.box(P['lamp'], 0, -W / 2 - 2.6, 4.58, 11, 4.2, 0.03)
    g.text(P['gold'], 'CAPITAL BAY BANK', 0, -W / 2 - 0.75, 9.6, 1.25, 0.14)
    # tower sections with stone piers and setbacks
    secs = [(24, 15, 55), (21, 55, 92), (17.5, 92, 120)]
    for (w, z0, z1) in secs:
        g.box(P['glassDark'], 0, 0, z0, w - 0.6, w - 0.6, z1 - z0)
        n = round(w / 2.4)
        for side in range(4):
            for i in range(n + 1):
                t = -w / 2 + i * w / n
                x, y, rz = ((t, -w / 2, 0), (t, w / 2, 0), (-w / 2, t, math.pi / 2), (w / 2, t, math.pi / 2))[side]
                g.box(P['pearl'] if i % 2 == 0 else P['metal'], x, y, z0, 0.5 if i % 2 == 0 else 0.14, 0.7, z1 - z0, rz)
        z = z0
        while z < z1: g.box(P['graphite'], 0, 0, z, w - 0.4, w - 0.4, 0.5); z += 4
        g.box(P['pearl'], 0, 0, z1, w + 0.6, w + 0.6, 0.8)
        for cx, cy in ((-w / 2, -w / 2), (w / 2, -w / 2), (w / 2, w / 2), (-w / 2, w / 2)): g.box(P['gold'], cx, cy, z0, 0.6, 0.6, z1 - z0)
        # terrace planters on each setback
        for k in range(8): ang = k / 8 * 2 * math.pi; g.box(P['green'], math.cos(ang) * (w / 2 - 1.2), math.sin(ang) * (w / 2 - 1.2), z1 + 0.8, 1.6, 1.6, 0.7)
    # gold lattice crown
    top = 120.8; w = 15
    for side in range(4):
        for i in range(7):
            t = -w / 2 + i * w / 6
            x, y, rz = ((t, -w / 2, 0), (t, w / 2, 0), (-w / 2, t, math.pi / 2), (w / 2, t, math.pi / 2))[side]
            g.box(P['gold'], x, y, top, 0.22, 0.22, 12, rz)
    for k in range(4): g.box(P['gold'], 0, 0, top + 3 * k + 2.8, w + 0.3, w + 0.3, 0.18)
    g.box(P['glass'], 0, 0, top, w - 1.2, w - 1.2, 10); g.cyl(P['metal'], 0, 0, top + 12, 0.25, 14, 8, 0.08); g.sphere(P['lamp'], 0, 0, top + 26.2, 0.3, 1)
    g.build('CapitalBayBankHQ'); export('bank_hq')

# ================================================================ Pulse Advertising Agency (upper floors above the walk-in ground floor)
def agency_upper():
    reset(); P = palette(); g = G()
    # V1 (z 5-11): timber louvre skin
    g.box(P['soffit'], 2, 0, 5.0, 32, 20, 0.5); g.box(P['glassWarm'], 2, 0, 5.5, 31.4, 19.4, 5.5)
    for x in [i * 0.5 - 15.8 + 2 for i in range(64)]: g.box(P['timber'], x, -10.15, 5.5, 0.14, 0.3, 5.5); g.box(P['timber'], x, 10.15, 5.5, 0.14, 0.3, 5.5)
    for y in [i * 0.5 - 9.8 for i in range(40)]: g.box(P['timber'], -14.15, y, 5.5, 0.3, 0.14, 5.5); g.box(P['timber'], 18.15, y, 5.5, 0.3, 0.14, 5.5)
    # V2 (z 11-17): cantilevered glass box with thick pearl frame
    g.box(P['pearl'], -3, 1, 11.0, 28.6, 18.6, 0.6); g.box(P['pearl'], -3, 1, 16.6, 28.6, 18.6, 0.6)
    for sx in (-1, 1):
        g.box(P['pearl'], -3 + sx * 14.0, 1, 11.0, 0.6, 18.6, 6.2)
    rect_curtain(g, P, 27.6, 17.6, 11.6, 16.6, 5.0, 1.8, P['glass'], P['graphite'], cx=-3, cy=1, mull_d=0.18)
    # V3 (z 17.2-21.7): set-back studio with roof terrace and timber pergola
    g.box(P['pearl'], 1, -0.5, 17.2, 24.6, 16.6, 0.4); rect_curtain(g, P, 24, 16, 17.6, 21.3, 3.7, 2.0, P['glassWarm'], P['graphite'], cx=1, cy=-0.5, mull_d=0.16)
    g.box(P['pearl'], 1, -0.5, 21.3, 24.6, 16.6, 0.5)
    for k in range(9): g.box(P['timber'], -9 + k * 2.6, -10.5, 17.2 + 3.0, 0.16, 6, 0.24)
    for k in range(5): g.box(P['green'], -12 + k * 6, -10.0, 17.6, 2.2, 1.0, 0.8)
    # vertical blade sign with violet accent
    g.box(P['graphite'], 18.6, -9.0, 6.0, 0.5, 2.4, 14); g.box(P['violet'], 18.86, -9.0, 6.4, 0.05, 0.12, 13.2)
    for i, ch in enumerate('PULSE'): g.text(P['white'], ch, 18.9, -9.0, 18.2 - i * 2.4, 1.9, 0.1, math.pi / 2)
    g.build('PulseAgencyUpper'); export('agency_upper')

# ================================================================ Talentopia University main building
def university():
    reset(); P = palette(); g = G()
    W, D, H = 34, 24, 18
    g.box(P['glassWarm'], 0, 0, 0, W - 1, D - 1, H)
    # deep stone grid facade (front + back) and stone flanks
    for y0, sgn in ((-D / 2, -1), (D / 2, 1)):
        for i in range(12):
            x = -W / 2 + 0.6 + i * (W - 1.2) / 11
            if abs(x) < 5.2 and sgn < 0: continue
            g.box(P['stone'], x, y0, 0, 0.8, 1.4, H)
        for z in (0, 4.6, 9.0, 13.4, 17.6): g.box(P['stone'], 0, y0, z, W, 1.4, 0.6)
    for sx in (-1, 1): g.box(P['stone'], sx * W / 2, 0, 0, 1.2, D, H)
    # central glazed atrium slot with gold mullions
    g.box(P['glass'], 0, -D / 2 - 0.3, 0, 10, 0.4, H)
    for i in range(9): g.box(P['gold'], -4.8 + i * 1.2, -D / 2 - 0.55, 0, 0.1, 0.25, H)
    for z in range(1, 6): g.box(P['gold'], 0, -D / 2 - 0.55, z * 3.6, 10, 0.25, 0.12)
    # canopy + steps
    g.box(P['pearl'], 0, -D / 2 - 3.5, 4.6, 14, 6, 0.45); g.box(P['lamp'], 0, -D / 2 - 3.5, 4.58, 13, 5.4, 0.03)
    for k in range(3): g.box(P['stone'], 0, -D / 2 - 1.5 - k * 0.5, 0, 14, 0.5, 0.45 - k * 0.15)
    g.text(P['gold'], 'TALENTOPIA UNIVERSITY', 0, -D / 2 - 0.75, H - 2.6, 1.15, 0.14)
    # green roof + skylights
    g.box(P['roofg'], 0, 0, H, W, D, 0.3)
    for k in range(4): g.box(P['glass'], -10 + k * 6.6, 2, H + 0.3, 4.4, 8, 0.9)
    # campanile clock tower at the front-left corner
    cx, cy = -W / 2 + 3, -D / 2 + 3; th = 46
    g.box(P['stone'], cx, cy, 0, 6, 6, th)
    for zz in range(4, th - 6, 4): g.box(P['glassDark'], cx, cy - 3.05, zz, 1.2, 0.2, 2.6)
    g.box(P['glass'], cx, cy, th, 5.2, 5.2, 4); g.box(P['pearl'], cx, cy, th + 4, 6.6, 6.6, 0.6); g.cyl(P['metal'], cx, cy, th + 4.6, 0.12, 6, 8, 0.05)
    for (dx, dy, rz) in ((0, -3.06, 0), (3.06, 0, math.pi / 2), (0, 3.06, 0), (-3.06, 0, math.pi / 2)):
        g.cyl(P['white'], cx + dx, cy + dy, th - 4.2, 1.5, 0.12, 32, face=rz)   # clock face
        g.box(P['graphite'], cx + dx * 1.02, cy + dy * 1.02, th - 4.9, 0.12 if rz == 0 else 0.05, 0.05 if rz == 0 else 0.12, 1.2, rz)  # hands
    g.build('TalentopiaUniversity'); export('university')

# ================================================================ MedCity hospital exterior upgrade (aligned to medcity.glb local space)
def hospital_upgrade():
    reset(); P = palette(); g = G()
    # Blender space: front at y=24 (three z=-24), back y=54, x -30..30, upper floors z 5.3..24.3
    for i in range(41):
        x = -30 + i * 1.5
        g.box(P['white'], x, 23.45, 5.6, 0.22, 1.0, 18.6)            # front brise-soleil
    for i in range(21):
        y = 24.5 + i * 1.45
        g.box(P['white'], -30.55, y, 5.6, 1.0, 0.22, 18.6); g.box(P['white'], 30.55, y, 5.6, 1.0, 0.22, 18.6)
    g.box(P['pearl'], 0, 39, 24.3, 61.6, 31.6, 1.0)                    # crown band
    # rooftop signage frame + mint cross light box
    g.box(P['graphite'], -6, 25.2, 25.3, 30, 0.4, 3.2)
    g.text(P['white'], 'MEDCITY GENERAL HOSPITAL', -6, 24.95, 26.3, 1.6, 0.12)
    g.box(P['mint'], 14.5, 25.0, 25.6, 2.6, 0.5, 0.9); g.box(P['mint'], 14.5, 25.0, 25.15, 0.9, 0.5, 2.6)
    # rooftop plant screen
    for i in range(14): g.box(P['metal'], -26 + i * 1.2, 50, 25.3, 0.1, 6, 2.6)
    g.build('MedCityHospitalUpgrade'); export('hospital_upgrade')

# ================================================================ skyline kit
def tower_slim():
    reset(); P = palette(); g = G(); z = 0.0
    g.box(P['glassWarm'], 0, 0, 0, 20, 20, 6); g.box(P['pearl'], 0, -10.8, 5.0, 10, 3.2, 0.35)
    for i in range(26):
        t = i / 25; s = 20 - 4 * t; pts = superellipse(s, s, 5.0, 40)
        g.prism(P['white'], superellipse(s + 1.4, s + 1.4, 5.0, 40), 6 + i * 3.3, 6 + i * 3.3 + 0.3)   # balcony slabs
        g.prism(P['glass'], pts, 6 + i * 3.3 + 0.3, 6 + (i + 1) * 3.3)
        for k in range(0, 40, 4): x, y = pts[k]; g.box(P['metal'], x * 1.035, y * 1.035, 6 + i * 3.3 + 0.3, 0.05, 0.05, 1.05)
    g.prism(P['pearl'], superellipse(17, 17, 5.0, 40), 91.8, 93.2)
    g.build('TowerSlim'); export('tower_slim')
def tower_stepped():
    reset(); P = palette(); g = G()
    for (w, z0, z1) in ((22, 0, 42), (18, 42, 72), (13, 72, 95)):
        rect_curtain(g, P, w, w, z0, z1, 4.0, 2.2, P['glassDark'], P['metal'])
        for cx, cy in ((-w / 2, -w / 2), (w / 2, -w / 2), (w / 2, w / 2), (-w / 2, w / 2)): g.box(P['stone'], cx, cy, z0, 1.6, 1.6, z1 - z0)
        g.box(P['stone'], 0, 0, z1, w + 1, w + 1, 0.9)
    g.box(P['gold'], 0, 0, 95.9, 6, 6, 3); g.cyl(P['metal'], 0, 0, 98.9, 0.12, 6, 8, 0.05)
    g.build('TowerStepped'); export('tower_stepped')
def tower_twist():
    reset(); P = palette(); g = G()
    g.box(P['glassDark'], 0, 0, 0, 28, 28, 6)
    for i in range(25):
        t = i / 24; s = 26 - 8 * t; rot = math.radians(90) * t; zz = 6 + i * 4
        pts = superellipse(s, s * 0.82, 6.0, 40, rot)
        curtain_floor(g, P, pts, zz, 4.0, P['glassDark'], P['graphite'], P['graphite'], every=2)
        for k in (5, 15, 25, 35): x, y = pts[k]; g.box(P['cyan'], x * 1.01, y * 1.01, zz + 0.4, 0.08, 0.08, 3.6, math.atan2(y, x))
    g.prism(P['graphite'], superellipse(18.5, 15, 6.0, 40, math.radians(90)), 106, 108)
    g.build('TowerTwist'); export('tower_twist')
def tower_diagrid():
    reset(); P = palette(); g = G(); W, D, H = 36, 24, 76
    rect_curtain(g, P, W, D, 0, H, 4.0, 2.0, P['glass'], P['metal'])
    # graphite exoskeleton diagrid on the long faces
    for y0 in (-D / 2 - 0.6, D / 2 + 0.6):
        for k in range(-4, 5):
            for zb in range(0, H, 12):
                x0 = k * 9.0; L = math.hypot(9, 12); ang = math.atan2(12, 9)
                for sgn in (-1, 1):
                    ob = (x0 + sgn * 2.25, y0, zb)
                    bm = g.bm(P['graphite']); M = Matrix.Translation((x0 + sgn * 2.25, y0, zb + 6)) @ Matrix.Rotation(sgn * (math.pi / 2 - ang), 4, 'Y') @ Matrix.Diagonal((0.6, 0.6, L, 1))
                    if abs(x0 + sgn * 2.25) < W / 2 - 1: bmesh.ops.create_cube(bm, size=1.0, matrix=M)
    g.box(P['graphite'], 0, 0, H, W + 1.2, D + 1.2, 1.2)
    g.build('TowerDiagrid'); export('tower_diagrid')
def tower_round():
    reset(); P = palette(); g = G(); H = 70
    for i in range(int(H / 4)):
        zz = i * 4; pts = superellipse(26, 20, 2.0, 48)
        curtain_floor(g, P, pts, zz, 4.0, P['glass'], P['pearl'], P['pearl'], every=1, mull_w=0.25, mull_d=0.9)
    g.prism(P['pearl'], superellipse(27, 21, 2.0, 48), H, H + 1.2); g.prism(P['gold'], superellipse(10, 7, 2.0, 32), H + 1.2, H + 4)
    g.build('TowerRound'); export('tower_round')

ALL = dict(talentopia_tower=talentopia_tower, bank_hq=bank_hq, agency_upper=agency_upper, university=university, hospital_upgrade=hospital_upgrade,
           tower_slim=tower_slim, tower_stepped=tower_stepped, tower_twist=tower_twist, tower_diagrid=tower_diagrid, tower_round=tower_round)
for k, fn in ALL.items():
    if ONLY and k not in ONLY: continue
    fn()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, '..', '..', 'asset-src', k + '.blend')) if os.path.isdir(os.path.join(OUT, '..', '..', 'asset-src')) else None
