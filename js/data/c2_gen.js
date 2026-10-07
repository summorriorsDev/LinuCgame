/* 第2章 実戦演習 — 生成問題（出題のたびに数値・文字列が変わる）
   問題と答えの丸暗記ができないようにするためのもの。 */
window.__ch = 2;
(function () {
  function R(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[R(a.length)]; }
  function shuf(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = R(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /* 正解を先頭に、重複しない誤答を最大 n-1 個並べた選択肢を返す（表示順は出題時にシャッフルされる） */
  function mk(q, correct, wrongs, e, n) {
    n = n || 5;
    var o = [String(correct)];
    shuf(wrongs).forEach(function (w) { w = String(w); if (o.length < n && o.indexOf(w) < 0) o.push(w); });
    return { type: 'choice', q: q, o: o, a: 0, e: e };
  }

  /* ---------- 1.02.1 パーミッション ---------- */
  function bits(n) { return [4, 2, 1].map(function (b, i) { return (n & b) ? 'rwx'[i] : '-'; }).join(''); }
  function sym(o) { return bits((o >> 6) & 7) + bits((o >> 3) & 7) + bits(o & 7); }
  function oct(o) { return ('000' + o.toString(8)).slice(-3); }
  function randMode() { var d = [0, 1, 2, 4, 5, 6, 7]; return (pick(d) << 6) | (pick(d) << 3) | pick(d); }
  function nearModes(o, n) {
    var out = [];
    for (var k = 0; k < 40 && out.length < n; k++) {
      var sh = pick([6, 3, 0]), dg = pick([0, 1, 2, 4, 5, 6, 7]);
      var v = (o & ~(7 << sh)) | (dg << sh);
      if (v !== o && out.indexOf(v) < 0) out.push(v);
    }
    return out;
  }

  qg('1.02.1', 'sym2oct', function () {
    var o = randMode(), s = sym(o);
    var d = [(o >> 6) & 7, (o >> 3) & 7, o & 7];
    return mk('`ls -l` で、パーミッションが `-' + s + '` と表示されるファイルがある。これを数値（8進数）で表したものはどれか。',
      oct(o), nearModes(o, 6).map(oct).concat([oct(((o & 7) << 6) | (((o >> 3) & 7) << 3) | ((o >> 6) & 7))]),
      'r=4、w=2、x=1 として、所有者・グループ・その他の3文字ずつを足す。\n' + s.slice(0, 3) + '→' + d[0] + '、' + s.slice(3, 6) + '→' + d[1] + '、' + s.slice(6) + '→' + d[2] + '\nよって `' + oct(o) + '`。');
  });

  qg('1.02.1', 'oct2sym', function () {
    var o = randMode(), s = sym(o);
    var rev = sym(((o & 7) << 6) | (((o >> 3) & 7) << 3) | ((o >> 6) & 7));
    return mk('`chmod ' + oct(o) + ' file` を実行した直後の `ls -l` で、パーミッション部分（先頭の種別文字を除く9文字）として表示されるものはどれか。',
      s, nearModes(o, 6).map(sym).concat([rev]),
      '数値の各桁を、所有者・グループ・その他の順に r=4・w=2・x=1 で読み替える。\n`' + oct(o) + '` → `' + s.slice(0, 3) + ' ' + s.slice(3, 6) + ' ' + s.slice(6) + '`。');
  });

  qg('1.02.1', 'umask', function () {
    var um = pick([2, 18, 23, 63, 7, 31, 22, 10]); // 002,022,027,077,007,037,026,012
    var file = R(2) === 0;
    var base = file ? 438 : 511; // 0666 / 0777
    var res = base & ~um & 511;
    var other = (file ? 511 : 438) & ~um & 511;
    return mk('`umask` の値が `' + oct(um) + '` のユーザが、新しく**' + (file ? 'ファイル' : 'ディレクトリ') + '**を作成した。作成直後のパーミッションを数値で表したものはどれか。',
      oct(res), [oct(other), oct(um), oct(511 - um), oct(438 - um > 0 ? 438 - um : 0), oct(base)],
      '新規作成時の初期値は、ファイルが `666`、ディレクトリが `777`。このうち umask で指定されたビットを**取り除く**。\n' +
      (file ? 'ファイル: 666' : 'ディレクトリ: 777') + ' − umask `' + oct(um) + '` → `' + oct(res) + '`。');
  });

  function applyChmod(mode, expr) {
    expr.split(',').forEach(function (c) {
      var m = /^([ugoa]*)([+\-=])([rwx]*)$/.exec(c);
      var who = m[1] || 'a'; if (who.indexOf('a') >= 0) who = 'ugo';
      var p = 0; m[3].split('').forEach(function (ch) { p |= { r: 4, w: 2, x: 1 }[ch]; });
      who.split('').forEach(function (w) {
        var sh = { u: 6, g: 3, o: 0 }[w];
        if (m[2] === '+') mode |= p << sh;
        else if (m[2] === '-') mode &= ~(p << sh);
        else mode = (mode & ~(7 << sh)) | (p << sh);
      });
    });
    return mode & 511;
  }
  qg('1.02.1', 'chmod-sym', function () {
    var start = pick([420, 416, 384, 493, 488, 448, 436, 292, 511, 432]); // 644,640,600,755,750,700,664,444,777,660
    var exprs = ['u+x', 'g+w', 'o-r', 'a-w', 'go=r', 'g=', 'u=rwx,g=rx,o=', 'g-r,o-r', 'a+x', 'o+w', 'u-w', 'go-rwx', 'u+x,g+x'];
    var ex = pick(exprs), res = applyChmod(start, ex);
    var alts = exprs.filter(function (x) { return x !== ex; }).map(function (x) { return oct(applyChmod(start, x)); });
    return mk('パーミッションが `' + oct(start) + '`（`' + sym(start) + '`）のファイルに対して、`chmod ' + ex + ' file` を実行した。実行後のパーミッションを数値で表したものはどれか。',
      oct(res), alts.concat([oct(start)]),
      '`' + ex + '` の意味：u=所有者、g=グループ、o=その他、a=全員。`+` は追加、`-` は削除、`=` はその区分の権限をそのとおりに**置き換える**（記載のない権限は外れる）。\n`' + sym(start) + '` → `' + sym(res) + '`（`' + oct(res) + '`）。');
  });

  var LAB = { 0: '何もできない', 4: '読み取りのみ可能', 2: '書き込みのみ可能', 1: '実行のみ可能', 6: '読み取りと書き込みが可能', 5: '読み取りと実行が可能', 3: '書き込みと実行が可能', 7: '読み取り・書き込み・実行のすべてが可能' };
  qg('1.02.1', 'access', function () {
    var owner = pick(['alice', 'bob', 'carol']), grp = pick(['dev', 'staff', 'ops']);
    var users = ['alice', 'bob', 'carol', 'dave'];
    var user = pick(users);
    var inGrp = (user === owner) ? R(2) === 0 : R(2) === 0; // 所有者でない場合にグループへ所属するか
    var o, cls;
    do { o = randMode(); } while (((o >> 6) & 7) === ((o >> 3) & 7) && ((o >> 3) & 7) === (o & 7));
    var bitsOf;
    if (user === owner) { bitsOf = (o >> 6) & 7; cls = '所有者'; }
    else if (inGrp) { bitsOf = (o >> 3) & 7; cls = '所有グループ'; }
    else { bitsOf = o & 7; cls = 'その他'; }
    var groups = inGrp ? grp : pick(['users', 'wheel', 'audio'].filter(function (g) { return g !== grp; }));
    var fname = pick(['report.txt', 'run.sh', 'notes.md']);
    var correct = LAB[bitsOf];
    var wrongs = Object.keys(LAB).map(function (k) { return LAB[k]; });
    return mk('ファイルの情報が次のとおりである。\n```\n-' + sym(o) + ' 1 ' + owner + ' ' + grp + ' 1024 Oct  6 10:00 ' + fname + '\n```\nユーザ `' + user + '`（所属グループ: `' + groups + '`）が、このファイルに対して行える操作はどれか。（root 権限は考えない）',
      correct, wrongs,
      'Linux は、**実行したユーザがどの区分に当てはまるかを先に決め、その区分の権限だけを見る**。\n所有者なら所有者の権限、所有者でなく所有グループに所属するならグループの権限、どちらでもなければその他の権限。\nこの場合は「' + cls + '」の権限 `' + bits(bitsOf) + '` → ' + correct + '。');
  });

  /* ---------- 1.02.4 find の -mtime ---------- */
  qg('1.02.4', 'mtime', function () {
    var names = shuf(['a.log', 'b.log', 'c.log', 'd.log', 'e.log']).slice(0, 4);
    var ages = []; while (ages.length < 4) { var v = R(11); if (ages.indexOf(v) < 0) ages.push(v); }
    var n = 1 + R(7), kind = pick(['+', '', '-']);
    var cnt = ages.filter(function (a) { return kind === '+' ? a > n : kind === '-' ? a < n : a === n; }).length;
    var tbl = names.map(function (nm, i) { return nm + ' … ' + ages[i] + '日前'; }).join('\n');
    var rule = kind === '+' ? 'n日**より前**（n+1日以上前）' : kind === '-' ? 'n日**以内**（n日未満、つまり0〜n-1日前）' : 'ちょうどn日前';
    return mk('次の4つのファイルがある。数値は、最終更新から経過した日数（24時間単位で切り捨て）である。\n```\n' + tbl + '\n```\n`find . -name "*.log" -mtime ' + kind + n + '` が表示するファイルの数はいくつか。',
      cnt + '個', [0, 1, 2, 3, 4].map(function (x) { return x + '個'; }),
      '`-mtime ' + kind + 'n` の `n` を ' + n + ' として、`' + (kind || '（符号なし）') + '` は「' + rule + '」。\n該当するのは ' + cnt + '個。');
  });

  /* ---------- 1.03.2 フィルタ ---------- */
  qg('1.03.2', 'seq-head-tail', function () {
    var N = 8 + R(13), A = 4 + R(N - 5), B = 2 + R(Math.min(3, A - 2));
    function rng(a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r.join(', '); }
    var correct = rng(A - B + 1, A);
    return mk('次のコマンドを実行したときの出力として、正しいものはどれか。（`seq 1 ' + N + '` は 1 から ' + N + ' までを1行ずつ出力する。出力は1行ずつ表示されるが、ここでは「,」区切りで示す）\n```\nseq 1 ' + N + ' | head -n ' + A + ' | tail -n ' + B + '\n```',
      correct, [rng(N - B + 1, N), rng(1, B), rng(A - B, A - 1), rng(A, A + B - 1), rng(A - B + 2, A + 1)],
      '処理を順に追う。\n1. `seq 1 ' + N + '` → 1〜' + N + '\n2. `head -n ' + A + '` → 先頭 ' + A + ' 行（1〜' + A + '）\n3. `tail -n ' + B + '` → その最後の ' + B + ' 行 → ' + correct);
  });

  qg('1.03.2', 'tr', function () {
    var words = ['linux server', 'open source', 'hello world  bash', 'file system'];
    var w = pick(words), op = pick(['upper', 'del', 'squeeze', 'map']);
    if (op === 'squeeze') w = pick(['hello  world   bash', 'a  b   c', 'one   two  three']);
    if (op === 'map') w = pick(['abc cab', 'a big cat', 'black cab']);
    var cmd, res;
    if (op === 'upper') { cmd = "tr a-z A-Z"; res = w.toUpperCase(); }
    else if (op === 'del') { cmd = "tr -d 'aeiou'"; res = w.replace(/[aeiou]/g, ''); }
    else if (op === 'squeeze') { cmd = "tr -s ' '"; res = w.replace(/ +/g, ' '); }
    else { cmd = "tr 'abc' 'xyz'"; res = w.replace(/a/g, 'x').replace(/b/g, 'y').replace(/c/g, 'z'); }
    var alts = [w.toUpperCase(), w.replace(/[aeiou]/g, ''), w.replace(/ +/g, ' '), w.replace(/a/g, 'x').replace(/b/g, 'y').replace(/c/g, 'z'), w.replace(/[aeiou]/g, '*'), w.split('').reverse().join('')];
    return mk('次のコマンドの出力として、正しいものはどれか。\n```\necho "' + w + '" | ' + cmd + '\n```',
      res, alts,
      '`tr` は標準入力の文字を変換・削除する。`tr a-z A-Z`=大文字化、`tr -d 文字`=削除、`tr -s 文字`=連続した同じ文字を1つに圧縮、`tr 変換前 変換後`=1文字ずつ対応させて置換。');
  });

  qg('1.03.2', 'cut', function () {
    var line = 'root:x:0:0:root:/root:/bin/bash';
    var f = line.split(':');
    var specs = [['-f1', [0]], ['-f3', [2]], ['-f1,7', [0, 6]], ['-f2-4', [1, 2, 3]], ['-f6,7', [5, 6]], ['-f5-', [4, 5, 6]], ['-f1-3', [0, 1, 2]]];
    var sp = pick(specs);
    var join = function (idx) { return idx.map(function (i) { return f[i]; }).join(':'); };
    var correct = join(sp[1]);
    var alts = specs.map(function (s) { return join(s[1]); }).concat([join(sp[1].map(function (i) { return Math.max(i - 1, 0); })), join(sp[1].map(function (i) { return Math.min(i + 1, 6); }))]);
    return mk('次のコマンドの出力として、正しいものはどれか。\n```\necho "' + line + '" | cut -d: ' + sp[0] + '\n```',
      correct, alts,
      '`-d:` は区切り文字を `:` に指定。フィールド番号は**1から**数える（`/etc/passwd` なら 1=ユーザ名、2=パスワード、3=UID、4=GID、5=コメント、6=ホーム、7=シェル）。`-f2-4` は2〜4番目、`-f5-` は5番目から最後まで。');
  });

  /* ---------- 1.03.4 sed / grep ---------- */
  qg('1.03.4', 'sed-sub', function () {
    var words = ['banana', 'mississippi', 'committee', 'balloon', 'assess', 'bookkeeper'];
    var w = pick(words);
    var chars = []; w.split('').forEach(function (c) { if (w.split(c).length > 2 && chars.indexOf(c) < 0) chars.push(c); });
    var c = pick(chars), r = pick(['X', '0', '#']);
    var flag = pick(['', 'g', '2']);
    function sub(fl) {
      if (fl === 'g') return w.split(c).join(r);
      var n = fl === '2' ? 2 : 1, idx = -1, k = 0;
      for (var i = 0; i < w.length; i++) if (w[i] === c && ++k === n) { idx = i; break; }
      return idx < 0 ? w : w.slice(0, idx) + r + w.slice(idx + 1);
    }
    var correct = sub(flag);
    var last = w.lastIndexOf(c);
    return mk('次のコマンドの出力として、正しいものはどれか。\n```\necho "' + w + '" | sed \'s/' + c + '/' + r + '/' + flag + '\'\n```',
      correct, [sub(''), sub('g'), sub('2'), w.slice(0, last) + r + w.slice(last + 1), w],
      '`s/検索/置換/` は、フラグなしだと**各行の最初の一致だけ**を置換する。`g` は行内のすべて、数字 `N` は N 番目の一致だけを置換する。');
  });

  var CONF = ['# Port number', 'Port 22', 'PermitRootLogin no', '', '#PasswordAuthentication yes', 'PasswordAuthentication no', 'X11Forwarding yes', '# Logging', 'LogLevel INFO', '', 'AllowUsers alice bob', 'UsePAM yes', '#Banner none'];
  qg('1.03.4', 'grep-count', function () {
    var lines = shuf(CONF).slice(0, 9);
    var cases = [
      ['grep -v \'^#\' conf', function (l) { return !/^#/.test(l); }, '`^#` は「行頭が #」。`-v` で**それ以外の行**（空行を含む）が出力される。'],
      ['grep -v \'^$\' conf', function (l) { return l !== ''; }, '`^$` は「行頭の直後が行末」＝空行。`-v` で空行**以外**が出力される（コメント行は残る）。'],
      ['grep -vE \'^(#|$)\' conf', function (l) { return !/^(#|$)/.test(l); }, '`-E` で拡張正規表現。`^(#|$)` は「# で始まる行、または空行」。`-v` でそれらを除く（設定の実行行だけが残る）。'],
      ['grep -c \'^#\' conf', function (l) { return /^#/.test(l); }, '`-c` は一致した行の**数**を出力する。`^#` は行頭が # の行。'],
      ['grep -ci \'permit\' conf', function (l) { return /permit/i.test(l); }, '`-i` は大文字小文字を区別しない。`-c` と組み合わせると、一致した行数を出力する。'],
      ['grep -c \'no\' conf', function (l) { return /no/.test(l); }, '`no` を**含む**行（行の途中でも一致）を数える。`none` のように語の一部でも一致する。']
    ];
    var cs = pick(cases), cnt = lines.filter(cs[1]).length;
    var show = lines.map(function (l) { return l === '' ? '' : l; }).join('\n');
    var isCount = /-c/.test(cs[0]);
    var opts = []; for (var d = -2; d <= 3; d++) if (cnt + d >= 0) opts.push((cnt + d) + (isCount ? '' : '行'));
    var corr = cnt + (isCount ? '' : '行');
    return mk('ファイル `conf` の内容が次のとおりである。（空の行は空行である）\n```\n' + show + '\n```\n`' + cs[0] + '` を実行したときの出力は、' + (isCount ? '何と表示されるか。' : '何行になるか。'),
      corr, opts, cs[2] + '\n該当は ' + cnt + (isCount ? '' : '行') + '。');
  });

  /* ---------- 1.03.3 リダイレクト ---------- */
  qg('1.03.3', 'redirect-seq', function () {
    var letters = shuf(['A', 'B', 'C', 'D', 'E']).slice(0, 4);
    var ops = letters.map(function (l, i) { return { l: l, app: i === 0 ? false : R(3) > 0 }; });
    if (!ops.some(function (o, i) { return i > 0 && !o.app; })) ops[1 + R(3)].app = false;
    var content = [];
    ops.forEach(function (o) { if (o.app) content.push(o.l); else content = [o.l]; });
    var all = letters.slice(), last = [letters[3]];
    var cmds = ops.map(function (o) { return 'echo ' + o.l + ' ' + (o.app ? '>>' : '>') + ' f'; }).join('\n');
    var fmtc = function (a) { return a.join('、'); };
    return mk('カレントディレクトリに `f` というファイルは存在しない。次のコマンドを順に実行したあと、`cat f` で表示される内容（1行1文字）はどれか。（「、」区切りで示す）\n```\n' + cmds + '\n```',
      fmtc(content), [fmtc(all), fmtc(last), fmtc(letters.slice(0, 2)), fmtc(letters.slice().reverse()), fmtc(letters.slice(1))].concat([fmtc(content.slice().reverse())]),
      '`>` は**上書き**（それまでの内容は消える）、`>>` は**追記**。順に追うと、最後の `>` 以降に追記された分だけが残る。\n結果：' + fmtc(content));
  });

  /* ---------- 1.01.4 シグナル / nice ---------- */
  qg('1.01.4', 'signal', function () {
    var S = { 1: 'SIGHUP', 2: 'SIGINT', 3: 'SIGQUIT', 9: 'SIGKILL', 15: 'SIGTERM', 18: 'SIGCONT', 19: 'SIGSTOP' };
    var keys = Object.keys(S), k = pick(keys);
    var mean = { 1: '端末の切断／設定の再読み込み', 2: 'キーボードからの割り込み（Ctrl+C）', 3: 'キーボードからの終了（Ctrl+\\）、コアダンプ', 9: '強制終了（捕捉・無視できない）', 15: '終了要求（既定のシグナル）', 18: '停止中のプロセスを再開', 19: '強制停止（捕捉・無視できない）' };
    if (R(2) === 0) {
      return mk('`kill -' + k + ' 1234` で送られるシグナルはどれか。', S[k], keys.map(function (x) { return S[x]; }).concat(['SIGTSTP']),
        'シグナル番号：' + keys.map(function (x) { return x + '=' + S[x].slice(3); }).join('、') + '。\n' + S[k] + ' は ' + mean[k] + '。');
    }
    return mk('シグナル `' + S[k] + '` の番号はどれか。', k, keys.filter(function (x) { return x !== k; }).concat(['0', '11', '20']),
      'シグナル番号：' + keys.map(function (x) { return x + '=' + S[x].slice(3); }).join('、') + '。');
  });

  qg('1.01.4', 'nice', function () {
    if (R(2) === 0) {
      var vals = []; while (vals.length < 4) { var v = R(40) - 20; if (vals.indexOf(v) < 0) vals.push(v); }
      var pids = [3011, 3012, 3013, 3014];
      var tbl = 'PID   NI  COMMAND\n' + vals.map(function (v, i) { return pids[i] + '  ' + (v < 0 ? v : ' ' + v) + '  job' + (i + 1); }).join('\n');
      var best = vals.indexOf(Math.min.apply(null, vals));
      return mk('`ps -o pid,ni,comm` の結果が次のとおりである。CPU を最も優先的に割り当てられるプロセスはどれか。\n```\n' + tbl + '\n```',
        'PID ' + pids[best], pids.map(function (p) { return 'PID ' + p; }),
        'nice値は**小さいほど優先度が高い**（-20 が最優先、19 が最低）。最も小さい NI は ' + vals[best] + '（PID ' + pids[best] + '）。');
    }
    var cases = [
      ['nice command', '10', '`-n` を省略した nice の既定の増分は `10`。'],
      ['nice -n 5 command', '5', '`-n 5` は現在の値に5を加える。'],
      ['nice -n 15 command', '15', '`-n 15` は現在の値に15を加える。'],
      ['nice -n -5 command（root が実行）', '-5', '負の値は優先度を上げる指定で、root のみ可能。']
    ];
    var c = pick(cases);
    return mk('nice値が `0` のシェルから、次のコマンドを実行した。起動したプロセスの nice値（NI）はいくつになるか。\n```\n' + c[0] + '\n```',
      c[1], ['0', '5', '10', '15', '-5', '-10', '19'], c[2]);
  });

  /* ---------- 1.02.2 tar ---------- */
  qg('1.02.2', 'tar', function () {
    var ops = [['c', '作成'], ['x', '展開'], ['t', '内容を一覧表示']];
    var comps = [['', 'tar', '圧縮なし'], ['z', 'tar.gz', 'gzip'], ['j', 'tar.bz2', 'bzip2'], ['J', 'tar.xz', 'xz']];
    var op = pick(ops), cp = pick(comps), dir = pick(['work', 'project', 'logs']);
    var file = dir + '.' + cp[1];
    function cmd(o, c) { var f = file; return 'tar ' + o + c + 'f ' + f + (o === 'c' ? ' ' + dir : ''); }
    var correct = cmd(op[0], cp[0]);
    var wrongs = [];
    ops.forEach(function (o) { comps.forEach(function (c) { var s = cmd(o[0], c[0]); if (s !== correct) wrongs.push(s); }); });
    var q = op[0] === 'c' ? '`' + dir + '` ディレクトリを、' + (cp[0] ? cp[2] + ' で圧縮して' : '圧縮せずに') + '`' + file + '` を**作成**するコマンドはどれか。'
      : op[0] === 'x' ? '`' + file + '`（' + (cp[0] ? cp[2] + ' 圧縮' : '圧縮なし') + '）を、カレントディレクトリに**展開**するコマンドはどれか。'
        : '`' + file + '`（' + (cp[0] ? cp[2] + ' 圧縮' : '圧縮なし') + '）の内容を、展開せずに**一覧表示**するコマンドはどれか。';
    return mk(q, correct, wrongs,
      '操作：`c`=作成、`x`=展開、`t`=一覧。圧縮：`z`=gzip（.gz）、`j`=bzip2（.bz2）、`J`=xz（.xz）、なし=無圧縮。`f` の直後にアーカイブ名。');
  });

  /* ---------- 1.02.3 リンクカウント ---------- */
  qg('1.02.3', 'linkcount', function () {
    var names = ['f'], syms = [], steps = ['touch f'], pool = ['g', 'h', 'k'], sp = ['s', 't'];
    for (var i = 0; i < 4; i++) {
      var r = R(10);
      if (r < 4 && pool.length) {
        var src = pick(names), dst = pool.shift(); names.push(dst); steps.push('ln ' + src + ' ' + dst);
      } else if (r < 6 && sp.length) {
        var tg = pick(names), sn = sp.shift(); syms.push(sn); steps.push('ln -s ' + tg + ' ' + sn);
      } else if (names.length > 1) {
        var rm = pick(names); names.splice(names.indexOf(rm), 1); pool.push(rm); steps.push('rm ' + rm);
      } else if (pool.length) {
        var d2 = pool.shift(); names.push(d2); steps.push('ln ' + names[0] + ' ' + d2);
      }
    }
    var keep = names[0];
    var cnt = names.length;
    return mk('空のディレクトリで、次のコマンドを順に実行した。最後に `ls -l ' + keep + '` を実行したとき、`' + keep + '` のリンク数（2列目の数字）はいくつか。\n```\n' + steps.join('\n') + '\n```',
      String(cnt), ['1', '2', '3', '4', '5'],
      '**ハードリンク**を作る（`ln 元 名前`）と、同じ inode の名前が増えてリンク数が増える。**シンボリックリンク**（`ln -s`）はリンク数に影響しない。`rm` で名前を消すとリンク数が減る。\n最終的に同じ実体を指す名前は ' + names.join('、') + '（' + cnt + '個）。');
  });

  /* ---------- 1.03.1 && / || とクォート ---------- */
  qg('1.03.1', 'andor', function () {
    var cmds = [['true', 0, ''], ['false', 1, ''], ['echo A', 0, 'A'], ['echo B', 0, 'B'], ['echo C', 0, 'C']];
    var seq, ops, out, tries = 0;
    do {
      var n = 3 + R(2);
      seq = []; ops = [];
      for (var i = 0; i < n; i++) { seq.push(pick(cmds)); if (i > 0) ops.push(pick(['&&', '||'])); }
      var st = seq[0][1]; out = seq[0][2] ? [seq[0][2]] : [];
      for (var j = 1; j < n; j++) {
        var run = ops[j - 1] === '&&' ? st === 0 : st !== 0;
        if (run) { st = seq[j][1]; if (seq[j][2]) out.push(seq[j][2]); }
      }
      tries++;
    } while (tries < 60 && (out.length === 0 || seq.filter(function (c) { return c[2]; }).length < 2));
    var line = seq[0][0]; for (var k = 1; k < seq.length; k++) line += ' ' + ops[k - 1] + ' ' + seq[k][0];
    var fm = function (a) { return a.length ? a.join('') : '何も出力されない'; };
    var correct = fm(out);
    var alts = ['A', 'B', 'C', 'AB', 'BC', 'AC', 'ABC', 'CB', '何も出力されない'];
    return mk('次のコマンドラインを実行したとき、出力される文字を順に並べたものはどれか。\n```\n' + line + '\n```',
      correct, alts,
      '`&&` は直前が**成功（終了ステータス0）**のとき、`||` は直前が**失敗**のときに次を実行する。左から順に評価していく。`true` は成功、`false` は失敗、`echo` は成功。');
  });

  qg('1.03.1', 'quote', function () {
    var V = 5 + R(5);
    var forms = [['$X', String(V)], ['"$X"', String(V)], ["'$X'", '$X'], ['"\\$X"', '$X'], ['\\$X', '$X'], ['"${X}0"', V + '0'], ["'${X}0'", '${X}0'], ['"$X$X"', V + '' + V]];
    var chosen = shuf(forms).slice(0, 3);
    var line = 'echo ' + chosen.map(function (c) { return c[0]; }).join(' ');
    var correct = chosen.map(function (c) { return c[1]; }).join(' ');
    var wrongs = [];
    for (var i = 0; i < 12; i++) { wrongs.push(shuf(forms).slice(0, 3).map(function (c) { return c[1]; }).join(' ')); }
    wrongs.push(chosen.map(function (c) { return c[0]; }).join(' '));
    return mk('次のコマンドを実行したとき、出力されるものはどれか。\n```\nX=' + V + '\n' + line + '\n```',
      correct, wrongs,
      '**ダブルクォート**の中では変数が展開される。**シングルクォート**の中、または `\\$` でエスケープした `$` は展開されず、文字そのまま。`${X}0` は変数 `X` の直後に `0` を付けた文字列。');
  });

  /* ---------- 1.05.2 パーティション番号 / LVM ---------- */
  qg('1.05.2', 'mbr-logical', function () {
    var d = pick(['sda', 'sdb', 'sdc']), p = 1 + R(3), l = 1 + R(4);
    var correct = '/dev/' + d + (4 + l);
    var wrongs = ['/dev/' + d + (p + 1 + l), '/dev/' + d + (p + l), '/dev/' + d + (l), '/dev/' + d + (4 + l + 1), '/dev/' + d + (4 + l - 1), '/dev/' + d + (p + 2 + l)];
    return mk('MBR 形式の `/dev/' + d + '` に、基本パーティションを ' + p + ' つ、拡張パーティションを 1 つ作成し、さらに拡張パーティション内に論理パーティションを ' + l + ' つ作成した。最後に作成した（' + l + '番目の）論理パーティションのデバイス名はどれか。',
      correct, wrongs,
      'MBR では、基本パーティション（拡張パーティションを含む）のデバイス番号に 1〜4 を割り当てる。**論理パーティションは、基本パーティションの数に関係なく、番号 5 から**始まる。\n' + l + '番目の論理パーティション → ' + correct + '。');
  });

  qg('1.05.2', 'lvm-free', function () {
    var pv = []; var cnt = 2 + R(2); for (var i = 0; i < cnt; i++) pv.push(pick([5, 10, 20, 30]));
    var total = pv.reduce(function (a, b) { return a + b; }, 0);
    var a = 2 * (1 + R(3)), b = 2 * (1 + R(3));
    while (a + b >= total) { a = Math.max(2, a - 2); b = Math.max(2, b - 2); if (a + b >= total) { a = 2; b = 2; break; } }
    var free = total - a - b;
    var cmds = 'pvcreate ' + pv.map(function (s, i) { return '/dev/sdb' + (i + 1); }).join(' ') + '\nvgcreate vg0 ' + pv.map(function (s, i) { return '/dev/sdb' + (i + 1); }).join(' ') + '\nlvcreate -L ' + a + 'G -n data vg0\nlvcreate -L ' + b + 'G -n log vg0';
    var opts = [free + 'GB', total + 'GB', (total - a) + 'GB', (total - b) + 'GB', (free + 2) + 'GB', Math.max(free - 2, 0) + 'GB'];
    return mk('次のとおり LVM を構成した。' + pv.map(function (s, i) { return '`/dev/sdb' + (i + 1) + '` は ' + s + 'GB'; }).join('、') + '。ボリュームグループ `vg0` の未割り当ての空き容量はいくつか。（メタデータなどによる誤差は考えない）\n```\n' + cmds + '\n```',
      free + 'GB', opts,
      '`vgcreate` で PV を束ねると、VG の容量は PV の合計（' + pv.join(' + ') + ' = ' + total + 'GB）。そこから `lvcreate` で切り出した ' + a + 'GB と ' + b + 'GB を引いた ' + free + 'GB が、VG の空き。');
  });

  /* ---------- 1.05.3 fstab ---------- */
  qg('1.05.3', 'fstab', function () {
    var uuid = pick(['3f2a9c1e-7b4d', '9d8e1c6a-52f0', 'b7c04e3d-91aa']);
    var mp = pick(['/data', '/home', '/var', '/backup']), fs = pick(['ext4', 'xfs']);
    var opt = pick(['defaults', 'defaults,noatime', 'defaults,ro', 'defaults,nofail']);
    var dump = 0, pass = pick([0, 1, 2]);
    var line = 'UUID=' + uuid + '-0000  ' + mp + '  ' + fs + '  ' + opt + '  ' + dump + '  ' + pass;
    var F = ['マウントするデバイス（UUID やデバイス名、ラベルで指定）', 'マウントポイント（マウント先のディレクトリ）', 'ファイルシステムの種類', 'マウントオプション', 'dump によるバックアップの要否（0 は不要）', '起動時の fsck の実行順序（0 は検査しない）'];
    var n = R(6);
    var line2 = '```\n' + line + '\n```';
    return mk('`/etc/fstab` の次の行について、**' + (n + 1) + '番目のフィールド**（左から数える）が表すものはどれか。\n' + line2,
      F[n], F,
      '`fstab` の6つのフィールドは左から ①デバイス ②マウントポイント ③ファイルシステム種別 ④マウントオプション ⑤dump ⑥fsck の順序。' + (n === 5 ? '\nルートFSは `1`、それ以外は `2`、検査しないなら `0`。' : ''));
  });
})();
