const spawn = require('child_process').spawn;
const execFile = require('child_process').execFile;
const ffprobe = process.env.FFPROBE;
const tsreplace = 'tsreplace'; // tsreplace コマンドのパス
const qsvencc = 'qsvencc'; // qsvenc コマンドのパス

const input = process.env.INPUT;
const output = process.env.OUTPUT;

/**
 * 動画長取得関数
 * @param {string} filePath ファイルパス
 * @return number 動画長を返す (秒)
 */
const getDuration = filePath => {
    return new Promise((resolve, reject) => {
        execFile(ffprobe, ['-v', '0', '-select_streams', 'v:0', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath], (err, stdout) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                const firstLine = stdout.split('\n')[0].trim();
                resolve(parseFloat(firstLine));
            } catch (err) {
                reject(err);
            }
        });
    });
};

/**
 * 動画フレームレート取得関数
 * @param {string} filePath ファイルパス
 * @return number フレームレートを返す
 */
const getFramerate = filePath => {
    return new Promise((resolve, reject) => {
        execFile(ffprobe, ['-v', '0', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'default=noprint_wrappers=1:nokey=1', filePath], (err, stdout) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                const firstLine = stdout.split('\n')[0].trim(); // 最初の行を取得
                if (firstLine.includes('/')) {
                    // "30000/1001" のような形式を計算
                    const [numerator, denominator] = firstLine.split('/').map(Number);
                    resolve(numerator / denominator);
                } else {
                    // すでに数値の場合はそのまま返す
                    resolve(parseFloat(firstLine));
                }
            } catch (err) {
                reject(err);
            }
        });
    });
};

// tsreplace + qsvenc のエンコードオプション
const args = [
    '-i', input,
    '--remove-typed',
    '-o', output,
    '-e', qsvencc,
    '--avhw',
    '-i', '-',
    '--input-format', 'mpegts',
    '--avsync', 'vfr',
    '--tff',
    '--vpp-deinterlace', 'normal',
    '-c', 'hevc',
    '--icq', '23',
    '--gop-len', '90',
    '--output-format', 'mpegts',
    '--log-level', 'quiet,output=info,core_progress=info',
    '-o', '-',
];

(async () => {
        // 動画の総フレーム数を計算
        const duration = await getDuration(input); // 動画の長さ（秒）
        const framerate = await getFramerate(input); // フレームレート
        const totalFrames = Math.round(duration * framerate); // 総フレーム数

        console.log(`動画の長さ: ${duration} 秒`);
        console.log(`フレームレート: ${framerate} fps`);
        console.log(`総フレーム数: ${totalFrames}`);

        const child = spawn(tsreplace, args);

        /**
         * エンコード進捗表示用に標準出力に進捗情報を吐き出す
         * 出力する JSON
         * {"type":"progress","percent": 0.8, "log": "view log" }
         */
        child.stderr.on('data', data => {
            let strbyline = String(data).split('\n');
            for (let i = 0; i < strbyline.length; i++) {
                let str = strbyline[i];
                if (/\d+\s+frames/.test(str)) {
                    const enc_reg = /(?<frame>\d+)\s+frames:\s+(?<fps>\d+\.\d+)\s+fps,\s+(?<bitrate>\d+)\s+kbps/;
                    let encmatch = str.match(enc_reg);

                    if (encmatch === null) continue;

                    const progress = {};
                    progress['frame'] = parseInt(encmatch.groups.frame); // 処理済みフレーム数
                    progress['fps'] = parseFloat(encmatch.groups.fps); // 現在のフレームレート
                    progress['bitrate'] = parseInt(encmatch.groups.bitrate); // ビットレート (kbps)
                    progress['percent'] = parseFloat((progress['frame'] / totalFrames).toFixed(2)); // 進捗率を計算
                    

                    const log =
                        `${progress.frame} frames: ` +
                        `${progress.fps} fps, ` +
                        `${progress.bitrate} kbps, `;

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
