#!/bin/sh
H="$1"; cd "$H"
B=/Applications/Blender.app/Contents/MacOS/Blender
run(){ ARMAXIS=Y ARMDOWN=82 LEGAXIS=X LEGSIGN=1 TEX=$TEX $B -b -P make2.py -- "$H/out" "$@" 2>&1 | grep -E "^GLB|Traceback|Error:" ; }
TEX=1024 run avatar_f1 0 0.2 1 0 0 young_african_female afro01 female_casualsuit01 shoes03
TEX=1024 run avatar_m1 1 0.2 0 0 1 young_caucasian_male short02 male_casualsuit03 shoes01
TEX=1024 run avatar_f2 0 0.2 0 1 0 young_asian_female ponytail01 female_casualsuit01 shoes04
TEX=1024 run avatar_m2 1 0.2 1 0 0 young_african_male short04 male_casualsuit05 shoes05
TEX=768 run receptionist 0 0.45 0 1 0 middleage_asian_female bob01 female_elegantsuit01 shoes02
TEX=768 run doctor 1 0.5 1 0 0 middleage_african_male short01 male_elegantsuit01 shoes06
TEX=640 run visitor_m 1 0.85 0 0 1 old_caucasian_male short03 male_casualsuit01 shoes01
TEX=640 run visitor_f 0 0.25 0 0 1 young_caucasian_female2 long01 female_sportsuit01 shoes04
echo BATCH_DONE
