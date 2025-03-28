#!/bin/bash

# 子プロセスのPIDを格納する配列
pids=()

# 子プロセスを終了させる関数
# SIGTERMシグナルを処理する関数
handle_sigterm() {
    for pid in "${pids[@]}"; do
        kill -SIGTERM "$pid" 2>/dev/null
    done
}

# SIGINTシグナルを処理する関数
handle_sigint() {
    for pid in "${pids[@]}"; do
        kill -SIGINT "$pid" 2>/dev/null
    done
}

# EXITシグナルを処理する関数
handle_exit() {
    for pid in "${pids[@]}"; do
        kill -SIGKILL "$pid" 2>/dev/null
    done
}

# シグナルをキャッチして対応する関数を実行
trap handle_sigterm SIGTERM
trap handle_sigint SIGINT
trap handle_exit EXIT

# 子プロセスをバックグラウンドで実行し、PIDを配列に追加
recdvb --dev "$1" "$2" - - | dantto4k - - &
pids+=($!)

# 子プロセスが終了するまで待機
wait "${pids[@]}"