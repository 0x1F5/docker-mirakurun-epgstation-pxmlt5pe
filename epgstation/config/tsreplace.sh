#!/bin/bash

tsreplace -i "$INPUT" --remove-typed -o "$OUTPUT" -e qsvencc --avhw -i - --input-format mpegts --avsync vfr --tff --vpp-deinterlace normal -c hevc --icq 23 --gop-len 90 --output-format mpegts -o -