/* 第3章（弱点克服）— リポジトリとパッケージ管理（1.04）。apt / dpkg / yum(dnf) / rpm を、コマンドの形で打てる・見分けられるようにする書き下ろし問題。 */
window.__ch = 5;

/* ================= 1.04.1 aptコマンドによるパッケージ管理 ================= */
qc('1.04.1', 'Debian 系で、リポジトリの**パッケージ索引（一覧）を最新の状態に更新**するだけで、インストール済みのパッケージ自体は更新しないコマンドはどれか。',
  ['apt update', 'apt upgrade', 'apt full-upgrade', 'apt autoremove', 'apt list --upgradable'], 0,
  '`apt update`＝索引の更新、`apt upgrade`＝実際にパッケージを更新。順番は **update → upgrade**。索引が古いままだと、新しいバージョンが見つからない。');

qc('1.04.1', 'パッケージ `nginx` を、**設定ファイルも含めて**完全に削除するコマンドはどれか。',
  ['apt purge nginx', 'apt remove nginx', 'apt autoremove nginx', 'apt clean nginx', 'apt delete nginx'], 0,
  '`remove` はプログラムだけ削除して**設定ファイルを残す**。`purge` は設定ファイルも削除する。`apt delete` というサブコマンドはない。');

qa('1.04.1', 'パッケージ `nginx` を、**設定ファイルを残したまま**削除できるコマンドを、すべて選べ。',
  ['`apt remove nginx`', '`apt-get remove nginx`', '`dpkg -r nginx`', '`apt purge nginx`', '`dpkg -P nginx`'], [0, 1, 2],
  '`remove`（`dpkg -r`）は設定ファイルを残す。**`purge`（`dpkg -P`）は設定ファイルも削除**する。');

qc('1.04.1', '`apt upgrade` と `apt full-upgrade` の違いとして、正しいものはどれか。',
  ['`full-upgrade` は、依存関係を解決するために必要なら、既存のパッケージの削除も行う', '`full-upgrade` は、索引の更新も同時に行う', '`upgrade` はカーネルを更新しない', '`upgrade` は設定ファイルを削除する', '違いはなく、どちらも同じ動作である'], 0,
  '`upgrade` は既存パッケージを**削除しない**範囲で更新する。`full-upgrade`（`apt-get dist-upgrade` と同等）は、必要なら削除もして依存関係を解決する。どちらも索引は更新しない（`apt update` が必要）。');

qc('1.04.1', '`apt autoremove` が行うことはどれか。',
  ['依存関係でインストールされ、今は不要になったパッケージを削除する', 'ダウンロード済みの .deb ファイルをすべて削除する', 'すべてのパッケージの設定ファイルを削除する', '壊れた依存関係を修復する', 'パッケージ索引を更新する'], 0,
  '不要になった自動インストールのパッケージを削除する。.deb のキャッシュ削除は `apt clean`、壊れた依存の修復は `apt --fix-broken install`。');

qc('1.04.1', '`/etc/apt/sources.list` の `deb-src` で始まる行が指すものはどれか。',
  ['ソースパッケージを取得するリポジトリ', 'バイナリパッケージ（.deb）を取得するリポジトリ', 'パッケージの署名鍵', 'ミラーサーバの優先順位', '無効にしたリポジトリ'], 0,
  '`deb` ＝バイナリパッケージ、`deb-src` ＝ソースパッケージのリポジトリ。ソースの取得は `apt-get source パッケージ名`。');

qm('1.04.1', 'Debian 系で、APT が参照するリポジトリの設定が書かれている場所として、正しいものを2つ選べ。',
  ['`/etc/apt/sources.list`', '`/etc/apt/sources.list.d/` 以下のファイル', '`/etc/yum.repos.d/` 以下のファイル', '`/var/lib/dpkg/status`', '`/etc/dpkg/dpkg.cfg`'], [0, 1],
  '`/etc/yum.repos.d/` は yum / dnf（RHEL 系）の場所。`/var/lib/dpkg/status` はインストール済みパッケージの状態を記録するデータベース。');

qc('1.04.1', '`apt install` でダウンロードされた .deb ファイルが、標準で**保存（キャッシュ）されるディレクトリ**はどれか。',
  ['/var/cache/apt/archives', '/var/lib/apt/lists', '/var/lib/dpkg', '/etc/apt/archives', '/usr/share/apt'], 0,
  '.deb のキャッシュは `/var/cache/apt/archives`。`/var/lib/apt/lists` は**パッケージ索引**（`apt update` の結果）の置き場所。');

qc('1.04.1', 'ディスク容量を空けるために、キャッシュにある**ダウンロード済みの .deb ファイルをすべて削除**するコマンドはどれか。',
  ['apt clean', 'apt autoclean', 'apt autoremove', 'apt purge', 'apt update'], 0,
  '`apt clean` はキャッシュの .deb をすべて削除。`apt autoclean` は、もう取得できない**古い**バージョンの .deb だけを削除する。');

qc('1.04.1', '`apt-cache policy nginx` で確認できる内容はどれか。',
  ['インストール済みのバージョン、候補（インストールされるはずの）バージョン、リポジトリの優先度', 'nginx が依存しているパッケージの一覧', 'nginx がインストールするファイルの一覧', 'nginx の設定ファイルの場所', 'nginx のライセンス'], 0,
  '`policy` は、インストール済み／候補のバージョンと、どのリポジトリから入るかを示す。依存関係は `apt-cache depends`、ファイル一覧は `dpkg -L`。');

qc('1.04.1', 'パッケージ `nginx` が**依存しているパッケージ**を表示するコマンドはどれか。',
  ['apt-cache depends nginx', 'apt-cache rdepends nginx', 'apt-cache policy nginx', 'apt-cache stats nginx', 'apt-cache pkgnames nginx'], 0,
  '`depends`＝このパッケージが依存するもの、`rdepends`＝このパッケージに**依存している側**（逆依存）。');

qm('1.04.1', 'パッケージ `nginx` を、アップグレードの対象から外して**バージョンを固定**する方法として、正しいものを2つ選べ。',
  ['`apt-mark hold nginx`', '`echo "nginx hold" | dpkg --set-selections`', '`apt-mark auto nginx`', '`apt-mark manual nginx`', '`apt autoremove --hold nginx`'], [0, 1],
  '`hold` で保留にする。`apt-mark auto` / `manual` は、「自動インストール」「手動インストール」の印を付け替えるもので、固定とは別。解除は `apt-mark unhold`。');

qc('1.04.1', 'パッケージ `nginx` を**インストールせずに**、`.deb` ファイルを**カレントディレクトリにダウンロードだけ**するコマンドはどれか。',
  ['apt download nginx', 'apt get nginx', 'apt-get source nginx', 'apt-cache download nginx', 'dpkg --download nginx'], 0,
  '`apt download`（`apt-get download`）は .deb をカレントディレクトリに保存する。`apt-get source` は**ソースパッケージ**を取得する。');

qc('1.04.1', 'ローカルにある `sample.deb` を、**依存パッケージも自動的に解決して**インストールしたい。適切なコマンドはどれか。',
  ['apt install ./sample.deb', 'dpkg -i sample.deb', 'dpkg -x sample.deb', 'dpkg -c sample.deb', 'apt-file sample.deb'], 0,
  '`apt install ./ファイル名.deb` なら、依存パッケージもリポジトリから取得して入れる。`dpkg -i` は依存関係を**解決しない**。`./` を付けないとパッケージ名と解釈される。');

qc('1.04.1', '`apt-file search /usr/bin/convert` は、何を調べるコマンドか。',
  ['指定したファイルを含むパッケージ（未インストールのものも含む）', '指定したファイルの所有者', 'インストール済みパッケージのファイルの一覧', 'パッケージのダウンロード元', '指定したファイルの権限'], 0,
  '`apt-file` は、リポジトリ上のパッケージに含まれるファイルを検索する（先に `apt-file update` が必要）。**インストール済み**のファイルの所属は `dpkg -S`。');

qc('1.04.1', 'Ubuntu の `sources.list` に書かれている `main restricted universe multiverse` は、何を表すか。',
  ['リポジトリのコンポーネント（区分）', 'CPU のアーキテクチャ', 'ディストリビューションのバージョン名', 'ミラーサーバの URL', '署名鍵の種類'], 0,
  '`deb URL ディストリビューション名 コンポーネント…` の最後の部分。Debian なら `main contrib non-free` など。');

qm('1.04.1', 'インストール済みパッケージの**一覧を表示する**コマンドを2つ選べ。',
  ['`apt list --installed`', '`dpkg -l`', '`apt list --upgradable`', '`apt-cache search .`', '`apt-file list`'], [0, 1],
  '`apt list --upgradable` は更新できるものだけ、`apt-cache search .` はリポジトリ上の**全パッケージ**の一覧。');

qi('1.04.1', 'apt を使って、パッケージ `nginx` をインストールするコマンドを入力せよ。（`sudo` や `-y` は付けない）',
  ['apt install nginx', 'apt-get install nginx'],
  '`apt install パッケージ名`。古い書き方の `apt-get install` も同じ動作。');

qi('1.04.1', 'apt を使って、**パッケージ索引を更新する**コマンドを入力せよ。（`sudo` は付けない）',
  ['apt update', 'apt-get update'],
  '索引の更新は `apt update`。パッケージの更新（`apt upgrade`）の前に行う。');

qi('1.04.1', 'apt を使って、パッケージ `nginx` を、**設定ファイルも含めて**削除するコマンドを入力せよ。（`sudo` は付けない）',
  ['apt purge nginx', 'apt-get purge nginx', 'apt remove --purge nginx', 'apt-get remove --purge nginx'],
  '`purge`、または `remove --purge`。単なる `remove` は設定ファイルを残す。');

/* ================= 1.04.2 Debianパッケージ管理 ================= */
qc('1.04.2', 'dpkg で、`.deb` ファイルをインストールするオプションはどれか。',
  ['-i', '-r', '-l', '-L', '-S'], 0,
  '`-i`（`--install`）＝インストール、`-r`＝削除、`-l`＝一覧、`-L`＝ファイル一覧、`-S`＝ファイルの所属パッケージ。');

qc('1.04.2', 'インストール済みのパッケージ `bash` が、**インストールしたファイルの一覧**を表示する dpkg のコマンドはどれか。',
  ['dpkg -L bash', 'dpkg -l bash', 'dpkg -S bash', 'dpkg -s bash', 'dpkg -c bash'], 0,
  '`-L`（大文字）＝ファイル一覧、`-l`（小文字）＝パッケージの一覧。**大文字小文字の取り違え**は頻出のひっかけ。');

qc('1.04.2', 'インストール済みのファイル `/usr/bin/curl` が、**どのパッケージに含まれていたか**を調べる dpkg のコマンドはどれか。',
  ['dpkg -S /usr/bin/curl', 'dpkg -L /usr/bin/curl', 'dpkg -l /usr/bin/curl', 'dpkg -s /usr/bin/curl', 'dpkg -c /usr/bin/curl'], 0,
  '`-S` ＝ search（ファイル→パッケージ）。`-L` は逆（パッケージ→ファイル一覧）。RPM 系の `rpm -qf` に相当する。');

qm('1.04.2', 'インストールされていない `foo.deb` ファイルそのものを調べるコマンドを、2つ選べ。',
  ['`dpkg -c foo.deb`（含まれるファイルの一覧）', '`dpkg -I foo.deb`（パッケージの情報）', '`dpkg -L foo`（インストール済みのファイル一覧）', '`dpkg -s foo`（インストール済みの状態）', '`dpkg -l foo.deb`（インストール済みの一覧）'], [0, 1],
  '`.deb` ファイルを対象にするのは **`-c`（contents）と `-I`（info）**。`-L` や `-s` は、すでにインストール済みのパッケージが対象。');

qc('1.04.2', '`dpkg` で、パッケージを**設定ファイルも含めて**削除するオプションはどれか。',
  ['-P', '-r', '-i', '-l', '-x'], 0,
  '`-P`（`--purge`）＝設定ファイルも削除、`-r`（`--remove`）＝設定ファイルを残して削除。');

qc('1.04.2', '`dpkg -l` の出力で、パッケージの状態が `rc` と表示されているのは、どういう状態か。',
  ['削除済みだが、設定ファイルが残っている', '正常にインストールされている', '完全に削除されている', 'インストールの途中で失敗している', '更新できるバージョンがある'], 0,
  '`ii` ＝正常にインストール済み。**`rc` ＝ remove 済み・config 残り**（`dpkg -r` や `apt remove` の後）。`dpkg -P` や `apt purge` で消える。');

qc('1.04.2', '`dpkg-reconfigure パッケージ名` は、何をするコマンドか。',
  ['インストール済みパッケージの設定（質問）をやり直す', 'パッケージを再インストールする', 'パッケージの設定ファイルを削除する', 'パッケージの依存関係を修復する', 'パッケージの索引を再構築する'], 0,
  'インストール時に聞かれた設定（debconf の質問）をもう一度行う。例：`dpkg-reconfigure tzdata`。');

qc('1.04.2', '`dpkg --configure -a` は、何をするコマンドか。',
  ['展開済みだが、設定が完了していないパッケージの設定を終わらせる', 'すべてのパッケージの設定を初期化する', 'すべてのパッケージを再インストールする', '設定ファイルの差分を表示する', 'パッケージの状態をすべて表示する'], 0,
  'インストールが途中で止まったときの復旧に使う。`apt --fix-broken install` と合わせて覚える。');

qm('1.04.2', '`dpkg` について、正しい説明を2つ選べ。',
  ['ローカルにある `.deb` ファイルを直接扱う、低レベルのツールである', 'リポジトリからの自動ダウンロードは行わない', '依存関係を自動的に解決して、必要なパッケージを追加で入れる', '`dpkg -i` はパッケージ索引も同時に更新する', 'RPM パッケージも標準で扱える'], [0, 1],
  '依存関係の解決とダウンロードを行うのは **apt**。`dpkg -i` は依存が足りないとエラーになる。RPM を扱うのは `rpm`。');

qc('1.04.2', 'Debian 系で、インストール済みパッケージの**状態情報**が記録されているファイルはどれか。',
  ['/var/lib/dpkg/status', '/var/lib/rpm/Packages', '/etc/apt/sources.list', '/var/cache/apt/archives', '/var/log/yum.log'], 0,
  '`/var/lib/dpkg/status` が dpkg のデータベース。RPM 系のデータベースは `/var/lib/rpm`。');

qi('1.04.2', 'dpkg を使って、`pkg.deb` をインストールするコマンドを入力せよ。（`sudo` は付けない）',
  ['dpkg -i pkg.deb', 'dpkg --install pkg.deb'],
  '`-i` ＝ install。');

qi('1.04.2', 'dpkg を使って、インストール済みの `curl` が**インストールしたファイルの一覧**を表示するコマンドを入力せよ。',
  ['dpkg -L curl', 'dpkg --listfiles curl'],
  '`-L`（大文字）＝ `--listfiles`。');

/* ================= 1.04.3 yumコマンドによるパッケージ管理 ================= */
qc('1.04.3', 'yum で、**更新できるパッケージがあるか確認する**が、実際の更新は行わないコマンドはどれか。',
  ['yum check-update', 'yum update', 'yum upgrade', 'yum list installed', 'yum makecache'], 0,
  '`check-update` は更新の有無（と一覧）を表示するだけ。`update` / `upgrade` は実際に更新する。');

qc('1.04.3', 'yum で、**インストール済みのパッケージ**の一覧を表示するコマンドはどれか。',
  ['yum list installed', 'yum list available', 'yum list updates', 'yum search installed', 'yum info installed'], 0,
  '`list installed`＝導入済み、`list available`＝導入可能（リポジトリにあるが未導入）、`list updates`＝更新可能。');

qc('1.04.3', 'ファイル `/usr/bin/zip` を**提供しているパッケージ**を調べる yum のサブコマンドはどれか。',
  ['provides（whatprovides）', 'search', 'info', 'list', 'deplist'], 0,
  '`yum provides /usr/bin/zip`（`whatprovides`）。ファイル名やコマンド名から、どのパッケージを入れればよいかを調べる。');

qc('1.04.3', 'パッケージ `httpd` の**バージョン・サイズ・概要などの詳細情報**を表示する yum のコマンドはどれか。',
  ['yum info httpd', 'yum list httpd', 'yum search httpd', 'yum provides httpd', 'yum deplist httpd'], 0,
  '`info` が詳細情報。`search` は名前・概要からの検索、`deplist` は依存関係の一覧。');

qc('1.04.3', 'yum がダウンロードしたパッケージやメタデータの**キャッシュをすべて削除**するコマンドはどれか。',
  ['yum clean all', 'yum makecache', 'yum remove all', 'yum purge', 'yum autoremove'], 0,
  '`yum clean all`。反対にキャッシュを作る（メタデータを取得する）のは `yum makecache`。');

qc('1.04.3', 'yum の**全体の設定ファイル**はどれか。',
  ['/etc/yum.conf', '/etc/yum.repos.d/', '/etc/apt/apt.conf', '/etc/rpm/macros', '/var/lib/rpm'], 0,
  '全体の設定は `/etc/yum.conf`（dnf は `/etc/dnf/dnf.conf`）。個別のリポジトリの定義は `/etc/yum.repos.d/` の `*.repo`。');

qc('1.04.3', 'yum の**リポジトリ設定ファイル（`.repo`）を置く**標準のディレクトリはどれか。',
  ['/etc/yum.repos.d/', '/etc/yum/repos/', '/var/lib/yum/', '/etc/apt/sources.list.d/', '/usr/lib/yum/'], 0,
  '`/etc/yum.repos.d/*.repo`。`/etc/apt/sources.list.d/` は apt 用。');

qm('1.04.3', 'yum の `.repo` ファイルに書かれる項目として、正しいものを3つ選べ。',
  ['`baseurl=`（リポジトリの URL）', '`enabled=1`（リポジトリを有効にする）', '`gpgcheck=1`（パッケージの署名を検証する）', '`components=main`（コンポーネントの指定）', '`deb http://example.com/ stable main`'], [0, 1, 2],
  '`.repo` は `[リポジトリID]`、`name=`、`baseurl=`（または `mirrorlist=`）、`enabled=`、`gpgcheck=`、`gpgkey=` などで構成される。`deb …` や `components` は apt 側の書き方。');

qc('1.04.3', '`epel` リポジトリを**今回だけ無効にして** `httpd` をインストールしたい。正しいコマンドはどれか。',
  ['yum --disablerepo=epel install httpd', 'yum --norepo=epel install httpd', 'yum --skip-repo=epel install httpd', 'yum --without-repo epel install httpd', 'yum --exclude-repo=epel install httpd'], 0,
  '一時的な無効化は `--disablerepo=ID`、無効なリポジトリを一時的に有効にするのは `--enablerepo=ID`。永続的な変更は `.repo` の `enabled=` か `yum-config-manager`。');

qc('1.04.3', 'yum で `yum erase httpd` は、どのコマンドと同じ動作か。',
  ['yum remove httpd', 'yum update httpd', 'yum clean httpd', 'yum purge httpd', 'yum downgrade httpd'], 0,
  '`erase` は `remove` の別名。');

qc('1.04.3', 'yum で、パッケージ**グループ** "Development Tools" を導入するコマンドはどれか。',
  ['yum groupinstall "Development Tools"', 'yum install-group "Development Tools"', 'yum grouplist "Development Tools"', 'yum group-add "Development Tools"', 'yum install --group-only "Development Tools"'], 0,
  '`yum groupinstall`（`yum group install`）。一覧は `yum grouplist`（`yum group list`）。');

qc('1.04.3', 'yum の**過去の操作の履歴**を表示するコマンドはどれか。',
  ['yum history', 'yum log', 'yum list history', 'yum info history', 'yum rollback'], 0,
  '`yum history`。特定の操作を取り消すのは `yum history undo 番号`。');

qc('1.04.3', 'インストール済みのパッケージ `httpd` を、**1つ前のバージョンに戻す**yum のサブコマンドはどれか。',
  ['downgrade', 'rollback', 'revert', 'undo', 'reinstall'], 0,
  '`yum downgrade`。`reinstall` は同じバージョンを入れ直す。');

qc('1.04.3', 'ローカルにある `foo.rpm` を、**依存パッケージをリポジトリから取得しながら**インストールするコマンドはどれか。',
  ['yum localinstall foo.rpm', 'rpm -ivh foo.rpm', 'rpm -qp foo.rpm', 'yum provides foo.rpm', 'yum deplist foo.rpm'], 0,
  '`yum localinstall foo.rpm`（または `yum install ./foo.rpm`）。`rpm -ivh` は依存関係を解決せず、足りなければエラーになる。');

qc('1.04.3', 'RHEL 8 以降の `dnf` について、正しい説明はどれか。',
  ['yum の後継で、基本的なサブコマンドは yum と互換性がある', 'apt の別名で、Debian 系でも使える', 'rpm より低レベルのツールである', '依存関係を解決しない', 'パッケージのビルド専用ツールである'], 0,
  'RHEL 8 以降では `yum` は `dnf` へのリンク（互換コマンド）。設定は `/etc/dnf/dnf.conf`、リポジトリは `/etc/yum.repos.d/` を共通で使う。');

qm('1.04.3', '`yum update` の説明として、正しいものを2つ選べ。',
  ['パッケージ名を付けずに実行すると、更新できるすべてのパッケージが更新される', 'パッケージ名を付けると、そのパッケージが更新される', 'パッケージ名を付けると、そのパッケージが新規にインストールされる', 'リポジトリの設定ファイルを更新する', 'キャッシュを削除する'], [0, 1],
  '新規のインストールは `yum install`。`update` は、すでに入っているパッケージの更新。');

qi('1.04.3', 'yum を使って、パッケージ `httpd` をインストールするコマンドを入力せよ。（`sudo` や `-y` は付けない）',
  ['yum install httpd', 'dnf install httpd'],
  '`yum install パッケージ名`。');

qi('1.04.3', 'yum を使って、パッケージ `httpd` を削除するコマンドを入力せよ。（`sudo` や `-y` は付けない）',
  ['yum remove httpd', 'yum erase httpd', 'dnf remove httpd', 'dnf erase httpd'],
  '`remove`（または `erase`）。');

qi('1.04.3', 'yum を使って、リポジトリの一覧を表示するコマンドを入力せよ。',
  ['yum repolist', 'dnf repolist'],
  '`yum repolist`。無効のものも含めるなら `yum repolist all`。');

/* ================= 1.04.4 RPMパッケージ管理 ================= */
qc('1.04.4', 'rpm で、`foo.rpm` をインストールし、進行状況を `#` で表示する典型的なオプションの組み合わせはどれか。',
  ['-ivh', '-Uvh', '-qpl', '-Va', '-e'], 0,
  '`-i`＝install、`-v`＝詳細、`-h`＝`#` で進行状況。更新は `-U`。');

qc('1.04.4', 'rpm の `-U` オプションの説明として、正しいものはどれか。',
  ['インストール済みなら更新し、未インストールなら新規インストールする', 'インストール済みの場合に限り、更新する', 'パッケージを削除する', 'パッケージの情報を表示する', 'パッケージの署名を確認する'], 0,
  '`-U`＝upgrade。未導入でも入る。**`-F`（freshen）は、導入済みの場合だけ更新**する。');

qc('1.04.4', 'rpm の `-F`（freshen）オプションの説明として、正しいものはどれか。',
  ['すでにインストールされているパッケージだけを更新し、未インストールなら何もしない', '未インストールなら新規にインストールする', 'パッケージを削除する', '依存関係を無視してインストールする', 'パッケージの署名を確認する'], 0,
  '`-F` は更新専用。`-U` との違いが問われやすい。');

qc('1.04.4', 'インストール済みの**すべてのパッケージ**を一覧表示する rpm のコマンドはどれか。',
  ['rpm -qa', 'rpm -ql', 'rpm -qi', 'rpm -qf', 'rpm -qR'], 0,
  '`-q`（query）＋ `-a`（all）。`rpm -qa | grep httpd` のように絞り込むことが多い。');

qc('1.04.4', 'インストール済みのパッケージ `httpd` が**インストールしたファイルの一覧**を表示する rpm のコマンドはどれか。',
  ['rpm -ql httpd', 'rpm -qi httpd', 'rpm -qf httpd', 'rpm -qa httpd', 'rpm -qR httpd'], 0,
  '`-ql`＝list。`-qi`＝info（情報）、`-qf`＝ファイルの所属パッケージ、`-qR`＝依存するもの。');

qc('1.04.4', 'インストール済みのファイル `/etc/passwd` が**どのパッケージに含まれるか**を調べる rpm のコマンドはどれか。',
  ['rpm -qf /etc/passwd', 'rpm -ql /etc/passwd', 'rpm -qi /etc/passwd', 'rpm -qp /etc/passwd', 'rpm -V /etc/passwd'], 0,
  '`-qf`＝file。Debian 系の `dpkg -S` に相当する。');

qm('1.04.4', 'インストールされていない `foo.rpm` の**中のファイル一覧**を表示するコマンドを、2つ選べ。',
  ['`rpm -qpl foo.rpm`', '`rpm -qp --list foo.rpm`', '`rpm -ql foo.rpm`', '`rpm -qa foo.rpm`', '`rpm -qf foo.rpm`'], [0, 1],
  '**未インストールの rpm ファイルを調べるときは `-p`** を付ける。`-qpl`、`-qpi`（情報）、`-qpR`（依存）。`-p` がないと、インストール済みのパッケージを探してしまう。');

qc('1.04.4', 'インストールされていない `foo.rpm` の**パッケージ情報**（バージョン・概要など）を表示するコマンドはどれか。',
  ['rpm -qpi foo.rpm', 'rpm -qi foo.rpm', 'rpm -ivh foo.rpm', 'rpm -qf foo.rpm', 'rpm -Va foo.rpm'], 0,
  'ファイルを対象にする `-p` ＋ info の `-i`。');

qc('1.04.4', 'インストール済みパッケージ `httpd` が**依存している（必要とする）もの**を表示する rpm のコマンドはどれか。',
  ['rpm -qR httpd', 'rpm -qa httpd', 'rpm -ql httpd', 'rpm -qd httpd', 'rpm -qc httpd'], 0,
  '`-qR`（`--requires`）。`-qc`＝設定ファイルだけ、`-qd`＝ドキュメントだけの一覧。');

qc('1.04.4', 'インストール済みパッケージ `httpd` の**設定ファイルだけ**を一覧表示する rpm のコマンドはどれか。',
  ['rpm -qc httpd', 'rpm -qd httpd', 'rpm -ql httpd', 'rpm -qR httpd', 'rpm -qi httpd'], 0,
  '`-qc`＝configuration files。`-qd` ＝ documentation files。');

qc('1.04.4', 'rpm の `-V` オプションは、何をするか。',
  ['インストール済みのファイルが、rpm のデータベースの記録から変更されていないか検証する', 'パッケージの署名を確認する', 'パッケージを削除する', 'パッケージの情報を表示する', 'パッケージの一覧を表示する'], 0,
  '`rpm -V パッケージ名`（全体は `-Va`）。サイズ・パーミッション・MD5・更新日時などの変化が出力される。署名の検証は `-K` / `--checksig`。');

qc('1.04.4', 'rpm パッケージの**署名の検証に使う公開鍵**を、rpm のデータベースに登録するオプションはどれか。',
  ['--import', '--checksig', '--addkey', '--install-key', '-K'], 0,
  '`rpm --import 鍵ファイル`。署名とダイジェストの確認は `rpm -K`（`--checksig`）。');

qc('1.04.4', '`rpm -K foo.rpm`（`--checksig`）は、何をするか。',
  ['パッケージの署名とダイジェスト（改ざんされていないか）を確認する', 'パッケージをインストールする', 'パッケージを削除する', 'パッケージの情報を表示する', 'パッケージのデータベースを再構築する'], 0,
  '`gpgcheck=1` の確認と同じ目的。事前に `rpm --import` で公開鍵を登録しておく。');

qc('1.04.4', 'rpm で、インストール済みのパッケージ `httpd` を**削除する**オプションはどれか。',
  ['-e', '-d', '-r', '-u', '-x'], 0,
  '`-e`（erase）。他のパッケージが依存していると、エラーになる（`--nodeps` で無視できるが非推奨）。');

qc('1.04.4', '`rpm2cpio foo.rpm | cpio -idv` は、何をするか。',
  ['rpm パッケージを**インストールせずに**、中身をカレントディレクトリに展開する', 'rpm パッケージをインストールする', 'rpm パッケージを cpio アーカイブに変換して削除する', 'rpm パッケージの署名を確認する', 'rpm パッケージのファイル一覧だけを表示する'], 0,
  '`rpm2cpio` が rpm を cpio 形式に変換し、`cpio -idv` が展開する（`-i` 展開、`-d` ディレクトリ作成、`-v` 詳細）。');

qc('1.04.4', 'パッケージファイル `bash-5.1.8-6.el9.x86_64.rpm` で、**バージョン**にあたる部分はどれか。',
  ['5.1.8', '6.el9', 'x86_64', 'bash', 'rpm'], 0,
  '`名前-バージョン-リリース.アーキテクチャ.rpm`。`6.el9` はリリース、`x86_64` はアーキテクチャ。');

qc('1.04.4', 'RPM パッケージの情報が記録されているデータベースの場所はどれか。',
  ['/var/lib/rpm', '/var/lib/dpkg', '/etc/rpm', '/var/cache/yum', '/usr/lib/rpm'], 0,
  '`/var/lib/rpm`。破損した場合は `rpm --rebuilddb` で再構築する。`/var/lib/dpkg` は dpkg のデータベース。');

qc('1.04.4', '`rpm` と `yum` の違いとして、正しい説明はどれか。',
  ['yum は、リポジトリから依存パッケージも取得して導入するが、rpm は指定したファイルだけを扱い、依存関係を自動解決しない', 'rpm は、リポジトリから依存パッケージを自動的に取得する', 'yum は、ローカルの .rpm ファイルを扱えない', 'rpm は、Debian 系で使うツールである', '両者に機能の違いはない'], 0,
  'rpm は低レベル（Debian 系の dpkg に相当）、yum / dnf は高レベル（apt に相当）。');

qi('1.04.4', 'rpm を使って、インストール済みの `httpd` が**インストールしたファイルの一覧**を表示するコマンドを入力せよ。',
  ['rpm -ql httpd', 'rpm -q -l httpd', 'rpm --query --list httpd', 'rpm -q --list httpd'],
  '`-q`（query）＋ `-l`（list）。');

qi('1.04.4', 'rpm を使って、ファイル `/usr/bin/ssh` を**含むパッケージ**を調べるコマンドを入力せよ。',
  ['rpm -qf /usr/bin/ssh', 'rpm -q -f /usr/bin/ssh', 'rpm --query --file /usr/bin/ssh', 'rpm -q --file /usr/bin/ssh'],
  '`-qf`（query file）。');

qi('1.04.4', 'rpm を使って、`foo.rpm` を**インストールする**コマンドを入力せよ。（進行状況の表示のオプションも付けること）',
  ['rpm -ivh foo.rpm', 'rpm -ihv foo.rpm', 'rpm -vih foo.rpm', 'rpm -hiv foo.rpm', 'rpm -vhi foo.rpm', 'rpm -hvi foo.rpm', 'rpm -i -v -h foo.rpm', 'rpm -Uvh foo.rpm'],
  '`-ivh`（順番は自由）。更新を兼ねるなら `-Uvh`。');
