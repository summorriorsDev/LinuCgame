/* 第2章 実戦演習 — 主題1.01
   出力の読み取り・誤りを選ぶ・複数選択・状況設定など、試験でよく見る形式の書き下ろし問題。 */
window.__ch = 2;

/* ---- 1.01.1 インストール、起動、接続、切断と停止 ---- */
qc('1.01.1', 'SSH に関する記述のうち、**誤っているもの**はどれか。',
  ['公開鍵認証では、クライアントの秘密鍵をサーバの `~/.ssh/authorized_keys` に登録する。',
   '`ssh-keygen -R ホスト名` で、`known_hosts` に記録された該当ホストの情報を削除できる。',
   '`ssh user@host ls /tmp` のように、接続先でコマンドを1つ実行して切断できる。',
   '`/etc/ssh/sshd_config` の `Port` で、サーバが待ち受けるポート番号を変更できる。',
   '初回接続時に表示されるホスト鍵のフィンガープリントは、接続先が本物かを確認するために使う。'], 0,
  '`authorized_keys` に登録するのは**公開鍵**。秘密鍵は自分のクライアントにだけ置き、絶対に渡さない。\nそれ以外の4つは正しい記述。');

qc('1.01.1', '再構築したサーバに ssh 接続したところ、次の警告が出て接続が拒否された。サーバのホスト鍵が正当に変わったことを確認できている場合の対処として、適切なものはどれか。\n```\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n```',
  ['クライアントで `ssh-keygen -R サーバ名` を実行し、古いホスト鍵の記録を削除してから再接続する。',
   'サーバ側の `~/.ssh/authorized_keys` を削除する。',
   'サーバ側の `sshd_config` に `PermitRootLogin yes` を追加する。',
   'クライアントの秘密鍵（`id_rsa`）を削除して作り直す。',
   '`ssh -p 22` と、ポートを明示して接続する。'], 0,
  '警告は、**クライアントの `known_hosts` に記録されたホスト鍵と、今回サーバが提示した鍵が違う**ことを示している（なりすましの可能性も）。正当な変更と確認できたら、`ssh-keygen -R` で古い記録を消して再接続する。\n`authorized_keys` や自分の秘密鍵は、この警告とは無関係。');

qm('1.01.1', '公開鍵認証で ssh 接続できるようにするために必要な作業を、2つ選べ。',
  ['クライアントで `ssh-keygen` を実行して、鍵ペアを作成する。',
   'クライアントの公開鍵を、サーバのログイン先ユーザの `~/.ssh/authorized_keys` に登録する。',
   'クライアントの秘密鍵を、サーバの `~/.ssh/authorized_keys` に登録する。',
   'サーバの公開鍵を、クライアントの `~/.ssh/authorized_keys` に登録する。'], [0, 1],
  '鍵ペアの作成（クライアント）と、公開鍵のサーバへの登録（`ssh-copy-id` が便利）の2段階。サーバのホスト鍵は、クライアント側の `known_hosts` に記録される別の仕組み。');

qc('1.01.1', '`shutdown -h +5 "Maintenance"` を実行したときの説明として、正しいものはどれか。',
  ['5分後にシステムを停止する。メッセージ `Maintenance` はログイン中のユーザに通知される。',
   '5秒後にシステムを再起動する。',
   'ただちにシステムを停止し、5分後にもう一度起動する。',
   '5分ごとに `Maintenance` というメッセージを表示するだけで、システムは停止しない。',
   '`-h` は help の意味で、使い方を表示する。'], 0,
  '`-h` は停止（halt/poweroff）、`+5` は「5分後」、末尾の文字列はログイン中の全ユーザに送られる通知メッセージ。再起動は `-r`、取り消しは `-c`。');

qi('1.01.1', 'systemd を使っているシステムで、`systemctl` を使って再起動するコマンドを入力せよ。',
  ['systemctl reboot'],
  '`systemctl reboot`（再起動）、`systemctl poweroff`（電源断）、`systemctl halt`（停止）。');

qc('1.01.1', 'ディストリビューションとパッケージ形式の組み合わせとして、正しいものはどれか。',
  ['Ubuntu — .deb　／　AlmaLinux — .rpm',
   'Ubuntu — .rpm　／　AlmaLinux — .deb',
   'Debian — .rpm　／　Red Hat Enterprise Linux — .deb',
   'Debian — .rpm　／　AlmaLinux — .rpm',
   'Ubuntu — .deb　／　Red Hat Enterprise Linux — .deb'], 0,
  'Debian 系（Debian、Ubuntu など）は `.deb`（`apt` / `dpkg`）、Red Hat 系（RHEL、AlmaLinux、Rocky Linux、CentOS など）は `.rpm`（`dnf` / `yum` / `rpm`）。');

/* ---- 1.01.2 仮想マシン・コンテナの概念と利用 ---- */
qc('1.01.2', '次は `docker ps -a` の実行結果である。この出力から読み取れる内容として、正しいものはどれか。\n```\nCONTAINER ID  IMAGE  COMMAND                 CREATED       STATUS                    PORTS                  NAMES\na1b2c3d4e5f6  nginx  "/docker-entrypoint…"   2 hours ago   Up 2 hours                0.0.0.0:8080->80/tcp   web\nf6e5d4c3b2a1  mysql  "docker-entrypoint.s…"  3 days ago    Exited (0) 3 days ago                            db\n```',
  ['コンテナ `web` は実行中で、ホストの8080番ポートがコンテナの80番ポートに転送されている。',
   'コンテナ `db` は実行中である。',
   'コンテナ `db` は異常終了している。',
   'コンテナ `web` のイメージは `mysql` である。',
   'コンテナはどちらも停止している。'], 0,
  '`STATUS` が `Up` なら実行中、`Exited (0)` は**正常終了**（0以外なら異常終了）。`PORTS` の `0.0.0.0:8080->80/tcp` は「ホスト8080 → コンテナ80」。');

qc('1.01.2', '`docker run --rm -it ubuntu bash` の `--rm` オプションの意味として、正しいものはどれか。',
  ['コンテナが終了したときに、そのコンテナを自動的に削除する。',
   '起動前に、同名のイメージを削除する。',
   'コンテナをバックグラウンドで実行する。',
   'コンテナ内の `/` を読み取り専用にする。',
   '終了したあと、そのイメージを削除する。'], 0,
  '`--rm` は「コンテナ終了時にコンテナ自身を削除」。イメージは消えない。バックグラウンド実行は `-d`、対話操作は `-i -t`。');

qc('1.01.2', 'コンテナに環境変数 `DB_HOST=db` を渡して、名前 `app` でバックグラウンド起動するコマンドとして、正しいものはどれか。（イメージ名は `myimg`）',
  ['docker run -d --name app -e DB_HOST=db myimg',
   'docker run -d --name app -v DB_HOST=db myimg',
   'docker run -d --name app -p DB_HOST=db myimg',
   'docker run -d -e app --name DB_HOST=db myimg',
   'docker start -d --name app -e DB_HOST=db myimg'], 0,
  '`--name` はコンテナ名、`-e`（`--env`）は環境変数、`-v` はボリューム、`-p` はポート。`docker start` は既存のコンテナを起動するだけで、新規作成や環境変数の指定はできない。');

qm('1.01.2', 'コンテナ型仮想化の特徴として、正しいものを2つ選べ。',
  ['ホストOSのカーネルを共有するため、仮想マシンに比べて起動が速く、資源の消費が少ない。',
   'イメージから同じ環境を何度でも作成できるため、環境の再現性が高い。',
   'コンテナごとに独自のカーネルを持つため、カーネルのバージョンを自由に選べる。',
   'ホストOSとは別のハードウェアを完全にエミュレートする。'], [0, 1],
  'コンテナは**カーネルを共有**する。カーネルが別でハードウェアをエミュレートするのは、仮想マシン（VM）の特徴。');

qc('1.01.2', 'Dockerfile で、イメージのビルド中にパッケージのインストールなどのコマンドを実行する命令はどれか。',
  ['RUN', 'FROM', 'CMD', 'EXPOSE', 'COPY'], 0,
  '`FROM` はベースイメージ、`RUN` はビルド時のコマンド実行、`COPY` はファイルのコピー、`EXPOSE` は公開するポートの宣言、`CMD` は**コンテナ起動時**の既定コマンド。');

qc('1.01.2', 'KVM でハードウェア支援による仮想化を行うために、CPU に必要な機能はどれか。',
  ['Intel VT-x または AMD-V', 'ハイパースレッディングのみ', '64ビット命令セットのみ', 'FPU（浮動小数点演算ユニット）', 'ECCメモリ対応'], 0,
  'KVM は CPU の仮想化支援機能（Intel の VT-x、AMD の AMD-V）を使う。BIOS/UEFI で有効になっている必要がある。');

/* ---- 1.01.3 ブートプロセスとsystemd ---- */
qc('1.01.3', '次は `systemctl status sshd` の出力の一部である。この状態の説明として、正しいものはどれか。\n```\n● sshd.service - OpenSSH server daemon\n     Loaded: loaded (/usr/lib/systemd/system/sshd.service; disabled; vendor preset: enabled)\n     Active: active (running) since Mon 2026-10-05 09:00:12 JST; 3h ago\n```',
  ['現在は稼働中だが、OSを再起動しても自動では起動しない。',
   '現在は停止しているが、OSの起動時に自動で起動する。',
   '現在も稼働中で、OSの起動時にも自動で起動する。',
   'ユニットファイルが見つからず、起動できない。',
   '`/etc/systemd/system` に作成した独自のユニットである。'], 0,
  '`Active: active (running)` は今動いている状態、`Loaded:` の `disabled` は**自動起動が無効**という意味。`vendor preset: enabled` は「パッケージの既定は有効」という情報で、現在の設定ではない。パスが `/usr/lib/systemd/system` なので、パッケージ提供のユニット。');

qc('1.01.3', 'サービス `sshd` が、OSの起動時に自動起動する設定になっているかどうかだけを確認するコマンドはどれか。',
  ['systemctl is-enabled sshd', 'systemctl is-active sshd', 'systemctl list-units sshd', 'systemctl show sshd', 'systemctl cat sshd'], 0,
  '`is-enabled` は自動起動の設定、`is-active` は**現在稼働しているか**。この2つの違いは頻出。`cat` はユニットファイルの内容を表示する。');

qc('1.01.3', '次のユニットファイル `myapp.service` に対して `systemctl enable myapp` を実行したとき、行われることとして正しいものはどれか。\n```\n[Unit]\nDescription=My App\nAfter=network.target\n\n[Service]\nExecStart=/usr/local/bin/myapp\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n```',
  ['`multi-user.target` に紐づけるシンボリックリンクが作られ、次回以降 `multi-user.target` の起動時に自動起動する。',
   'ただちに `myapp` が起動する。',
   '`network.target` が起動したあとで、必ず `myapp` が1回だけ起動する。',
   '`ExecStart` のコマンドが、そのまま1回実行される。',
   '`Restart=on-failure` により、`myapp` が停止したら常に再起動される。'], 0,
  '`enable` は `[Install]` セクションの `WantedBy=` に従って、`multi-user.target.wants/` 以下にシンボリックリンクを作る（**起動はしない**。起動は `start`、同時なら `enable --now`）。`After=` は起動の「順序」だけを決める。');

qc('1.01.3', 'ユニットファイルの `After=network.target` が表すものとして、正しいものはどれか。',
  ['`network.target` が起動したあとに、このユニットを起動する、という順序の指定（依存関係の要求ではない）。',
   '`network.target` が起動できなければ、このユニットも起動しない、という強い依存関係。',
   '`network.target` と同時に、このユニットを起動する。',
   'このユニットの終了後に、`network.target` を起動する。',
   'ネットワークの接続が確認できるまで、`systemctl` コマンドが待機する。'], 0,
  '`After=` / `Before=` は**順序**のみ。起動を要求する依存は `Requires=`（強い）や `Wants=`（弱い）で指定する。');

qc('1.01.3', 'GRUB の起動メニューで、カーネルの起動パラメータに `systemd.unit=rescue.target` を追加して起動した。起動後の状態として、正しいものはどれか。',
  ['そのときの起動に限り、レスキューモード（シングルユーザモード）で起動する。',
   '次回以降の起動でも、常にレスキューモードで起動する。',
   'グラフィカルログインが無効になり、`graphical.target` が削除される。',
   'ファイルシステムの検査（`fsck`）だけが実行されて、停止する。',
   'ネットワークを有効にした状態の `multi-user.target` で起動する。'], 0,
  'GRUBメニュー上での編集は、**その1回の起動だけ**有効（保存されない）。永続的に変えるには `systemctl set-default` や `/etc/default/grub` を編集する。');

qc('1.01.3', '`journalctl -u sshd --since "1 hour ago"` の説明として、正しいものはどれか。',
  ['sshd ユニットについて、直近1時間のログを表示する。',
   'sshd 以外のユニットの、1時間前までのログを表示する。',
   'sshd を1時間後に再起動するよう予約する。',
   '1時間以上前のログのみを表示する。',
   'カーネルのメッセージのうち、sshd に関するものだけを表示する。'], 0,
  '`-u` はユニット指定、`--since` は指定した時刻以降。`--until` で終了時刻を指定。優先度での絞り込みは `-p err` など。');

qi('1.01.3', '失敗（failed）状態になっているユニットを一覧表示するコマンドを入力せよ。（`systemctl` を使う）',
  ['systemctl --failed', 'systemctl list-units --failed', 'systemctl --state=failed', 'systemctl list-units --state=failed'],
  '`systemctl --failed`（`list-units --failed` の省略形）。起動後にサービスの不具合を確認するときの定番。');

qc('1.01.3', 'UEFI 環境で、ブートローダのファイルが置かれるパーティションはどれか。',
  ['EFI システムパーティション（ESP）', 'スワップパーティション', 'ルートファイルシステムのみ（`/boot` は不要）', 'MBR（先頭512バイト）', '`/var` パーティション'], 0,
  'UEFI では、FAT 形式の **EFI システムパーティション（ESP、通常 `/boot/efi`）** にブートローダを置く。BIOS + MBR の環境では、ディスク先頭の MBR にブートローダの一部を置く。');

/* ---- 1.01.4 プロセスの生成、監視、終了 ---- */
qc('1.01.4', '次の実行結果で、プロセス `sleep 300` の親プロセスのPIDはどれか。\n```\n$ ps -ef | grep sleep\nalice     2314  2290  0 10:01 pts/0    00:00:00 sleep 300\nalice     2330  2290  0 10:02 pts/0    00:00:00 grep sleep\n```',
  ['2290', '2314', '2330', '300', '10'], 0,
  '`ps -ef` の列は `UID  PID  PPID  C  STIME  TTY  TIME  CMD`。3列目の **PPID** が親のPID。2314 は `sleep` 自身のPID。');

qc('1.01.4', '次は `top` の出力の先頭部分である。この出力から読み取れる内容として、正しいものはどれか。\n```\ntop - 10:05:01 up 3 days,  2:11,  2 users,  load average: 0.15, 0.30, 0.45\nTasks: 180 total,   1 running, 178 sleeping,   0 stopped,   1 zombie\n%Cpu(s):  2.0 us,  1.0 sy,  0.0 ni, 96.5 id,  0.5 wa\n```',
  ['ゾンビプロセスが1つ存在する。',
   '過去15分間の平均負荷は 0.15 である。',
   'システムは起動してから約2時間である。',
   'CPU の96.5%がユーザプロセスで使われている。',
   '停止中のプロセスが1つある。'], 0,
  '`load average` は左から**1分・5分・15分**（0.15, 0.30, 0.45）。`up 3 days, 2:11` は稼働時間。`id` は idle（空き）で96.5%。`zombie` が1。');

qc('1.01.4', '端末で実行中のコマンドを、キーボードの `Ctrl+Z` で中断したとき、プロセスに送られるシグナルはどれか。',
  ['SIGTSTP', 'SIGSTOP', 'SIGINT', 'SIGTERM', 'SIGQUIT'], 0,
  '`Ctrl+Z` は **SIGTSTP**（端末からの一時停止要求。プロセス側で処理することも可能）。`SIGSTOP` は捕捉できない強制停止で、`kill -STOP` で送る。`Ctrl+C` は SIGINT、`Ctrl+\\` は SIGQUIT。', true);

qc('1.01.4', '次のようにジョブが動いているとき、ジョブ番号2のジョブをフォアグラウンドに戻すコマンドはどれか。\n```\n$ jobs\n[1]-  Running                 sleep 100 &\n[2]+  Running                 sleep 200 &\n```',
  ['fg %2', 'bg %2', 'kill -9 %2', 'jobs %2 --fg', 'nohup %2'], 0,
  'ジョブ番号は `%番号` で指定する。`fg` はフォアグラウンドへ、`bg` は**停止中のジョブ**をバックグラウンドで再開（すでに実行中のジョブには意味がない）。');

qm('1.01.4', 'ssh で接続して長い処理を実行する。ssh の接続が切れても処理が継続するようにする方法として、適切なものを2つ選べ。',
  ['`nohup コマンド &` で実行する。',
   '`tmux` や `screen` のセッション内で実行する。',
   'コマンドの末尾に `&` を付けるだけで実行する。',
   '`Ctrl+C` を押してから、処理を再実行する。'], [0, 1],
  '`nohup` は SIGHUP を無視して継続させる。`tmux`/`screen` はセッション自体が切断後も残る。`&` だけでは、切断時に SIGHUP を受けて終了することがある。');

qc('1.01.4', '一般ユーザ alice が、自分のプロセス（nice値5）に対して `renice -n 0 -p PID` を実行した。結果として正しいものはどれか。',
  ['権限エラーになる。nice値を下げる（優先度を上げる）のは root のみ可能である。',
   'nice値が0に変更される。',
   'nice値が10に変更される。',
   '何も表示されずに、nice値は5のままである。',
   'プロセスが終了する。'], 0,
  '一般ユーザは自分のプロセスの nice値を**上げる（優先度を下げる）ことだけ**ができる。下げる（優先度を上げる）には root 権限が必要。');

/* ---- 1.01.5 デスクトップ環境の利用 ---- */
qc('1.01.5', '環境変数 `DISPLAY` が `:0` のとき、表している内容として正しいものはどれか。',
  ['同じマシン上の、最初のディスプレイ（X サーバ）に表示する。',
   'ディスプレイの解像度が0である。',
   'リモートホストの0番ポートに表示する。',
   'ディスプレイが無効（表示しない）である。',
   'ディスプレイマネージャが起動していない。'], 0,
  '`DISPLAY=ホスト名:ディスプレイ番号.スクリーン番号`。ホスト名を省略すると**ローカル**、`:0` は最初のディスプレイ。`ssh -X` で接続すると、`localhost:10.0` のような値が設定される。');

qc('1.01.5', '用語と説明の組み合わせとして、正しいものはどれか。',
  ['GNOME ― デスクトップ環境　／　GDM ― ディスプレイマネージャ',
   'GNOME ― ディスプレイマネージャ　／　GDM ― デスクトップ環境',
   'GNOME ― ウィンドウマネージャのみ　／　GDM ― X サーバ',
   'GNOME ― X サーバ　／　GDM ― デスクトップ環境',
   'GNOME ― ディスプレイサーバ　／　GDM ― パッケージ管理ツール'], 0,
  'GNOME は、ウィンドウやパネルなどを含む**デスクトップ環境**。GDM は、ログイン画面を担当する**ディスプレイマネージャ**。');
