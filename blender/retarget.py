# Retarget Quaternius Universal Animation Library clips (CC0, UE-mannequin skeleton) onto MPFB/MakeHuman game_engine characters.
# blender -b -P retarget.py -- target.glb out.glb clips.json ual1.glb [ual2.glb ...]
# clips.json: [["OutName", "SourceAnimName"], ...]
# Method: (1) align both armatures to face the same way, (2) build a reference pose of the target whose bone directions match the
# source rest pose (T-pose vs A-pose), (3) per frame, world-space rotation transfer P_t = P_s * Rs^-1 * Rt_ref, (4) pelvis translation
# scaled by hip height. Also measures each loop's ground speed from the planted foot so the web player can avoid foot sliding.
import bpy, sys, os, json, math
from mathutils import Matrix, Quaternion, Vector

a = sys.argv[sys.argv.index('--') + 1:]
TGT, OUT, CLIPS, SRCS = a[0], a[1], json.load(open(a[2])), a[3:]

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for act in list(bpy.data.actions): bpy.data.actions.remove(act)

def imp(path):
    before = set(bpy.data.objects); acts_before = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.data.objects if o not in before]
    acts = [x for x in bpy.data.actions if x not in acts_before]
    return objs, acts

tobjs, tacts = imp(TGT)
T = next(o for o in tobjs if o.type == 'ARMATURE')
for x in tacts: bpy.data.actions.remove(x)
if T.animation_data:
    for tr in list(T.animation_data.nla_tracks): T.animation_data.nla_tracks.remove(tr)
    T.animation_data.action = None

sources = []  # (armature, {animname: action})
for p in SRCS:
    objs, acts = imp(p)
    S = next(o for o in objs if o.type == 'ARMATURE')
    for o in objs:
        if o.type == 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    if S.animation_data: S.animation_data.action = None
    sources.append((S, acts))

def find_action(name):
    for S, acts in sources:
        for x in acts:
            base = x.name.split('_Armature')[0]
            if x.name == name or base == name or x.name.startswith(name + '_') and x.name[len(name) + 1:].lower().startswith('arm'):
                return S, x
    for S, acts in sources:
        for x in acts:
            if x.name.startswith(name): return S, x
    return None, None

bpy.context.view_layer.update()
lower = lambda s: s.lower()

RIG = {'pelvis': 'def-hips', 'spine_01': 'def-spine.001', 'spine_02': 'def-spine.002', 'spine_03': 'def-spine.003', 'neck_01': 'def-neck', 'head': 'def-head'}
for s_ in ('l', 'r'):
    S_ = s_.upper()
    RIG.update({f'clavicle_{s_}': f'def-shoulder.{S_}', f'upperarm_{s_}': f'def-upper_arm.{S_}', f'lowerarm_{s_}': f'def-forearm.{S_}', f'hand_{s_}': f'def-hand.{S_}',
                f'thigh_{s_}': f'def-thigh.{S_}', f'calf_{s_}': f'def-shin.{S_}', f'foot_{s_}': f'def-foot.{S_}', f'ball_{s_}': f'def-toe.{S_}'})
    for f_ in ('index', 'middle', 'pinky', 'ring'):
        for k in (1, 2, 3): RIG[f'{f_}_0{k}_{s_}'] = f'def-f_{f_}.0{k}.{S_}'
    for k in (1, 2, 3): RIG[f'thumb_0{k}_{s_}'] = f'def-thumb.0{k}.{S_}'
RIG = {k: v.lower() for k, v in RIG.items()}
def build_map(S):
    sb = {lower(b.name): b for b in S.data.bones}
    return {b.name: sb.get(lower(b.name)) or sb.get(RIG.get(lower(b.name), '#')) for b in tb}

def forward(arm):
    W = arm.matrix_world; b0 = arm.data.bones
    lk = {lower(x.name): x for x in b0}
    class _B:
        def get(self, n): return lk.get(n) or lk.get(RIG.get(n, '#'))
    b = _B()
    f = Vector((0, 0, 0))
    for s in ('l', 'r'):
        fb = b.get('foot_' + s); bb = b.get('ball_' + s)
        if fb and bb: f += (W @ bb.head_local) - (W @ fb.head_local)
    f.z = 0; return f.normalized()

def set_action(arm, act):
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = act
    try:
        if act is not None and getattr(ad, 'action_slot', None) is None and len(act.slots): ad.action_slot = act.slots[0]
    except Exception as e: pass

tf = forward(T)
for S, _ in sources:
    sf = forward(S)
    ang = math.atan2(tf.y, tf.x) - math.atan2(sf.y, sf.x)
    S.matrix_world = Matrix.Rotation(ang, 4, 'Z') @ S.matrix_world
    S.location = T.location.copy()
bpy.context.view_layer.update()
print('forward target', tuple(round(v, 2) for v in tf), 'source', tuple(round(v, 2) for v in forward(sources[0][0])))

Wt = T.matrix_world.copy(); Wt_rot = Wt.to_quaternion()
tb = T.data.bones
order = []  # top-down
def walk(b):
    order.append(b)
    for c in b.children: walk(c)
for b in tb:
    if b.parent is None: walk(b)

# preferred child for bone direction
PREF = {'pelvis': 'spine_01', 'spine_01': 'spine_02', 'spine_02': 'spine_03', 'spine_03': 'neck_01', 'neck_01': 'head', 'clavicle_l': 'upperarm_l', 'clavicle_r': 'upperarm_r',
        'upperarm_l': 'lowerarm_l', 'upperarm_r': 'lowerarm_r', 'lowerarm_l': 'hand_l', 'lowerarm_r': 'hand_r', 'hand_l': 'middle_01_l', 'hand_r': 'middle_01_r',
        'thigh_l': 'calf_l', 'thigh_r': 'calf_r', 'calf_l': 'foot_l', 'calf_r': 'foot_r', 'foot_l': 'ball_l', 'foot_r': 'ball_r'}
for f in ('index', 'middle', 'pinky', 'ring', 'thumb'):
    for s in ('l', 'r'):
        PREF[f'{f}_01_{s}'] = f'{f}_02_{s}'; PREF[f'{f}_02_{s}'] = f'{f}_03_{s}'



def ref_pose(S, mp):
    """Target reference world rotations whose bone directions match the source rest directions."""
    Ws = S.matrix_world
    H = {b.name: Wt @ b.head_local for b in tb}
    Rt = {b.name: Wt_rot @ b.matrix_local.to_quaternion() for b in tb}
    C = {}; Hn = {}; ref = {}
    for b in order:
        Cp = C[b.parent.name] if b.parent else Quaternion()
        Hn[b.name] = (Hn[b.parent.name] + Cp @ (H[b.name] - H[b.parent.name])) if b.parent else H[b.name]
        D = Quaternion()
        ch = PREF.get(lower(b.name))
        s = mp.get(b.name)
        if ch and s and ch in [lower(c.name) for c in b.children]:
            cname = next(c.name for c in b.children if lower(c.name) == ch)
            sc = mp.get(cname)
            if sc:
                dcur = Cp @ (H[cname] - H[b.name])
                dsrc = (Ws @ sc.head_local) - (Ws @ s.head_local)
                if dcur.length > 1e-5 and dsrc.length > 1e-5: D = dcur.rotation_difference(dsrc)
        C[b.name] = D @ Cp
        ref[b.name] = C[b.name] @ Rt[b.name]
    return ref

results = {}
sc = bpy.context.scene
for out_name, src_name in CLIPS:
    S, act = find_action(src_name)
    if not act: print('MISSING', src_name); continue
    mp = build_map(S); ref = ref_pose(S, mp)
    Ws = S.matrix_world; Ws_rot = Ws.to_quaternion()
    Rs = {b.name: Ws_rot @ b.matrix_local.to_quaternion() for b in S.data.bones}
    t_pel = tb.get('pelvis'); s_pel = mp['pelvis']
    ratio = (Wt @ t_pel.head_local).z / max(1e-4, (Ws @ s_pel.head_local).z)
    set_action(S, act)
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    newact = bpy.data.actions.new(out_name); set_action(T, newact)
    for pb in T.pose.bones: pb.rotation_mode = 'QUATERNION'
    rest_pel_w = Ws @ s_pel.head_local
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        Pt_arm = {}; Mt_arm = {}
        for b in order:
            s = mp.get(b.name); pb = T.pose.bones[b.name]
            R_full = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local.copy()
            Pp_full = Mt_arm[b.parent.name] if b.parent else Matrix.Identity(4)
            if s:
                spb = S.pose.bones[s.name]
                Ps_w = Ws_rot @ spb.matrix.to_quaternion()
                Pt_w = Ps_w @ Rs[s.name].inverted() @ ref[b.name]
                Pt = Wt_rot.inverted() @ Pt_w
                base = Pp_full @ R_full
                if lower(b.name) == 'pelvis':
                    head_w = Ws @ spb.head; dw = (head_w - rest_pel_w) * ratio
                    head_t = Wt.inverted() @ ((Wt @ b.head_local) + dw)
                    M = Matrix.LocRotScale(head_t, Pt, None)
                    B = base.inverted() @ M
                    pb.location = B.to_translation(); pb.rotation_quaternion = B.to_quaternion()
                else:
                    Bq = base.to_quaternion().inverted() @ Pt
                    pb.location = (0, 0, 0); pb.rotation_quaternion = Bq
            else:
                pb.location = (0, 0, 0); pb.rotation_quaternion = Quaternion()
            Mt_arm[b.name] = Pp_full @ R_full @ Matrix.Translation(pb.location) @ pb.rotation_quaternion.to_matrix().to_4x4()
            pb.keyframe_insert('rotation_quaternion', frame=f - f0 + 1)
            if lower(b.name) == 'pelvis': pb.keyframe_insert('location', frame=f - f0 + 1)
    # measure ground speed from planted foot (world, target after keying)
    n = f1 - f0 + 1; fps = sc.render.fps / sc.render.fps_base
    pos = {s: [] for s in ('l', 'r')}
    for i in range(1, n + 1):
        sc.frame_set(i); bpy.context.view_layer.update()
        for s in ('l', 'r'):
            pbn = T.pose.bones.get('ball_' + s) or T.pose.bones.get('foot_' + s)
            pos[s].append(T.matrix_world @ pbn.head)
    speeds = []
    for s in ('l', 'r'):
        zs = [p.z for p in pos[s]]; zmin = min(zs)
        fwd = tf
        for i in range(1, n):
            if pos[s][i].z < zmin + 0.03 and pos[s][i - 1].z < zmin + 0.03:
                speeds.append(-(pos[s][i] - pos[s][i - 1]).dot(fwd) * fps)
    sp = sorted(speeds)[len(speeds) // 2] if speeds else 0
    results[out_name] = {'frames': n, 'duration': round((n - 1) / fps, 3), 'groundSpeed': round(sp, 3)}
    tr = T.animation_data.nla_tracks.new(); tr.name = out_name; tr.strips.new(out_name, 1, newact); set_action(T, None)
    print('CLIP', out_name, results[out_name])

for S, _ in sources: bpy.data.objects.remove(S, do_unlink=True)
for o in bpy.data.objects: o.select_set(o.type in ('MESH', 'ARMATURE'))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_skins=True, export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_image_format='JPEG', export_jpeg_quality=80, export_morph=False,
                          export_force_sampling=True, export_optimize_animation_size=True)
json.dump(results, open(OUT.replace('.glb', '.clips.json'), 'w'), indent=1)
print('EXPORTED', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB')
