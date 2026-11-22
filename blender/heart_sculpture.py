# Talentopia V4: clean up the AI-generated heart (TripoSR, from a FLUX reference image) into a city sculpture.
# blender -b -P heart_sculpture.py -- IN.glb OUT.glb
# Fixes normals, smooths the marching-cubes surface, decimates for the web, stands it upright on its apex, keeps vertex colours.
import bpy, sys, math, os
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; SRC, OUT = a[0], a[1]
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=SRC)
ob = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0005); bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
# keep only the largest connected piece (drops floating marching-cubes crumbs)
import bmesh
bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
seen, parts = set(), []
for v in bm.verts:
    if v.index in seen: continue
    stack, comp = [v], []
    seen.add(v.index)
    while stack:
        x = stack.pop(); comp.append(x)
        for e in x.link_edges:
            y = e.other_vert(x)
            if y.index not in seen: seen.add(y.index); stack.append(y)
    parts.append(comp)
parts.sort(key=len, reverse=True)
for comp in parts[1:]: bmesh.ops.delete(bm, geom=comp, context='VERTS')
bm.to_mesh(ob.data); bm.free()
m = ob.modifiers.new('smooth', 'CORRECTIVE_SMOOTH'); m.iterations = 6; m.factor = 0.5
d = ob.modifiers.new('dec', 'DECIMATE'); d.ratio = min(1.0, 22000 / max(1, len(ob.data.polygons)))
bpy.ops.object.modifier_apply(modifier='smooth'); bpy.ops.object.modifier_apply(modifier='dec')
# scale to 3.2 m tall, base on the ground, centred
bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]; zs = [p.z for p in bb]; h = max(zs) - min(zs)
s = 3.2 / h; ob.scale = (s, s, s); bpy.ops.object.transform_apply(scale=True)
bb = [Vector(c) for c in ob.bound_box]; c = sum(bb, Vector()) / 8; zmin = min(p.z for p in bb)
ob.location = (-c.x, -c.y, -zmin); bpy.ops.object.transform_apply(location=True)
for p in ob.data.polygons: p.use_smooth = True
mat = bpy.data.materials.new('HeartSculpture'); mat.use_nodes = True; ob.data.materials.clear(); ob.data.materials.append(mat)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True, export_normals=True, export_vertex_color='ACTIVE' if True else 'NONE',
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
print('EXPORTED', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB tris', len(ob.data.polygons))
