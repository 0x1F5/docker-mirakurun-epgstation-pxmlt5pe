const spawn = require('child_process').spawn;
const qsvencc = 'qsvencc'; // qsvencc コマンドのパス

const input = process.env.INPUT;
const output = process.env.OUTPUT;
const mode = process.argv[2]; // コマンドライン引数でモードを取得

// qsvencc のエンコードオプション
const args = [
    '--avhw',
    '-i', input,
    '--output-depth', '10',
    '--input-format', 'mpegts',
    '--audio-codec', 'aac:aac_coder=twoloop',
    '--audio-bitrate', '192',
    '--audio-stream', ':stereo',
    '--avsync', 'vfr',
    '--gop-len', '90',
    '--log-level', 'quiet,output=info,core_progress=info',
    '--output-format', 'mp4',
    '-o', output,
];

// モードに応じたエンコードオプションを設定
if (mode === '4k') {
    args.push('--input-probesize', '1000K');
    args.push('--input-analyze', '0.7');
    args.push('--vpp-colorspace', 'hdr2sdr=hable');
    args.push('--disable-opencl');
    args.push('--output-thread', '0');
    args.push('--codec', 'hevc');
    args.push('--icq', '23');
    args.push('--repeat-headers');
    args.push('--quality', 'balanced');
    args.push('--profile', 'main');
    args.push('--dar', '16:9');
    args.push('--gop-len', '120');
    args.push('--output-res', '1920x1080');
    args.push('--audio-samplerate', '48000');
    args.push('--audio-ignore-decode-error', '30');
} else if (mode === 'h264') {
    args.push('--tff');
    args.push('--vpp-deinterlace', 'normal');
    args.push('-c', 'h264');
    args.push('--icq', '23');
} else if (mode === 'h265') {
    args.push('--tff');
    args.push('--vpp-deinterlace', 'normal');
    args.push('-c', 'hevc');
    args.push('--icq', '23');
} else {
    process.exit(1);
}

(async () => {
    const child = spawn(qsvencc, args);

    /**
     * エンコード進捗表示用に標準出力に進捗情報を吐き出す
     * 出力する JSON
     * {"type":"progress","percent": 0.8, "log": "view log" }
     */
    child.stderr.on('data', data => {
        let strbyline = String(data).split('\n');
        for (let i = 0; i < strbyline.length; i++) {
            let str = strbyline[i];
            if (/^\[\d+(\.\d+)?%\]/.test(str)) {
                // 想定log
                // [0.6%] 413 frames: 59.34 fps, 5869 kbps, remain 0:20:16, est out size 847.2MB
                const enc_reg = /\[(?<percent>\d+\.\d+)%\]\s+(?<frame>\d+)\s+frames:\s+(?<fps>\d+\.\d+)\s+fps,\s+(?<bitrate>\d+)\s+kbps,\s+remain\s+(?<remain>\d+:\d+:\d+),\s+est\s+out\s+size\s+(?<size>\d+\.\d+MB)/;
                let encmatch = str.match(enc_reg);

                if (encmatch === null) continue;

                const progress = {};
                progress['percent'] = parseFloat(encmatch.groups.percent) / 100; // 進捗率 (0.006)
                progress['frame'] = parseInt(encmatch.groups.frame); // 処理済みフレーム数
                progress['fps'] = parseFloat(encmatch.groups.fps); // 現在のフレームレート
                progress['bitrate'] = parseInt(encmatch.groups.bitrate); // ビットレート (kbps)
                progress['remain'] = encmatch.groups.remain; // 残り時間
                progress['size'] = parseFloat(encmatch.groups.size); // 推定出力サイズ (MB)    

                const log =
                    `${progress.frame} frames: ` +
                    `${progress.fps} fps, ` +
                    `${progress.bitrate} kbps, ` +
                    `remain ${progress.remain}, ` +
                    `est out size ${progress.size}MB`;

                console.log(JSON.stringify({ type: 'progress', percent: progress.percent, log: log }));
            }
        }
    });

    child.on('error', err => {
        console.error(err);
        throw new Error(err);
    });

    child.on('close', (code) => {
        process.exitCode = code;
    });

    process.on('SIGINT', () => {
        child.kill('SIGINT');
    });
})();
