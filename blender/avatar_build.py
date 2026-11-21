# Talentopia V2 avatar base: one MPFB (MakeHuman, CC0) game-engine body with morph targets for body shape, face shape and
# expressions, plus modular hair / outfits / shoes / hat refitted to every body morph so clothing follows the body.
# blender -b -P avatar_build.py -- OUT_DIR
import bpy, bmesh, sys, os, json, math
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1]
os.makedirs(os.path.join(OUT, 'parts'), exist_ok=True); os.makedirs(os.path.join(OUT, 'skins'), exist_ok=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

from bl_ext.blender_org.mpfb.services import HumanService, LocationService, TargetService, ClothesService
from bl_ext.blender_org.mpfb.entities.objectproperties import HumanObjectProperties
from bl_ext.blender_org.mpfb.entities.clothes.mhclo import Mhclo

U = LocationService.get_user_data()
import bl_ext.blender_org.mpfb as _m
TARGETS = os.path.join(os.path.dirname(_m.__file__), 'data', 'targets')
def asset(kind, name, ext): return os.path.join(U, kind, name, name + ext)

NEUTRAL = {"gender": 0.5, "age": 0.5, "muscle": 0.5, "weight": 0.5, "proportions": 0.6, "height": 0.5, "cupsize": 0.5, "firmness": 0.5,
           "race": {"african": 1 / 3, "asian": 1 / 3, "caucasian": 1 / 3}}
base = HumanService.create_human(macro_detail_dict=NEUTRAL, scale=0.1)
rig = HumanService.add_builtin_rig(base, "game_engine") or next(o for o in bpy.data.objects if o.type == 'ARMATURE')
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
HumanService.set_character_skin(asset("skins", "young_caucasian_female", ".mhmat"), base, skin_type="GAMEENGINE")

PARTS = {  # kind -> [(name, asset_type, label)]
    'eyes': [('high-poly', 'Eyes', 'Eyes')],
    'brows': [('eyebrow001', 'Eyebrows', 'Fine'), ('eyebrow006', 'Eyebrows', 'Full')],
    'lashes': [('eyelashes01', 'Eyelashes', 'Lashes')],
    'teeth': [('teeth_base', 'Teeth', 'Teeth')], 'tongue': [('tongue01', 'Tongue', 'Tongue')],
    'hair': [('short02', 'Hair', 'Short crop'), ('short01', 'Hair', 'Short wave'), ('short03', 'Hair', 'Side part'), ('short04', 'Hair', 'Textured short'),
             ('bob01', 'Hair', 'Bob'), ('bob02', 'Hair', 'Long bob'), ('ponytail01', 'Hair', 'Ponytail'), ('long01', 'Hair', 'Long'), ('braid01', 'Hair', 'Braid'), ('afro01', 'Hair', 'Afro')],
    'outfit': [('male_casualsuit03', 'Clothes', 'Casual shirt & jeans'), ('female_casualsuit01', 'Clothes', 'Casual tee & jeans'), ('male_casualsuit05', 'Clothes', 'Hoodie & trousers'),
               ('female_casualsuit02', 'Clothes', 'Casual top & skirt'), ('male_elegantsuit01', 'Clothes', 'Business suit'), ('female_elegantsuit01', 'Clothes', 'Tailored suit'),
               ('male_worksuit01', 'Clothes', 'Work uniform'), ('female_sportsuit01', 'Clothes', 'Sportswear')],
    'shoes': [('shoes01', 'Clothes', 'Leather shoes'), ('shoes03', 'Clothes', 'Sneakers'), ('shoes06', 'Clothes', 'Boots')],
    'hat': [('fedora01', 'Clothes', 'Fedora')],
}
KIND_DIR = {'eyes': 'eyes', 'brows': 'eyebrows', 'lashes': 'eyelashes', 'teeth': 'teeth', 'tongue': 'tongue', 'hair': 'hair', 'outfit': 'clothes', 'shoes': 'clothes', 'hat': 'clothes'}
proxies = []  # (kind, name, label, object)
for kind, items in PARTS.items():
    for name, atype, label in items:
        before = set(bpy.data.objects)
        try: HumanService.add_mhclo_asset(asset(KIND_DIR[kind], name, ".mhclo"), base, asset_type=atype, subdiv_levels=0, material_type="GAMEENGINE")
        except Exception as e: print('SKIP', name, e); continue
        new = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
        if new: proxies.append((kind, name, label, new[0])); new[0].name = f'{kind}__{name}'
print('PROXIES', len(proxies))

# per-outfit / per-shoe body vertices hidden under the garment (bitmask stored per vertex)
hide_bits = {}; bit = 0
for kind, name, label, ob in proxies:
    if kind not in ('outfit', 'shoes'): continue
    m = Mhclo(); m.load(asset('clothes', name, '.mhclo'))
    hide_bits[name] = bit; vs = [v for v in (m.delverts or []) if v < len(base.data.vertices)]
    if not hasattr(base, '_hide'): pass
    attr = base.data.attributes.get('_hide') or base.data.attributes.new('_hide', 'FLOAT', 'POINT')
    for v in vs: attr.data[v].value = float(int(attr.data[v].value) | (1 << bit))
    bit += 1
# drop clothing delete-masks (we hide per outfit at runtime instead)
for mod in list(base.modifiers):
    if mod.type == 'MASK' and mod.vertex_group != 'body': base.modifiers.remove(mod)

def cap_base():
    k = base.shape_key_add(name='__cap', from_mix=True); co = [v.co.copy() for v in k.data]; base.shape_key_remove(k); return co
def cap(ob): return [v.co.copy() for v in ob.data.vertices]
def refit(obs):
    for ob in obs: ClothesService.fit_clothes_to_human(ob, base, set_parent=False)

allp = [p[3] for p in proxies]
head_kinds = {'eyes', 'brows', 'lashes', 'teeth', 'tongue', 'hair', 'hat'}
face_kinds = {'eyes', 'brows', 'lashes', 'teeth', 'tongue'}
refit(allp); B0 = cap_base(); P0 = {p[3].name: cap(p[3]) for p in proxies}
morphs = {}  # name -> (base deltas, {proxy: deltas})
def record(name, obs):
    B = cap_base(); refit(obs); D = {}
    for ob in obs:
        c = cap(ob); d = [c[i] - P0[ob.name][i] for i in range(len(c))]
        if max((x.length for x in d), default=0) > 2e-4: D[ob.name] = d
    morphs[name] = ([B[i] - B0[i] for i in range(len(B))], D); print('MORPH', name, 'proxies', len(D))

BODY = [('masc', 'gender', 1.0), ('fem', 'gender', 0.0), ('heavy', 'weight', 1.0), ('slim', 'weight', 0.0), ('muscular', 'muscle', 1.0)]
for name, prop, val in BODY:
    HumanObjectProperties.set_value(prop, val, entity_reference=base); TargetService.reapply_macro_details(base)
    record(name, allp)
    HumanObjectProperties.set_value(prop, NEUTRAL[prop], entity_reference=base); TargetService.reapply_macro_details(base)
refit(allp)

FACE = {'jawWide': ['chin/chin-width-incr'], 'chinStrong': ['chin/chin-prominent-incr'], 'noseWide': ['nose/nose-scale-horiz-incr'], 'noseNarrow': ['nose/nose-scale-horiz-decr'],
        'cheekbones': ['cheek/l-cheek-bones-incr', 'cheek/r-cheek-bones-incr'], 'eyesBig': ['eyes/l-eye-scale-incr', 'eyes/r-eye-scale-incr'],
        'eyesUp': ['eyes/l-eye-corner1-up', 'eyes/r-eye-corner1-up'], 'lipsFull': ['mouth/mouth-lowerlip-volume-incr', 'mouth/mouth-upperlip-volume-incr'],
        'headRound': ['head/head-round'], 'headSquare': ['head/head-square']}
EX = os.path.join('expression', 'units', 'caucasian')
EXPR = {'blinkL': [EX + '/eye-left-closure'], 'blinkR': [EX + '/eye-right-closure'], 'smile': [EX + '/mouth-corner-puller'], 'jawOpen': [EX + '/mouth-open'],
        'mouthO': [EX + '/mouth-pursing'], 'mouthE': [EX + '/mouth-retraction'], 'browsUp': [EX + '/eyebrows-left-up', EX + '/eyebrows-right-up'],
        'browsDown': [EX + '/eyebrows-left-down', EX + '/eyebrows-right-down']}
def target_morph(name, paths, kinds):
    keys = []
    for p in paths:
        fp = os.path.join(TARGETS, p + '.target.gz')
        if not os.path.exists(fp): print('MISSING target', fp); continue
        TargetService.load_target(base, fp, weight=1.0, name='__t_' + os.path.basename(p)); keys.append('__t_' + os.path.basename(p))
    if not keys: return
    record(name, [p[3] for p in proxies if p[0] in kinds])
    for k in keys:
        kb = base.data.shape_keys.key_blocks.get(k)
        if kb: base.shape_key_remove(kb)
    refit([p[3] for p in proxies if p[0] in kinds])
for n, ps in FACE.items(): target_morph(n, ps, head_kinds)
for n, ps in EXPR.items(): target_morph(n, ps, face_kinds)

# bake neutral shape into the base, then add our morphs as clean shape keys
base.shape_key_clear()
for i, v in enumerate(base.data.vertices): v.co = B0[i]
base.shape_key_add(name='Basis')
for name, (bd, pd) in morphs.items():
    k = base.shape_key_add(name=name, from_mix=False)
    for i, d in enumerate(bd): k.data[i].co = B0[i] + d
for kind, pname, label, ob in proxies:
    for i, v in enumerate(ob.data.vertices): v.co = P0[ob.name][i]
    ob.shape_key_add(name='Basis')
    for name, (bd, pd) in morphs.items():
        if ob.name in pd:
            k = ob.shape_key_add(name=name, from_mix=False)
            for i, d in enumerate(pd[ob.name]): k.data[i].co = P0[ob.name][i] + d

# ---------------------------------------------------------------- procedural beards cut from the face surface (keep weights + morphs)
def region_from(deltas, frac):
    mx = max(d.length for d in deltas) or 1; return {i for i, d in enumerate(deltas) if d.length > frac * mx}
blink = region_from(morphs['blinkL'][0], 0.2) | region_from(morphs['blinkR'][0], 0.2)
lips = region_from(morphs['mouthO'][0], 0.35)
head_g = base.vertex_groups.get('head'); body_g = base.vertex_groups.get('body')
gi_head, gi_body = head_g.index if head_g else -1, body_g.index if body_g else -1
def w(v, gi): return next((g.weight for g in v.groups if g.group == gi), 0.0)
V = base.data.vertices
eye_z = sum(V[i].co.z for i in blink) / max(1, len(blink)); lip_z = sum(V[i].co.z for i in lips) / max(1, len(lips)); lip_y = sum(V[i].co.y for i in lips) / max(1, len(lips))
headv = [v for v in V if w(v, gi_head) > 0.5 and w(v, gi_body) > 0.5]
hy = sum(v.co.y for v in headv) / len(headv); hx = max(abs(v.co.x) for v in headv)
chin_z = min(v.co.z for v in headv if v.co.y < hy)
def beard_set(full):
    top = lip_z + (eye_z - lip_z) * (0.42 if full else 0.3)
    s = set()
    for v in V:
        if w(v, gi_body) < 0.5: continue
        c = v.co
        if c.y > hy + 0.004: continue
        if w(v, gi_head) > 0.3 and chin_z - 0.002 <= c.z <= top and abs(c.x) < hx * 0.93 and v.index not in lips: s.add(v.index)
        elif chin_z - 0.035 <= c.z < chin_z and c.y < hy - 0.01 and abs(c.x) < hx * 0.7: s.add(v.index)
    if not full: s -= {i for i in s if V[i].co.z > lip_z + 0.004 and abs(V[i].co.x) < 0.012}  # stubble: lighter moustache gap
    return s
def make_beard(name, sel, offset):
    ob = base.copy(); ob.data = base.data.copy(); ob.name = name; bpy.context.scene.collection.objects.link(ob)
    for mod in list(ob.modifiers):
        if mod.type != 'ARMATURE': ob.modifiers.remove(mod)
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
    bm.normal_update(); norms = [v.normal.copy() for v in bm.verts]
    for lay in bm.verts.layers.shape.values():
        for v in bm.verts: v[lay] = v[lay] + norms[v.index] * offset
    for v in bm.verts: v.co = v.co + norms[v.index] * offset
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in sel], context='VERTS'); bm.to_mesh(ob.data); bm.free()
    if '_hide' in ob.data.attributes: ob.data.attributes.remove(ob.data.attributes['_hide'])
    ob.data.materials.clear(); m = bpy.data.materials.new('Beard'); m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.05, 0.035, 0.025, 1); ob.data.materials.append(m)
    return ob
beards = [('beard', 'stubble', 'Stubble', make_beard('beard__stubble', beard_set(False), 0.0012)), ('beard', 'full', 'Short beard', make_beard('beard__full', beard_set(True), 0.0045))]
print('BEARD verts', [len(b[3].data.vertices) for b in beards])

# remove helper geometry (keep 'body' group) with bmesh, which preserves shape keys + attributes
for mod in list(base.modifiers):
    if mod.type == 'MASK': base.modifiers.remove(mod)
bm = bmesh.new(); bm.from_mesh(base.data); bm.verts.ensure_lookup_table(); dl = bm.verts.layers.deform.active
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (dl and gi_body in v[dl] and v[dl][gi_body] > 0.5)], context='VERTS'); bm.to_mesh(base.data); bm.free()
for ob in [p[3] for p in proxies] + [b[3] for b in beards]:
    for mod in list(ob.modifiers):
        if mod.type not in ('ARMATURE',): ob.modifiers.remove(mod)
print('BASE verts', len(base.data.vertices))

# ---------------------------------------------------------------- skins (textures swapped at runtime)
SKINS = ['young_caucasian_female', 'young_caucasian_male', 'young_asian_female', 'young_asian_male', 'young_african_female', 'young_african_male', 'middleage_caucasian_male', 'middleage_african_female']
skins_out = []
for s in SKINS:
    d = os.path.join(U, 'skins', s); pngs = [f for f in os.listdir(d) if f.endswith('.png') and 'diffuse' in f.lower()] if os.path.isdir(d) else []
    if not pngs: continue
    img = bpy.data.images.load(os.path.join(d, pngs[0])); img.scale(1024, 1024)
    sc = bpy.context.scene; sc.view_settings.view_transform = 'Standard'; sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 82
    img.save_render(os.path.join(OUT, 'skins', s + '.jpg'), scene=sc); skins_out.append(s)

# ---------------------------------------------------------------- export: base + one GLB per swappable part
def export(path, meshes):
    for o in bpy.data.objects: o.select_set(False)
    rig.select_set(True)
    for m in meshes: m.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_skins=True, export_animations=False,
                              export_morph=True, export_morph_normal=False, export_try_sparse_sk=True, export_attributes=True, export_image_format='AUTO', export_yup=True)
    print('EXPORTED', os.path.basename(path), round(os.path.getsize(path) / 1e6, 2), 'MB')
core = [base] + [p[3] for p in proxies if p[0] in ('eyes', 'brows', 'lashes', 'teeth', 'tongue')] + [b[3] for b in beards]
export(os.path.join(OUT, 'avatar_base.glb'), core)
catalog = {'morphs': list(morphs.keys()), 'skins': skins_out, 'hideBits': hide_bits, 'parts': {}}
for kind, name, label, ob in proxies:
    if kind in ('hair', 'outfit', 'shoes', 'hat'):
        export(os.path.join(OUT, 'parts', f'{kind}_{name}.glb'), [ob]); catalog['parts'].setdefault(kind, []).append({'id': name, 'label': label, 'file': f'parts/{kind}_{name}.glb', 'mesh': ob.name})
catalog['brows'] = [{'id': p[1], 'label': p[2], 'mesh': p[3].name} for p in proxies if p[0] == 'brows']
catalog['beards'] = [{'id': b[1], 'label': b[2], 'mesh': b[3].name} for b in beards]
json.dump(catalog, open(os.path.join(OUT, 'avatar_catalog.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, '..', '..', 'asset-src', 'avatar_base.blend'))
print('DONE')
