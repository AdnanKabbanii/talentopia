import bpy,sys,os,time,math
a=sys.argv[sys.argv.index('--')+1:];OUT=a[0];W=int(a[1]);H=int(a[2]);WS=float(a[3]);FOG=float(a[4]);EXP=float(a[5]);TAG=a[6]
sc=bpy.context.scene;D=bpy.data
def setE(name,s):
    m=D.materials.get(name)
    if m:
        for n in m.node_tree.nodes:
            if n.type=='EMISSION': n.inputs[1].default_value=s
for n,v in [("neonV",5),("neonC",4.5),("neonP",4),("neonW",4),("logoMat",4),("wordmark",3.5)]: setE(n,v)
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
sc.render.resolution_x=W;sc.render.resolution_y=H
sc.render.filepath=os.path.join(OUT,"t_"+TAG+".png");t=time.time();bpy.ops.render.render(write_still=True);print("RENDER_S",round(time.time()-t,1))
