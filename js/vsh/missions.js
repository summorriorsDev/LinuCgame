/* ターミナル道場のミッション。files は初期ファイル（絶対パス）。sol は模範解答（自動テストにも使う）。
   check(t) が true になるとクリア。t.out() は各コマンドの標準出力の配列、t.node(path) はノード、など。
   must は「入力したコマンド履歴がすべて満たすべき正規表現」（正しい書き方を身につけるための縛り）。 */
(function (G) {
  'use strict';
  var M = G.MISSIONS = [];
  function m(o) { M.push(o); }
  function lines(s) { return s.split('\n').filter(function (x) { return x !== ''; }); }
  function same(a, b) { return a.length === b.length && a.every(function (x, i) { return x === b[i]; }); }
  var H = '/home/tux/';

  /* ============ 1.03.3 ストリーム・パイプ・リダイレクト ============ */
  m({ id: 'redir-overwrite', sub: '1.03.3', title: 'ls の結果をファイルに保存する（>）',
    files: { '/home/tux/a.txt': '', '/home/tux/b.txt': '', '/home/tux/c.txt': '' },
    goal: 'カレントディレクトリの一覧（`ls` の出力）を、`list.txt` に**書き出そう**。`>` は上書きのリダイレクト。',
    hint: '`ls > list.txt` のように、コマンドのあとに `> ファイル名` を付ける。',
    sol: ['ls > list.txt'], must: [/ls/, />/],
    check: function (t) { var s = t.read('list.txt'); return s !== null && /a\.txt/.test(s) && /b\.txt/.test(s) && /c\.txt/.test(s); },
    explain: '`>` は標準出力をファイルへ（既存の内容は消える）。`cat list.txt` で確認すると、`list.txt` 自身も一覧に入っている。リダイレクトは**コマンドより先に**ファイルを作るため。' });
  m({ id: 'redir-append', sub: '1.03.3', title: '末尾に追記する（>>）',
    files: { '/home/tux/memo.txt': '1行目\n' },
    goal: '`memo.txt` の末尾に `2行目` という行を**追記**しよう。1行目が消えてはいけない。',
    hint: '`>>` は追記。`echo 文字列 >> ファイル`。',
    sol: ['echo 2行目 >> memo.txt'],
    check: function (t) { return t.read('memo.txt') === '1行目\n2行目\n'; },
    explain: '`>` だと上書きで1行目が消える。`>>` は末尾に追記する。' });
  m({ id: 'redir-stderr', sub: '1.03.3', title: 'エラー出力だけをファイルへ（2>）',
    files: {},
    goal: '`ls /nonexistent /etc/hostname` を実行し、**エラーメッセージだけ**を `err.txt` に保存しよう。画面には正常な結果（`/etc/hostname`）だけが出るはず。',
    hint: '標準エラー出力のファイルディスクリプタは 2。`2> err.txt`。',
    sol: ['ls /nonexistent /etc/hostname 2> err.txt'], must: [/2>\s*err\.txt/],
    check: function (t) { var e = t.read('err.txt'); return e !== null && /No such file/.test(e) && !/hostname/.test(e) && t.out().some(function (o) { return o === '/etc/hostname\n'; }); },
    explain: '`2>` は標準エラー出力（2）だけをリダイレクトする。標準出力（1）は画面に出る。' });
  m({ id: 'redir-both', sub: '1.03.3', title: '標準出力と標準エラーの両方をファイルへ（2>&1）',
    files: {},
    goal: '`ls /nonexistent /etc/hostname` の**標準出力と標準エラー出力の両方**を `all.log` に保存しよう。画面には何も出ないはず。',
    hint: '`> all.log 2>&1`（順序が重要）、または bash の `&> all.log`。',
    sol: ['ls /nonexistent /etc/hostname > all.log 2>&1'], must: [/2>&1|&>|>&/],
    check: function (t) { var s = t.read('all.log'); return s !== null && /No such file/.test(s) && /\/etc\/hostname/.test(s) && t.log.some(function (e) { return /all\.log/.test(e.cmd) && e.out === '' && e.err === ''; }); },
    explain: '`> all.log 2>&1` は、まず標準出力をファイルへ、次に標準エラーを「標準出力の今の向き先（ファイル）」へ。順序を逆にすると、エラーは画面に出てしまう（次のミッション）。' });
  m({ id: 'redir-order', sub: '1.03.3', title: '2>&1 の順序を体験する',
    files: {},
    goal: '次の2つを順に実行して、結果の違いを観察しよう。\n① `ls /nonexistent /etc/hostname 2>&1 > out.txt`　② `cat out.txt`\n（エラーはどこに出た？ out.txt には何が入った？）',
    hint: '①の後に `cat out.txt` で中身を確認する。',
    sol: ['ls /nonexistent /etc/hostname 2>&1 > out.txt', 'cat out.txt'], must: [/2>&1\s*>\s*out\.txt/, /cat out\.txt/],
    check: function (t) { return t.read('out.txt') === '/etc/hostname\n'; },
    explain: '`2>&1 > out.txt` は左から順に処理される。`2>&1` の時点で標準出力はまだ「画面」なので、エラーは画面へ。そのあと標準出力だけがファイルに向く。結果：エラーは画面に出て、out.txt には `/etc/hostname` だけ。' });
  m({ id: 'redir-sudo', sub: '1.03.3', title: 'sudo とリダイレクトの落とし穴',
    files: {},
    goal: '一般ユーザのまま `sudo echo hello > /etc/test.conf` を実行すると、権限エラーになる（試してみよう）。そのあと、**`/etc/test.conf` に `hello` を書き込めるようにしよう**。',
    hint: 'リダイレクトは sudo ではなく元のシェルが処理する。書き込む側を sudo にする（`tee`）か、`sudo sh -c \'...\'`。',
    sol: ['sudo echo hello > /etc/test.conf', 'echo hello | sudo tee /etc/test.conf'], must: [/sudo/],
    check: function (t) { return t.read('/etc/test.conf') === 'hello\n'; },
    explain: '`sudo echo hello > file` では、ファイルを開くのは `sudo` で起動した echo ではなく**元のシェル**（一般ユーザ）。`echo hello | sudo tee file` なら、書き込む `tee` が root で動く。' });
  m({ id: 'tee-basic', sub: '1.03.3', title: 'tee で画面とファイルの両方へ',
    files: {},
    goal: '`ls /etc` の結果を、**画面に表示しながら** `etc.txt` にも保存しよう。',
    hint: '`コマンド | tee ファイル`。',
    sol: ['ls /etc | tee etc.txt'], must: [/tee/],
    check: function (t) { var s = t.read('etc.txt'); return s !== null && /hostname/.test(s) && t.out().some(function (o) { return /hostname/.test(o); }); },
    explain: '`tee` は標準入力を、標準出力とファイルの両方に出力する（`-a` で追記）。' });
  m({ id: 'xargs-touch', sub: '1.03.3', title: 'xargs で標準入力を引数にする',
    files: { '/home/tux/names.txt': 'x1\nx2\nx3\n' },
    goal: '`names.txt` に書かれた名前（x1, x2, x3）のファイルを、`xargs` を使って**作成**しよう。',
    hint: '`cat names.txt | xargs touch` または `xargs touch < names.txt`。',
    sol: ['cat names.txt | xargs touch'], must: [/xargs/],
    check: function (t) { return t.exists('x1') && t.exists('x2') && t.exists('x3'); },
    explain: '`xargs` は標準入力の文字列を、コマンドの**引数**に変換して実行する。パイプで渡された内容は、そのままでは引数にならない。' });
  m({ id: 'pipe-wc', sub: '1.03.3', title: 'パイプで数える',
    files: {},
    goal: '`/etc` 直下のエントリ数を、`ls` と `wc` をパイプで組み合わせて数え、**数字だけ**を表示しよう。',
    hint: '`ls /etc | wc -l`。',
    sol: ['ls /etc | wc -l'], must: [/ls/, /wc/, /\|/],
    check: function (t) { var n = t.list('/etc').length; return t.out().some(function (o) { return o === n + '\n'; }); },
    explain: '`ls` の出力1行が1エントリなので、行数を数える `wc -l` で個数になる。パイプで渡るのは標準出力だけ。' });

  /* ============ 1.03.2 フィルタ ============ */
  m({ id: 'seq-head-tail', sub: '1.03.2', title: 'head と tail を組み合わせる',
    files: {},
    goal: '`seq 1 15`（1〜15を1行ずつ出力）の結果から、**7, 8, 9, 10 だけ**を表示しよう。`seq` `head` `tail` をパイプでつなぐ。',
    hint: '先頭10行を取り出してから、その最後の4行を取り出す。',
    sol: ['seq 1 15 | head -n 10 | tail -n 4'], must: [/seq/, /head/, /tail/],
    check: function (t) { return t.out().some(function (o) { return o === '7\n8\n9\n10\n'; }); },
    explain: '`head -n 10` で 1〜10、その最後の4行（`tail -n 4`）で 7〜10。順番を逆にすると結果が変わる。' });
  m({ id: 'tail-plus', sub: '1.03.2', title: 'tail -n +N（N行目から最後まで）',
    files: { '/home/tux/lines.txt': 'L1\nL2\nL3\nL4\nL5\n' },
    goal: '`lines.txt` の **3行目から最後まで**を表示しよう。',
    hint: '`tail -n +3`。`+` が付くと「その行から最後まで」の意味になる。',
    sol: ['tail -n +3 lines.txt'], must: [/tail/],
    check: function (t) { return t.out().some(function (o) { return o === 'L3\nL4\nL5\n'; }); },
    explain: '`tail -n 3` は**最後の3行**、`tail -n +3` は**3行目から最後まで**。似ているが別物。' });
  m({ id: 'cut-users', sub: '1.03.2', title: 'cut でフィールドを取り出す',
    files: {},
    goal: '`/etc/passwd` から、**ユーザ名（第1フィールド）だけ**を1行ずつ表示しよう。',
    hint: '区切りは `:`。`cut -d: -f1`。',
    sol: ['cut -d: -f1 /etc/passwd'], must: [/cut/],
    check: function (t) { return t.out().some(function (o) { return o === 'root\ndaemon\nsshd\ntux\nalice\nbob\n'; }); },
    explain: '`-d` が区切り文字、`-f` がフィールド番号（1から数える）。`-f1,7` や `-f2-4` のように複数指定もできる。' });
  m({ id: 'count-names', sub: '1.03.2', title: 'sort | uniq -c で集計する',
    files: { '/home/tux/names.txt': 'bob\nalice\nbob\ncarol\nalice\nbob\n' },
    goal: '`names.txt` で**最も多く出現する名前**を、`回数 名前` の形で1行だけ表示しよう。',
    hint: '`sort` → `uniq -c` → `sort -nr` → `head -n 1`。',
    sol: ['sort names.txt | uniq -c | sort -nr | head -n 1'], must: [/uniq/],
    check: function (t) { return t.out().some(function (o) { return /^\s*3 bob\n$/.test(o); }); },
    explain: '`uniq` は**隣り合う**重複しか見ないので、先に `sort`。`uniq -c` で件数を付け、`sort -nr` で多い順に並べる。' });
  m({ id: 'sort-k', sub: '1.03.2', title: 'sort -k でキーを指定する',
    files: { '/home/tux/score.txt': 'tom 80\namy 95\njoe 70\n' },
    goal: '`score.txt`（名前 点数）から、**点数が最も低い人**の行だけを表示しよう。',
    hint: '`sort -k2 -n` で2列目を数値として昇順に並べ、先頭1行。',
    sol: ['sort -k2 -n score.txt | head -n 1'], must: [/sort/],
    check: function (t) { return t.out().some(function (o) { return o === 'joe 70\n'; }); },
    explain: '`-k2` は2番目のフィールドをキーに、`-n` は数値として比較する（付けないと文字列順で `100` が `20` より前に来る）。' });
  m({ id: 'tr-upper', sub: '1.03.2', title: 'tr で大文字に変換する',
    files: { '/home/tux/words.txt': 'linux\nserver\n' },
    goal: '`words.txt` の内容を**すべて大文字**で表示しよう。ファイル自体は変更しない。',
    hint: '`tr` は標準入力しか受け取らないので、`< words.txt` で渡す。',
    sol: ['tr a-z A-Z < words.txt'], must: [/tr/],
    check: function (t) { return t.out().some(function (o) { return o === 'LINUX\nSERVER\n'; }) && t.read('words.txt') === 'linux\nserver\n'; },
    explain: '`tr` はファイル名を引数に取れない。`< ファイル` か、パイプで標準入力に渡す。' });
  m({ id: 'wc-l-only', sub: '1.03.2', title: '行数だけを表示する',
    files: { '/home/tux/access.log': 'a\nb\nc\nd\ne\n' },
    goal: '`access.log` の**行数だけ**（ファイル名なし）を表示しよう。',
    hint: '`wc -l access.log` だとファイル名も出る。標準入力から読ませると名前が出ない。',
    sol: ['wc -l < access.log'], must: [/wc/],
    check: function (t) { return t.out().some(function (o) { return o === '5\n'; }); },
    explain: '`wc -l ファイル` は `5 access.log` のように名前を付けて表示する。`wc -l < ファイル` や `cat ファイル | wc -l` なら数字だけ。' });
  m({ id: 'sort-u', sub: '1.03.2', title: '重複を取り除いた一覧',
    files: { '/home/tux/dup.txt': 'b\na\nb\nc\na\n' },
    goal: '`dup.txt` から、**重複を取り除いて**アルファベット順に表示しよう。',
    hint: '`sort -u`、または `sort | uniq`。',
    sol: ['sort -u dup.txt'], must: [/sort/],
    check: function (t) { return t.out().some(function (o) { return o === 'a\nb\nc\n'; }); },
    explain: '`uniq` だけでは隣り合う重複しか除けない。`sort -u` か `sort | uniq` を使う。' });

  /* ============ 1.03.4 正規表現・grep・sed ============ */
  var CONF = '# Port number\nPort 22\n\nPermitRootLogin no\n#PasswordAuthentication yes\nPasswordAuthentication no\nX11Forwarding yes\n';
  m({ id: 'grep-v-comment', sub: '1.03.4', title: 'コメント行を除いて表示する',
    files: { '/home/tux/conf.txt': CONF },
    goal: '`conf.txt` から、`#` で始まる**コメント行を除いて**表示しよう（空行は残ってよい）。',
    hint: '`grep -v` は一致した行を除く。`^` は行頭。',
    sol: ['grep -v "^#" conf.txt'], must: [/grep|sed/],
    check: function (t) { return t.out().some(function (o) { return o === 'Port 22\n\nPermitRootLogin no\nPasswordAuthentication no\nX11Forwarding yes\n'; }); },
    explain: '`grep -v "^#"`。`#PasswordAuthentication yes` も行頭が # なので除かれる。行の途中に # があるだけの行まで消したいなら `grep -v "#"` だが、意味が違う。' });
  m({ id: 'grep-effective', sub: '1.03.4', title: '設定の行だけを取り出す',
    files: { '/home/tux/conf.txt': CONF },
    goal: '`conf.txt` から、**コメント行と空行の両方**を除いて、設定の行だけを表示しよう。',
    hint: '`grep -v -e "^#" -e "^$"` か、`grep -vE "^(#|$)"`、または `sed`。',
    sol: ['grep -vE "^(#|$)" conf.txt'], must: [/grep|sed/],
    check: function (t) { return t.out().some(function (o) { return o === 'Port 22\nPermitRootLogin no\nPasswordAuthentication no\nX11Forwarding yes\n'; }); },
    explain: '`^$` は「行頭の直後が行末」＝空行。`-E` の拡張正規表現なら `|` で「#で始まる、または空行」と書ける。' });
  m({ id: 'grep-count', sub: '1.03.4', title: '一致した行数を数える',
    files: { '/home/tux/app.log': 'ok\nerror: disk\nok\nerror: net\nwarn\nerror: cpu\n' },
    goal: '`app.log` のうち、`error` を含む行が**何行あるか**を、数字で表示しよう。',
    hint: '`grep -c`。',
    sol: ['grep -c error app.log'], must: [/grep|wc/],
    check: function (t) { return t.out().some(function (o) { return o === '3\n'; }); },
    explain: '`grep -c` は一致した**行の数**を出力する（出現回数ではない）。' });
  m({ id: 'sed-global', sub: '1.03.4', title: 'sed で置換する（g の有無）',
    files: { '/home/tux/words.txt': 'banana\nmango\n' },
    goal: '`words.txt` の各行の `a` を**すべて** `A` に置換して表示しよう。ファイル自体は変更しない。',
    hint: '`sed s/a/A/g`。`g` を付けないと各行の最初の1つだけ。',
    sol: ['sed s/a/A/g words.txt'], must: [/sed/],
    check: function (t) { return t.out().some(function (o) { return o === 'bAnAnA\nmAngo\n'; }) && t.read('words.txt') === 'banana\nmango\n'; },
    explain: '`s/a/A/` は各行の**最初の**一致だけ（`bAnana`）。`g` で行内すべて。`-i` を付けない限り、元のファイルは変わらず結果が画面に出る。' });
  m({ id: 'sed-inplace', sub: '1.03.4', title: 'sed -i でファイルを書き換える',
    files: { '/home/tux/motd.txt': 'foo bar foo\n' },
    goal: '`motd.txt` を**直接書き換えて**、`foo` をすべて `baz` にしよう。',
    hint: '`sed -i s/foo/baz/g motd.txt`。',
    sol: ['sed -i s/foo/baz/g motd.txt'], must: [/sed/, /-i/],
    check: function (t) { return t.read('motd.txt') === 'baz bar baz\n'; },
    explain: '`-i`（in-place）でファイルそのものを書き換える。画面には何も出ない。' });
  m({ id: 'sed-range', sub: '1.03.4', title: 'sed -n で範囲を表示する',
    files: { '/home/tux/lines.txt': 'L1\nL2\nL3\nL4\nL5\n' },
    goal: '`lines.txt` の **2〜4行目だけ**を表示しよう。',
    hint: '`sed -n 2,4p`。`-n` は自動出力を止め、`p` で表示する。',
    sol: ['sed -n 2,4p lines.txt'],
    check: function (t) { return t.out().some(function (o) { return o === 'L2\nL3\nL4\n'; }); },
    explain: '`-n` を付けないと全行が自動表示され、`p` の行が二重になる。削除なら `sed 2,4d`。' });
  m({ id: 'grep-r', sub: '1.03.4', title: 'grep -r でディレクトリを再帰検索',
    files: { '/home/tux/conf.d/a.conf': 'Port 22\n', '/home/tux/conf.d/b.conf': 'PermitRootLogin no\n', '/home/tux/conf.d/c.conf': 'X11Forwarding yes\n' },
    goal: '`conf.d` ディレクトリ以下のファイルから、`PermitRootLogin` を含む行を**再帰的に**検索しよう。',
    hint: '`grep -r パターン ディレクトリ`。',
    sol: ['grep -r PermitRootLogin conf.d'], must: [/grep.*-[a-zA-Z]*[rR]/],
    check: function (t) { return t.out().some(function (o) { return o === 'conf.d/b.conf:PermitRootLogin no\n'; }); },
    explain: '`-r` で配下のファイルをすべて検索し、`ファイル名:行` の形式で表示される。' });

  /* ============ 1.03.1 コマンドライン ============ */
  m({ id: 'export-var', sub: '1.03.1', title: 'export して子プロセスに渡す',
    files: {},
    goal: '変数 `NAME` に `tux` を設定し、**子シェル** `bash -c \'echo $NAME\'` でも `tux` と表示されるようにしよう。',
    hint: '`export` していない変数は子プロセスに引き継がれない。',
    sol: ['export NAME=tux', "bash -c 'echo $NAME'"], must: [/export/],
    check: function (t) { return t.log.some(function (e) { return /bash -c/.test(e.cmd) && e.out === 'tux\n'; }); },
    explain: '`NAME=tux` だけではシェル変数。`export NAME=tux` で環境変数になり、子プロセスに引き継がれる。' });
  m({ id: 'quote-single', sub: '1.03.1', title: 'シングルクォートで展開させない',
    files: {},
    goal: '`$HOME` という**文字列そのもの**を、展開せずに表示しよう。',
    hint: 'シングルクォートの中では変数が展開されない。',
    sol: ["echo '$HOME'"], must: [/echo/],
    check: function (t) { return t.out().some(function (o) { return o === '$HOME\n'; }); },
    explain: '`echo "$HOME"`（ダブルクォート）は `/home/tux` に展開される。`\'$HOME\'` や `\\$HOME` は展開されない。' });
  m({ id: 'and-chain', sub: '1.03.1', title: '&& でつなぐ',
    files: {},
    goal: '`work` ディレクトリを作成し、**成功したときだけ**そこへ移動して `pwd` を表示しよう。（`&&` を使う）',
    hint: '`mkdir work && cd work && pwd`。',
    sol: ['mkdir work && cd work && pwd'], must: [/&&/],
    check: function (t) { return t.sh.cwd === '/home/tux/work'; },
    explain: '`&&` は直前が成功（終了ステータス0）のときだけ次を実行。`||` は失敗のときだけ。`;` は無条件。' });
  m({ id: 'sudo-bangbang', sub: '1.03.1', title: 'sudo !!（直前のコマンドを sudo で）',
    files: {},
    goal: '`cat /etc/shadow` は権限エラーになる。**直前のコマンドを sudo 付きで**やり直そう。（`!!` を使う）',
    hint: '`!!` は直前のコマンドラインに展開される。',
    sol: ['cat /etc/shadow', 'sudo !!'], must: [/sudo !!/],
    check: function (t) { return t.out().some(function (o) { return /^root:!:/.test(o); }); },
    explain: '履歴展開 `!!` で、打ち直さずに `sudo cat /etc/shadow` を実行できる。' });
  m({ id: 'run-script', sub: '1.03.1', title: 'スクリプトを実行する（./ と実行権限）',
    files: { '/home/tux/run.sh': { c: '#!/bin/bash\necho hello from run.sh\n', m: 420 } },
    goal: '`run.sh` を**実行**して `hello from run.sh` と表示させよう。（実行権限がありません）',
    hint: '`chmod` で実行権限を付け、`./run.sh`。カレントディレクトリは PATH に入っていない。',
    sol: ['chmod u+x run.sh', './run.sh'], must: [/chmod/, /\.\/run\.sh/],
    check: function (t) { return t.out().some(function (o) { return o === 'hello from run.sh\n'; }); },
    explain: '`run.sh` とだけ打つと PATH から探すので `command not found`。`./run.sh` とパスで指定する。実行権限がないと `Permission denied`。' });
  m({ id: 'cmd-subst-date', sub: '1.03.1', title: 'コマンド置換で日付をファイル名に',
    files: {},
    goal: '今日の日付を含む `backup-YYYY-MM-DD.txt`（空ファイル）を、`date +%F` を使って作ろう。',
    hint: '`touch backup-$(date +%F).txt`。',
    sol: ['touch backup-$(date +%F).txt'], must: [/date/],
    check: function (t) { return t.exists('backup-2026-10-09.txt'); },
    explain: '`$(コマンド)` はその出力に置き換わる（コマンド置換）。バッククォート `` `date` `` でも同じ。' });
  m({ id: 'brace-expand', sub: '1.03.1', title: 'ブレース展開',
    files: {},
    goal: '`file1.txt` `file2.txt` `file3.txt` を、**1つのコマンドで**作成しよう。',
    hint: '`touch file{1..3}.txt`。',
    sol: ['touch file{1..3}.txt'], must: [/\{.*\}/],
    check: function (t) { return t.exists('file1.txt') && t.exists('file2.txt') && t.exists('file3.txt'); },
    explain: '`{1..3}` や `{a,b,c}` はシェルが展開する（ブレース展開）。ファイルを作るのは `touch`。' });
  m({ id: 'alias-lt', sub: '1.03.1', title: 'alias を定義する',
    files: {},
    goal: '`lt` と打つと `ls -lt` が実行されるように、**alias** を定義して、`lt` を実行してみよう。',
    hint: "`alias lt='ls -lt'`。",
    sol: ["alias lt='ls -lt'", 'lt'],
    check: function (t) { return t.sh.aliases.lt === 'ls -lt' && t.log.some(function (e) { return e.cmd.trim() === 'lt'; }); },
    explain: '`alias` は現在のシェルだけで有効。いつも使うなら `~/.bashrc` に書く。解除は `unalias lt`。' });

  /* ============ 1.02.1 パーミッション ============ */
  m({ id: 'chmod-num', sub: '1.02.1', title: 'chmod（数値モード）',
    files: { '/home/tux/script.sh': { c: '#!/bin/bash\n', m: 420 } },
    goal: '`script.sh` を、**所有者 rwx / グループ r-x / その他 r--** にしよう。（数値で表すと？）',
    hint: 'r=4, w=2, x=1。7 5 4。',
    sol: ['chmod 754 script.sh'],
    check: function (t) { return t.mode('script.sh') === '754'; },
    explain: 'rwx=7、r-x=5、r--=4 なので `754`。`ls -l` で `-rwxr-xr--` になる。' });
  m({ id: 'chmod-sym', sub: '1.02.1', title: 'chmod（記号モード）',
    files: { '/home/tux/report.txt': { c: 'x\n', m: 420 } },
    goal: '`report.txt`（644）から、**グループとその他の読み取り権限**を外そう。記号モードで。',
    hint: '`chmod go-r`。',
    sol: ['chmod go-r report.txt'], must: [/chmod/],
    check: function (t) { return t.mode('report.txt') === '600'; },
    explain: '`u`=所有者、`g`=グループ、`o`=その他、`a`=全員。`+`追加、`-`削除、`=`置換。' });
  m({ id: 'umask-077', sub: '1.02.1', title: 'umask と新規作成時の権限',
    files: {},
    goal: '`umask` を `077` にして、`new.txt`（touch）と `newdir`（mkdir）を作ろう。`ls -ld new.txt newdir` で権限を確認！',
    hint: 'ファイルは 666、ディレクトリは 777 から umask の bit を取り除く。',
    sol: ['umask 077', 'touch new.txt', 'mkdir newdir', 'ls -ld new.txt newdir'],
    check: function (t) { return t.mode('new.txt') === '600' && t.mode('newdir') === '700'; },
    explain: 'ファイル 666 − 077 → 600（`-rw-------`）、ディレクトリ 777 − 077 → 700（`drwx------`）。' });
  m({ id: 'suid', sub: '1.02.1', title: 'SUID を設定する',
    files: { '/home/tux/tool': { c: '#!ELF\n', m: 493 } },
    goal: '`tool`（755）に **SUID** を付けよう。`ls -l` で所有者の `x` が `s` になるはず。',
    hint: '`chmod u+s` または `chmod 4755`。',
    sol: ['chmod u+s tool', 'ls -l tool'],
    check: function (t) { return t.mode('tool') === '4755'; },
    explain: 'SUID は実行時に**ファイル所有者**の権限で動かす仕組み（例: `/usr/bin/passwd`）。表示は `rws`。' });
  m({ id: 'sgid-dir', sub: '1.02.1', title: 'ディレクトリの SGID（グループ継承）',
    files: { '/home/tux/shared/': { u: 1000, g: 2000, m: 493 } },
    goal: '`shared` ディレクトリ（グループ `dev`）に **SGID** を設定してから、その中に `memo.txt` を作ろう。`ls -l shared` で、memo.txt のグループが `dev` になっていることを確認！',
    hint: '`chmod g+s shared` を先に。tux の所属グループは tux と dev。',
    sol: ['chmod g+s shared', 'touch shared/memo.txt', 'ls -l shared'],
    check: function (t) { return (t.node('shared') && (t.node('shared').mode & 0x400) !== 0) && t.gid('shared/memo.txt') === 2000; },
    explain: 'SGID（`g+s`、2000）付きディレクトリでは、新規ファイルの所有グループが**ディレクトリのグループ**になる。付けなければ作成者の主グループ（tux）。' });
  m({ id: 'perm-denied', sub: '1.02.1', title: '権限エラーを体験する',
    files: { '/home/tux/secret.txt': { c: 'top secret\n', u: 1001, g: 1001, m: 384 } },
    goal: '`secret.txt` は alice の所有で 600。まず `cat secret.txt` で**読めない**ことを確かめてから、管理者権限（`sudo`）で内容を表示しよう。',
    hint: '`sudo cat secret.txt`。',
    sol: ['cat secret.txt', 'sudo cat secret.txt'], must: [/cat secret/, /sudo/],
    check: function (t) { return t.log.some(function (e) { return /Permission denied/.test(e.err); }) && t.out().some(function (o) { return o === 'top secret\n'; }); },
    explain: '他人所有で 600 のファイルは、tux には読めない（`Permission denied`）。root（sudo）は権限チェックを受けない。' });
  m({ id: 'chgrp-dev', sub: '1.02.1', title: 'グループだけ変更する（chgrp）',
    files: { '/home/tux/data.txt': 'x\n' },
    goal: '`data.txt` の**所有グループだけ**を `dev` に変更しよう。所有者は変えない。',
    hint: '`chgrp dev data.txt` または `chown :dev data.txt`。',
    sol: ['chgrp dev data.txt'],
    check: function (t) { return t.gid('data.txt') === 2000 && t.uid('data.txt') === 1000; },
    explain: '`chown ユーザ:グループ` ではユーザ部分を省略（`:dev`）するとグループだけ変わる。一般ユーザは自分の所属グループにしか変更できない。' });
  m({ id: 'sticky', sub: '1.02.1', title: 'スティッキービット',
    files: { '/home/tux/pub/': { m: 511 } },
    goal: '`pub`（777）を `/tmp` のように、**他人のファイルを消せない**ようにするため、スティッキービット付きの `1777` にしよう。',
    hint: '`chmod 1777 pub` または `chmod +t pub`。',
    sol: ['chmod +t pub', 'ls -ld pub'],
    check: function (t) { return t.mode('pub') === '1777'; },
    explain: 'スティッキービット（`t`）付きのディレクトリでは、ファイルの所有者（とディレクトリの所有者・root）だけが削除・名前変更できる。' });

  /* ============ 1.02.2 ファイル管理 ============ */
  m({ id: 'ls-la', sub: '1.02.2', title: '隠しファイルも含めて詳細表示',
    files: { '/home/tux/.hidden': 'x\n', '/home/tux/visible.txt': 'y\n' },
    goal: '**隠しファイルも含めて**、詳細表示（`ls -l` 形式）で一覧を出そう。',
    hint: '`ls -la`。',
    sol: ['ls -la'],
    check: function (t) { return t.out().some(function (o) { return /\.hidden/.test(o) && /^-rw/m.test(o); }); },
    explain: '`.` で始まる名前が隠しファイル。`ls` では表示されず、`-a` で表示。`-l` は詳細（権限・所有者・サイズ・日時）。' });
  m({ id: 'mkdir-p', sub: '1.02.2', title: 'mkdir -p',
    files: {},
    goal: '`a/b/c` を、親ディレクトリも含めて**一度に**作成しよう。',
    hint: '`mkdir -p a/b/c`。',
    sol: ['mkdir -p a/b/c'], must: [/mkdir.*-p|mkdir.*--parents/],
    check: function (t) { return t.isDir('a/b/c'); },
    explain: '`-p`（parents）は途中のディレクトリも作り、すでにあってもエラーにならない。' });
  m({ id: 'cp-r-into', sub: '1.02.2', title: 'cp -r（既存ディレクトリへ）',
    files: { '/home/tux/src/file.txt': 'x\n', '/home/tux/dst/': null },
    goal: '`src` ディレクトリを、すでにある `dst` ディレクトリ**の中に**コピーしよう。コピー後、どこに何ができたか `ls -R dst` で確認！',
    hint: '`cp -r src dst`。',
    sol: ['cp -r src dst', 'ls -R dst'],
    check: function (t) { return t.exists('dst/src/file.txt'); },
    explain: 'コピー先が**既存のディレクトリ**なら、その中に `src` ごと入る（`dst/src/file.txt`）。`dst` がなければ、`dst` という名前でコピーされる。' });
  m({ id: 'cp-p', sub: '1.02.2', title: 'cp -p（更新日時を保つ）',
    files: { '/home/tux/old.txt': { c: 'old\n', d: 30 } },
    goal: '`old.txt` を `copy.txt` にコピーしよう。ただし**更新日時を保ったまま**。`ls -l` で比べてみよう。',
    hint: '`cp -p`（または `cp -a`）。',
    sol: ['cp -p old.txt copy.txt', 'ls -l'], must: [/cp.*-[a-zA-Z]*[pa]/],
    check: function (t) { return t.exists('copy.txt') && t.mtime('copy.txt') === t.mtime('old.txt'); },
    explain: '`-p` は所有者・パーミッション・タイムスタンプを保持する。`-a` はそれに加えて再帰・リンク保持。' });
  m({ id: 'rm-r', sub: '1.02.2', title: 'rm -r（ディレクトリごと削除）',
    files: { '/home/tux/junk/a': 'x\n', '/home/tux/junk/sub/b': 'y\n' },
    goal: '`junk` ディレクトリを、中身ごと削除しよう。',
    hint: '`rm -r junk`。`rmdir` は空のディレクトリ専用。',
    sol: ['rm -r junk'],
    check: function (t) { return !t.exists('junk'); },
    explain: '`rm` はディレクトリに `-r` が必要。`rmdir` は空のときだけ使える。' });
  m({ id: 'rm-dashf', sub: '1.02.2', title: '名前が - で始まるファイルを消す',
    files: { '/home/tux/-f': 'x\n', '/home/tux/keep.txt': 'y\n' },
    goal: '`-f` という名前のファイルを削除しよう。（`rm -f` ではオプションとして解釈されてしまう）',
    hint: '`rm -- -f` か `rm ./-f`。',
    sol: ['rm -- -f'],
    check: function (t) { return !t.exists('-f') && t.exists('keep.txt'); },
    explain: '`--` は「ここからはオプションではない」の意味。`./` を付けてパスとして指定する方法もある。' });
  m({ id: 'tar-create', sub: '1.02.2', title: 'tar で gzip 圧縮アーカイブを作る',
    files: { '/home/tux/data/a.txt': 'A\n', '/home/tux/data/b.txt': 'B\n' },
    goal: '`data` ディレクトリを、gzip 圧縮して `data.tar.gz` にまとめよう。',
    hint: '`tar czf data.tar.gz data`。`f` の直後にファイル名。',
    sol: ['tar czf data.tar.gz data'], must: [/tar/],
    check: function (t) { return /data\/a\.txt/.test(t.silent('tar tzf data.tar.gz')); },
    explain: '`c` 作成、`z` gzip、`f` ファイル指定。中身の確認は `tar tzf data.tar.gz`、展開は `tar xzf`。' });
  m({ id: 'tar-extract', sub: '1.02.2', title: 'tar を別のディレクトリへ展開する',
    files: {}, prep: ['mkdir pkg', 'echo hello > pkg/readme.txt', 'tar czf backup.tar.gz pkg', 'rm -r pkg', 'mkdir restore'],
    goal: '`backup.tar.gz` を、`restore` ディレクトリの**中に**展開しよう。（カレントは移動せずに）',
    hint: '`tar xzf backup.tar.gz -C restore`。',
    sol: ['tar xzf backup.tar.gz -C restore'], must: [/tar/, /-C/],
    check: function (t) { return t.read('restore/pkg/readme.txt') === 'hello\n' && !t.exists('pkg'); },
    explain: '`-C ディレクトリ` で展開先を指定する。展開前に内容を見たいときは `tar tzf`。' });
  m({ id: 'gzip-k', sub: '1.02.2', title: 'gzip -k（元のファイルを残す）',
    files: { '/home/tux/big.log': 'log\nlog\n' },
    goal: '`big.log` を gzip で圧縮しよう。ただし**元のファイルも残す**こと。',
    hint: '`gzip -k big.log`。',
    sol: ['gzip -k big.log', 'ls'], must: [/gzip.*(-k|--keep)/],
    check: function (t) { return t.exists('big.log') && t.exists('big.log.gz'); },
    explain: '`gzip` は既定では元のファイルを `.gz` に**置き換える**。`-k`（keep）で残せる。展開は `gunzip` か `gzip -d`。' });

  /* ============ 1.02.3 リンク ============ */
  m({ id: 'hardlink', sub: '1.02.3', title: 'ハードリンクを作る',
    files: { '/home/tux/a.txt': 'hello\n' },
    goal: '`a.txt` の**ハードリンク** `b.txt` を作り、`ls -li` で **inode 番号が同じ**ことを確認しよう。',
    hint: '`ln a.txt b.txt` → `ls -li`。',
    sol: ['ln a.txt b.txt', 'ls -li'],
    check: function (t) { var a = t.node('a.txt'), b = t.node('b.txt'); return a && b && a === b && a.nlink === 2 && t.log.some(function (e) { return /ls .*-.*i/.test(e.cmd); }); },
    explain: 'ハードリンクは同じ inode に別名を付ける。リンク数（`ls -l` の2列目）が 2 になる。片方を消しても実体は残る。' });
  m({ id: 'symlink', sub: '1.02.3', title: 'シンボリックリンクを作る',
    files: {},
    goal: '`/etc/hostname` を指すシンボリックリンク `hn` を、カレントディレクトリに作ろう。',
    hint: '`ln -s リンク先 リンク名`。',
    sol: ['ln -s /etc/hostname hn', 'ls -l hn'], must: [/ln.*-s/],
    check: function (t) { var n = t.lnode('hn'); return n && n.type === 'l' && n.target === '/etc/hostname'; },
    explain: '書式は `ln -s 元 リンク名`（元が先）。`ls -l` では `hn -> /etc/hostname` と表示される。' });
  m({ id: 'link-count', sub: '1.02.3', title: 'リンク数の変化を追う',
    files: {},
    goal: '次を順に実行し、最後に `ls -l g` で **g のリンク数**を確認しよう。\n`touch f` → `ln f g` → `ln -s f s` → `rm f` → `ls -l g`',
    hint: 'ハードリンクは名前が増えるとリンク数が増え、シンボリックリンクは影響しない。',
    sol: ['touch f', 'ln f g', 'ln -s f s', 'rm f', 'ls -l g'],
    check: function (t) { return t.out().some(function (o) { return /^-rw-r--r-- 1 tux/.test(o); }) && t.exists('g'); },
    explain: '`ln f g` で 2、`ln -s f s` は影響なし（2のまま）、`rm f` で 1。`g` は残り、`s` は壊れたリンクになる。' });
  m({ id: 'dangling', sub: '1.02.3', title: '壊れたシンボリックリンク',
    files: { '/home/tux/a.txt': 'hi\n' },
    goal: '`a.txt` へのシンボリックリンク `s` を作り、`a.txt` を削除してから `cat s` を実行しよう。何が起きる？',
    hint: '`ln -s a.txt s` → `rm a.txt` → `cat s`。',
    sol: ['ln -s a.txt s', 'rm a.txt', 'cat s'],
    check: function (t) { return t.log.some(function (e) { return /^cat s/.test(e.cmd) && /No such file/.test(e.err); }); },
    explain: 'シンボリックリンクは「名前」を指すだけなので、元が消えると壊れる（`No such file or directory`）。ハードリンクなら中身は残る。' });

  /* ============ 1.02.4 find ============ */
  var PROJ = { '/home/tux/proj/a.conf': 'x\n', '/home/tux/proj/b.log': 'x\n', '/home/tux/proj/sub/c.conf': 'x\n', '/home/tux/proj/sub/d.log': 'x\n' };
  m({ id: 'find-name', sub: '1.02.4', title: 'find -name',
    files: PROJ,
    goal: '`proj` 以下から、拡張子が `.conf` のファイルを**すべて**探して表示しよう。',
    hint: '`find proj -name "*.conf"`。ワイルドカードはクォートする。',
    sol: ['find proj -name "*.conf"'], must: [/find/],
    check: function (t) { return t.out().some(function (o) { return same(lines(o).sort(), ['proj/a.conf', 'proj/sub/c.conf']); }); },
    explain: '`find 場所 -name パターン`。パターンをクォートしないと、シェルが先に展開してしまう。' });
  m({ id: 'find-mtime', sub: '1.02.4', title: 'find -mtime +7',
    files: { '/home/tux/logs/new.log': { c: 'x\n', d: 1 }, '/home/tux/logs/old.log': { c: 'x\n', d: 10 }, '/home/tux/logs/older.log': { c: 'x\n', d: 30 } },
    goal: '`logs` 以下から、**更新が7日より前**のファイルだけを表示しよう。',
    hint: '`find logs -type f -mtime +7`。',
    sol: ['find logs -type f -mtime +7'], must: [/-mtime\s*\+7/],
    check: function (t) { return t.out().some(function (o) { return same(lines(o).sort(), ['logs/old.log', 'logs/older.log']); }); },
    explain: '`-mtime +7` は「7日より前（8日以上前）」、`-7` は7日未満、`7` はちょうど7日。' });
  m({ id: 'find-size', sub: '1.02.4', title: 'find -size',
    files: { '/home/tux/data/big.bin': 'x'.repeat(2 * 1024 * 1024), '/home/tux/data/small.txt': 'x\n' },
    goal: '`data` 以下から、**1MBを超える**ファイルを探そう。',
    hint: '`find data -type f -size +1M`。単位は `k` `M` `G`。',
    sol: ['find data -type f -size +1M'], must: [/-size/],
    check: function (t) { return t.out().some(function (o) { return o === 'data/big.bin\n'; }); },
    explain: '`-size +1M` は「1MBより大きい」。単位を省略すると 512 バイトブロックなので要注意。' });
  m({ id: 'find-suid', sub: '1.02.4', title: 'find -perm で SUID を探す',
    files: { '/home/tux/bin/tool1': { c: 'x\n', m: 2541 }, '/home/tux/bin/tool2': { c: 'x\n', m: 493 } },
    goal: '`bin` 以下から、**SUID が設定された**ファイルを探そう。',
    hint: '`find bin -perm -4000`。ハイフン付きは「この bit をすべて含む」。',
    sol: ['find bin -perm -4000'], must: [/-perm/],
    check: function (t) { return t.out().some(function (o) { return o === 'bin/tool1\n'; }); },
    explain: '`-perm -4000` は「4000 の bit を含む」。ハイフンなしの `-perm 4000` は「ぴったり 4000」で意味が違う。' });
  m({ id: 'find-exec', sub: '1.02.4', title: 'find -exec で削除する',
    files: { '/home/tux/tmp/a.tmp': 'x\n', '/home/tux/tmp/b.tmp': 'x\n', '/home/tux/tmp/keep.txt': 'x\n' },
    goal: '`tmp` 以下の `*.tmp` を、`find` の **`-exec`** で削除しよう。`keep.txt` は残す。',
    hint: '`find tmp -name "*.tmp" -exec rm {} \\;`。`{}` は見つかったファイル名に置き換わる。',
    sol: ['find tmp -name "*.tmp" -exec rm {} \\;'], must: [/-exec/],
    check: function (t) { return !t.exists('tmp/a.tmp') && !t.exists('tmp/b.tmp') && t.exists('tmp/keep.txt'); },
    explain: '`-exec コマンド {} \\;` は、見つかったファイルごとにコマンドを実行する。`\\;` はコマンドの終わり（`;` をシェルに解釈させない）。' });
  m({ id: 'type-cmds', sub: '1.02.4', title: 'type でコマンドの種類を調べる',
    files: {},
    goal: '`type ls` と `type cd` を実行して、`ls` は alias、`cd` はシェルの組み込みコマンドだと確かめよう。',
    hint: '`type ls` と `type cd` を順に。',
    sol: ['type ls', 'type cd'],
    check: function (t) { return t.out().some(function (o) { return /aliased/.test(o); }) && t.out().some(function (o) { return /shell builtin/.test(o); }); },
    explain: '`type` は alias・組み込み・外部コマンド（パス）のどれかを教えてくれる。`which` は PATH 上の実行ファイルだけを探す。' });
})(typeof window !== 'undefined' ? window : globalThis);
