# Build one fully-clothed MPFB character with idle + walk animations and export a web GLB.
# blender -b -P make2.py -- OUTDIR NAME gender age african asian caucasian skin hair outfit shoes [render]
import bpy, sys, os, math
a = sys.argv[sys.argv.index('--')+1:]
OUT, NAME = a[0], a[1]
gender, age, afr, asi, cau = map(float, a[2:7]); SKIN, HAIR, OUTFIT, SHOES = a[7:11]; RENDER = len(a) > 11 and a[11] == 'render'
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
from bl_ext.blender_org.mpfb.services import HumanService, LocationService
U = LocationService.get_user_data()
def f(kind, name, ext): return os.path.join(U, kind, name, name + ext)
macro = {"gender": gender, "age": age, "muscle": 0.5, "weight": 0.45, "proportions": 0.6, "height": 0.55 if gender > .5 else 0.45,
         "cupsize": 0.5, "firmness": 0.5, "race": {"african": afr, "asian": asi, "caucasian": cau}}
base = HumanService.create_human(macro_detail_dict=macro, scale=0.1)
HumanService.add_builtin_rig(base, "game_engine")
HumanService.set_character_skin(f("skins", SKIN, ".mhmat"), base, skin_type="GAMEENGINE")
def add(kind, name, atype):
    HumanService.add_mhclo_asset(f(kind, name, ".mhclo"), base, asset_type=atype, subdiv_levels=0, material_type="GAMEENGINE")
add("eyes", "high-poly", "Eyes")
add("eyebrows", "eyebrow001" if gender < .5 else "eyebrow006", "Eyebrows")
try: add("eyelashes", "eyelashes01", "Eyelashes")
except Exception as e: print("no eyelashes", e)
add("hair", HAIR, "Hair")
add("clothes", OUTFIT, "Clothes")
add("clothes", SHOES, "Clothes")
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
# remove teeth/tongue (hidden) to save size
for o in list(bpy.data.objects):
    if any(k in o.name.lower() for k in ("teeth", "tongue", "low-poly")): bpy.data.objects.remove(o, do_unlink=True)

# ---------------- procedural animations (local bone rotations, degrees) ----------------
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='POSE')
pb = rig.pose.bones
for b in pb: b.rotation_mode = 'XYZ'
REST = {"upperarm_l": (0, 0, 0), "upperarm_r": (0, 0, 0)}
def pose(vals):
    for b in pb: b.rotation_euler = (0, 0, 0)
    for k, v in vals.items():
        if k in pb: pb[k].rotation_euler = tuple(math.radians(x) for x in v)
def key(frame):
    for b in pb: b.keyframe_insert("rotation_euler", frame=frame)
    pb["pelvis"].keyframe_insert("location", frame=frame)
ARM = float(os.environ.get("ARMDOWN", "62"))   # lower the A-pose arms to the sides
AX = os.environ.get("ARMAXIS", "Z")
def armdown(sign):
    return (0, 0, sign*ARM) if AX == "Z" else ((sign*ARM, 0, 0) if AX == "X" else (0, sign*ARM, 0))
def make_action(name, frames, fn):
    act = bpy.data.actions.new(name); rig.animation_data_create(); rig.animation_data.action = act
    for i, fr in enumerate(frames):
        pose(fn(i / (len(frames)-1))); pb["pelvis"].location = (0, 0, 0)
        if name == "Walk": pb["pelvis"].location = (0, 0.012*abs(math.sin(2*math.pi*i/(len(frames)-1))), 0)
        key(fr)
    act.use_fake_user = True
    tr = rig.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, frames[0], act); rig.animation_data.action = None
    return act
def idle(u):
    s = math.sin(2*math.pi*u)
    return {"upperarm_l": armdown(1), "upperarm_r": armdown(-1), "lowerarm_l": (0, 0, 0), "lowerarm_r": (0, 0, 0),
            "spine_02": (1.5*s, 0, 0), "spine_03": (1.0*s, 0, 0), "head": (-1*s, 0, 0)}
def walk(u):
    s = math.sin(2*math.pi*u); c = math.cos(2*math.pi*u)
    L = float(os.environ.get("LEGSIGN", "1"))
    LA = os.environ.get("LEGAXIS", "X")
    ax = lambda d: (d, 0, 0) if LA == "X" else ((0, 0, d) if LA == "Z" else (0, d, 0))
    v = {"thigh_l": ax(L*28*s), "thigh_r": ax(-L*28*s),
         "calf_l": ax(-L*35*max(0, -c)), "calf_r": ax(-L*35*max(0, c)),
         "foot_l": ax(L*10*s), "foot_r": ax(-L*10*s),
         "spine_01": (0, 4*s, 0), "spine_03": (0, -5*s, 0)}
    al = armdown(1); ar = armdown(-1)
    A = float(os.environ.get("ARMSWING", "-22"))
    v["upperarm_l"] = (al[0] + A*s if AX != "X" else al[0], al[1], al[2] + (A*s if AX == "X" else 0))
    v["upperarm_r"] = (ar[0] - A*s if AX != "X" else ar[0], ar[1], ar[2] - (A*s if AX == "X" else 0))
    v["lowerarm_l"] = (0, 0, 0); v["lowerarm_r"] = (0, 0, 0)
    return v
make_action("Idle", list(range(1, 50, 6)) + [49], idle)
make_action("Walk", list(range(1, 26, 3)) + [25], walk)
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------- optional render for checking ----------------
sc = bpy.context.scene
if RENDER:
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam)
    cam.location = (4.0, 0, 1.0) if os.environ.get("CAMSIDE") else (2.2, -3.2, 1.25); cam.rotation_euler = (math.radians(88), 0, math.radians(90)) if os.environ.get("CAMSIDE") else (math.radians(86), 0, math.radians(34)); cam.data.lens = 45; sc.camera = cam
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    for loc, e in (((2, -3, 3), 500), ((-2.5, -2, 2), 250), ((0, 2, 3), 300)):
        l = bpy.data.objects.new("L", bpy.data.lights.new("L", 'AREA')); l.data.energy = e; l.data.size = 2; l.location = loc; sc.collection.objects.link(l)
        l.rotation_euler = (math.radians(55), 0, math.atan2(loc[0], -loc[1]))
    sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x = 480; sc.render.resolution_y = 640; sc.view_settings.view_transform = 'AgX'
    tr = rig.animation_data.nla_tracks
    for nm, frs in (("Idle", [1]), ("Walk", [1, 7, 13])):
        for t in tr: t.mute = (t.name != nm)
        for fr in frs:
            sc.frame_set(fr); sc.render.filepath = os.path.join(OUT, f"{NAME}_{nm}_{fr}.png"); bpy.ops.render.render(write_still=True)
    for t in tr: t.mute = False

# ---------------- shrink textures and export ----------------
for img in bpy.data.images:
    T = int(os.environ.get("TEX", "768"))
    if img.size[0] > T:
        img.scale(T, int(T*img.size[1]/img.size[0]))
for o in bpy.data.objects: o.select_set(o.type in ('MESH', 'ARMATURE'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, NAME + ".glb"), export_format='GLB', use_selection=True, export_skins=True,
                          export_apply=True, export_animations=True, export_animation_mode='NLA_TRACKS', export_image_format='JPEG', export_jpeg_quality=78,
                          export_morph=False)
print("GLB", NAME, round(os.path.getsize(os.path.join(OUT, NAME + ".glb"))/1e6, 2), "MB")
