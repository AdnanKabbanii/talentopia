# Talentopia V4: New York style city buildings, built procedurally in Blender and exported as GLB (geometry + material names + UVs).
# blender -b -P nyc.py -- OUT_DIR
# Z up, front faces -Y (becomes +Z / south in three.js), metres, origin = ground centre of the footprint.
# Materials are only named here; world/nyc.js assigns shared photo-scanned PBR textures by name (UVs are in metres, world-aligned).
# Each building is exported twice: NAME.glb (near: recessed windows, frames, sills, fire escapes) and NAME_lo.glb (far: flat).
import bpy, bmesh, math, sys, os, random
from mathutils import Vector, Matrix

a = sys.argv[sys.argv.index('--') + 1:]
OUT = a[0]; ONLY = set(a[1:])
os.makedirs(OUT, exist_ok=True)
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))

MATS = {}
def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True; MATS[name] = m
    return MATS[name]

class G:
    def __init__(self, lo=False): self.b = {}; self.lo = lo
    def bm(self, name):
        if name not in self.b: self.b[name] = bmesh.new()
        return self.b[name]
    def rect(self, m, c, A, B):  # quad centred at c with half-axes A, B; normal = A x B
        bm = self.bm(m); vs = [bm.verts.new(c - A - B), bm.verts.new(c + A - B), bm.verts.new(c + A + B), bm.verts.new(c - A + B)]
        bm.faces.new(vs)
    def box(self, m, c, hx, hy, hz, ex=X, ey=Y, ez=Z, skip=()):
        A, B, C = ex * hx, ey * hy, ez * hz
        if '+x' not in skip: self.rect(m, c + A, B, C)
        if '-x' not in skip: self.rect(m, c - A, C, B)
        if '+y' not in skip: self.rect(m, c + B, C, A)
        if '-y' not in skip: self.rect(m, c - B, A, C)
        if '+z' not in skip: self.rect(m, c + C, A, B)
        if '-z' not in skip: self.rect(m, c - C, B, A)
    def cyl(self, m, c, r, h, seg=16, r2=None):
        bm = self.bm(m); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=Matrix.Translation(c + Z * (h / 2)))
    def build(self, name):
        objs = []
        for mname, bm in self.b.items():
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
            uv = bm.loops.layers.uv.verify()
            for f in bm.faces:  # world-aligned metre UVs by dominant axis
                n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
                for l in f.loops:
                    p = l.vert.co
                    l[uv].uv = (p.x, p.y) if ax == 2 else ((p.y, p.z) if ax == 0 else (p.x, p.z))
            me = bpy.data.meshes.new(name + '_' + mname); bm.to_mesh(me); bm.free(); me.materials.append(mat(mname))
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
    MATS.clear()

def export(name):
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=False, export_apply=True, export_yup=True, export_normals=True, export_texcoords=True, export_materials='EXPORT', export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7, export_draco_position_quantization=14, export_draco_normal_quantization=8, export_draco_texcoord_quantization=12)
    tris = sum(len(p.vertices) - 2 for o in bpy.context.scene.objects if o.type == 'MESH' for p in o.data.polygons)
    print('EXPORTED', name, round(os.path.getsize(path) / 1e6, 2), 'MB', 'tris', tris)

def glass_pick(r):
    x = r.random()
    return 'Glass' if x < 0.55 else ('GlassBlind' if x < 0.82 else 'GlassLit')

# ---------------------------------------------------------------- facade: punched windows in a wall plane
def facade(g, r, o, n, W, z0, floors, fh, bays, wall, winW, winH, sill, depth=0.22, trim='Cornice', frames=True, lintel=True, glass=None):
    """o = point on the facade plane at ground centre of this facade, n = outward normal (horizontal)."""
    t = Z.cross(n); bw = W / bays
    for f in range(floors):
        z = z0 + f * fh
        g.rect(wall, o + Z * (z + sill / 2), t * (W / 2), Z * (sill / 2))  # band under windows
        top = sill + winH; g.rect(wall, o + Z * (z + (top + fh) / 2), t * (W / 2), Z * ((fh - top) / 2))  # band over windows
        for b in range(bays + 1):  # piers between windows
            x0 = -W / 2 + (b * bw - (bw - winW) / 2 if b else 0); x1 = -W / 2 + (b * bw + (bw - winW) / 2 if b < bays else W)
            if b == 0: x0, x1 = -W / 2, -W / 2 + (bw - winW) / 2
            if x1 - x0 > 1e-3: g.rect(wall, o + t * ((x0 + x1) / 2) + Z * (z + sill + winH / 2), t * ((x1 - x0) / 2), Z * (winH / 2))
        for b in range(bays):
            c = o + t * (-W / 2 + (b + 0.5) * bw) + Z * (z + sill + winH / 2); hw, hh = winW / 2, winH / 2
            gm = glass or glass_pick(r)
            if g.lo:
                g.rect(gm, c - n * 0.02, t * hw, Z * hh); continue
            d2 = n * (depth / 2)
            g.rect(wall, c - t * hw - d2, Z * hh, n * (depth / 2)); g.rect(wall, c + t * hw - d2, n * (depth / 2), Z * hh)
            g.rect(wall, c + Z * hh - d2, t * hw, n * (depth / 2)); g.rect(trim, c - Z * hh - d2, n * (depth / 2), t * hw)
            g.rect(gm, c - n * depth, t * hw, Z * hh)
            if frames:  # double-hung sash: meeting rail + centre bar
                g.box('Frame', c - n * (depth - 0.03) + Z * (hh * 0.1), hw, 0.03, 0.035, t, n, Z, skip=('-y',))
                if winW > 1.0: g.box('Frame', c - n * (depth - 0.03), 0.03, 0.03, hh, t, n, Z, skip=('-y',))
            g.box(trim, c - Z * (hh + 0.06) + n * 0.05, hw + 0.1, 0.07, 0.06, t, n, Z)  # sill
            if lintel: g.box(trim, c + Z * (hh + 0.14) + n * 0.02, hw + 0.12, 0.04, 0.14, t, n, Z)

def storefront(g, r, o, n, W, bays, h=4.6, pier='Granite'):
    t = Z.cross(n); bw = W / bays
    g.rect(pier, o + Z * (h - 0.15), t * (W / 2), Z * 0.15)
    sign = r.choice(['SignA', 'SignB', 'SignC', 'SignD'])
    for b in range(bays):
        cx = -W / 2 + (b + 0.5) * bw; c = o + t * cx
        g.box(pier, c - t * (bw / 2 - 0.25) + Z * (h / 2) + n * 0.1, 0.25, 0.12, h / 2, t, n, Z)
        g.rect('Glass' if g.lo else 'GlassShop', c + Z * 1.9 - n * 0.15, t * (bw / 2 - 0.5), Z * 1.6)
        if not g.lo:
            g.box('Frame', c + Z * 0.25 - n * 0.1, bw / 2 - 0.5, 0.06, 0.25, t, n, Z)
            g.box('Frame', c + Z * 3.55 - n * 0.1, bw / 2 - 0.5, 0.06, 0.05, t, n, Z)
            if b % 2 == 0 and r.random() < 0.7:  # awning
                aw = r.choice(['AwningRed', 'AwningGreen', 'AwningNavy', 'AwningCream'])
                e = (t, (n * 0.8 - Z * 0.6).normalized(), None); ez = t.cross(e[1])
                g.box(aw, c + Z * 3.55 + n * 0.62, bw / 2 - 0.45, 0.8, 0.02, t, e[1], ez)
        g.rect(sign, c + Z * (h - 0.6) + n * 0.13, t * (bw / 2 - 0.35), Z * 0.35)
    g.rect('Granite', o - n * 0.15 + Z * 0.5 * 0 + Z * (h / 2), t * (W / 2), Z * (h / 2))  # back wall behind the shop glass

def cornice(g, w, d, z, mat='Cornice', big=True):
    for (dz, hz, out) in ([(0, 0.25, 0.12), (0.25, 0.45, 0.45), (0.7, 0.18, 0.6)] if big else [(0, 0.3, 0.12), (0.3, 0.2, 0.25)]):
        hx, hy = w / 2 + out, d / 2 + out; g.box(mat, Vector((0, 0, z + dz + hz / 2)), hx, hy, hz / 2)

def roof(g, w, d, z, parapet=0.9, mat='Roof', pmat=None):
    g.rect(mat, Vector((0, 0, z + 0.02)), X * (w / 2), Y * (d / 2))
    if parapet and pmat:
        for s in (-1, 1):
            g.box(pmat, Vector((0, s * (d / 2 - 0.15), z + parapet / 2)), w / 2, 0.15, parapet / 2)
            g.box(pmat, Vector((s * (w / 2 - 0.15), 0, z + parapet / 2)), 0.15, d / 2, parapet / 2)

def water_tower(g, x, y, z, r=2.1):
    if g.lo:
        g.cyl('Wood', Vector((x, y, z + 3.2)), r, 3.6, 10); g.cyl('Roof', Vector((x, y, z + 6.8)), r * 1.05, 1.4, 10, 0.05); return
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        g.box('Steel', Vector((x + sx * r * 0.65, y + sy * r * 0.65, z + 1.6)), 0.09, 0.09, 1.6)
    g.box('Steel', Vector((x, y, z + 3.15)), r * 0.95, r * 0.95, 0.07)
    g.cyl('Wood', Vector((x, y, z + 3.2)), r, 3.6, 18)
    for k in range(3): g.cyl('Steel', Vector((x, y, z + 3.6 + k * 1.1)), r + 0.03, 0.08, 18)
    g.cyl('Roof', Vector((x, y, z + 6.8)), r * 1.06, 1.5, 18, 0.06)

def fire_escape(g, o, n, x0, x1, z0, floors, fh):
    if g.lo: return
    t = Z.cross(n); w = (x1 - x0) / 2; cx = (x0 + x1) / 2; dpt = 1.05
    for f in range(floors):
        z = z0 + f * fh; c = o + t * cx + n * (dpt / 2) + Z * z
        g.box('Steel', c, w, dpt / 2, 0.03, t, n, Z)
        g.box('Steel', c + n * (dpt / 2) + Z * 0.95, w, 0.025, 0.025, t, n, Z)  # top rail
        g.box('Steel', c + n * (dpt / 2) + Z * 0.5, w, 0.012, 0.012, t, n, Z)   # mid rail
        for e in (-1, 1): g.box('Steel', c + t * (e * w) + Z * 0.48, 0.025, dpt / 2, 0.48, t, n, Z)
        for k in range(int(w * 2 / 0.55) + 1): g.box('Steel', c + n * (dpt / 2) + t * (-w + k * 0.55) + Z * 0.48, 0.012, 0.012, 0.48, t, n, Z)
        if f < floors - 1:  # stair to the next platform
            L = math.hypot(w * 1.4, fh); dirv = (t * (w * 1.4 * (1 if f % 2 else -1)) + Z * fh).normalized(); ez = dirv.cross(n)
            g.box('Steel', o + t * cx + n * (dpt * 0.55) + Z * (z + fh / 2), L / 2, 0.3, 0.03, dirv, n, ez)

# ---------------------------------------------------------------- building types
def prewar(name, seed, w, d, floors, brick, fh=3.25, bay=3.0, escape=True, tower=True, lo=False):
    r = random.Random(seed); g = G(lo); gf = 4.6; H = gf + floors * fh
    bays = max(2, round(w / bay)); dbays = max(2, round(d / bay)); winW = min(1.35, w / bays - 0.9)
    for n, W, B in ((-Y, w, bays), (Y, w, bays), (X, d, dbays), (-X, d, dbays)):
        o = n * ((d if abs(n.y) else w) / 2)
        if n.y < 0: storefront(g, r, o, n, W, B); z0 = gf
        else: g.rect('Granite' if n.y < 0 else brick, o + Z * (gf / 2), Z.cross(n) * (W / 2), Z * (gf / 2)); z0 = gf
        g.rect('Cornice', o + Z * (gf + 0.12) + n * 0.06, Z.cross(n) * (W / 2 + 0.06), Z * 0.12)
        facade(g, r, o, n, W, z0, floors, fh, B, brick, winW, 1.75, 0.85)
    cornice(g, w, d, H); roof(g, w, d, H, 0, 'Roof')
    if escape and floors >= 4: fire_escape(g, -Y * (d / 2), -Y, -w / 2 + w / bays * 1, -w / 2 + w / bays * 3, gf + 0.05, floors, fh)
    if tower and floors >= 6: water_tower(g, w * 0.22 * (1 if seed % 2 else -1), d * 0.15, H + 0.9)
    if not lo:
        for k in range(2): g.box('Metal', Vector((r.uniform(-w / 3, w / 3), r.uniform(-d / 3, 0), H + 1.3)), r.uniform(0.6, 1.4), r.uniform(0.6, 1.2), 0.45)
        g.box(brick, Vector((-w * 0.3, d * 0.3, H + 1.5)), 1.0, 1.0, 0.75)  # stair bulkhead
    return g.build(name)

def brownstones(name, seed, units=4, lo=False):
    r = random.Random(seed); g = G(lo); uw, d, fh, floors = 6.0, 14.0, 3.4, 4; w = uw * units; H = 1.6 + floors * fh - 0.8
    for u in range(units):
        cx = -w / 2 + (u + 0.5) * uw; o = Vector((cx, -d / 2, 0)); mat_ = 'Sandstone' if u % 3 else 'BrickBrown'
        g.rect(mat_, o + Z * 0.8, X * (uw / 2), Z * 0.8)
        facade(g, r, o, -Y, uw, 1.6, floors - 1, fh, 3, mat_, 1.05, 2.2, 0.6, trim='Cornice')
        g.rect(mat_, o + Z * (1.6 + (floors - 1) * fh + 0.5), X * (uw / 2), Z * 0.5)
        if not lo:  # stoop
            for s in range(8): g.box('Sandstone', o + Vector((-uw * 0.28, -2.6 + s * 0.32, s * 0.2 + 0.1)), 0.85, 0.16 + (7 - s) * 0.0, 0.1 + 0.0)
            for e in (-1, 1): g.box('Steel', o + Vector((-uw * 0.28 + e * 0.88, -1.4, 1.35)), 0.025, 1.3, 0.025, X, (Y * 2.6 + Z * 1.6).normalized(), X.cross((Y * 2.6 + Z * 1.6).normalized()))
            g.rect('Wood', o + Vector((-uw * 0.28, -0.05, 2.75)), X * 0.6, Z * 1.15)
        cornice(g, uw, 0.6, H - 0.1, 'CorniceDark', big=False) if False else g.box('CorniceDark', o + Vector((0, -0.3, H + 0.3)), uw / 2, 0.35, 0.3)
    for n in (Y, X, -X):
        o = n * ((d if abs(n.y) else w) / 2); W = w if abs(n.y) else d
        facade(g, r, o, n, W, 0.4, floors, fh * 0.98, max(2, round(W / 3)), 'BrickBrown', 1.0, 1.7, 0.8, lintel=False)
    roof(g, w, d, H + 0.6, 0, 'Roof')
    return g.build(name)

def office(name, seed, w, d, tiers, stone='Limestone', fh=3.8, bay=1.9, lo=False, crown=False):
    """tiers: list of (floors, inset) -- wedding-cake setbacks like 1920s Manhattan offices."""
    r = random.Random(seed); g = G(lo); z = 0.0; base = 8.0
    for i, (floors, inset) in enumerate(tiers):
        tw, td = w - 2 * inset, d - 2 * inset; h = (base if i == 0 else 0) + floors * fh
        for n, W in ((-Y, tw), (Y, tw), (X, td), (-X, td)):
            o = n * ((td if abs(n.y) else tw) / 2); B = max(2, round(W / bay))
            if i == 0:
                if n.y < 0: storefront(g, r, o, n, W, max(2, round(W / 5)), h=base, pier='Granite')
                else: g.rect('Granite', o + Z * (base / 2), Z.cross(n) * (W / 2), Z * (base / 2))
                facade(g, r, o, n, W, base, floors, fh, B, stone, W / B - 0.55, 2.2, 0.9, trim=stone, lintel=False, frames=not lo)
            else: facade(g, r, o, n, W, z, floors, fh, B, stone, W / B - 0.55, 2.2, 0.9, trim=stone, lintel=False, frames=not lo)
        z += h; cornice(g, tw, td, z, stone, big=False); roof(g, tw, td, z + 0.5, 0, 'Roof')
        if i == len(tiers) - 1 and not lo:
            for k in range(2): g.box('Metal', Vector((r.uniform(-tw / 4, tw / 4), r.uniform(-td / 4, td / 4), z + 1.6)), 1.5, 1.2, 0.9)
    if crown:
        tw = w - 2 * tiers[-1][1]
        for k in range(4): s = tw / 2 * (0.75 - k * 0.15); g.box('Metal', Vector((0, 0, z + 1 + k * 2.4)), s, s, 1.2)
        g.cyl('Metal', Vector((0, 0, z + 10.6)), 0.6, 16, 8, 0.05)
    return g.build(name)

def glass_tower(name, seed, w, d, floors, fh=4.0, lo=False, slant=False):
    r = random.Random(seed); g = G(lo); H = floors * fh; lobby = 7.0
    for n in (-Y, Y, X, -X):
        W = w if abs(n.y) else d; o = n * ((d if abs(n.y) else w) / 2); t = Z.cross(n)
        g.rect('GlassShop', o + Z * (lobby / 2) - n * 1.2, t * (W / 2 - 1.2), Z * (lobby / 2))
        g.rect('GlassCurtain', o + Z * (lobby + (H - lobby) / 2), t * (W / 2), Z * ((H - lobby) / 2))
        if not lo:
            k = int(W / 1.5)
            for i in range(k + 1): g.box('Mullion', o + t * (-W / 2 + i * W / k) + Z * ((lobby + H) / 2) + n * 0.12, 0.05, 0.12, (H - lobby) / 2, t, n, Z, skip=('-y',))
            for f in range(int((H - lobby) / fh) + 1): g.box('Mullion', o + Z * (lobby + f * fh) + n * 0.06, W / 2, 0.06, 0.08, t, n, Z, skip=('-y',))
        for e in (-1, 1): g.box('Granite', o + t * (e * (W / 2 - 0.6)) + Z * (lobby / 2) - n * 0.6, 0.6, 0.6, lobby / 2, t, n, Z)
    g.rect('Granite', Vector((0, 0, lobby)), X * (w / 2), Y * (d / 2)) if False else None
    roof(g, w, d, H, 1.2, 'Roof', 'Mullion')
    if not lo: g.box('Metal', Vector((0, d * 0.1, H + 2.0)), w * 0.3, d * 0.25, 2.0)
    return g.build(name)

def deco_tower(name, seed, w, floors_list, lo=False):
    r = random.Random(seed); g = G(lo); z = 0.0; fh = 3.8
    for i, floors in enumerate(floors_list):
        s = w * (1 - i * 0.16); h = floors * fh + (7 if i == 0 else 0)
        for n in (-Y, Y, X, -X):
            o = n * (s / 2); t = Z.cross(n); B = max(3, round(s / 2.0))
            if i == 0:
                if n.y < 0: storefront(g, r, o, n, s, max(2, round(s / 6)), h=7, pier='Granite')
                else: g.rect('Granite', o + Z * 3.5, t * (s / 2), Z * 3.5)
            z0 = z + (7 if i == 0 else 0)
            facade(g, r, o, n, s, z0, floors, fh, B, 'Limestone', s / B - 0.75, 2.4, 0.7, trim='Limestone', lintel=False, frames=False, glass=None)
            if not lo:
                for b in range(B + 1): g.box('Limestone', o + t * (-s / 2 + b * s / B) + Z * (z0 + floors * fh / 2) + n * 0.18, 0.2, 0.2, floors * fh / 2, t, n, Z)
        z += h; g.box('Limestone', Vector((0, 0, z + 0.5)), s / 2 + 0.3, s / 2 + 0.3, 0.5); z += 1
        roof(g, s, s, z, 0, 'Roof')
    s = w * (1 - len(floors_list) * 0.16)
    for k in range(5): q = s / 2 * (1 - k * 0.18); g.box('Metal' if k > 1 else 'Limestone', Vector((0, 0, z + k * 2.6 + 1.3)), q, q, 1.3)
    g.cyl('Metal', Vector((0, 0, z + 13)), 0.9, 30, 8, 0.05)
    return g.build(name)

BUILD = {
    'prewar_a': lambda lo: prewar('prewar_a', 11, 24, 20, 8, 'BrickRed', lo=lo),
    'prewar_b': lambda lo: prewar('prewar_b', 12, 18, 18, 6, 'BrickYellow', lo=lo),
    'prewar_c': lambda lo: prewar('prewar_c', 13, 30, 22, 11, 'BrickBrown', lo=lo),
    'prewar_d': lambda lo: prewar('prewar_d', 14, 15, 16, 5, 'BrickDark', tower=False, lo=lo),
    'prewar_e': lambda lo: prewar('prewar_e', 15, 21, 20, 9, 'BrickYellow', escape=False, lo=lo),
    'brownstones': lambda lo: brownstones('brownstones', 21, 4, lo=lo),
    'office_a': lambda lo: office('office_a', 31, 34, 30, [(12, 0), (6, 3), (4, 6.5)], lo=lo),
    'office_b': lambda lo: office('office_b', 32, 28, 26, [(16, 0), (5, 3.5)], stone='BrickYellow', lo=lo),
    'office_c': lambda lo: office('office_c', 33, 40, 36, [(18, 0), (8, 4), (6, 8), (4, 11)], lo=lo, crown=True),
    'glass_a': lambda lo: glass_tower('glass_a', 41, 30, 30, 40, lo=lo),
    'glass_b': lambda lo: glass_tower('glass_b', 42, 26, 36, 28, lo=lo),
    'glass_c': lambda lo: glass_tower('glass_c', 43, 22, 22, 55, lo=lo),
    'deco_a': lambda lo: deco_tower('deco_a', 51, 36, [20, 14, 10, 8], lo=lo),
    'deco_b': lambda lo: deco_tower('deco_b', 52, 30, [16, 12, 8], lo=lo),
}
for k, fn in BUILD.items():
    if ONLY and k not in ONLY: continue
    for lo in ((True,) if k.startswith(('office', 'deco')) else (False, True)):  # skyline towers are only ever seen from afar
        reset(); fn(lo); export(k + ('_lo' if lo else ''))
