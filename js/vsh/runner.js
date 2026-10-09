/* vsh — ミッションの実行・判定（UI からもテストからも使う） */
(function (G) {
  'use strict';
  var VSH = G.VSH;
  var HOME = '/home/tux';
  VSH.CMDS.help = function (c) {
    c.out('道場で使えるコマンド（実際のLinuxと同じ書き方で動きます）\n' +
      '  ファイル  : ls cd pwd cat touch mkdir rmdir cp mv rm ln chmod chown chgrp umask stat file find tar gzip gunzip bzip2 xz\n' +
      '  テキスト  : head tail wc sort uniq cut tr paste tac rev nl seq grep egrep sed tee xargs echo printf\n' +
      '  シェル    : alias type which export env set unset source bash sudo history\n' +
      '  記号      : > >> < 2> 2>&1 | && || ; $(..) $VAR {a,b} {1..3} * ? \'..\' ".."\n' +
      '  操作      : ↑↓ で履歴、Tab で補完、clear で画面消去、!! で直前のコマンド\n' +
      '  ※ systemctl や apt など、実機が必要なコマンドは動きません。\n');
  };
  VSH.buildMission = function (m) {
    var fs = VSH.defaultFS(m.files || {});
    var sh = new VSH.Shell({ fs: fs, cwd: m.cwd || HOME });
    (m.prep || []).forEach(function (cmd) { sh.execLine(cmd); });
    sh.history = []; sh.status = 0;
    return { sh: sh, log: [], m: m };
  };
  VSH.freeShell = function () {
    var fs = VSH.defaultFS({
      '/home/tux/memo.txt': '1行目\n2行目\n3行目\n', '/home/tux/names.txt': 'bob\nalice\nbob\ncarol\n',
      '/home/tux/docs/readme.txt': 'hello\n', '/home/tux/docs/notes/todo.txt': 'LinuC 101\n', '/home/tux/.hidden': 'secret\n'
    });
    return { sh: new VSH.Shell({ fs: fs, cwd: HOME }), log: [], m: null };
  };
  /* 1行実行してログに残す。{ chunks, echo, entry } */
  VSH.runLine = function (st, line) {
    var r = st.sh.run(line);
    var out = '', err = '';
    r.chunks.forEach(function (c) { if (c.fd === 1) out += c.s; else err += c.s; });
    var entry = { cmd: r.echo || line, raw: line, out: out, err: err, status: r.status };
    if (line.trim() !== '') st.log.push(entry);
    return { chunks: r.chunks, echo: r.echo, entry: entry };
  };
  function rel(p) { return p.charAt(0) === '/' ? p : HOME + '/' + p; }
  VSH.mkChecker = function (st) {
    var sh = st.sh, fs = sh.fs, R = VSH.ROOT;
    function look(p, follow) { return fs.lookup(rel(p), fs.root, follow !== false, R); }
    var t = {
      sh: sh, log: st.log,
      out: function () { return st.log.map(function (e) { return e.out; }).filter(function (o) { return o !== ''; }); },
      last: function () { return st.log[st.log.length - 1]; },
      node: function (p) { var r = look(p, true); return r.node || null; },
      lnode: function (p) { var r = look(p, false); return r.node || null; },
      exists: function (p) { var r = look(p, false); return !!r.node; },
      isDir: function (p) { var n = t.node(p); return !!n && n.type === 'd'; },
      read: function (p) { var n = t.node(p); return n && n.type === 'f' ? n.data : null; },
      mode: function (p) { var n = t.node(p); return n ? (n.mode & 0xfff).toString(8) : null; },
      gid: function (p) { var n = t.node(p); return n ? n.gid : null; },
      uid: function (p) { var n = t.node(p); return n ? n.uid : null; },
      mtime: function (p) { var n = t.node(p); return n ? n.mtime : null; },
      list: function (p) { var n = t.node(p); return n && n.type === 'd' ? Object.keys(n.children) : []; },
      silent: function (cmd) {
        var s2 = new VSH.Shell({ fs: fs.clone(), cwd: sh.cwd, uid: sh.uid, gid: sh.gid, gids: sh.gids });
        var r = s2.execLine(cmd);
        return r.chunks.filter(function (c) { return c.fd === 1; }).map(function (c) { return c.s; }).join('');
      }
    };
    return t;
  };
  /* ミッションの判定。{ ok, solved, mustOk } */
  VSH.checkMission = function (st) {
    var m = st.m; if (!m) return { ok: false, solved: false, mustOk: true };
    var t = VSH.mkChecker(st), solved = false;
    try { solved = !!m.check(t); } catch (e) { solved = false; }
    var hist = st.log.map(function (e) { return e.raw + '\n' + e.cmd; }).join('\n');     // 入力したとおりの行と、履歴展開後の行の両方
    var mustOk = (m.must || []).every(function (re) { return re.test(hist); });
    return { ok: solved && mustOk, solved: solved, mustOk: mustOk };
  };
})(typeof window !== 'undefined' ? window : globalThis);
