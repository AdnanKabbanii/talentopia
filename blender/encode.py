import bpy,sys,os,glob
a=sys.argv[sys.argv.index('--')+1:];FR=a[0];OUTF=a[1]
sc=bpy.context.scene;sc.sequence_editor_create();se=sc.sequence_editor
files=sorted(glob.glob(os.path.join(FR,"f_*.png")))
st=se.strips.new_image("seq",files[0],channel=1,frame_start=1)
for f in files[1:]: st.elements.append(os.path.basename(f))
sc.frame_start=1;sc.frame_end=len(files);sc.render.fps=24
sc.render.resolution_x=1280;sc.render.resolution_y=720;sc.render.resolution_percentage=100
ims=sc.render.image_settings
try: ims.media_type='VIDEO'
except Exception as e: print("media_type n/a",e)
ims.file_format='FFMPEG'
ff=sc.render.ffmpeg;ff.format='MPEG4';ff.codec='H264';ff.constant_rate_factor='MEDIUM';ff.ffmpeg_preset='GOOD';ff.gopsize=24
try: ff.audio_codec='NONE'
except Exception: pass
sc.render.filepath=OUTF;bpy.ops.render.render(animation=True);print("ENCODED",OUTF)
