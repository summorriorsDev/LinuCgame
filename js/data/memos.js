/* 小主題ごとの「要点メモ」。ステージ開始前に任意で読める最短サマリー。 */
window.MEMOS = {
  '1.01.1': [
    '停止・再起動: `shutdown -h now`（停止）／`shutdown -r +10`（10分後に再起動）／`shutdown -c`（取消）。`systemctl poweroff`・`reboot` も同じ。',
    'SSH接続: `ssh -p ポート user@host`（scpのポートは大文字 `-P`）。',
    '公開鍵認証: `ssh-keygen` で鍵ペア作成 → `ssh-copy-id` でサーバの `~/.ssh/authorized_keys` に登録。秘密鍵は 600。',
    '`~/.ssh/known_hosts` = 接続したサーバのホスト鍵（クライアント側）。',
    '設定ファイル: サーバ `/etc/ssh/sshd_config`、クライアント `/etc/ssh/ssh_config`。root禁止は `PermitRootLogin no`。',
    '情報確認: `/etc/os-release`（ディストリ）、`uname -r`（カーネル）、`who`/`w`（ログイン中）、`last`（履歴）。'
  ],
  '1.01.2': [
    'コンテナ = ホストの**カーネルを共有**する軽量な隔離環境（namespace で分離、cgroups で資源制限）。VM はゲストOSごとにカーネルを持つ。',
    'Docker: `docker run -d -p ホスト:コンテナ イメージ`、`docker ps -a`（停止中も）、`docker exec -it 名前 bash`、`docker pull`、`docker rm`（コンテナ削除）、`docker rmi`（イメージ削除）。',
    'イメージ作成は `Dockerfile` → `docker build`。データ永続化は `-v` でボリューム/ディレクトリをマウント。',
    'KVM は Linux カーネルの仮想化機能。`virsh list --all`、`virsh start/shutdown/destroy`（destroy は強制停止）。',
    'IaaS（インフラを借りる）／PaaS（実行基盤）／SaaS（アプリ）。'
  ],
  '1.01.3': [
    '起動順: UEFI/BIOS → GRUB → カーネル(+initramfs) → systemd（PID 1）。',
    'ターゲット: runlevel 3 = `multi-user.target`、5 = `graphical.target`、1 = `rescue.target`。確認 `systemctl get-default`、変更 `set-default`、即時切替 `isolate`。',
    'サービス操作: `start / stop / restart / reload / status / enable / disable / is-active / enable --now`。`mask` は起動を完全に禁止。',
    'ユニットファイルを変更したら `systemctl daemon-reload`。置き場所は `/etc/systemd/system`（優先）と `/usr/lib/systemd/system`。',
    'ログ: `journalctl -u ユニット`、`-b`（今回の起動）、`-f`（追尾）、`-k`（カーネル）。`dmesg` もカーネルのメッセージ。',
    'GRUB2 の設定は `/etc/default/grub` を編集 → `grub2-mkconfig -o /boot/grub2/grub.cfg`（Debian系は `update-grub`）。'
  ],
  '1.01.4': [
    '`ps aux` / `ps -ef` で全プロセス、`pstree` で親子関係、`top`（M=メモリ順、P=CPU順、k=kill）。',
    'シグナル: `kill PID` は SIGTERM(15)、`kill -9` は SIGKILL（強制）、`kill -1` / `-HUP` は設定再読み込み。名前指定は `killall` / `pkill`、検索は `pgrep`。',
    'nice値は **-20（最優先）〜19**。一般ユーザは上げるのみ。`nice -n 10 cmd`、`renice -n 5 -p PID`。',
    'ジョブ制御: `cmd &`（バックグラウンド）、`Ctrl+Z`（一時停止）→ `bg` / `fg`、`jobs`。`nohup` はログアウトしても継続。',
    '`uptime` の load average = 過去 1 / 5 / 15 分。STAT の `Z` はゾンビ。`free` でメモリ状況。'
  ],
  '1.01.5': [
    'X Window System = クライアント/サーバ型（Xサーバが画面を担当）。後継は Wayland。',
    'ディスプレイマネージャ（ログイン画面）: GDM（GNOME）、LightDM、SDDM（KDE）。',
    'CUI から `startx` でX起動。`ssh -X` でリモートのX画面をローカルへ転送。'
  ],
  '1.02.1': [
    '数値: r=4, w=2, x=1。`rwxr-xr--` = 754。`chmod u+x file`、`chmod 644 file`、`chmod -R` で再帰。',
    '`chown user:group file`、`chgrp group file`。',
    'umask: ファイルは 666 − umask、ディレクトリは 777 − umask。umask 022 → ファイル 644 / ディレクトリ 755。',
    '特殊権限: SUID(4000)=所有者権限で実行 `rws`、SGID(2000)=グループを継承、スティッキー(1000)=所有者のみ削除可 `t`（例: /tmp）。',
    'ディレクトリの x = 移動・配下へのアクセス、r = 一覧、w = 作成・削除。'
  ],
  '1.02.2': [
    '`cp -r`（再帰）、`cp -p`（属性保持）、`cp -a`（全部保持）、`mv`（移動・名前変更）、`rm -r`、`rmdir`（空ディレクトリのみ）、`mkdir -p`（親ごと作成）、`touch`（作成/時刻更新）。',
    'tar: `c`作成 `x`展開 `t`一覧 `z`gzip `j`bzip2 `J`xz `f`ファイル。例: `tar czf a.tar.gz dir`、`tar xzf a.tar.gz`。',
    '圧縮: gzip(.gz) / bzip2(.bz2) / xz(.xz) / zip(.zip) ←→ gunzip / bunzip2 / unxz / unzip。',
    'ワイルドカード: `*`=0文字以上、`?`=ちょうど1文字、`[abc]`=いずれか1文字。',
    '`ls -la`（隠しファイル込みの詳細）、`ls -ld dir`（ディレクトリ自身）、`file`（種別判定）。'
  ],
  '1.02.3': [
    '`ln 元 リンク`=ハードリンク（同じinode、同一FS内のみ、ディレクトリ不可）／`ln -s 元 リンク`=シンボリックリンク（パスへの参照、FSをまたげる）。',
    '元ファイルを消すと、シンボリックリンクは壊れる／ハードリンクはデータが残る。',
    '`ls -i` で inode 番号を確認（ハードリンクは同じ番号）。`ls -l` の先頭 `l` と `->` がシンボリックリンク。'
  ],
  '1.02.4': [
    'FHS: `/etc` 設定、`/var` 可変データ（`/var/log`）、`/usr` ソフト、`/opt` 追加アプリ、`/home`、`/tmp`、`/boot`、`/dev`、`/proc`（カーネル/プロセス情報）、`/sys`。',
    '`find 場所 -name "*.conf" -type f -mtime +7 -size +10M -user tux -perm -4000`。`-exec cmd {} \\;` で結果に対して実行。',
    '`locate` はDB検索（`updatedb` で更新）。`which` は PATH 上の実行ファイル、`whereis` は実行ファイル+man+ソース、`type` は種別。'
  ],
  '1.03.1': [
    '変数: `export VAR=値`（子プロセスへ引き継ぐ）、`PATH=$PATH:/opt/bin`、`alias ll="ls -l"`、`unalias`。',
    '履歴: `history`、`!!`（直前）、`!25`（番号）、`Ctrl+R`（検索）。保存先 `~/.bash_history`。',
    'クォート: `"..."` は変数展開あり、`\'...\'` は展開なし、`\\` は1文字エスケープ。`$(cmd)` でコマンド置換。',
    '`&&`=成功時のみ、`||`=失敗時のみ、`;`=順に実行。`source file` は現在のシェルで実行。',
    '設定ファイル: ログインシェル `/etc/profile` → `~/.bash_profile`、対話シェル `~/.bashrc`。',
    'man: セクション 1=コマンド、5=ファイル形式、8=管理コマンド。`man -k`（キーワード検索）。`cd -`（直前のディレクトリ）。'
  ],
  '1.03.2': [
    '`cut -d: -f1`、`sort`（`-n` 数値、`-r` 逆順、`-u` 重複除去、`-k`、`-t`）、`uniq`（隣接する重複のみ → 先に sort、`-c` で件数）。',
    '`wc -l`（行）/`-w`（単語）/`-c`（バイト）、`head -n`/`tail -n`、`tail -f`（追尾）、`tac`（逆順）、`nl`・`cat -n`（行番号）。',
    '`tr a-z A-Z`（文字変換）、`paste`（横に連結）、`join`（キーで結合）、`split -l`、`less`（`/` 検索、`q` 終了）。'
  ],
  '1.03.3': [
    'ファイルディスクリプタ: 標準入力 0、標準出力 1、標準エラー 2。',
    '`>` 上書き、`>>` 追記、`<` 入力、`2>` エラーのみ、`> file 2>&1`（両方を同じファイルへ。順序が重要）、`&> file`（bash）、`/dev/null`（捨てる）。',
    '`|` は**標準出力だけ**を次の標準入力へ。`tee`（画面+ファイルの両方、`-a` で追記）、`xargs`（入力を引数に変換）。',
    'ヒアドキュメント: `cmd <<EOF ... EOF`。'
  ],
  '1.03.4': [
    'grep: `-i` 大小無視、`-v` 反転、`-n` 行番号、`-c` 件数、`-l` ファイル名、`-r` 再帰、`-w` 単語、`-E` 拡張正規表現（egrep）。',
    '正規表現: `^` 行頭、`$` 行末、`.` 任意の1文字、`*` 直前の0回以上、`[abc]` / `[^abc]` / `[0-9]`。基本正規表現では `\\+ \\? \\|` と書く（`-E` なら不要）。',
    'sed: `s/old/new/`（行で最初のみ）、`s/old/new/g`（すべて）、`-n \'2,4p\'`（表示）、`\'/pat/d\'`（削除）、`-i`（ファイル直接変更）。'
  ],
  '1.03.5': [
    'vi のモード: 起動時はコマンドモード → `i a o` などで挿入、`Esc` で戻る、`:` でexコマンド。',
    '挿入: `i`（カーソル位置）`a`（次の位置）`o`（下に行）`O`（上に行）`A`（行末）`I`（行頭）。',
    '編集: `dd`（行削除）`yy`（行コピー）`p`（貼付）`x`（1文字削除）`u`（undo）`Ctrl+r`（redo）。数字を前置で回数指定（`3dd`）。',
    '保存/終了: `:w`、`:q`、`:wq` / `:x` / `ZZ`、`:q!`（破棄）、`:w 別名`。',
    '検索・置換: `/foo`（前方）`?foo`（後方）`n`/`N`、`:%s/old/new/g`。移動: `G`（最終行）`gg`（先頭）。`:set number`。'
  ],
  '1.04.1': [
    '`apt update`（一覧の更新）→ `apt upgrade`（実際の更新）。`apt full-upgrade` は依存関係のため削除もする。',
    '`apt install / remove / purge（設定も削除）/ autoremove`、`apt search`、`apt show`、`apt list --installed`。',
    '取得元は `/etc/apt/sources.list` と `/etc/apt/sources.list.d/`。'
  ],
  '1.04.2': [
    '`dpkg -i x.deb`（導入）、`-r`（削除）、`-P`（設定も完全削除）、`-l`（一覧）、`-L パッケージ`（ファイル一覧）、`-S ファイル`（所属パッケージ）。',
    'dpkg は依存関係を自動解決しない（apt が解決する）。'
  ],
  '1.04.3': [
    '`yum install / remove / update`、`search`、`info`、`list installed`、`check-update`、`provides ファイル`、`history`、`clean all`。',
    'リポジトリ設定は `/etc/yum.repos.d/*.repo`（`baseurl`、`enabled=1/0`、`gpgcheck`）。',
    'RHEL 8 以降は `dnf` が後継（`yum` は互換）。'
  ],
  '1.04.4': [
    '`rpm -ivh`（導入）、`-Uvh`（更新/導入）、`-e`（削除）、`-V`（検証）、`--import`（GPG鍵）。',
    '問い合わせ: `-qa`（全部）`-qi`（情報）`-ql`（ファイル一覧）`-qf ファイル`（所属）`-qpi x.rpm`（未導入のrpmの情報）。',
    'rpm は依存関係を自動解決しない（yum/dnf が解決）。'
  ],
  '1.05.1': [
    '`lspci`（PCI）`lsusb`（USB）`lsmod`（モジュール）`lscpu`、`dmesg`（カーネルのログ）、`modinfo`（モジュール情報）。',
    '`modprobe`（依存込みで追加）、`modprobe -r`（削除）、`insmod` / `rmmod` は依存を考慮しない。',
    '`/proc/cpuinfo`、`/proc/meminfo`、`/proc/interrupts`（IRQ）、`/proc/ioports`、`/sys`（sysfs）。udev が /dev を動的に管理（ルール: `/etc/udev/rules.d/`）。'
  ],
  '1.05.2': [
    'MBR: 基本パーティション最大4（拡張を含む）、論理は5番から、約2TBまで。GPT: 2TB超・128個まで。',
    'デバイス名: `/dev/sda1`（SATA/SCSI/USB）、`/dev/nvme0n1p1`（NVMe）。',
    'fdisk: `n` 作成、`d` 削除、`p` 表示、`t` タイプ変更、`w` 書き込み、`q` 保存せず終了。タイプ: 82=swap、83=Linux、8e=LVM。',
    'スワップ: `mkswap` → `swapon`（停止は `swapoff`）。',
    'LVM: `pvcreate` → `vgcreate` → `lvcreate -L 10G -n 名前 VG名`。拡張は `lvextend` の後に `resize2fs`（ext）／`xfs_growfs`（XFS）。',
    '確認: `lsblk`、`blkid`（UUID）、`df -h`（空き容量）、`du -sh`（使用量）。'
  ],
  '1.05.3': [
    '作成: `mkfs.ext4 デバイス`／`mkfs -t xfs デバイス`。XFS は拡張のみ可（`xfs_growfs`）、修復は `xfs_repair`。ext は `e2fsck`・`tune2fs -l`。',
    '`mount デバイス ポイント`、`umount`（nは1つ）、`mount -o remount,ro /`、`mount -o loop disk.iso /mnt`、`mount -a`。busy なら `fuser -m` / `lsof` で使用中のプロセスを確認。',
    '`/etc/fstab` の6列: ①デバイス（UUID=推奨）②マウントポイント③FS種類④オプション⑤dump⑥fsck順。オプション例: `defaults / ro / noexec / nosuid / noatime / noauto`。',
    '`fsck` はアンマウントした状態で。`df -h`（容量）、`df -i`（inode）、`findmnt`（ツリー表示）。ジャーナリング対応: ext3/ext4/XFS（ext2は非対応）。'
  ]
};
