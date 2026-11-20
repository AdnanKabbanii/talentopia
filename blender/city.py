# Talentopia cinematic city — Blender 5.x, Eevee.  Usage:
#   blender -b -P city.py -- OUTDIR [still|anim] [W H]
import bpy, bmesh, math, random, sys, os
from mathutils import Vector, Euler
args = sys.argv[sys.argv.index('--')+1:]
OUT = args[0]; MODE = args[1] if len(args) > 1 else 'still'
W = int(args[2]) if len(args) > 2 else 1280; H = int(args[3]) if len(args) > 3 else 720
random.seed(7)
import time; T0 = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
col = sc.collection

# ---------------------------------------------------------------- materials
def mat(name, base=(0.8,0.8,0.8), metal=0.0, rough=0.4, emit=None, estr=0.0, coat=0.0, alpha=1.0, trans=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*base, 1); b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if coat: b.inputs["Coat Weight"].default_value = coat
    if trans: b.inputs["Transmission Weight"].default_value = trans
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = estr
    if alpha < 1: b.inputs["Alpha"].default_value = alpha
    return m
def emissive(name, c, s):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    e = nt.nodes.new("ShaderNodeEmission"); e.inputs[0].default_value = (*c, 1); e.inputs[1].default_value = s
    o = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(e.outputs[0], o.inputs[0]); return m
def window_tower_mat(name, wall, seed):
    """Glass/metal facade with a grid of windows; a random subset glows warm or cool."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    b = N.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*wall, 1); b.inputs["Metallic"].default_value = 0.25; b.inputs["Roughness"].default_value = 0.25; b.inputs["Coat Weight"].default_value = 0.5
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping")
    sxyz = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sxyz.inputs[0])
    addxy = N.new("ShaderNodeMath"); addxy.operation = 'ADD'; L.new(sxyz.outputs["X"], addxy.inputs[0]); L.new(sxyz.outputs["Y"], addxy.inputs[1])
    cxyz = N.new("ShaderNodeCombineXYZ"); L.new(addxy.outputs[0], cxyz.inputs["X"]); L.new(sxyz.outputs["Z"], cxyz.inputs["Y"])
    L.new(cxyz.outputs[0], mp.inputs["Vector"])
    mp.inputs["Scale"].default_value = (0.3, 0.3, 0.3)
    br = N.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = 1.0; br.inputs["Mortar Size"].default_value = 0.1; br.inputs["Brick Width"].default_value = 1.0; br.inputs["Row Height"].default_value = 0.9
    br.offset = 0.0; br.squash = 1.0
    L.new(mp.outputs["Vector"], br.inputs["Vector"])
    br.inputs["Color1"].default_value = (0,0,0,1); br.inputs["Color2"].default_value = (1,1,1,1); br.inputs["Mortar"].default_value = (0,0,0,1)
    br.inputs["Bias"].default_value = 0.0
    bw = N.new("ShaderNodeRGBToBW"); L.new(br.outputs["Color"], bw.inputs[0])
    rnd = N.new("ShaderNodeMath"); rnd.operation = 'GREATER_THAN'; rnd.inputs[1].default_value = 0.5
    L.new(bw.outputs[0], rnd.inputs[0])
    ns = bw
    inv = N.new("ShaderNodeMath"); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    L.new(br.outputs["Fac"], inv.inputs[1])  # Fac=1 on mortar -> window area = 1-Fac
    lit = N.new("ShaderNodeMath"); lit.operation = 'MULTIPLY'; L.new(inv.outputs[0], lit.inputs[0]); L.new(rnd.outputs[0], lit.inputs[1])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (1.0, 0.78, 0.55, 1); ramp.color_ramp.elements[1].color = (0.62, 0.78, 1.0, 1)
    L.new(bw.outputs[0], ramp.inputs["Fac"])
    L.new(ramp.outputs["Color"], b.inputs["Emission Color"])
    st = N.new("ShaderNodeMath"); st.operation = 'MULTIPLY'; st.inputs[1].default_value = 4.0; L.new(lit.outputs[0], st.inputs[0])
    L.new(st.outputs[0], b.inputs["Emission Strength"])
    return m

WHITE = mat("white", (0.92, 0.92, 0.97), metal=0.0, rough=0.22, coat=0.6)
PEARL = mat("pearl", (0.85, 0.84, 0.95), metal=0.3, rough=0.15, coat=1.0)
GLASS = mat("glass", (0.55, 0.62, 0.95), metal=0.9, rough=0.05)
DARK = mat("dark", (0.04, 0.04, 0.08), metal=0.6, rough=0.3)
ROADM = mat("road", (0.08, 0.08, 0.12), metal=0.3, rough=0.35)
GREEN = mat("leaf", (0.05, 0.22, 0.12), rough=0.8)
TRUNK = mat("trunk", (0.12, 0.09, 0.08), rough=0.8)
NEON_V = emissive("neonV", (0.62, 0.36, 1.0), 5)
NEON_C = emissive("neonC", (0.30, 0.86, 0.95), 4.5)
NEON_P = emissive("neonP", (0.97, 0.55, 0.85), 4)
NEON_W = emissive("neonW", (0.9, 0.92, 1.0), 4)
CARL = emissive("carL", (1.0, 0.95, 0.85), 12)
CART = emissive("carT", (1.0, 0.15, 0.25), 10)
TOWERS = [window_tower_mat(f"tw{i}", w, i) for i, w in enumerate([(0.86,0.87,0.93),(0.7,0.74,0.86),(0.92,0.92,0.96),(0.5,0.55,0.72),(0.95,0.95,0.98)])]

def link(o):
    if o.name not in col.objects: col.objects.link(o)
    return o
def box(name, loc, size, m, rot=0, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc); o = bpy.context.object; o.name = name
    o.scale = (size[0]/2, size[1]/2, size[2]/2); o.rotation_euler[2] = rot
    bpy.ops.object.transform_apply(scale=True)
    if bevel: b = o.modifiers.new("bv", 'BEVEL'); b.width = bevel; b.segments = 2
    o.data.materials.append(m); return o
def cyl(name, loc, r, d, m, verts=48, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d, location=loc)
    else: bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=d, location=loc)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
def torus(name, loc, R, r, m, rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=128, minor_segments=12, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o

# ---------------------------------------------------------------- water & ground
bpy.ops.mesh.primitive_plane_add(size=4000, location=(0,0,-0.5)); water = bpy.context.object; water.name = "water"
water.data.materials.append(mat("waterM", (0.01, 0.015, 0.05), metal=0.0, rough=0.03, coat=1.0))
def island(cx, cy, r, h=1.0):
    o = cyl("island", (cx, cy, h/2-0.5), r, h, mat("pave", (0.18,0.18,0.24), metal=0.2, rough=0.25), verts=96)
    torus("islandRim", (cx, cy, h-0.45), r, 0.18, NEON_V); return o
island(0, 0, 46, 1.2)
for k in range(9):
    a = k/9*2*math.pi + 0.3; island(math.cos(a)*230, math.sin(a)*230, 55 + (k%3)*12, 1.0)
for k in range(14):
    a = k/14*2*math.pi; island(math.cos(a)*420, math.sin(a)*420, 70, 1.0)

# ---------------------------------------------------------------- central lotus plaza + Talentopia tower
torus("plazaRing1", (0,0,0.85), 38, 0.25, NEON_C); torus("plazaRing2", (0,0,0.85), 30, 0.18, NEON_V)
cyl("plazaDisk", (0,0,0.8), 28, 0.4, PEARL, 96)
for k in range(8):                       # petals: stretched half-spheres leaning outward
    a = k/8*2*math.pi
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1, location=(math.cos(a)*20, math.sin(a)*20, 7))
    p = bpy.context.object; p.name = f"petal{k}"; p.scale = (4.5, 1.2, 14); p.rotation_euler = (0, math.radians(32), a)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    bm = bmesh.new(); bm.from_mesh(p.data)
    for v in [v for v in bm.verts if v.co.z < -9]: bm.verts.remove(v)
    bm.to_mesh(p.data); bm.free(); p.data.materials.append(PEARL); bpy.ops.object.shade_smooth()
    sol = p.modifiers.new("sol", 'SOLIDIFY'); sol.thickness = 0.4
    edge = box(f"petalEdge{k}", (math.cos(a)*24, math.sin(a)*24, 1.2), (0.3, 6, 0.3), NEON_V, rot=a+math.pi/2)
tw = cyl("talentTower", (0,0,60), 7, 120, PEARL, verts=6, r2=4.2)
for k in range(6):
    a = k/6*2*math.pi
    s = box(f"towerStrip{k}", (math.cos(a)*5.7, math.sin(a)*5.7, 60), (0.35, 0.35, 120), NEON_V if k % 2 else NEON_C, rot=a)
    s.rotation_euler = (math.radians(1.3)*math.sin(a), -math.radians(1.3)*math.cos(a), a)
cyl("crown", (0,0,122), 5, 3, GLASS, verts=6); cyl("spire", (0,0,135), 0.5, 24, NEON_W, verts=8)
torus("crownRing", (0,0,118), 8.5, 0.35, NEON_C)
# Talentopia logo hologram (triangle) + wordmark
def logo(loc, s, rot):
    bm = bmesh.new()
    pts = [(-1, 0.62), (1, 0.62), (0, -0.95)]
    vs = [bm.verts.new((x*s, 0, z*s)) for x, z in pts]; bm.faces.new(vs)
    me = bpy.data.meshes.new("logoM"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("logo", me); link(o); o.location = loc; o.rotation_euler = rot
    o.data.materials.append(emissive("logoMat", (0.72, 0.55, 1.0), 6)); return o
logo((0, -9, 96), 9, (0, 0, 0))
bpy.ops.object.text_add(location=(0, -9.5, 82)); t = bpy.context.object; t.data.body = "TALENTOPIA"; t.data.align_x = 'CENTER'
t.data.size = 5.2; t.data.extrude = 0.15; t.rotation_euler = (math.radians(90), 0, 0); t.data.materials.append(emissive("wordmark", (0.95, 0.93, 1.0), 5))
# figure on the plaza (silhouette)
PCOL = {c: mat("pc", c, rough=0.5) for c in [(0.9,0.9,0.95),(0.1,0.1,0.15),(0.5,0.4,0.9),(0.3,0.8,0.85)]}; SKIN = mat("skin", (0.7, 0.5, 0.4), rough=0.6)
def person(loc, c=(0.9,0.9,0.95), s=1.0):
    cyl("pbody", (loc[0], loc[1], loc[2]+0.9*s), 0.24*s, 1.1*s, PCOL[c], verts=12, r2=0.18*s)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15*s, location=(loc[0], loc[1], loc[2]+1.62*s), segments=12, ring_count=8)
    bpy.context.object.data.materials.append(SKIN)
for i in range(110):
    a = random.random()*2*math.pi; r = random.uniform(30, 44); person((math.cos(a)*r, math.sin(a)*r, 0.7), random.choice([(0.9,0.9,0.95),(0.1,0.1,0.15),(0.5,0.4,0.9),(0.3,0.8,0.85)]))

# ---------------------------------------------------------------- curved elevated roads with light streaks
def road_ring(R, z, width, a0=0.0, a1=2*math.pi, name="road"):
    curve = bpy.data.curves.new(name, 'CURVE'); curve.dimensions = '3D'
    sp = curve.splines.new('POLY'); n = 160; sp.points.add(n-1)
    for i in range(n):
        a = a0 + (a1-a0)*i/(n-1); sp.points[i].co = (math.cos(a)*R, math.sin(a)*R, z + 3*math.sin(a*3), 1)
    curve.extrude = width/2; curve.bevel_depth = 0.35; curve.use_fill_caps = True
    o = bpy.data.objects.new(name, curve); link(o); o.data.materials.append(WHITE)
    for side, m in ((1, NEON_C), (-1, NEON_V)):   # glowing edge rails
        c2 = bpy.data.curves.new(name+"e", 'CURVE'); c2.dimensions = '3D'; s2 = c2.splines.new('POLY'); s2.points.add(n-1)
        for i in range(n):
            a = a0 + (a1-a0)*i/(n-1); rr = R + side*width/2
            s2.points[i].co = (math.cos(a)*rr, math.sin(a)*rr, z + 3*math.sin(a*3) + 0.5, 1)
        c2.bevel_depth = 0.12; e = bpy.data.objects.new(name+"e", c2); link(e); e.data.materials.append(m)
    for i in range(0, n, 10):                       # pillars
        a = a0 + (a1-a0)*i/(n-1); zz = z + 3*math.sin(a*3)
        cyl("pillar", (math.cos(a)*R, math.sin(a)*R, zz/2-0.3), 0.9, zz, WHITE, verts=16)
    cars = []
    for i in range(int(R/3)):                        # cars = light streaks
        a = random.uniform(a0, a1); lane = random.choice([-1.6, 1.6]); zz = z + 3*math.sin(a*3) + 0.8
        L = CARL if lane > 0 else CART
        c = box("car", (math.cos(a)*(R+lane), math.sin(a)*(R+lane), zz), (2.4, 0.5, 0.35), L, rot=a+math.pi/2)
        cars.append((c, R+lane, a, zz - z - 3*math.sin(a*3), lane))
    return cars
CARS = []
CARS += road_ring(70, 10, 9, name="ringA")
CARS += road_ring(150, 16, 11, name="ringB")
CARS += road_ring(320, 22, 12, name="ringC")
for k in range(6):                                   # radial bridges
    a = k/6*2*math.pi + 0.5
    for R0, R1, z in ((46, 70, 10), (75, 150, 14), (155, 320, 19)):
        mid = (R0+R1)/2; L = R1-R0
        b = box("bridge", (math.cos(a)*mid, math.sin(a)*mid, z), (L, 8, 0.8), WHITE, rot=a, bevel=0.2)
        box("bridgeLine", (math.cos(a)*mid, math.sin(a)*mid, z+0.5), (L, 0.25, 0.15), NEON_C, rot=a)

# ---------------------------------------------------------------- skyline
def tower(x, y, h, w, d, i):
    shape = i % 4; m = TOWERS[i % len(TOWERS)]
    if shape == 1:      # cylindrical glass tower
        o = cyl("tower", (x, y, h/2), w/2, h, m, verts=40)
    elif shape == 2:    # tapered tower
        o = cyl("tower", (x, y, h/2), w/2, h, m, verts=8, r2=w/2*0.62); bpy.ops.object.shade_flat()
    elif shape == 3:    # stepped / setback tower
        o = box("tower", (x, y, h*0.3), (w, d, h*0.6), m, bevel=1.2)
        box("towerUp", (x, y, h*0.6 + h*0.2), (w*0.72, d*0.72, h*0.4), m, bevel=1.0)
        box("towerTop", (x, y, h + 2), (w*0.45, d*0.45, 4), NEON_W if i % 2 else m, bevel=0.5)
    else:               # rounded-corner slab
        o = box("tower", (x, y, h/2), (w, d, h), m, rot=random.uniform(0, math.pi), bevel=1.6)
    if i % 2 == 0:      # vertical light lines
        for k in range(4):
            aa = k/4*2*math.pi + 0.4
            cyl("tLine", (x + math.cos(aa)*w*0.52, y + math.sin(aa)*w*0.52, h*0.5), 0.16, h*0.98, random.choice([NEON_V, NEON_C, NEON_P]), verts=6)
    return o
def _unused(x, y, h, w, d, i):
    o = box("tower", (x, y, h/2), (w, d, h), TOWERS[i % len(TOWERS)], rot=random.uniform(0, math.pi), bevel=0.3)
    if i % 3 == 0:
        for sx in (-1, 1):
            e = box("tEdge", (0, 0, 0), (0.35, 0.35, h), random.choice([NEON_V, NEON_C, NEON_P]))
            e.parent = o; e.location = (sx*w/2, d/2, 0)
    if i % 4 == 1:
        cyl("spireT", (x, y, h + 8), 0.4, 16, NEON_W, verts=8)
    if i % 5 == 2:
        for z in range(12, int(h), 18):
            r = box("band", (0, 0, 0), (w+0.4, d+0.4, 0.5), NEON_V); r.parent = o; r.location = (0, 0, z - h/2)
    return o
i = 0
for k in range(9):
    a = k/9*2*math.pi + 0.3; cx, cy = math.cos(a)*230, math.sin(a)*230
    for j in range(7 if abs(((math.degrees(math.atan2(cy, cx)) + 82 + 180) % 360) - 180) > 30 else 3):
        rr = random.uniform(8, 40); aa = random.uniform(0, 2*math.pi)
        tower(cx+math.cos(aa)*rr, cy+math.sin(aa)*rr, random.uniform(35, 140), random.uniform(10, 18), random.uniform(10, 18), i); i += 1
for k in range(14):
    a = k/14*2*math.pi; cx, cy = math.cos(a)*420, math.sin(a)*420
    if -2.2 < math.atan2(cy, cx) < -0.8: continue
    for j in range(9):
        rr = random.uniform(5, 55); aa = random.uniform(0, 2*math.pi)
        tower(cx+math.cos(aa)*rr, cy+math.sin(aa)*rr, random.uniform(60, 260), random.uniform(14, 26), random.uniform(14, 26), i); i += 1
for j in range(60):                                  # far skyline
    a = random.uniform(0, 2*math.pi); rr = random.uniform(620, 900)
    tower(math.cos(a)*rr, math.sin(a)*rr, random.uniform(80, 320), random.uniform(20, 40), random.uniform(20, 40), i); i += 1

# holographic district billboards near the inner islands
DIST = ["MedCity","Capital Bay","Creative Quarter","Forge & Form","Code Nexus","Taste District","Planet Lab","Civic Square","Market Street"]
for k, name in enumerate(DIST):
    a = k/9*2*math.pi + 0.3; cx, cy = math.cos(a)*185, math.sin(a)*185
    fr = box("bbFrame", (cx, cy, 34), (22, 0.6, 12), DARK, rot=a+math.pi/2)
    gl = box("bbGlow", (cx, cy, 34), (21, 0.7, 11), emissive("bb", random.choice([(0.55,0.35,1),(0.3,0.8,0.95),(0.95,0.5,0.85)]), 4), rot=a+math.pi/2)
    bpy.ops.object.text_add(location=(cx*0.985, cy*0.985, 32.5)); tx = bpy.context.object; tx.data.body = name; tx.data.align_x = 'CENTER'; tx.data.size = 2.6
    tx.rotation_euler = (math.radians(90), 0, a+math.pi/2+math.pi); tx.data.materials.append(emissive("bbt", (1, 1, 1), 5))
    cyl("bbPole", (cx, cy, 14), 0.6, 28, WHITE, verts=12)

# trees around islands
def tree(x, y, s=1):
    cyl("trunk", (x, y, 1.8*s), 0.25*s, 3*s, TRUNK, verts=8)
    for j in range(3):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=(2.0-0.3*j)*s, location=(x+random.uniform(-.6,.6)*s, y+random.uniform(-.6,.6)*s, (4+j*1.3)*s))
        bpy.context.object.data.materials.append(GREEN)
for k in range(130):
    a = random.uniform(0, 2*math.pi); r = random.choice([random.uniform(40, 45), random.uniform(180, 280)])
    tree(math.cos(a)*r, math.sin(a)*r, random.uniform(0.8, 1.4))

# flying vehicles
for k in range(26):
    a = random.uniform(0, 2*math.pi); r = random.uniform(60, 380)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(math.cos(a)*r, math.sin(a)*r, random.uniform(50, 120)))
    f = bpy.context.object; f.scale = (3, 1.3, 0.6); f.rotation_euler[2] = a + math.pi/2; f.data.materials.append(PEARL)
    torus("flyRing", f.location - Vector((0, 0, 0.5)), 2.6, 0.12, random.choice([NEON_C, NEON_V]))

# ---------------------------------------------------------------- world, lights, render settings
world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True; nt = world.node_tree; N = nt.nodes; L = nt.links
for n in list(N): N.remove(n)
tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Generated"], sep.inputs[0])
ramp = N.new("ShaderNodeValToRGB"); cr = ramp.color_ramp
cr.elements[0].position = 0.46; cr.elements[0].color = (0.75, 0.32, 0.55, 1)
cr.elements[1].position = 0.62; cr.elements[1].color = (0.012, 0.012, 0.06, 1)
e2 = cr.elements.new(0.52); e2.color = (0.18, 0.08, 0.38, 1)
L.new(sep.outputs["Z"], ramp.inputs["Fac"])
bg = N.new("ShaderNodeBackground"); bg.inputs[1].default_value = 1.6; L.new(ramp.outputs["Color"], bg.inputs[0])
vol = N.new("ShaderNodeVolumePrincipled"); vol.inputs["Density"].default_value = 0.0009; vol.inputs["Color"].default_value = (0.55, 0.45, 0.9, 1)
out = N.new("ShaderNodeOutputWorld"); L.new(bg.outputs[0], out.inputs["Surface"]); L.new(vol.outputs[0], out.inputs["Volume"])

def light(kind, loc, energy, color, size=1.0, rot=(0,0,0)):
    d = bpy.data.lights.new(kind, kind); d.energy = energy; d.color = color
    if kind == 'AREA': d.size = size
    o = bpy.data.objects.new(kind, d); o.location = loc; o.rotation_euler = rot; link(o); return o
light('SUN', (0, 0, 100), 2.5, (0.75, 0.65, 1.0), rot=(math.radians(62), 0, math.radians(-40)))
light('AREA', (0, -60, 70), 15000, (0.75, 0.6, 1.0), size=40, rot=(math.radians(55), 0, 0))
light('POINT', (0, -26, 8), 6000, (0.5, 0.85, 1.0))
for k in range(9):
    a = k/9*2*math.pi + 0.3; light('POINT', (math.cos(a)*230, math.sin(a)*230, 40), 25000, (0.75, 0.55, 1.0))

sc.render.engine = 'BLENDER_EEVEE'
ee = sc.eevee
for attr, val in (("use_raytracing", True), ("ray_tracing_method", 'SCREEN'), ("use_shadows", True), ("taa_render_samples", 32),
                  ("volumetric_tile_size", '8'), ("volumetric_samples", 24), ("use_volumetric_shadows", False)):
    try: setattr(ee, attr, val)
    except Exception: pass
try:
    ee.ray_tracing_options.resolution_scale = '2'
except Exception: pass
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Punchy'
except Exception: pass
sc.view_settings.exposure = 0.4
sc.render.resolution_x = W; sc.render.resolution_y = H; sc.render.resolution_percentage = 100

# bloom via compositor glare
try:
    sc.use_nodes = True
    tree = getattr(sc, "compositing_node_group", None)
    if tree is None and hasattr(bpy.data, "node_groups") and hasattr(sc, "compositing_node_group"):
        pass
    if tree is None:
        try:
            tree = bpy.data.node_groups.new("comp", "CompositorNodeTree"); sc.compositing_node_group = tree
        except Exception:
            tree = sc.node_tree
    for n in list(tree.nodes): tree.nodes.remove(n)
    rl = tree.nodes.new("CompositorNodeRLayers")
    gl = tree.nodes.new("CompositorNodeGlare")
    for k, v in (("Type", 'Bloom'), ("Quality", 'High'), ("Threshold", 1.0), ("Strength", 0.6), ("Size", 0.75)):
        try: gl.inputs[k].default_value = v
        except Exception as e: print("GLARE SET FAIL", k, e)
    try:
        outn = tree.nodes.new("NodeGroupOutput"); tree.interface.new_socket("Image", in_out='OUTPUT', socket_type='NodeSocketColor')
        tree.links.new(rl.outputs["Image"], gl.inputs[0]); tree.links.new(gl.outputs[0], outn.inputs[0])
    except Exception:
        comp = tree.nodes.new("CompositorNodeComposite"); tree.links.new(rl.outputs["Image"], gl.inputs[0]); tree.links.new(gl.outputs[0], comp.inputs[0])
    print("COMPOSITOR OK")
except Exception as e:
    print("COMPOSITOR FAILED", e)

# ---------------------------------------------------------------- camera
camd = bpy.data.cameras.new("cam"); camd.lens = 28; camd.clip_end = 5000
cam = bpy.data.objects.new("cam", camd); link(cam); sc.camera = cam
tgt = bpy.data.objects.new("tgt", None); link(tgt); tgt.location = (0, 0, 10)
tc_ = cam.constraints.new('TRACK_TO'); tc_.target = tgt; tc_.track_axis = 'TRACK_NEGATIVE_Z'; tc_.up_axis = 'UP_Y'
def campos(t):  # t in 0..1: slow orbit + push-in
    a = math.radians(-100 + 40*t); r = 400 - 110*t; z = 250 - 90*t
    return (math.cos(a)*r, math.sin(a)*r, z)
import time as _t; print('BUILD_DONE', round(_t.time()-T0,1))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'city.blend'))
if MODE == 'still':
    cam.location = campos(0.15)
    sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = os.path.join(OUT, "still.png")
    t1=_t.time(); bpy.ops.render.render(write_still=True); print("DONE still RENDER_S", round(_t.time()-t1,1))
else:
    fps = 24; secs = 10; sc.render.fps = fps; sc.frame_start = 1; sc.frame_end = fps*secs
    for f in range(sc.frame_start, sc.frame_end+1, 6):
        cam.location = campos((f-1)/(fps*secs-1)); cam.keyframe_insert("location", frame=f)
    for (c, R, a0, dz, lane) in CARS:   # animate light streaks along their rings
        sp = (0.012 if lane > 0 else -0.012) * (150/R)
        for f in (sc.frame_start, sc.frame_end):
            a = a0 + sp*(f-1); c.location = (math.cos(a)*R, math.sin(a)*R, c.location.z); c.rotation_euler[2] = a+math.pi/2
            c.keyframe_insert("location", frame=f); c.keyframe_insert("rotation_euler", frame=f)
    sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = os.path.join(OUT, "frames", "f_")
    bpy.ops.render.render(animation=True); print("DONE anim")
