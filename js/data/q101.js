/* 主題1.01 Linuxのインストールと仮想マシン・コンテナの利用 */

/* ---- 1.01.1 インストール、起動、接続、切断と停止 ---- */
qc('1.01.1', '30分後にシステムを再起動するよう予約するコマンドはどれか。',
  ['shutdown -r +30', 'shutdown -h +30', 'shutdown -c +30', 'reboot +30'], 0,
  '`shutdown -r` は再起動(reboot)、`-h` は停止(halt/poweroff)。時刻は `+分` で相対指定できる。\n`-c` は予約の取り消し。`reboot` コマンドは時刻指定ができない。');

qi('1.01.1', '予約済みの shutdown を取り消すコマンドを入力せよ。（オプション含む）',
  ['shutdown -c'],
  '`shutdown -c` で予約したシャットダウン/再起動をキャンセルできる。');

qc('1.01.1', 'ssh クライアントが、接続したことのあるサーバのホスト公開鍵を記録するファイルはどれか。',
  ['~/.ssh/known_hosts', '~/.ssh/authorized_keys', '~/.ssh/id_rsa.pub', '/etc/ssh/sshd_config'], 0,
  '初回接続時に表示される「ホストの指紋を保存するか」の確認結果が `~/.ssh/known_hosts` に保存される。\n`authorized_keys` は「サーバ側」でログインを許可する公開鍵を並べるファイル。');

qc('1.01.1', '公開鍵認証で、サーバ側にログインを許可するユーザの公開鍵を登録するファイルはどれか。',
  ['~/.ssh/authorized_keys', '~/.ssh/known_hosts', '/etc/ssh/ssh_config', '~/.ssh/id_rsa'], 0,
  'ログインされる側（サーバ）のユーザの `~/.ssh/authorized_keys` に公開鍵を追記する。\n秘密鍵（id_rsa など）は自分のクライアント側だけに置き、パーミッションは 600 にする。');

qc('1.01.1', 'ssh の公開鍵認証に使う鍵ペア（秘密鍵と公開鍵）を生成するコマンドはどれか。',
  ['ssh-keygen', 'ssh-copy-id', 'ssh-add', 'ssh-agent'], 0,
  '`ssh-keygen` が鍵ペアを生成する。`ssh-copy-id` は公開鍵をサーバに登録、`ssh-agent` は秘密鍵を一時的に保持、`ssh-add` はそのエージェントに鍵を追加する。');

qc('1.01.1', 'ローカルの公開鍵をリモートホストの `authorized_keys` へ登録するコマンドはどれか。',
  ['ssh-copy-id', 'ssh-keygen', 'scp-key', 'ssh-add'], 0,
  '`ssh-copy-id user@host` で公開鍵がサーバの `~/.ssh/authorized_keys` に追記される。');

qc('1.01.1', 'ポート番号 2222 で動作している sshd に、ユーザ tux として server.example.com へ接続するコマンドはどれか。',
  ['ssh -p 2222 tux@server.example.com', 'ssh -P 2222 tux@server.example.com', 'ssh tux@server.example.com:2222', 'ssh -l 2222 tux server.example.com'], 0,
  'ssh は小文字の `-p` でポート指定。ちなみに `scp` は大文字の `-P`（ひっかけ頻出）。\n`-l` はログインユーザ名の指定。');

qc('1.01.1', 'sshd（SSHサーバ）の設定ファイルはどれか。',
  ['/etc/ssh/sshd_config', '/etc/ssh/ssh_config', '~/.ssh/config', '/etc/sshd.conf'], 0,
  'サーバ側は `sshd_config`、クライアント側は `ssh_config`（ユーザ個別は `~/.ssh/config`）。名前が1文字違いなので注意。');

qc('1.01.1', 'sshd で root ユーザの直接ログインを禁止するための設定はどれか。（`/etc/ssh/sshd_config`）',
  ['PermitRootLogin no', 'DenyRoot yes', 'RootLogin disable', 'AllowRoot no'], 0,
  '`PermitRootLogin no` で root のログインを拒否する。設定変更後は `systemctl reload sshd` などで反映する。');

qc('1.01.1', '稼働中のディストリビューションの名前やバージョンが記載されているファイルはどれか。',
  ['/etc/os-release', '/etc/hosts', '/etc/fstab', '/etc/passwd'], 0,
  '`/etc/os-release` はディストリビューション共通の情報ファイル。RHEL系なら `/etc/redhat-release`、Debian系なら `/etc/debian_version` もある。');

qi('1.01.1', 'カーネルのリリース番号（例: 5.14.0）を表示するコマンドを、オプション付きで入力せよ。',
  ['uname -r', 'uname --kernel-release'],
  '`uname -r` でカーネルのリリース番号、`uname -a` で全情報を表示。');

qc('1.01.1', 'ログイン中のユーザの一覧に加えて、各ユーザが実行中のコマンドや負荷平均も表示するコマンドはどれか。',
  ['w', 'who', 'last', 'id'], 0,
  '`who` はログイン中のユーザ一覧、`w` は実行中の処理や load average も表示。`last` は過去のログイン履歴（/var/log/wtmp）。');

/* ---- 1.01.2 仮想マシン・コンテナの概念と利用 ---- */
qc('1.01.2', 'コンテナ型の仮想化が、仮想マシン（VM）と比べて軽量・高速に起動できる主な理由はどれか。',
  ['ホストOSのカーネルを共有しているため', 'ハードウェアを完全にエミュレートしているため', 'コンテナごとに独自のカーネルを持つため', '物理CPUをコンテナが占有するため'], 0,
  'コンテナはホストのカーネルを共有し、プロセスを隔離する仕組み。VMはゲストOSごとにカーネルを持つので重い。\nそのためコンテナ内で別カーネル（例：別バージョンのカーネルモジュール）は使えない。');

qm('1.01.2', 'Linuxのコンテナ技術でプロセスを隔離・制限するために使われるカーネル機能を、2つ選べ。',
  ['namespace', 'cgroups', 'iptables', 'GRUB'], [0, 1],
  '`namespace` はプロセス・ネットワーク・マウントなどの「見える範囲」を分離し、`cgroups`（control groups）はCPU・メモリなど「使えるリソース量」を制限する。');

qc('1.01.2', '停止中のものも含め、すべてのコンテナを一覧表示するコマンドはどれか。',
  ['docker ps -a', 'docker ps', 'docker images', 'docker ls --stopped'], 0,
  '`docker ps` は実行中のみ。`-a` を付けると停止中も表示する。`docker images` はイメージの一覧。');

qc('1.01.2', '`docker run -d -p 8080:80 nginx` の `-p 8080:80` の意味として正しいものはどれか。',
  ['ホストの8080番ポートへの通信をコンテナの80番ポートへ転送する', 'コンテナの8080番ポートをホストの80番ポートへ転送する', 'コンテナを8080秒後に80回再起動する', 'プロセスID 8080 に優先度 80 を与える'], 0,
  '`-p ホストのポート:コンテナのポート` の順。`-d` はバックグラウンド（デタッチ）で実行するオプション。');

qi('1.01.2', 'レジストリからイメージ nginx を取得（ダウンロード）するコマンドを入力せよ。',
  ['docker pull nginx', 'docker image pull nginx', 'docker pull nginx:latest', 'docker image pull nginx:latest'],
  '`docker pull イメージ名[:タグ]`。タグ省略時は `latest` になる。');

qc('1.01.2', '実行中のコンテナ web の中で、対話的にシェル bash を起動するコマンドはどれか。',
  ['docker exec -it web bash', 'docker run -it web bash', 'docker attach bash web', 'docker enter web bash'], 0,
  '実行中のコンテナ内でコマンドを実行するのは `docker exec`。`-i`（標準入力維持）と `-t`（疑似端末）を付けて対話操作する。\n`docker run` は「イメージから新しいコンテナを作って」実行するコマンドなので別物。');

qc('1.01.2', 'ローカルに保存されているイメージ myimg を削除するコマンドはどれか。',
  ['docker rmi myimg', 'docker rm myimg', 'docker delete myimg', 'docker stop myimg'], 0,
  '`docker rm` はコンテナの削除、`docker rmi` はイメージの削除（rm image）。');

qc('1.01.2', 'KVM（libvirt）で、停止中のものも含めてすべての仮想マシンを表示するコマンドはどれか。',
  ['virsh list --all', 'virsh list', 'virsh show --all', 'virsh vm-list'], 0,
  '`virsh list` は起動中のみ。`--all` を付けると停止中のゲストも含めて表示する。');

qc('1.01.2', '`virsh destroy vm1` の動作として正しいものはどれか。',
  ['仮想マシン vm1 を強制停止する（定義は残る）', '仮想マシン vm1 の定義とディスクを削除する', '仮想マシン vm1 を正常にシャットダウンする', '仮想マシン vm1 を新規作成する'], 0,
  '`destroy` は電源を強制的に切るイメージ（定義やディスクは消えない）。正常終了は `virsh shutdown`、起動は `virsh start`、定義の削除は `virsh undefine`。');

qc('1.01.2', 'Linuxカーネルに組み込まれている仮想化機能（ハイパーバイザ機能）はどれか。',
  ['KVM', 'Docker', 'LVM', 'systemd'], 0,
  'KVM（Kernel-based Virtual Machine）はLinuxカーネルのモジュールとして提供される。Dockerはコンテナ、LVMは論理ボリューム管理。');

qc('1.01.2', 'Docker でコンテナイメージを作成するための手順書（ベースイメージや実行コマンドなど）を記述するファイルはどれか。',
  ['Dockerfile', 'docker-compose.log', 'Makefile', 'docker.conf'], 0,
  '`Dockerfile` を元に `docker build -t 名前 .` でイメージを作る。');

qc('1.01.2', 'コンテナを削除してもデータを失わないようにするための仕組みとして適切なものはどれか。',
  ['ボリュームやホストのディレクトリをマウントする（-v）', 'コンテナを停止だけにして削除しない', 'イメージを再ビルドする', 'コンテナのメモリ上限を増やす'], 0,
  'コンテナの書き込み層は削除と一緒に消える。永続化したいデータは `-v` でボリューム/ホストのディレクトリをマウントして保存する。');

qc('1.01.2', 'クラウドのサービスモデルのうち、仮想サーバやネットワークなどのインフラを借り、OSやミドルウェアは利用者が構築するものはどれか。',
  ['IaaS', 'PaaS', 'SaaS', 'DaaS'], 0,
  'IaaS = インフラ(Infrastructure)、PaaS = 実行基盤(Platform)、SaaS = アプリ(Software)。下の層ほど利用者の管理範囲が広い。');

/* ---- 1.01.3 ブートプロセスとsystemd ---- */
qc('1.01.3', 'Linuxの一般的な起動の流れとして正しいものはどれか。',
  ['BIOS/UEFI → ブートローダ(GRUB) → カーネル → systemd', 'ブートローダ → BIOS/UEFI → systemd → カーネル', 'BIOS/UEFI → カーネル → ブートローダ → systemd', 'systemd → カーネル → ブートローダ → BIOS/UEFI'], 0,
  'ファームウェア(BIOS/UEFI) がブートローダを読み込み、ブートローダがカーネルを読み込み、カーネルが最初のプロセス(systemd, PID 1)を起動する。');

qc('1.01.3', 'systemd を採用したシステムで、カーネルが最初に起動するプロセスのPIDはいくつか。',
  ['1', '0', '2', '100'], 0,
  '最初のユーザ空間プロセスは PID 1（systemd）。全プロセスの親になる。');

qc('1.01.3', 'SysVinitのランレベル3（CUIのマルチユーザモード）に相当する systemd のターゲットはどれか。',
  ['multi-user.target', 'graphical.target', 'rescue.target', 'poweroff.target'], 0,
  'runlevel 3 = `multi-user.target`、runlevel 5 = `graphical.target`、runlevel 1 = `rescue.target`、runlevel 0 = `poweroff.target`、runlevel 6 = `reboot.target`。');

qi('1.01.3', '現在のデフォルトターゲットを表示するコマンドを入力せよ。',
  ['systemctl get-default'],
  '確認は `systemctl get-default`、変更は `systemctl set-default graphical.target` のように行う。');

qc('1.01.3', 'sshd を「今すぐ起動」し、同時に「OS起動時の自動起動」も有効にするコマンドはどれか。',
  ['systemctl enable --now sshd', 'systemctl start --enable sshd', 'systemctl boot sshd', 'systemctl add sshd'], 0,
  '`enable` は自動起動の設定、`--now` を付けると同時に `start` も行う。（Debian系ではサービス名は `ssh`）');

qc('1.01.3', 'サービスを停止せずに設定ファイルを再読み込みさせたい。適切なコマンドはどれか。（サービスは reload に対応しているものとする）',
  ['systemctl reload httpd', 'systemctl restart httpd', 'systemctl daemon-reload', 'systemctl reset httpd'], 0,
  '`reload` は再起動せずに設定を再読み込み（対応サービスのみ）。`restart` は停止→起動。`daemon-reload` はsystemd自身にユニットファイルの変更を読み込ませる。');

qc('1.01.3', 'ユニットファイルを新規作成・編集した後、その内容を systemd に認識させるために実行するコマンドはどれか。',
  ['systemctl daemon-reload', 'systemctl reload-unit', 'systemctl refresh', 'systemctl reset-failed'], 0,
  'ユニットファイルを書き換えたら `systemctl daemon-reload` が必要。サービス自体の設定再読み込みの `reload` とは別物。');

qc('1.01.3', '管理者が作成・編集するユニットファイルを置く、パッケージ提供のものより優先されるディレクトリはどれか。',
  ['/etc/systemd/system', '/usr/lib/systemd/system', '/var/lib/systemd', '/boot/systemd'], 0,
  '優先順位は `/etc/systemd/system`（管理者）> `/run/systemd/system` > `/usr/lib/systemd/system`（パッケージ。Debian系は /lib/systemd/system）。');

qc('1.01.3', '今回の起動（ブート）以降のログだけを systemd のジャーナルから表示するコマンドはどれか。',
  ['journalctl -b', 'journalctl -f', 'journalctl -k', 'journalctl --last'], 0,
  '`-b` は今回のブート、`-f` は追尾(follow)、`-k` はカーネルメッセージ、`-u ユニット名` は特定ユニットのログ。');

qc('1.01.3', 'SysVinitのランレベル1（シングルユーザモード）に相当するターゲットはどれか。',
  ['rescue.target', 'emergency.target', 'multi-user.target', 'shutdown.target'], 0,
  '`rescue.target` が基本的なシステム初期化を行ったシングルユーザ環境。`emergency.target` はさらに最小限（ルートFSが読み取り専用でマウントされる）。');

qc('1.01.3', '稼働中のシステムを再起動せずに、systemctl で別のターゲット（例: rescue.target）へ切り替えるコマンドはどれか。',
  ['systemctl isolate rescue.target', 'systemctl switch rescue.target', 'systemctl set-default rescue.target', 'systemctl enable rescue.target'], 0,
  '`isolate` はそのターゲットと依存するユニットだけを起動し、それ以外を停止する。`set-default` は次回以降の既定ターゲットの変更。');

qc('1.01.3', '`systemctl mask foo.service` の効果として正しいものはどれか。',
  ['手動起動も含めて、foo.service が起動できなくなる', 'foo.service の自動起動を有効にする', 'foo.service を再読み込みする', 'foo.service のログを非表示にする'], 0,
  '`mask` はユニットを /dev/null へのシンボリックリンクにして、手動でも他ユニットの依存でも起動できなくする。解除は `unmask`。`disable` は自動起動をやめるだけで手動起動は可能。', true);

qc('1.01.3', 'GRUB 2 の設定を変更する際の正しい手順はどれか。',
  ['/etc/default/grub を編集し、grub2-mkconfig（または update-grub）で grub.cfg を再生成する', '/boot/grub2/grub.cfg を直接編集して再起動する', 'systemctl edit grub を実行する', 'initramfs を再作成する'], 0,
  'grub.cfg は自動生成ファイルなので直接編集せず、`/etc/default/grub` を編集して `grub2-mkconfig -o /boot/grub2/grub.cfg`（Debian系は `update-grub`）で反映する。', true);

qc('1.01.3', 'initramfs（初期RAMファイルシステム）の主な役割はどれか。',
  ['実際のルートファイルシステムをマウントするために必要なドライバ等を提供する', 'ユーザのホームディレクトリを RAM 上に作成する', 'ログを RAM 上に保存する', 'GRUB の設定ファイルを格納する'], 0,
  'ルートFSがLVMや特殊なデバイス上にある場合に必要なモジュールを含んだ一時的なルートFS。ブート初期にカーネルが使う。');

qi('1.01.3', 'サービス sshd の状態（稼働しているか、直近のログなど）を表示するコマンドを入力せよ。',
  ['systemctl status sshd', 'systemctl status sshd.service', 'systemctl status ssh', 'systemctl status ssh.service'],
  '`systemctl status ユニット名`。サービス名の `.service` は省略可能。');

qc('1.01.3', '起動時のカーネルのメッセージ（ハードウェア検出など）を確認するコマンドはどれか。',
  ['dmesg', 'lsmod', 'uptime', 'last'], 0,
  '`dmesg` はカーネルのリングバッファを表示する。`journalctl -k` でも同様に見られる。');

/* ---- 1.01.4 プロセスの生成、監視、終了 ---- */
qc('1.01.4', '`ps` コマンドをオプションなしで実行した場合に表示されるプロセスはどれか。',
  ['現在の端末（シェル）から起動した自分のプロセス', 'システム上のすべてのプロセス', '実行中のユーザ全員のプロセス', 'rootユーザのプロセスのみ'], 0,
  '全プロセスは `ps aux`（BSD形式）や `ps -ef`（UNIX形式）で表示する。');

qc('1.01.4', '`kill 1234` のようにシグナルを指定せずに kill を実行したとき、送信されるシグナルはどれか。',
  ['SIGTERM (15)', 'SIGKILL (9)', 'SIGHUP (1)', 'SIGINT (2)'], 0,
  'デフォルトは SIGTERM（15）で「終了してください」という依頼。プロセス側で処理できる。SIGKILL（9）は強制終了で、捕捉も無視もできない。');

qc('1.01.4', 'デーモンに設定ファイルの再読み込みをさせるために一般的に送るシグナルはどれか。',
  ['SIGHUP (1)', 'SIGSTOP (19)', 'SIGKILL (9)', 'SIGUSR3 (99)'], 0,
  '`kill -HUP PID`（`kill -1 PID`）。多くのデーモンが SIGHUP を「設定の再読み込み」として扱う。');

qc('1.01.4', 'プロセス名を指定して、同名のプロセスをまとめて終了させるコマンドはどれか。',
  ['killall', 'kill', 'stop', 'endproc'], 0,
  '`killall 名前` や `pkill 名前` が名前指定。`kill` はPID指定。');

qc('1.01.4', 'プロセスのnice値の範囲と、優先度の関係として正しいものはどれか。',
  ['-20〜19 で、値が小さいほど優先度が高い', '-20〜19 で、値が大きいほど優先度が高い', '0〜99 で、値が小さいほど優先度が高い', '1〜100 で、値が大きいほど優先度が高い'], 0,
  'nice値は -20（最優先）〜19（最低優先）。一般ユーザは値を「上げる」ことしかできず、下げるのは root のみ。');

qc('1.01.4', 'PID 1234 のプロセスの nice 値を 5 に変更するコマンドはどれか。',
  ['renice -n 5 -p 1234', 'nice -n 5 1234', 'renice 1234 5', 'priority 5 1234'], 0,
  '実行中のプロセスの変更は `renice`、新規コマンドを指定の nice 値で起動するのは `nice -n 値 コマンド`。');

qc('1.01.4', 'フォアグラウンドで実行中のコマンドを一時停止し、そのままバックグラウンドで再開させる操作はどれか。',
  ['Ctrl+Z のあとに bg を実行する', 'Ctrl+C のあとに bg を実行する', 'Ctrl+D のあとに fg を実行する', 'Ctrl+Z のあとに kill を実行する'], 0,
  '`Ctrl+Z` で一時停止(SIGTSTP)、`bg` でバックグラウンド再開、`fg` でフォアグラウンドに戻す。`jobs` で一覧。`Ctrl+C` は中断(SIGINT)。');

qc('1.01.4', 'コマンドの前に `nohup` を付けて実行する主な目的はどれか。',
  ['ログアウトしても（SIGHUPを受けても）プロセスを継続させる', 'プロセスの優先度を下げる', 'プロセスの出力を画面に表示しない', 'プロセスを高速化する'], 0,
  '`nohup コマンド &` でログアウト後も実行が続く。出力は標準では `nohup.out` に書き出される。');

qc('1.01.4', '`top` コマンドの実行中、メモリ使用率の高い順に並べ替えるキーはどれか。',
  ['M', 'P', 'T', 'q'], 0,
  '`M` = メモリ順、`P` = CPU順、`T` = 実行時間順、`k` = プロセスにシグナル送信(kill)、`q` = 終了。');

qc('1.01.4', '`uptime` で表示される load average の3つの数値は、何の平均を表すか。',
  ['過去1分・5分・15分の平均負荷', '過去1時間・6時間・24時間の平均負荷', 'CPU・メモリ・ディスクの使用率', '実行中・待機中・停止中のプロセス数'], 0,
  'load average は実行待ち/実行中のプロセス数の平均。CPUコア数を超え続けていると過負荷の目安になる。');

qc('1.01.4', '`ps` の STAT 欄が「Z」のプロセスの状態として正しいものはどれか。',
  ['ゾンビプロセス（終了済みだが親が終了状態を回収していない）', 'スリープ中', '停止（一時停止）中', '割り込み不可能なスリープ中'], 0,
  'Z = ゾンビ、S = スリープ、R = 実行中/実行可能、T = 停止、D = 割り込み不可能なスリープ（I/O待ち）。ゾンビはkillしても消えず、親プロセスの対応が必要。');

qi('1.01.4', 'プロセス名 sshd に一致するプロセスのPIDを検索して表示するコマンドを入力せよ。',
  ['pgrep sshd'],
  '`pgrep 名前` でPIDを表示。`pkill 名前` でシグナル送信。');

qc('1.01.4', 'メモリとスワップの使用状況を表示するコマンドはどれか。',
  ['free', 'df', 'du', 'uptime'], 0,
  '`free -h` で見やすい単位で表示。`df` はファイルシステムの空き、`du` はディレクトリの使用量。');

qc('1.01.4', 'プロセスの親子関係を木構造で表示するコマンドはどれか。',
  ['pstree', 'ps -l', 'top', 'jobs'], 0,
  '`pstree` は親子関係をツリー表示する。`ps f`（forest）でも似た表示ができる。');

/* ---- 1.01.5 デスクトップ環境の利用 ---- */
qc('1.01.5', 'X Window System の特徴として正しいものはどれか。',
  ['クライアント/サーバモデルで、Xサーバが画面表示や入力を管理する', 'カーネルの一部として動作する', 'CUI専用のサービスである', 'ネットワーク越しの表示はできない'], 0,
  'Xサーバ（画面・キーボード・マウスを担当）と、Xクライアント（各アプリ）に分かれており、ネットワーク越しにアプリの画面を表示することもできる。');

qc('1.01.5', 'X Window System の後継として採用が進んでいるディスプレイサーバのプロトコルはどれか。',
  ['Wayland', 'X.Org', 'GNOME', 'GRUB'], 0,
  'Wayland は X11 の後継。GNOME や KDE などの主要なデスクトップ環境が対応している。');

qc('1.01.5', 'GNOME デスクトップで標準的に使われる、グラフィカルなログイン画面を提供するディスプレイマネージャはどれか。',
  ['GDM', 'systemd', 'GRUB', 'startx'], 0,
  'GDM = GNOME Display Manager。他に LightDM、SDDM（KDE）などがある。');

qc('1.01.5', 'CUIコンソールにログインしたあとで、X Window System を起動するコマンドはどれか。',
  ['startx', 'xinit-stop', 'gdm-start', 'startgui'], 0,
  '`startx` はXサーバを起動し、`~/.xinitrc` などで指定されたデスクトップ環境/アプリを起動する。');

qc('1.01.5', 'リモートホストで動かす X アプリケーションの画面を、ssh 経由でローカルに表示するためのオプションはどれか。',
  ['ssh -X', 'ssh -D', 'ssh -L', 'ssh -N'], 0,
  '`ssh -X`（または `-Y`）でX11転送を有効にする。`-L` はローカルポート転送、`-D` はダイナミックポート転送。');
