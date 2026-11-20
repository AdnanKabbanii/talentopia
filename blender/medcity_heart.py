# Import BodyParts3D heart meshes, colour by structure, centre and export heart.glb
import bpy,os,sys,math
a=sys.argv[sys.argv.index('--')+1:];HD,OUT=a[0],a[1]
for o in list(bpy.data.objects): bpy.data.objects.remove(o,do_unlink=True)
names=dict(l.strip().split('\t') for l in open(os.path.join(HD,'names.tsv')) if '\t' in l)
def mat(n,c,alpha=1.0,rough=0.45):
    m=bpy.data.materials.new(n);m.use_nodes=True;b=m.node_tree.nodes["Principled BSDF"];b.inputs["Base Color"].default_value=(*c,1);b.inputs["Roughness"].default_value=rough
    b.inputs["Coat Weight"].default_value=0.4
    if alpha<1:
        b.inputs["Alpha"].default_value=alpha
        try: m.surface_render_method='BLENDED'
        except Exception: pass
    return m
def colour(name):
    n=name.lower()
    if 'aorta' in n or 'coronary' in n: return ('artery',(0.78,0.08,0.1),1)
    if 'vena cava' in n: return ('vein',(0.12,0.22,0.7),1)
    if 'pulmonary trunk' in n: return ('pulmart',(0.25,0.35,0.85),1)
    if 'cavity of left' in n: return ('leftside',(0.85,0.2,0.22),0.82)
    if 'cavity of right' in n: return ('rightside',(0.35,0.42,0.85),0.82)
    if 'wall of' in n: return ('wall',(0.72,0.32,0.3),0.55)
    if 'valve' in n or 'leaflet' in n or 'cusp' in n: return ('valve',(0.95,0.9,0.72),1)
    if 'papillary' in n: return ('papillary',(0.9,0.55,0.45),1)
    return ('tissue',(0.8,0.4,0.35),1)
mats={}
for fn in sorted(os.listdir(HD)):
    if not fn.endswith('.obj'): continue
    fid=fn[:-4];nm=names.get(fid,fid)
    bpy.ops.wm.obj_import(filepath=os.path.join(HD,fn))
    for o in bpy.context.selected_objects:
        o.name=fid+'|'+nm;k,c,al=colour(nm)
        if k not in mats: mats[k]=mat(k,c,al)
        o.data.materials.clear();o.data.materials.append(mats[k])
        for p in o.data.polygons: p.use_smooth=True
objs=[o for o in bpy.data.objects if o.type=='MESH']
# centre and scale to ~0.9 m tall display model
import mathutils
mn=mathutils.Vector((1e9,)*3);mx=mathutils.Vector((-1e9,)*3)
for o in objs:
    for v in o.bound_box:
        w=o.matrix_world@mathutils.Vector(v);mn=mathutils.Vector(map(min,mn,w));mx=mathutils.Vector(map(max,mx,w))
c=(mn+mx)/2;size=max(mx-mn);s=0.9/size
for o in objs:
    o.location=(o.location-c)*s;o.scale=(s,s,s)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.transform_apply(location=True,rotation=False,scale=True)
for o in objs:
    m=o.modifiers.new('dec','DECIMATE');m.ratio=0.35 if len(o.data.polygons)>20000 else (0.6 if len(o.data.polygons)>5000 else 1.0)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'heart.glb'),export_format='GLB',export_apply=True)
print("HEART",len(objs),round(os.path.getsize(os.path.join(OUT,'heart.glb'))/1e6,2),"MB", "polys",sum(len(o.data.polygons) for o in objs))
