/* 主題1.04 リポジトリとパッケージ管理 */

/* ---- 1.04.1 aptコマンドによるパッケージ管理 ---- */
qc('1.04.1', '`apt update` の動作として正しいものはどれか。',
  ['リポジトリからパッケージの一覧情報（インデックス）を取得して最新にする', 'インストール済みのすべてのパッケージを最新版にアップグレードする', '指定したパッケージだけを最新版にする', 'システムのカーネルを更新して再起動する'], 0,
  '`apt update` は「情報の更新」のみでパッケージ自体は変わらない。実際に更新するのは `apt upgrade`。通常は `apt update` → `apt upgrade` の順に実行する。');

qc('1.04.1', 'パッケージ nginx を、設定ファイルも含めて完全に削除するコマンドはどれか。',
  ['apt purge nginx', 'apt remove nginx', 'apt delete nginx', 'apt autoremove nginx'], 0,
  '`remove` は設定ファイルを残して削除、`purge` は設定ファイルも削除。`autoremove` は不要になった依存パッケージを削除する。');

qc('1.04.1', '他のパッケージの依存関係でインストールされ、現在はどのパッケージからも必要とされていないパッケージをまとめて削除するコマンドはどれか。',
  ['apt autoremove', 'apt clean', 'apt purge --all', 'apt cleanup'], 0,
  '`apt autoremove` が不要な依存パッケージを削除。`apt clean` はダウンロード済みの .deb キャッシュ（`/var/cache/apt/archives`）の削除。');

qc('1.04.1', 'パッケージ nginx の詳細情報（バージョン、依存関係、説明など）を表示するコマンドはどれか。',
  ['apt show nginx', 'apt list nginx', 'apt find nginx', 'apt detail nginx'], 0,
  '`apt show` が詳細表示。`apt search キーワード` が検索、`apt list --installed` がインストール済み一覧。');

qi('1.04.1', 'パッケージ nginx をインストールするコマンドを入力せよ。（root権限で実行しているものとし、apt を使う）',
  ['apt install nginx', 'apt-get install nginx', 'apt install -y nginx', 'apt-get install -y nginx'],
  '`apt install パッケージ名`。`-y` は確認の問い合わせに自動で yes と答えるオプション。');

qc('1.04.1', 'Debian系で、利用するリポジトリ（パッケージの取得元）を設定するファイルやディレクトリはどれか。',
  ['/etc/apt/sources.list と /etc/apt/sources.list.d/', '/etc/yum.repos.d/', '/var/lib/dpkg/status', '/etc/dpkg/dpkg.cfg'], 0,
  'apt の取得元は `/etc/apt/sources.list` および `/etc/apt/sources.list.d/*.list`（新しい形式は `.sources`）。`/etc/yum.repos.d/` は RHEL系。');

qc('1.04.1', 'インストール済みのパッケージを一覧表示するコマンドはどれか。（apt コマンドを使う）',
  ['apt list --installed', 'apt show --installed', 'apt search --installed-only', 'apt ls -i'], 0,
  '`apt list --installed`。従来は `dpkg -l`（または `dpkg --get-selections`）も使われる。');

qc('1.04.1', '`apt upgrade` と `apt full-upgrade` の違いとして正しいものはどれか。',
  ['full-upgrade は依存関係の解決のため、必要に応じてパッケージの削除も行う', 'full-upgrade は apt のインデックスのみ更新する', 'upgrade はカーネルを更新しない', 'upgrade はパッケージの新規インストールだけを行う'], 0,
  '`upgrade` は既存パッケージの削除を行わずに更新する。`full-upgrade`（旧 `dist-upgrade`）は依存関係の変更に伴うパッケージ追加・削除も行う。', true);

/* ---- 1.04.2 Debianパッケージ管理 ---- */
qc('1.04.2', 'ローカルにある `foo.deb` を直接インストールするコマンドはどれか。',
  ['dpkg -i foo.deb', 'dpkg -r foo.deb', 'dpkg -l foo.deb', 'dpkg -L foo.deb'], 0,
  '`dpkg -i`（install）。依存関係を自動では解決しないので、不足があれば `apt install -f` で補う。削除は `-r`、完全削除は `-P`。');

qc('1.04.2', 'インストール済みのパッケージの一覧を表示するコマンドはどれか。',
  ['dpkg -l', 'dpkg -L', 'dpkg -S', 'dpkg -i'], 0,
  '小文字の `-l` は一覧、大文字の `-L` は指定したパッケージが持つファイルの一覧。');

qc('1.04.2', 'ファイル `/bin/ls` を提供しているパッケージを調べるコマンドはどれか。',
  ['dpkg -S /bin/ls', 'dpkg -L /bin/ls', 'dpkg -l /bin/ls', 'dpkg -s /bin/ls'], 0,
  '`dpkg -S ファイルパス` はファイルがどのパッケージに属するか。`dpkg -L パッケージ名` はそのパッケージのファイル一覧。');

qc('1.04.2', 'パッケージを、設定ファイルも含めて完全に削除する dpkg のオプションはどれか。',
  ['dpkg -P', 'dpkg -r', 'dpkg -d', 'dpkg -u'], 0,
  '`-r`（remove）は設定ファイルを残す、`-P`（purge）は設定ファイルも含めて削除する。');

qc('1.04.2', '`dpkg` と `apt` の違いとして正しいものはどれか。',
  ['dpkg は個々の .deb を扱い依存関係を自動解決しないが、apt はリポジトリから取得し依存関係も解決する', 'dpkg はリポジトリを扱い、apt は .deb ファイル単体のみ扱う', 'dpkg は RHEL系、apt は Debian系で使う', 'どちらも違いはない'], 0,
  'dpkg は低レベルのパッケージ管理ツール、apt は高レベル（リポジトリ・依存関係）のツール。');

/* ---- 1.04.3 yumコマンドによるパッケージ管理 ---- */
qc('1.04.3', 'インストール済みのパッケージをすべて最新版に更新するコマンドはどれか。',
  ['yum update', 'yum upgrade-all', 'yum refresh', 'yum renew'], 0,
  '`yum update`（パッケージ名を付けると指定のみ）。`yum upgrade` も同じ働き（廃止予定のパッケージを削除する点が違う）。');

qc('1.04.3', 'パッケージ httpd の詳細情報（バージョン、サイズ、説明など）を表示するコマンドはどれか。',
  ['yum info httpd', 'yum show httpd', 'yum detail httpd', 'yum list httpd -v'], 0,
  '`yum info` が詳細、`yum search` がキーワード検索、`yum list installed` がインストール済み一覧。');

qc('1.04.3', 'ファイル `/usr/bin/vim` を提供しているパッケージを（未インストールのものも含め）調べるコマンドはどれか。',
  ['yum provides /usr/bin/vim', 'yum find /usr/bin/vim', 'yum owner /usr/bin/vim', 'yum file /usr/bin/vim'], 0,
  '`yum provides`（`whatprovides`）はリポジトリのメタ情報から調べる。インストール済みなら `rpm -qf ファイル` でも調べられる。');

qc('1.04.3', 'yum のリポジトリ設定ファイルが置かれる場所はどれか。',
  ['/etc/yum.repos.d/*.repo', '/etc/apt/sources.list', '/var/lib/rpm/', '/etc/yum/cache'], 0,
  '`/etc/yum.repos.d/` 配下の `*.repo`。全体設定は `/etc/yum.conf`（dnf なら `/etc/dnf/dnf.conf`）。');

qc('1.04.3', '`.repo` ファイルで、そのリポジトリを無効にするための設定はどれか。',
  ['enabled=0', 'enabled=1', 'gpgcheck=0', 'baseurl=none'], 0,
  '`enabled=1` が有効、`enabled=0` が無効。`gpgcheck` はパッケージのGPG署名検証の有無、`baseurl` はリポジトリのURL。');

qc('1.04.3', '更新可能なパッケージの一覧を表示するコマンドはどれか。',
  ['yum check-update', 'yum list installed', 'yum history', 'yum search updates'], 0,
  '`yum check-update`（または `yum list updates`）。実際には更新されない。');

qc('1.04.3', 'RHEL 8 以降で yum の後継として採用されている、パッケージ管理コマンドはどれか。',
  ['dnf', 'zypper', 'pacman', 'apt'], 0,
  '`dnf` が後継（RHEL 8 以降、`yum` コマンドは dnf へのエイリアス）。`zypper` は SUSE、`pacman` は Arch、`apt` は Debian/Ubuntu。');

qc('1.04.3', 'yum の操作履歴を確認したり、過去の操作を取り消したりするためのサブコマンドはどれか。',
  ['yum history', 'yum log', 'yum rollback', 'yum recent'], 0,
  '`yum history` で一覧、`yum history undo ID` で取り消し。');

/* ---- 1.04.4 RPMパッケージ管理 ---- */
qc('1.04.4', '`rpm -ivh foo.rpm` の各オプションの意味として正しいものはどれか。',
  ['-i インストール、-v 詳細表示、-h 進捗を # で表示', '-i 情報表示、-v 検証、-h ヘルプ', '-i 初期化、-v バージョン表示、-h ハッシュ確認', '-i 無視、-v 検証のみ、-h ホスト指定'], 0,
  'アップグレードは `rpm -Uvh`（未インストールなら新規インストール）、削除は `rpm -e`。');

qc('1.04.4', 'インストール済みのすべての RPM パッケージを一覧表示するコマンドはどれか。',
  ['rpm -qa', 'rpm -qi', 'rpm -ql', 'rpm -qf'], 0,
  '`-q` は問い合わせ(query)。`-qa` = すべて、`-qi` = 詳細情報、`-ql` = パッケージのファイル一覧、`-qf` = ファイルの所属パッケージ。');

qc('1.04.4', 'ファイル `/etc/hosts` がどのパッケージに属しているかを調べるコマンドはどれか。',
  ['rpm -qf /etc/hosts', 'rpm -ql /etc/hosts', 'rpm -qi /etc/hosts', 'rpm -V /etc/hosts'], 0,
  '`rpm -qf ファイルパス`。逆にパッケージのファイル一覧は `rpm -ql パッケージ名`。');

qc('1.04.4', '未インストールの `foo.rpm` の説明やバージョンなどの情報を、インストール前に確認するコマンドはどれか。',
  ['rpm -qpi foo.rpm', 'rpm -qi foo.rpm', 'rpm -qa foo.rpm', 'rpm -ivh foo.rpm --test'], 0,
  '`-p` はインストール前のrpmファイルを対象にするオプション。`-qpi` で情報、`-qpl` でファイル一覧。');

qi('1.04.4', 'インストール済みのパッケージ httpd を削除するコマンドを入力せよ。（rpm コマンド）',
  ['rpm -e httpd', 'rpm --erase httpd'],
  '`rpm -e`（erase）。依存関係があると削除に失敗する。');

qc('1.04.4', '`rpm` と `yum`（dnf）の違いとして正しいものはどれか。',
  ['rpm は依存関係を自動解決しないが、yum はリポジトリから依存パッケージも自動取得してインストールする', 'rpm はリポジトリからの取得に対応し、yum はローカルファイルのみ扱う', 'rpm は Debian 系で使い、yum は RHEL 系で使う', 'どちらも違いはない'], 0,
  'rpm は個々の .rpm を扱う低レベルツール、yum/dnf は rpm の上位の管理ツール。Debian系の dpkg ↔ apt に対応する関係。');

qc('1.04.4', 'RPMパッケージの署名検証のための GPG 公開鍵を、rpm のデータベースに取り込むコマンドはどれか。',
  ['rpm --import 鍵ファイル', 'rpm --addkey 鍵ファイル', 'rpm -K 鍵ファイル', 'rpm --gpg 鍵ファイル'], 0,
  '`rpm --import` で公開鍵を登録する。`rpm -K`（`--checksig`）はパッケージの署名やチェックサムの検証。', true);
