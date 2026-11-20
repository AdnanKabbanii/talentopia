import bpy,sys,os,time,math
a=sys.argv[sys.argv.index('--')+1:];OUT=a[0];W=int(a[1]);H=int(a[2]);WS=float(a[3]);FOG=float(a[4]);EXP=float(a[5]);TAG=a[6]
sc=bpy.context.scene;D=bpy.data
def setE(name,s):
    m=D.materials.get(name)
    if m:
        for n in m.node_tree.nodes:
            if n.type=='EMISSION': n.inputs[1].default_value=s
for n,v in [("neonV",8),("neonC",7),("neonP",6),("neonW",5),("logoMat",7),("wordmark",5)]: setE(n,v)
for o in D.objects:
    if o.type=='LIGHT':
        if o.data.type=='SUN': o.data.energy=4.5; o.data.color=(1.0,0.72,0.85); o.rotation_euler=(math.radians(78),0,math.radians(-60))
        if o.data.type=='AREA': o.data.energy=2500
        if o.data.type=='POINT': o.data.energy=min(o.data.energy,15000)
w=sc.world.node_tree
for n in w.nodes:
    if n.type=='BACKGROUND': n.inputs[1].default_value=WS
    if n.type=='VALTORGB':
        cr=n.color_ramp
        while len(cr.elements)>2: cr.elements.remove(cr.elements[1])
        cr.elements[0].position=0.40; cr.elements[0].color=(0.06,0.03,0.12,1)
        cr.elements[1].position=0.80; cr.elements[1].color=(0.01,0.01,0.05,1)
        for pos,c in ((0.495,(0.95,0.48,0.62,1)),(0.53,(0.42,0.2,0.7,1)),(0.6,(0.09,0.06,0.28,1))):
            e=cr.elements.new(pos); e.color=c
    if n.type=='PRINCIPLED_VOLUME': n.inputs["Density"].default_value=FOG
wm=D.materials.get("waterM");
if wm: wm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(0.03,0.04,0.12,1)
sc.view_settings.exposure=EXP
ang=math.radians(-82);rr=float(a[7]);zz=float(a[8]);sc.camera.location=(math.cos(ang)*rr,math.sin(ang)*rr,zz)
tg=D.objects.get('tgt');tg.location=(0,0,float(a[9]))
for m in D.materials:
    if m.name.startswith('tw'):
        for n in m.node_tree.nodes:
            if n.type=='MATH' and n.operation=='GREATER_THAN': n.inputs[1].default_value=0.72
            if n.type=='MATH' and n.operation=='MULTIPLY' and abs(n.inputs[1].default_value-4.0)<1e-3: n.inputs[1].default_value=3.2
tree=sc.compositing_node_group
for n in tree.nodes:
    if n.bl_idname=='CompositorNodeGlare': n.inputs['Threshold'].default_value=2.2; n.inputs['Strength'].default_value=0.5
for o in D.objects:
    if o.type=='LIGHT' and o.data.type=='AREA': o.data.energy=600

MODE=a[10]
# clear a sight-line corridor: remove towers near the line camera -> tower at any time
def campath(u):
    ang=math.radians(-82+22*u);rr=420-120*u
    return (math.cos(ang)*rr,math.sin(ang)*rr)
def segdist(px,py,ax,ay,bx,by):
    dx,dy=bx-ax,by-ay;L=dx*dx+dy*dy;t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/L));qx,qy=ax+t*dx,ay+t*dy;return math.hypot(px-qx,py-qy)
gone=0
for o in list(D.objects):
    if not ((o.type=='MESH' and o.name.startswith(("tower","tLine","spireT","tEdge","band","bbFrame","bbGlow","bbPole","trunk","Sphere","flyRing"))) or (o.type=='FONT' and o.name.startswith("Text"))): continue
    from mathutils import Vector as _V
    bb=[o.matrix_world @ _V(c) for c in o.bound_box];x=sum(v.x for v in bb)/8;y=sum(v.y for v in bb)/8
    if math.hypot(x,y)<60: continue
    near=min(segdist(x,y,*campath(k/20),0,0) for k in range(21))
    if near<34: D.objects.remove(o,do_unlink=True);gone+=1
print("CLEARED",gone)
cam=sc.camera;tg=D.objects.get('tgt')
def path(u):
    ang=math.radians(-82+22*u);rr=420-120*u;zz=120-35*u
    return (math.cos(ang)*rr,math.sin(ang)*rr,zz),(0,0,40+15*u)
fps=24;N=fps*10;sc.render.fps=fps;sc.frame_start=1;sc.frame_end=N
for f in range(1,N+1,4):
    u=(f-1)/(N-1);u=u*u*(3-2*u);p,tz=path(u);cam.location=p;cam.keyframe_insert("location",frame=f);tg.location=tz;tg.keyframe_insert("location",frame=f)
cars=[o for o in D.objects if o.name.startswith("car")]
for c in cars:
    x,y,z=c.location;R=math.hypot(x,y)
    if R<5: continue
    a0=math.atan2(y,x);lane=1 if c.active_material and c.active_material.name.startswith("carL") else -1
    sp=lane*0.9/R*12  # metres per frame / radius
    for f in range(1,N+1,12):
        aa=a0+sp*(f-1)/12;c.location=(math.cos(aa)*R,math.sin(aa)*R,z);c.rotation_euler[2]=aa+math.pi/2;c.keyframe_insert("location",frame=f);c.keyframe_insert("rotation_euler",frame=f)
try: sc.eevee.taa_render_samples=24
except Exception: pass
sc.render.resolution_x=W;sc.render.resolution_y=H
if MODE=="preview":
    for f in (1,120,240):
        sc.frame_set(f);sc.render.filepath=os.path.join(OUT,f"p_{f}.png");bpy.ops.render.render(write_still=True)
    print("PREVIEW_DONE")
else:
    sc.render.image_settings.file_format='PNG';sc.render.filepath=os.path.join(OUT,"frames","f_")
    t0=time.time();bpy.ops.render.render(animation=True);print("ANIM_DONE",round(time.time()-t0))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,"city_anim.blend"))
