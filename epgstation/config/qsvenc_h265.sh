#!/bin/bash

qsvencc --avhw -i "$INPUT" --input-format mpegts --tff --audio-codec aac --audio-bitrate 192 --avsync vfr --vpp-deinterlace normal -c hevc --icq 23 --gop-len 90 -o "$OUTPUT"