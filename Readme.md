# docker-mirakurun-epgstation-pxmlt5pe

[Mirakurun](https://github.com/Chinachu/Mirakurun) + [EPGStation](https://github.com/l3tnun/EPGStation) の Docker コンテナ

## 前提条件

- Docker, docker-compose の導入が必須
- チューナーのドライバが適切にインストールされていること

## 変更点

- PX-MLT5PE用にconfigを調整
- [libsobacas](https://github.com/tsunoda14/libsobacas)を組み込み、外部カードリーダー無しで動作するよう調整
- QSVEncによるハードウェアエンコードに対応

## インストール手順

```sh
curl -sf https://raw.githubusercontent.com/0x1F5/docker-mirakurun-epgstation-pxmlt5pe/v2/setup.sh | sh -s
cd docker-mirakurun-epgstation-pxmlt5pe

# チャンネル設定
vim mirakurun/conf/channels.yml

# コメントアウトされている restart や user の設定を適宜変更する
# 初回にepgstationのuser: "1000:1000"を設定しない場合後からchownしなければならないため設定することをおすすめする
# PX-MLT5PE以外を使う場合はdevicesを適宜調整する
vim docker-compose.yml
```

## 起動

```sh
sudo docker compose up -d
```

## チャンネルスキャン(取得漏れが出る場合もあるので注意)

```sh
#地デジ
curl -X PUT "http://localhost:40772/api/config/channels/scan?refresh=true"
#BS
curl -X PUT "http://localhost:40772/api/config/channels/scan?type=BS&setDisabledOnAdd=false&refresh=true"
#CS
curl -X PUT "http://localhost:40772/api/config/channels/scan?type=CS&setDisabledOnAdd=false&refresh=true"
```

mirakurun の EPG 更新を待ってからブラウザで http://DockerHostIP:8888 へアクセスし動作を確認する

## 停止

```sh
sudo docker compose stop
```

## コンテナの破棄

```sh
sudo docker compose down
```

## 更新

```sh
# mirakurunとdbを更新
sudo docker compose pull
# epgstationを更新
sudo docker compose build --pull
# 最新のイメージを元に起動
sudo docker compose up -d
```

## 設定

### Mirakurun

* ポート番号: 40772

### EPGStation

* ポート番号: 8888
* ポート番号: 8889

### 各種ファイル保存先

* 録画データ

```./recorded```

* サムネイル

```./epgstation/thumbnail```

* 予約情報と HLS 配信時の一時ファイル

```./epgstation/data```

* EPGStation 設定ファイル

```./epgstation/config```

* EPGStation のログ

```./epgstation/logs```

## v1からの移行について

[docs/migration.md](docs/migration.md)を参照
