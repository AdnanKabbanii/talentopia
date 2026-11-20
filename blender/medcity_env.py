# MedCity environment (plaza + street + hospital exterior + walkable lobby + anatomy lab) -> web GLB
# blender -b -P env.py -- OUTDIR TEXDIR [preview]
import bpy, bmesh, math, random, sys, os
from mathutils import Vector
a = sys.argv[sys.argv.index('--')+1:]; OUT, TEX = a[0], a[1]; PREVIEW = len(a) > 2 and a[2] == 'preview'
random.seed(3)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
sc = bpy.context.scene; col = sc.collection

# ------------------------------------------------------------ materials
def img(name, color=True):
    p = os.path.join(TEX, name)
    i = bpy.data.images.load(p, check_existing=True)
    if not color: i.colorspace_settings.name = 'Non-Color'
    return i
def pbr(name, tex, tile, rough=None, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    b = N.get("Principled BSDF"); b.inputs["Metallic"].default_value = metal
    uv = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1/tile, 1/tile, 1)
    L.new(uv.outputs["UV"], mp.inputs["Vector"])
    d = N.new("ShaderNodeTexImage"); d.image = img(tex + "_diff.jpg"); L.new(mp.outputs["Vector"], d.inputs["Vector"]); L.new(d.outputs["Color"], b.inputs["Base Color"])
    r = N.new("ShaderNodeTexImage"); r.image = img(tex + "_rough.jpg", False); L.new(mp.outputs["Vector"], r.inputs["Vector"]); L.new(r.outputs["Color"], b.inputs["Roughness"])
    nm = N.new("ShaderNodeNormalMap"); n = N.new("ShaderNodeTexImage"); n.image = img(tex + "_nor.jpg", False)
    L.new(mp.outputs["Vector"], n.inputs["Vector"]); L.new(n.outputs["Color"], nm.inputs["Color"]); L.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m
def flat(name, c, rough=0.5, metal=0.0, emit=None, es=0.0, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = es
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
    return m
ASPHALT = pbr("asphalt", "asphalt_02", 4)
PAVE = pbr("pavement", "concrete_pavement", 2.5)
GRASS = pbr("grass", "aerial_grass_rock", 4)
MARBLE = pbr("marble", "marble_tiles", 1.6)
PLASTER = pbr("plaster", "white_plaster_02", 2.0)
for _n in PLASTER.node_tree.nodes:
    if _n.type=="BSDF_PRINCIPLED": pass
STONE = pbr("stone", "white_sandstone_bricks", 3.0)
CONC = pbr("concrete", "brushed_concrete", 3.0)
PARQ = pbr("parquet", "herringbone_parquet", 1.5)
METALP = pbr("metalplate", "metal_plate", 1.0, metal=0.6)
GLASS = flat("glass", (0.32, 0.45, 0.55), rough=0.04, metal=0.6, alpha=0.38)
MULLION = flat("mullion", (0.16, 0.17, 0.2), rough=0.35, metal=0.8)
WHITE = flat("whitepanel", (0.88, 0.89, 0.9), rough=0.35)
WOOD = flat("wood", (0.42, 0.27, 0.15), rough=0.55)
DARKM = flat("darkmetal", (0.08, 0.08, 0.1), rough=0.4, metal=0.7)
LINE = flat("roadline", (0.92, 0.92, 0.9), rough=0.6)
LEAF = [flat("leaf%d" % i, c, rough=0.75) for i, c in enumerate([(0.12, 0.3, 0.1), (0.16, 0.36, 0.12), (0.1, 0.26, 0.12)])]
BARK = flat("bark", (0.22, 0.15, 0.1), rough=0.9)
WATER = flat("water", (0.05, 0.2, 0.28), rough=0.03, metal=0.2)
LIGHTP = flat("lightpanel", (1, 1, 1), emit=(1, 0.97, 0.92), es=6.0)
SIGNG = flat("signGreen", (0.05, 0.55, 0.38), emit=(0.15, 0.85, 0.55), es=2.5)
VIOLET = flat("violet", (0.5, 0.34, 0.96), emit=(0.5, 0.34, 0.96), es=2.0)
CYAN = flat("cyan", (0.32, 0.79, 0.91), emit=(0.32, 0.79, 0.91), es=1.5)
RED = flat("red", (0.8, 0.08, 0.1), rough=0.4)
SCREEN = flat("screen", (0.05, 0.12, 0.2), emit=(0.2, 0.55, 0.8), es=1.2)
UPHOL = flat("upholstery", (0.2, 0.32, 0.45), rough=0.8)
COLM = flat("collider", (1, 0, 1))

# ------------------------------------------------------------ helpers
OBJS = []
def uv_box(o, size=1.0):
    bm = bmesh.new(); bm.from_mesh(o.data); uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            co = o.matrix_world @ l.vert.co
            u, v = ((co.y, co.z) if ax == 0 else ((co.x, co.z) if ax == 1 else (co.x, co.y)))
            l[uvl].uv = (u/size, v/size)
    bm.to_mesh(o.data); bm.free()
def box(name, c, s, m, uv=True, rot=0.0):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); col.objects.link(o); o.location = c; o.scale = s; o.rotation_euler[2] = rot
    bpy.context.view_layer.update(); me.transform(o.matrix_basis); o.matrix_basis.identity()
    o.data.materials.append(m)
    if uv: uv_box(o)
    OBJS.append(o); return o
def cyl(name, c, r, h, m, verts=24, r2=None):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=h)
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); col.objects.link(o); o.location = c
    bpy.context.view_layer.update(); me.transform(o.matrix_basis); o.matrix_basis.identity()
    for p in me.polygons: p.use_smooth = True
    o.data.materials.append(m); uv_box(o); OBJS.append(o); return o
def ico(name, c, r, m, sub=2):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); col.objects.link(o); o.location = c
    for p in me.polygons: p.use_smooth = True
    o.data.materials.append(m); OBJS.append(o); return o
def collider(name, x1, y1, x2, y2, h=4.0):
    o = box("COL_" + name, ((x1+x2)/2, (y1+y2)/2, h/2), (abs(x2-x1), abs(y2-y1), h), COLM, uv=False); return o
def text(body, loc, size, m, rot=(math.radians(90), 0, 0), align='CENTER', extrude=0.04):
    cu = bpy.data.curves.new("txt", 'FONT'); cu.body = body; cu.size = size; cu.align_x = align; cu.extrude = extrude
    o = bpy.data.objects.new("sign", cu); col.objects.link(o); o.location = loc; o.rotation_euler = rot; o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False)
    OBJS.append(o); return o

# ------------------------------------------------------------ ground, plaza, road
box("ground", (0, 0, -0.1), (220, 220, 0.2), GRASS)
box("plaza", (0, -16, 0.02), (60, 36, 0.06), PAVE)
box("road", (0, 8, 0.01), (220, 12, 0.04), ASPHALT)
for x in range(-104, 106, 8): box("dash", (x, 8, 0.035), (3.5, 0.18, 0.01), LINE, uv=False)
for s in (-1, 1): box("edge", (0, 8 + s*5.6, 0.035), (220, 0.14, 0.01), LINE, uv=False)
for k in range(9): box("zebra", (-4 + k*1.0, 8, 0.036), (0.55, 10.5, 0.01), LINE, uv=False)
box("sidewalkN", (0, 16, 0.08), (220, 4, 0.16), PAVE); box("sidewalkS", (0, 0, 0.08), (220, 4, 0.16), PAVE)
for y in (14.05, 1.95): box("curb", (0, y, 0.09), (220, 0.18, 0.2), CONC, uv=False)
box("hospForecourt", (0, 21, 0.09), (70, 6.2, 0.18), PAVE)
# lawns + trees + benches on the plaza
for sx in (-1, 1):
    box("lawn", (sx*20, -16, 0.07), (14, 24, 0.08), GRASS)
    box("lawnEdge", (sx*20, -16, 0.1), (14.4, 24.4, 0.06), CONC, uv=False)
def tree(x, y, s=1.0):
    cyl("trunk", (x, y, 1.6*s), 0.16*s, 3.2*s, BARK, verts=10, r2=0.11*s)
    for i in range(5):
        ico("canopy", (x + random.uniform(-1, 1)*s, y + random.uniform(-1, 1)*s, (3.6 + random.uniform(0, 1.6))*s), random.uniform(1.1, 1.7)*s, random.choice(LEAF), sub=2)
    collider("tree", x-0.4, y-0.4, x+0.4, y+0.4)
for sx in (-1, 1):
    for y in (-24, -16, -8): tree(sx*20 + random.uniform(-3, 3), y + random.uniform(-1.5, 1.5), random.uniform(0.9, 1.2))
for x in range(-60, 61, 12):
    if abs(x) > 6: tree(x, 18.6 if abs(x) > 30 else -1.2, 1.0) if abs(x) > 30 else tree(x, -1.0, 0.9)
def bench(x, y, rot=0.0):
    g = []
    g.append(box("benchSeat", (x, y, 0.45), (1.8, 0.5, 0.06), WOOD, rot=rot)); g.append(box("benchBack", (x, y + (0.22 if rot == 0 else 0), 0.75), (1.8, 0.06, 0.5), WOOD, rot=rot))
    for dx in (-0.75, 0.75): box("benchLeg", (x + dx*math.cos(rot), y + dx*math.sin(rot), 0.22), (0.06, 0.5, 0.45), DARKM, uv=False, rot=rot)
    collider("bench", x-1, y-0.35, x+1, y+0.35, 1.0)
for x in (-9, 9):
    for y in (-26, -6): bench(x, y)
# fountain + Talentopia landmark
cyl("fountainRim", (0, -16, 0.3), 6.2, 0.6, CONC, verts=48); cyl("fountainWater", (0, -16, 0.5), 5.9, 0.12, WATER, verts=48)
collider("fountain", -6.2, -22.2, 6.2, -9.8, 1.0)
cyl("landmarkBase", (0, -16, 1.0), 1.4, 1.2, STONE, verts=6)
lm = cyl("landmark", (0, -16, 5.5), 0.9, 8.0, WHITE, verts=6, r2=0.35)
me = bpy.data.meshes.new("logoTri"); bm = bmesh.new()
vs = [bm.verts.new(v) for v in ((-1.1, -16 - 1.05, 9.8), (1.1, -16 - 1.05, 9.8), (0, -16 - 1.05, 8.0))]; bm.faces.new(vs); bm.to_mesh(me); bm.free()
o = bpy.data.objects.new("logo", me); col.objects.link(o); o.data.materials.append(VIOLET); OBJS.append(o)
text("TALENTOPIA", (0, -16 - 1.5, 1.3), 0.38, WHITE)
# streetlights
def streetlight(x, y, face):
    cyl("pole", (x, y, 3.0), 0.07, 6.0, DARKM, verts=10)
    box("arm", (x, y + face*0.6, 5.95), (0.08, 1.3, 0.08), DARKM, uv=False)
    box("lamp", (x, y + face*1.2, 5.85), (0.35, 0.6, 0.1), LIGHTP, uv=False)
    collider("pole", x-0.15, y-0.15, x+0.15, y+0.15)
for x in range(-56, 57, 16):
    streetlight(x, 2.6, 1); streetlight(x + 8, 13.4, -1)
# bus stop
box("busRoof", (-30, 0.6, 2.6), (5, 1.8, 0.1), GLASS, uv=False); box("busBack", (-30, -0.25, 1.3), (5, 0.06, 2.4), GLASS, uv=False)
for dx in (-2.4, 2.4): box("busPost", (-30 + dx, 0.6, 1.3), (0.08, 0.08, 2.6), DARKM, uv=False)
collider("bus", -32.5, -0.4, -27.5, 0.0, 2.6)

# ------------------------------------------------------------ backdrop buildings (west/east of plaza, across street)
def office(cx, cy, w, d, floors, mat=CONC):
    h = floors*3.6
    box("office", (cx, cy, h/2), (w, d, h), mat)
    for f in range(floors):
        z = 1.9 + f*3.6
        for sgn, (ox, oy, sw, sd) in ((1, (0, -d/2-0.02, w*0.94, 0.06)), (1, (0, d/2+0.02, w*0.94, 0.06)), (1, (-w/2-0.02, 0, 0.06, d*0.94)), (1, (w/2+0.02, 0, 0.06, d*0.94))):
            box("ribbon", (cx+ox, cy+oy, z), (sw, sd, 1.7), GLASS, uv=False)
    box("roofCap", (cx, cy, h + 0.25), (w + 0.4, d + 0.4, 0.5), DARKM, uv=False)
    collider("office", cx-w/2, cy-d/2, cx+w/2, cy+d/2, h)
office(-50, -18, 20, 26, 6); office(50, -18, 20, 26, 8, STONE); office(-62, 40, 22, 30, 10); office(64, 40, 24, 28, 7, STONE)
office(-46, -48, 26, 18, 5, STONE); office(46, -50, 26, 20, 9); office(0, -56, 36, 16, 4, STONE)

# ------------------------------------------------------------ hospital
HX1, HX2, HY1, HY2 = -30, 30, 24, 54       # footprint
GF = 5.0                                    # ground floor height
UP = 5                                      # upper floors
FH = 3.8
TOP = GF + UP*FH
# upper volume (stone with window bands + vertical fins)
box("hospUpper", (0, (HY1+HY2)/2, GF + UP*FH/2 + 0.3), (HX2-HX1, HY2-HY1, UP*FH), STONE)
for f in range(UP):
    z = GF + 0.3 + f*FH + 1.9
    box("hospBandF", (0, HY1-0.03, z), ((HX2-HX1)*0.96, 0.08, 2.1), GLASS, uv=False)
    box("hospBandB", (0, HY2+0.03, z), ((HX2-HX1)*0.96, 0.08, 2.1), GLASS, uv=False)
    for sx in (-1, 1): box("hospBandS", (sx*(HX2+0.03), (HY1+HY2)/2, z), (0.08, (HY2-HY1)*0.94, 2.1), GLASS, uv=False)
for x in range(-28, 29, 3): box("fin", (x, HY1-0.35, GF + UP*FH/2 + 0.3), (0.22, 0.6, UP*FH), WHITE, uv=False)
box("hospRoof", (0, (HY1+HY2)/2, TOP + 0.55), (HX2-HX1+0.6, HY2-HY1+0.6, 0.5), WHITE, uv=False)
box("roofGarden", (-12, (HY1+HY2)/2, TOP + 0.9), (20, 18, 0.25), GRASS)
for k in range(6): ico("roofShrub", (-20 + k*3.2, 36 + (k % 2)*4, TOP + 1.4), 0.9, random.choice(LEAF))
box("helipad", (14, 40, TOP + 0.85), (12, 12, 0.12), CONC); text("H", (14, 40, TOP + 0.93), 6.0, LINE, rot=(0, 0, 0), extrude=0.0)
# ground floor shell: glass curtain wall on the front with mullions, solid walls elsewhere
WT = 0.3
# front wall: glass with door gap at x in [-3, 3]
for (x1, x2) in ((HX1, -3), (3, HX2)):
    box("gfGlass", ((x1+x2)/2, HY1, GF/2), (x2-x1, 0.12, GF), GLASS, uv=False)
    collider("frontWall", x1, HY1-0.15, x2, HY1+0.15, GF)
    for x in range(int(x1)+1, int(x2), 2): box("mullionV", (x, HY1-0.05, GF/2), (0.1, 0.18, GF), MULLION, uv=False)
box("mullionH", (0, HY1-0.05, 2.9), (HX2-HX1, 0.18, 0.1), MULLION, uv=False)
box("doorHeader", (0, HY1, GF - 0.6), (6.2, 0.4, 1.2), MULLION, uv=False)
# sliding doors (animated in the web app)
DL = box("DOOR_L", (-1.5, HY1, 1.95), (3.0, 0.08, 3.9), GLASS, uv=False); DR = box("DOOR_R", (1.5, HY1, 1.95), (3.0, 0.08, 3.9), GLASS, uv=False)
# side + back walls (plaster inside / stone outside approximated as stone)
for (x1, y1, x2, y2) in ((HX1, HY1, HX1, HY2), (HX2, HY1, HX2, HY2), (HX1, HY2, HX2, HY2)):
    w = max(abs(x2-x1), WT); d = max(abs(y2-y1), WT)
    box("gfWall", ((x1+x2)/2, (y1+y2)/2, GF/2), (w, d, GF), STONE)
    collider("shell", min(x1, x2)-WT/2, min(y1, y2)-WT/2, max(x1, x2)+WT/2, max(y1, y2)+WT/2, GF)
# interior plaster lining on the shell walls
box("linW", (HX1+0.2, (HY1+HY2)/2, GF/2), (0.06, HY2-HY1-0.4, GF), PLASTER)
box("linE", (HX2-0.2, (HY1+HY2)/2, GF/2), (0.06, HY2-HY1-0.4, GF), PLASTER)
box("linN", (0, HY2-0.2, GF/2), (HX2-HX1-0.4, 0.06, GF), PLASTER)
box("gfCeiling", (0, (HY1+HY2)/2, GF + 0.15), (HX2-HX1, HY2-HY1, 0.3), WHITE, uv=False)
# entrance canopy + sign
box("canopy", (0, HY1 - 4.5, GF + 0.6), (16, 9, 0.5), WHITE, uv=False)
box("canopyEdge", (0, HY1 - 9.0, GF + 0.6), (16, 0.12, 0.5), CYAN, uv=False)
for sx in (-1, 1): cyl("canopyCol", (sx*7.2, HY1 - 8.3, GF/2), 0.25, GF, WHITE, verts=16); collider("canopyCol", sx*7.2-0.3, HY1-8.6, sx*7.2+0.3, HY1-8.0, GF)
text("MedCity General Hospital", (0, HY1 - 9.08, GF + 1.25), 0.95, LINE)
box("crossV", (22, HY1 - 0.5, TOP - 2.5), (1.0, 0.3, 3.4), SIGNG, uv=False); box("crossH", (22, HY1 - 0.5, TOP - 2.5), (3.4, 0.3, 1.0), SIGNG, uv=False)
# ambulance bay (east side)
box("ambCanopy", (36, 34, 4.2), (10, 12, 0.35), WHITE, uv=False)
for (x, y) in ((40.5, 28.5), (40.5, 39.5)): cyl("ambCol", (x, y, 2.1), 0.2, 4.2, DARKM, verts=12); collider("ambCol", x-0.3, y-0.3, x+0.3, y+0.3)
box("ambLane", (36, 34, 0.1), (10, 12, 0.03), ASPHALT)
text("EMERGENCY", (30.3, 34, 3.4), 0.6, RED, rot=(math.radians(90), 0, math.radians(90)))
def ambulance(x, y):
    box("ambBody", (x, y, 1.45), (2.3, 5.6, 2.3), WHITE, uv=False); box("ambCab", (x, y - 3.4, 1.1), (2.2, 1.6, 1.6), WHITE, uv=False)
    box("ambStripe", (x, y - 0.6, 1.2), (2.34, 6.8, 0.35), RED, uv=False); box("ambWind", (x, y - 4.2, 1.45), (2.0, 0.05, 0.7), GLASS, uv=False)
    box("ambLight", (x, y - 2.4, 2.7), (1.6, 0.4, 0.15), flat("lightbar", (0.2, 0.4, 1), emit=(0.2, 0.4, 1), es=3), uv=False)
    for dy in (-3.4, 1.8):
        for dx in (-1.1, 1.1): cyl("wheel", (x + dx, y + dy, 0.42), 0.42, 0.3, DARKM, verts=16).rotation_euler[1] = math.radians(90)
    collider("ambulance", x-1.3, y-4.3, x+1.3, y+2.9, 2.6)
ambulance(36, 34.5)

# ------------------------------------------------------------ interior: lobby
box("lobbyFloor", (0, (HY1+HY2)/2, 0.19), (HX2-HX1-0.4, HY2-HY1-0.4, 0.02), MARBLE)
# back partition wall of the lobby at y=40 with doors to the anatomy lab (x 6..9) and exam room (x -9..-6)
for (x1, x2) in ((HX1, -9), (-6, 6), (9, HX2)):
    box("partition", ((x1+x2)/2, 40, GF/2), (x2-x1, 0.25, GF), PLASTER); collider("partition", x1, 39.85, x2, 40.15, GF)
for (x1, x2) in ((-9, -6), (6, 9)): box("doorTop", ((x1+x2)/2, 40, GF - 0.6), (x2-x1, 0.25, 1.2), PLASTER)
box("examDoor", (-7.5, 40, 2.0), (3.0, 0.12, 4.0), WOOD, uv=False); collider("examDoor", -9, 39.8, -6, 40.2, 4)
text("Anatomy Lab  →", (7.5, 39.85, 4.1), 0.32, SIGNG); text("Examination  (coming soon)", (-7.5, 39.85, 4.1), 0.26, LINE)
# lab / exam rooms divider and side walls
box("roomDivider", (0, 47, GF/2), (0.25, 14, GF), PLASTER); collider("roomDivider", -0.15, 40, 0.15, 54, GF)
# reception desk (curved approximated with segments)
for k in range(9):
    ang = math.radians(-60 + k*15); x = math.sin(ang)*4.2; y = 33.5 - math.cos(ang)*1.6
    box("desk", (x, y, 0.55), (1.5, 0.6, 1.1), WHITE, uv=False, rot=ang)
    box("deskTop", (x, y, 1.13), (1.55, 0.75, 0.06), WOOD, uv=False, rot=ang)
collider("desk", -4.4, 31.4, 4.4, 34.2, 1.2)
box("deskBackWall", (0, 37.5, 2.2), (9, 0.2, 3.0), WOOD, uv=False); text("RECEPTION", (0, 37.38, 3.2), 0.42, LINE)
box("deskScreen1", (-1.2, 33.9, 1.45), (0.6, 0.05, 0.38), SCREEN, uv=False); box("deskScreen2", (1.2, 33.9, 1.45), (0.6, 0.05, 0.38), SCREEN, uv=False)
# waiting area seats
def seatrow(x, y, n):
    for i in range(n):
        box("seat", (x + i*0.7, y, 0.45), (0.6, 0.6, 0.12), UPHOL, uv=False); box("seatBack", (x + i*0.7, y + 0.28, 0.75), (0.6, 0.08, 0.55), UPHOL, uv=False)
    box("seatBeam", (x + (n-1)*0.35, y, 0.3), (n*0.7, 0.12, 0.1), DARKM, uv=False)
    collider("seats", x-0.35, y-0.35, x + n*0.7 - 0.35, y+0.4, 1.0)
for y in (28.0, 30.5): seatrow(-24, y, 8); seatrow(14, y, 8)
for (x, y) in ((-27, 38), (27, 38), (-12, 26.2), (12, 26.2)):
    cyl("planter", (x, y, 0.45), 0.55, 0.9, DARKM, verts=16); [ico("plant", (x + random.uniform(-.3, .3), y + random.uniform(-.3, .3), 1.3 + 0.35*i), 0.55 - 0.08*i, random.choice(LEAF)) for i in range(3)]
    collider("planter", x-0.6, y-0.6, x+0.6, y+0.6, 1.5)
# ceiling light panels in lobby
for x in range(-24, 25, 8):
    for y in (28, 34): box("ceilLight", (x, y, GF - 0.02), (3.0, 1.0, 0.04), LIGHTP, uv=False)
box("lobbyScreen", (-29.8, 33, 2.8), (0.08, 4.0, 2.2), SCREEN, uv=False)
text("Welcome to MedCity", (-29.7, 33, 3.7), 0.28, LINE, rot=(math.radians(90), 0, math.radians(90)))

# ------------------------------------------------------------ interior: anatomy lab (x 0..30, y 40..54)
box("labFloor", (15, 47, 0.2), (29.6, 13.6, 0.02), PARQ)
for x in range(4, 29, 7):
    for y in (44, 50): box("labLight", (x, y, GF - 0.02), (3.2, 1.0, 0.04), LIGHTP, uv=False)
cyl("plinth", (15, 47, 0.5), 1.4, 1.0, WHITE, verts=40); cyl("plinthRing", (15, 47, 1.02), 1.42, 0.05, CYAN, verts=40)
collider("plinth", 13.5, 45.5, 16.5, 48.5, 1.2)
for (x, y, rot) in ((29.8, 47, math.radians(90)),):
    box("labScreenBig", (x, y, 2.6), (0.08, 7.0, 3.2), SCREEN, uv=False)
for k, xx in enumerate((5, 11, 19, 25)):
    box("labBench", (xx, 52.4, 0.9), (4.5, 1.2, 0.08), WHITE, uv=False); box("labBenchBase", (xx, 52.4, 0.45), (4.4, 1.1, 0.88), METALP)
    box("labMonitor", (xx, 52.8, 1.35), (0.9, 0.05, 0.55), SCREEN, uv=False)
    collider("labBench", xx-2.3, 51.7, xx+2.3, 53.1, 1.0)
box("labCabinet", (1.2, 47, 1.0), (1.0, 6.0, 2.0), WHITE, uv=False); collider("labCab", 0.6, 44, 1.8, 50, 2.0)
text("Anatomy Lab", (15, 53.75, 3.8), 0.5, SIGNG)
# floor cue rings (where to interact)
cyl("cueReception", (0, 30.2, 0.21), 0.7, 0.01, CYAN, verts=40)
cyl("cueLab", (15, 43.6, 0.21), 0.7, 0.01, CYAN, verts=40)

# ------------------------------------------------------------ markers for the web app (empties)
def marker(name, loc):
    e = bpy.data.objects.new("MK_" + name, None); col.objects.link(e); e.location = loc
marker("spawn", (0, -34, 0)); marker("hospitalEntrance", (0, HY1 - 2.5, 0)); marker("reception", (0, 30.2, 0))
marker("receptionist", (0, 35.6, 0)); marker("labStation", (15, 43.6, 0)); marker("heart", (15, 47, 2.15)); marker("doctor", (18.5, 44.0, 0))
marker("visitor1", (-20, 29.2, 0)); marker("visitor2", (6, -8, 0)); marker("doorCenter", (0, HY1, 0))
# the hospital mesh group used for hover/click in the web app
for o in bpy.data.objects:
    if o.name.startswith(("hospUpper", "hospBand", "fin", "hospRoof", "gfGlass", "canopy", "crossV", "crossH", "gfWall", "doorHeader", "mullion")): o["clickable"] = "hospital"

# ------------------------------------------------------------ preview render or export
if PREVIEW:
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; nt = w.node_tree
    env = nt.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(os.path.join(os.path.dirname(TEX), "hdri", "sky_2k.hdr"))
    nt.links.new(env.outputs["Color"], nt.nodes["Background"].inputs["Color"]); nt.nodes["Background"].inputs[1].default_value = 1.0
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(35)); col.objects.link(sun)
    for o in bpy.data.objects:
        if o.name.startswith("COL_"): o.hide_render = True
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); col.objects.link(cam); sc.camera = cam; cam.data.lens = 26
    sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x = 1280; sc.render.resolution_y = 720; sc.view_settings.view_transform = 'AgX'
    try: sc.eevee.use_raytracing = True
    except Exception: pass
    shots = {"plaza": ((14, -46, 7), (0, 18, 6)), "front": ((-10, 4, 2.2), (0, 26, 4)), "lobby": ((-22, 26, 2.2), (4, 36, 1.4)), "lab": ((3, 42.5, 2.6), (15, 47, 1.4))}
    for nm, (p, t) in shots.items():
        cam.location = p; d = Vector(t) - Vector(p); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(OUT, "pv_" + nm + ".png"); bpy.ops.render.render(write_still=True)
    print("PREVIEW_DONE")
else:
    for o in bpy.data.objects: o.select_set(o.type in ('MESH', 'EMPTY'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "medcity.glb"), export_format='GLB', use_selection=True, export_extras=True,
                              export_image_format='JPEG', export_jpeg_quality=80, export_apply=True)
    print("EXPORTED", round(os.path.getsize(os.path.join(OUT, "medcity.glb"))/1e6, 2), "MB", "objects", len(OBJS))
