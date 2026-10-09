/* vsh — ブラウザ内で動く簡易シェル（学習用）。ターミナル道場の中核。
   仮想ファイルシステム（権限・リンク・inode・所有者）、bash 風の構文解析（クォート・変数・ブレース展開・
   グロブ・リダイレクト・パイプ・&&/||/;）、コマンド実行の土台を持つ。個々のコマンドは cmds*.js で登録する。 */
(function (G) {
  'use strict';
  var VSH = G.VSH = G.VSH || {};
  var CMDS = VSH.CMDS = {};
  var BASE = Date.UTC(2026, 9, 9, 10, 0, 0);      // 道場の「現在時刻」（固定）: 2026-10-09 10:00 UTC
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var USERS = { 0: 'root', 1000: 'tux', 1001: 'alice', 1002: 'bob' };
  var GROUPS = { 0: 'root', 100: 'users', 1000: 'tux', 1001: 'alice', 1002: 'bob', 2000: 'dev' };
  VSH.USERS = USERS; VSH.GROUPS = GROUPS; VSH.BASE = BASE; VSH.MON = MON;

  function idOf(table, s) {
    if (/^\d+$/.test(s)) return +s;
    for (var k in table) if (table[k] === s) return +k;
    return null;
  }
  VSH.uidOf = function (s) { return idOf(USERS, s); };
  VSH.gidOf = function (s) { return idOf(GROUPS, s); };
  var ERR = {
    ENOENT: 'No such file or directory', EACCES: 'Permission denied', ENOTDIR: 'Not a directory',
    EISDIR: 'Is a directory', EEXIST: 'File exists', ENOTEMPTY: 'Directory not empty', ELOOP: 'Too many levels of symbolic links',
    EPERM: 'Operation not permitted', EINVAL: 'Invalid argument'
  };
  VSH.ERR = ERR;
  function cmpStr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  VSH.cmpStr = cmpStr;

  /* ================= 仮想ファイルシステム ================= */
  function VFS() {
    this.ino = 100; this.clock = BASE;
    this.root = this.node('d', 0x1ed, 0, 0); this.root.parent = this.root;       // 0755
  }
  VFS.prototype.node = function (type, mode, uid, gid) {
    return { ino: this.ino++, type: type, mode: mode, uid: uid, gid: gid, mtime: this.clock, nlink: 1,
      children: type === 'd' ? {} : null, data: '', target: '', parent: null };
  };
  VFS.prototype.tick = function () { this.clock += 60000; return this.clock; };
  function can(n, cred, bit) {
    if (cred.uid === 0) return bit !== 1 || n.type === 'd' || (n.mode & 73) !== 0;
    var sh = n.uid === cred.uid ? 6 : (cred.gids.indexOf(n.gid) >= 0 ? 3 : 0);
    return ((n.mode >> sh) & bit) !== 0;
  }
  VFS.prototype.can = can;
  function comps(p) { return p.split('/').filter(function (x) { return x !== ''; }); }
  VFS.prototype.walk = function (start, cs, follow, cred, depth) {
    depth = depth || 0; var cur = start;
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i], last = i === cs.length - 1;
      if (cur.type !== 'd') return { err: 'ENOTDIR' };
      if (!can(cur, cred, 1)) return { err: 'EACCES' };
      if (c === '.') { if (last) return { node: cur, parent: cur.parent, name: '.' }; continue; }
      if (c === '..') { cur = cur.parent; if (last) return { node: cur, parent: cur.parent, name: '..' }; continue; }
      var ch = cur.children[c];
      if (!ch) return last ? { node: null, parent: cur, name: c } : { err: 'ENOENT' };
      if (ch.type === 'l' && (follow || !last)) {
        if (depth > 20) return { err: 'ELOOP' };
        var r = this.walk(ch.target.charAt(0) === '/' ? this.root : cur, comps(ch.target), true, cred, depth + 1);
        if (r.err) return r;
        if (!r.node) return last ? { node: null, parent: cur, name: c, dangling: true } : { err: 'ENOENT' };
        if (last) return { node: r.node, parent: cur, name: c };
        cur = r.node; continue;
      }
      if (last) return { node: ch, parent: cur, name: c };
      cur = ch;
    }
    return { node: cur, parent: cur.parent, name: '' };
  };
  /* path を解決する。cwd は cwd ノード。follow=最後のシンボリックリンクを辿るか */
  VFS.prototype.lookup = function (path, cwd, follow, cred) {
    var abs = path.charAt(0) === '/';
    if (path === '') return { err: 'ENOENT' };
    var cs = comps(path);
    if (!cs.length) return { node: abs ? this.root : cwd, parent: (abs ? this.root : cwd).parent, name: '' };
    return this.walk(abs ? this.root : cwd, cs, follow, cred);
  };
  /* セットアップ用（権限チェックなし） */
  var ROOT = { uid: 0, gid: 0, gids: [0] };
  VFS.prototype.mkdirp = function (path, mode, uid, gid) {
    var cur = this.root, cs = comps(path);
    for (var i = 0; i < cs.length; i++) {
      var ch = cur.children[cs[i]];
      var lastC = i === cs.length - 1;     // 途中のディレクトリは親の所有者を引き継ぐ。指定した所有者は最後の1つだけに付ける
      if (!ch) { ch = this.node('d', mode === undefined || !lastC ? 0x1ed : mode, uid === undefined || !lastC ? cur.uid : uid, gid === undefined || !lastC ? cur.gid : gid); ch.parent = cur; cur.children[cs[i]] = ch; }
      cur = ch;
    }
    return cur;
  };
  VFS.prototype.put = function (path, data, o) {
    o = o || {};
    var cs = comps(path), name = cs.pop();
    var dir = this.mkdirp('/' + cs.join('/'), 0x1ed, o.dirUid, o.dirGid);
    var n = this.node('f', o.mode === undefined ? 0x1a4 : o.mode, o.uid === undefined ? dir.uid : o.uid, o.gid === undefined ? dir.gid : o.gid);   // 0644
    n.data = data; n.parent = dir;
    if (o.days !== undefined) n.mtime = BASE - o.days * 86400000;
    if (o.mtime !== undefined) n.mtime = o.mtime;
    dir.children[name] = n; return n;
  };
  VFS.prototype.symlink = function (path, target, o) {
    o = o || {};
    var cs = comps(path), name = cs.pop(), dir = this.mkdirp('/' + cs.join('/'), 0x1ed);
    var n = this.node('l', 0x1ff, o.uid === undefined ? dir.uid : o.uid, o.gid === undefined ? dir.gid : o.gid); n.target = target; n.parent = dir; dir.children[name] = n; return n;
  };
  /* 仕様オブジェクトから作る: { '/a/b.txt': '内容', '/a/dir/': null, '/x': {c:'..', m:0o600, u:1000, g:1000, d:3} } */
  VFS.prototype.load = function (spec) {
    var self = this;
    Object.keys(spec).forEach(function (p) {
      var v = spec[p];
      if (p.charAt(p.length - 1) === '/') {
        var o = (v && typeof v === 'object') ? v : {};
        var d = self.mkdirp(p, o.m === undefined ? 0x1ed : o.m, o.u, o.g);
        d.mode = o.m === undefined ? d.mode : o.m; d.uid = o.u === undefined ? d.uid : o.u; d.gid = o.g === undefined ? d.gid : o.g;
        if (o.d !== undefined) d.mtime = BASE - o.d * 86400000;
        return;
      }
      if (v && typeof v === 'object' && v.link !== undefined) { self.symlink(p, v.link, { uid: v.u, gid: v.g }); return; }
      var obj = (v && typeof v === 'object') ? v : { c: v };
      self.put(p, obj.c === undefined ? '' : obj.c, { mode: obj.m, uid: obj.u, gid: obj.g, days: obj.d });
    });
  };
  VFS.prototype.clone = function () {          // 構造のディープコピー（ハードリンクの共有は保持）
    var copy = new VFS(), map = new Map();
    copy.ino = this.ino; copy.clock = this.clock;
    function cp(n, parent) {
      if (n.type !== 'd' && map.has(n)) return map.get(n);
      var c = {}; for (var k in n) c[k] = n[k];
      c.parent = parent; if (n.type !== 'd') map.set(n, c);
      if (n.type === 'd') { c.children = {}; Object.keys(n.children).forEach(function (nm) { c.children[nm] = cp(n.children[nm], c); }); }
      return c;
    }
    copy.root = cp(this.root, null); copy.root.parent = copy.root;
    return copy;
  };
  VSH.VFS = VFS;

  /* 既定のファイルシステム */
  VSH.defaultFS = function (extra) {
    var f = new VFS();
    f.load({
      '/bin/': null, '/boot/': null, '/dev/': null, '/lib/': null, '/mnt/': null, '/opt/': null, '/proc/': null, '/root/': { m: 0x1c0 },
      '/usr/bin/': null, '/usr/local/bin/': null, '/usr/sbin/': null, '/sbin/': null, '/srv/': null, '/var/log/': null, '/var/tmp/': { m: 0x3ff },
      '/etc/passwd': { c: 'root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nsshd:x:110:65534::/run/sshd:/usr/sbin/nologin\ntux:x:1000:1000:Tux:/home/tux:/bin/bash\nalice:x:1001:1001:Alice:/home/alice:/bin/bash\nbob:x:1002:1002:Bob:/home/bob:/bin/bash\n' },
      '/etc/hostname': 'lnx01\n',
      '/etc/hosts': '127.0.0.1\tlocalhost\n127.0.1.1\tlnx01\n',
      '/etc/os-release': 'NAME="Ubuntu"\nVERSION="22.04.3 LTS (Jammy Jellyfish)"\nID=ubuntu\n',
      '/etc/shadow': { c: 'root:!:19000:0:99999:7:::\n', m: 0x180 },
      '/var/log/messages': { c: 'Oct  9 09:58:01 lnx01 systemd[1]: Started Session 3.\nOct  9 09:59:12 lnx01 sshd[812]: Accepted publickey for tux\n' },
      '/tmp/': { m: 0x3ff },
      '/home/tux/': { u: 1000, g: 1000, m: 0x1ed },
      '/home/alice/': { u: 1001, g: 1001, m: 0x1c0 },
      '/home/bob/': { u: 1002, g: 1002, m: 0x1ed }
    });
    ['ls', 'cat', 'cp', 'mv', 'rm', 'echo', 'pwd', 'bash', 'sh', 'sleep', 'mkdir', 'rmdir', 'touch', 'chmod', 'chown', 'grep', 'sed', 'sort', 'head', 'tail', 'wc'].forEach(function (c) { f.put('/usr/bin/' + c, '#!ELF\n', { mode: 0x1ed }); });
    if (extra) f.load(extra);
    return f;
  };

  /* ================= 構文解析 ================= */
  function isDigit(c) { return c >= '0' && c <= '9'; }
  function matchParen(s, i) {            // s[i] === '(' に対応する ')' の位置
    var d = 0, q = null;
    for (; i < s.length; i++) {
      var c = s[i];
      if (q) { if (c === q) q = null; else if (c === '\\' && q === '"') i++; continue; }
      if (c === '\'' || c === '"') q = c;
      else if (c === '\\') i++;
      else if (c === '(') d++;
      else if (c === ')') { d--; if (d === 0) return i; }
    }
    return -1;
  }
  function parseDollar(s, i, q, segs) {  // s[i] === '$'。segs へ追加し、次の位置を返す
    var c = s[i + 1];
    if (c === '(') {
      if (s[i + 2] === '(') {                       // $(( 算術 ))
        var e2 = matchParen(s, i + 1);
        if (e2 > 0 && s[e2 - 1] === ')') { segs.push({ t: 'arith', c: s.slice(i + 3, e2 - 1), q: q }); return e2 + 1; }
      }
      var e = matchParen(s, i + 1);
      if (e < 0) { segs.push({ t: 'lit', s: '$', q: q }); return i + 1; }
      segs.push({ t: 'cmd', c: s.slice(i + 2, e), q: q }); return e + 1;
    }
    if (c === '{') {
      var j = s.indexOf('}', i + 2);
      if (j < 0) { segs.push({ t: 'lit', s: '$', q: q }); return i + 1; }
      var body = s.slice(i + 2, j), m = /^([A-Za-z_][A-Za-z0-9_]*|\?|#|\d)(:?[-=+])?(.*)$/.exec(body);
      if (m) segs.push({ t: 'var', n: m[1], op: m[2] || '', arg: m[3] || '', q: q });
      else segs.push({ t: 'lit', s: '', q: q });
      return j + 1;
    }
    if (c === '?' || c === '$' || c === '#' || c === '0' || isDigit(c || '')) { segs.push({ t: 'var', n: c, q: q }); return i + 2; }
    if (c !== undefined && /[A-Za-z_]/.test(c)) {
      var k = i + 1; while (k < s.length && /[A-Za-z0-9_]/.test(s[k])) k++;
      segs.push({ t: 'var', n: s.slice(i + 1, k), q: q }); return k;
    }
    segs.push({ t: 'lit', s: '$', q: q }); return i + 1;
  }
  function lex(line) {
    var toks = [], i = 0, n = line.length;
    while (i < n) {
      var ch = line[i];
      if (ch === ' ' || ch === '\t') { i++; continue; }
      if (ch === '\n') { toks.push({ op: ';' }); i++; continue; }
      if (ch === '#') break;
      var rest = line.slice(i, i + 4), m;
      if ((m = /^&>>?/.exec(rest))) { toks.push({ redir: m[0], fd: 1, both: true }); i += m[0].length; continue; }
      if ((m = /^(\d*)(>>|>&|>|<)/.exec(rest))) {
        var fd = m[1] === '' ? (m[2] === '<' ? 0 : 1) : +m[1];
        i += m[0].length;
        if (m[2] === '>&') {
          var m2 = /^(\d+|-)/.exec(line.slice(i));
          if (m2) { toks.push({ dup: true, fd: fd, to: m2[1] }); i += m2[1].length; continue; }
          toks.push({ redir: '&>', fd: 1, both: true }); continue;
        }
        toks.push({ redir: m[2], fd: fd }); continue;
      }
      if (ch === '|') { if (line[i + 1] === '|') { toks.push({ op: '||' }); i += 2; } else { toks.push({ op: '|' }); i++; } continue; }
      if (ch === '&') { if (line[i + 1] === '&') { toks.push({ op: '&&' }); i += 2; } else { toks.push({ op: '&' }); i++; } continue; }
      if (ch === ';') { toks.push({ op: ';' }); i++; continue; }
      if (ch === '(' || ch === ')') throw new Error('構文エラー: `' + ch + '` は道場のシェルでは使えません');
      // 単語
      var segs = [], lit = '', hasQ = false;
      var flush = function () { if (lit !== '') { segs.push({ t: 'lit', s: lit, q: false }); lit = ''; } };
      while (i < n) {
        var c = line[i];
        if (c === ' ' || c === '\t' || c === '\n' || c === '|' || c === '&' || c === ';' || c === '<' || c === '>' || c === '(' || c === ')') break;
        if (c === '\\') {
          if (i + 1 < n) { if (line[i + 1] !== '\n') { flush(); segs.push({ t: 'lit', s: line[i + 1], q: true }); hasQ = true; } i += 2; } else i++;
          continue;
        }
        if (c === '\'') {
          var e = line.indexOf('\'', i + 1);
          if (e < 0) throw new Error('構文エラー: クォート \' が閉じていません');
          flush(); segs.push({ t: 'lit', s: line.slice(i + 1, e), q: true }); hasQ = true; i = e + 1; continue;
        }
        if (c === '"') {
          flush(); hasQ = true; i++; var buf = '';
          var flushQ = function () { if (buf !== '') { segs.push({ t: 'lit', s: buf, q: true }); buf = ''; } };
          var closed = false;
          while (i < n) {
            var d = line[i];
            if (d === '"') { closed = true; i++; break; }
            if (d === '\\' && i + 1 < n && '$"\\`\n'.indexOf(line[i + 1]) >= 0) { if (line[i + 1] !== '\n') buf += line[i + 1]; i += 2; continue; }
            if (d === '$') { flushQ(); i = parseDollar(line, i, true, segs); continue; }
            if (d === '`') { var e3 = line.indexOf('`', i + 1); if (e3 < 0) throw new Error('構文エラー: ` が閉じていません'); flushQ(); segs.push({ t: 'cmd', c: line.slice(i + 1, e3), q: true }); i = e3 + 1; continue; }
            buf += d; i++;
          }
          if (!closed) throw new Error('構文エラー: クォート " が閉じていません');
          flushQ(); if (!segs.length || true) segs.push({ t: 'lit', s: '', q: true });
          continue;
        }
        if (c === '$') { flush(); i = parseDollar(line, i, false, segs); continue; }
        if (c === '`') { var e4 = line.indexOf('`', i + 1); if (e4 < 0) throw new Error('構文エラー: ` が閉じていません'); flush(); segs.push({ t: 'cmd', c: line.slice(i + 1, e4), q: false }); i = e4 + 1; continue; }
        lit += c; i++;
      }
      flush();
      toks.push({ word: { segs: segs, hasQ: hasQ } });
    }
    return toks;
  }
  function parseTokens(toks) {
    // 返り値: [{ pipe: [cmd...], sep: ';'|'&&'|'||'|'&' }]  cmd = { words, redirs, assigns }
    var list = [], pipe = [], cmd = { words: [], redirs: [], assigns: [] }, i = 0;
    function endCmd() {
      if (!cmd.words.length && !cmd.redirs.length && !cmd.assigns.length) return false;
      pipe.push(cmd); cmd = { words: [], redirs: [], assigns: [] }; return true;
    }
    for (; i < toks.length; i++) {
      var t = toks[i];
      if (t.word) {
        var w = t.word, first = w.segs[0];
        if (!cmd.words.length && first && first.t === 'lit' && !first.q && /^[A-Za-z_][A-Za-z0-9_]*=/.test(first.s)) {
          var eq = first.s.indexOf('=');
          var nm = first.s.slice(0, eq), v0 = first.s.slice(eq + 1);
          var vs = [{ t: 'lit', s: v0, q: false }].concat(w.segs.slice(1));
          cmd.assigns.push({ name: nm, word: { segs: vs, hasQ: w.hasQ } });
        } else cmd.words.push(w);
      } else if (t.redir) {
        var tw = toks[++i];
        if (!tw || !tw.word) throw new Error('構文エラー: リダイレクトの対象がありません');
        cmd.redirs.push({ op: t.redir, fd: t.fd, both: !!t.both, word: tw.word });
      } else if (t.dup) {
        cmd.redirs.push({ dup: true, fd: t.fd, to: t.to });
      } else if (t.op === '|') {
        if (!endCmd()) throw new Error('構文エラー: `|` の前にコマンドがありません');
      } else {
        var had = endCmd();
        if (!had && !pipe.length) { if (t.op === ';') continue; throw new Error('構文エラー: `' + t.op + '` の前にコマンドがありません'); }
        if (!had && pipe.length && t.op !== ';') throw new Error('構文エラー: `' + t.op + '` の前にコマンドがありません');
        if (pipe.length) { list.push({ pipe: pipe, sep: t.op }); pipe = []; }
      }
    }
    var had2 = endCmd();
    if (pipe.length) list.push({ pipe: pipe, sep: ';' });
    else if (!had2 && list.length && (list[list.length - 1].sep === '&&' || list[list.length - 1].sep === '||')) throw new Error('構文エラー: コマンドが続きません');
    return list;
  }
  VSH.lex = lex; VSH.parse = function (line) { return parseTokens(lex(line)); };

  /* ================= ブレース展開 ================= */
  function braceExpand(s) {
    var i = s.indexOf('{'); if (i < 0) return [s];
    var depth = 0, j, comma = [];
    for (j = i; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') { depth--; if (depth === 0) break; }
      else if (s[j] === ',' && depth === 1) comma.push(j);
    }
    if (j >= s.length) return [s];
    var pre = s.slice(0, i), body = s.slice(i + 1, j), post = s.slice(j + 1), parts = [];
    var rng = /^(-?\d+)\.\.(-?\d+)$/.exec(body), rch = /^([A-Za-z])\.\.([A-Za-z])$/.exec(body);
    if (rng) {
      var a = +rng[1], b = +rng[2], step = a <= b ? 1 : -1, pad = /^-?0\d/.test(rng[1]) || /^-?0\d/.test(rng[2]);
      var w = Math.max(rng[1].replace('-', '').length, rng[2].replace('-', '').length);
      for (var x = a; step > 0 ? x <= b : x >= b; x += step) { var t = String(Math.abs(x)); if (pad) while (t.length < w) t = '0' + t; parts.push((x < 0 ? '-' : '') + t); }
    } else if (rch) {
      var ca = rch[1].charCodeAt(0), cb = rch[2].charCodeAt(0), st = ca <= cb ? 1 : -1;
      for (var y = ca; st > 0 ? y <= cb : y >= cb; y += st) parts.push(String.fromCharCode(y));
    } else if (comma.length) {
      var prev = i + 1;
      comma.forEach(function (p) { parts.push(s.slice(prev, p)); prev = p + 1; });
      parts.push(s.slice(prev, j));
    } else {                                    // {単独} は展開しない
      return braceExpand(s.slice(j + 1)).map(function (r) { return s.slice(0, j + 1) + r; });
    }
    var out = [];
    parts.forEach(function (p) { braceExpand(p).forEach(function (pp) { braceExpand(post).forEach(function (po) { out.push(pre + pp + po); }); }); });
    return out;
  }
  VSH.braceExpand = braceExpand;

  /* ================= シェル ================= */
  function Shell(opts) {
    opts = opts || {};
    this.fs = opts.fs || VSH.defaultFS();
    this.cwd = opts.cwd || '/home/tux';
    this.uid = opts.uid === undefined ? 1000 : opts.uid;
    this.gid = opts.gid === undefined ? 1000 : opts.gid;
    this.gids = opts.gids || [1000, 2000];
    this.umask = opts.umask === undefined ? 18 : opts.umask;
    this.vars = opts.vars || { HOME: '/home/tux', USER: 'tux', PATH: '/usr/local/bin:/usr/bin:/bin', SHELL: '/bin/bash', LANG: 'ja_JP.UTF-8' };
    this.exported = opts.exported || { HOME: 1, USER: 1, PATH: 1, SHELL: 1, LANG: 1 };
    this.aliases = opts.aliases || { ls: 'ls --color=auto', ll: 'ls -alF' };
    this.status = 0; this.history = []; this.depth = opts.depth || 0;
  }
  Shell.prototype.cred = function () { return { uid: this.uid, gid: this.gid, gids: this.gids }; };
  Shell.prototype.cwdNode = function () {
    var r = this.fs.lookup(this.cwd, this.fs.root, true, ROOT);
    return r.node || this.fs.root;
  };
  Shell.prototype.sub = function (extra) {      // サブシェル（bash -c / $(...)）: エクスポート済みの変数だけ引き継ぐ
    extra = extra || {};
    var vars = {}, exp = {}, self = this;
    Object.keys(this.exported).forEach(function (k) { vars[k] = self.vars[k]; exp[k] = 1; });
    return new Shell({ fs: this.fs, cwd: this.cwd, uid: extra.uid === undefined ? this.uid : extra.uid, gid: extra.gid === undefined ? this.gid : extra.gid,
      gids: extra.gids || this.gids, umask: this.umask, vars: extra.keepVars ? Object.assign({}, this.vars) : vars, exported: extra.keepVars ? Object.assign({}, this.exported) : exp,
      aliases: Object.assign({}, this.aliases), depth: this.depth + 1 });
  };
  Shell.prototype.getVar = function (n) {
    if (n === '?') return String(this.status);
    if (n === '$') return '1234';
    if (n === '0') return 'bash';
    if (n === '#') return '0';
    return this.vars[n] === undefined ? '' : this.vars[n];
  };
  Shell.prototype.abs = function (p) {            // 字句的に正規化した絶対パス
    var parts = (p.charAt(0) === '/' ? p : this.cwd + '/' + p).split('/'), out = [];
    parts.forEach(function (x) { if (x === '' || x === '.') return; if (x === '..') out.pop(); else out.push(x); });
    return '/' + out.join('/');
  };
  Shell.prototype.stat = function (p, follow) { return this.fs.lookup(p, this.cwdNode(), follow !== false, this.cred()); };

  /* ---- 展開 ---- */
  Shell.prototype.expandSeg = function (seg) {   // → 文字列（展開後）
    if (seg.t === 'lit') return seg.s;
    if (seg.t === 'var') {
      var v = this.getVar(seg.n);
      if (seg.op) {
        var unset = this.vars[seg.n] === undefined || (seg.op.charAt(0) === ':' && v === '');
        var o = seg.op.replace(':', '');
        if (o === '-') return unset ? seg.arg : v;
        if (o === '=') { if (unset) { this.vars[seg.n] = seg.arg; return seg.arg; } return v; }
        if (o === '+') return unset ? '' : seg.arg;
      }
      return v;
    }
    if (seg.t === 'cmd') {
      var r = this.sub({ keepVars: true }).execLine(seg.c);
      var s = r.chunks.filter(function (c) { return c.fd === 1; }).map(function (c) { return c.s; }).join('');
      this._subErr = (this._subErr || []).concat(r.chunks.filter(function (c) { return c.fd === 2; }));
      return s.replace(/\n+$/, '');
    }
    if (seg.t === 'arith') {
      var self = this, ex = seg.c.replace(/[A-Za-z_][A-Za-z0-9_]*/g, function (nm) { var x = self.getVar(nm); return /^-?\d+$/.test(x) ? x : '0'; });
      if (!/^[0-9+\-*\/%() \t]*$/.test(ex)) throw new Error('算術式エラー');
      try { return String(Math.trunc(Function('return (' + (ex.trim() || '0') + ')')())); } catch (e) { throw new Error('算術式エラー'); }
    }
    return '';
  };
  Shell.prototype.expandWord = function (w, noGlob) {  // → 文字列配列
    var self = this, bare = w.segs.every(function (s) { return s.t === 'lit' && !s.q; });
    var words = [w];
    if (bare) {
      var raw = w.segs.map(function (s) { return s.s; }).join('');
      if (raw.indexOf('{') >= 0) { var ex = braceExpand(raw); if (ex.length > 1 || ex[0] !== raw) words = ex.map(function (s) { return { segs: [{ t: 'lit', s: s, q: false }], hasQ: false }; }); }
    }
    var out = [];
    words.forEach(function (wd) {
      var chars = [], hasQuoted = wd.hasQ, first = true;
      wd.segs.forEach(function (seg) {
        var s = self.expandSeg(seg);
        if (first && seg.t === 'lit' && !seg.q && s.charAt(0) === '~') {          // チルダ展開
          var m = /^~([A-Za-z0-9_]*)(\/.*)?$/.exec(s);
          if (m && (seg === wd.segs[0])) {
            var home = m[1] === '' ? (self.vars.HOME || '/home/tux') : (m[1] === 'root' ? '/root' : '/home/' + m[1]);
            s = home + (m[2] || '');
          }
        }
        first = false;
        var exp = seg.t !== 'lit';
        for (var i = 0; i < s.length; i++) chars.push({ c: s[i], q: seg.q, exp: exp });
      });
      // 単語分割（クォートされていない展開結果の空白）
      var fields = [], cur = [], has = hasQuoted;
      chars.forEach(function (ch) {
        if (ch.exp && !ch.q && /\s/.test(ch.c)) { if (cur.length || has) { fields.push(cur); } cur = []; has = false; }
        else cur.push(ch);
      });
      if (cur.length || has) fields.push(cur);
      fields.forEach(function (f) {
        if (!noGlob && f.some(function (ch) { return !ch.q && (ch.c === '*' || ch.c === '?' || ch.c === '['); })) {
          var g = self.glob(f);
          if (g && g.length) { g.forEach(function (x) { out.push(x); }); return; }
        }
        out.push(f.map(function (ch) { return ch.c; }).join(''));
      });
    });
    return out;
  };
  Shell.prototype.glob = function (chars) {
    var self = this, cred = this.cred(), fs = this.fs;
    var cs = [], cur = [];
    chars.forEach(function (ch) { if (ch.c === '/') { cs.push(cur); cur = []; } else cur.push(ch); });
    cs.push(cur);
    var abs = chars.length && chars[0].c === '/';
    if (abs) cs.shift();
    function toRe(comp) {
      var src = '^';
      for (var i = 0; i < comp.length; i++) {
        var ch = comp[i];
        if (ch.q) { src += ch.c.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); continue; }
        if (ch.c === '*') src += '[^/]*';
        else if (ch.c === '?') src += '[^/]';
        else if (ch.c === '[') {
          var j = i + 1, neg = false;
          if (j < comp.length && (comp[j].c === '!' || comp[j].c === '^') && !comp[j].q) { neg = true; j++; }
          var k = j, body = '';
          if (k < comp.length && comp[k].c === ']') { body += '\\]'; k++; }
          while (k < comp.length && !(comp[k].c === ']' && !comp[k].q)) { body += comp[k].c === '\\' ? '\\\\' : (comp[k].c === '^' ? '\\^' : comp[k].c); k++; }
          if (k >= comp.length) { src += '\\['; continue; }
          src += '[' + (neg ? '^' : '') + body + ']'; i = k;
        } else src += ch.c.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
      }
      return new RegExp(src + '$');
    }
    var results = [];
    function rec(node, prefix, idx) {
      if (idx === cs.length) { results.push(prefix); return; }
      var comp = cs[idx], text = comp.map(function (x) { return x.c; }).join('');
      var special = comp.some(function (x) { return !x.q && (x.c === '*' || x.c === '?' || x.c === '['); });
      var join = function (nm) { return prefix === '' ? nm : (prefix === '/' ? '/' + nm : prefix + '/' + nm); };
      if (node.type !== 'd') return;
      if (!special) {
        if (text === '') { rec(node, prefix, idx + 1); return; }
        var r = fs.walk(node, [text], true, cred);
        if (r.err || !r.node) return;
        rec(r.node, join(text), idx + 1); return;
      }
      if (!can(node, cred, 4) || !can(node, cred, 1)) return;
      var re = toRe(comp), dot = comp.length && comp[0].c === '.';
      Object.keys(node.children).sort(cmpStr).forEach(function (nm) {
        if (nm.charAt(0) === '.' && !dot) return;
        if (!re.test(nm)) return;
        var ch = node.children[nm];
        if (idx < cs.length - 1) { var rr = fs.walk(node, [nm], true, cred); if (!rr.node || rr.node.type !== 'd') return; rec(rr.node, join(nm), idx + 1); }
        else rec(ch, join(nm), idx + 1);
      });
    }
    rec(abs ? fs.root : this.cwdNode(), abs ? '/' : '', 0);
    return results;
  };

  /* ---- ファイル書き込み（リダイレクトなどで使う） ---- */
  Shell.prototype.openWrite = function (path, append, cred) {
    cred = cred || this.cred();
    var r = this.fs.lookup(path, this.cwdNode(), true, cred);
    if (r.err) return { err: r.err };
    if (r.node) {
      if (r.node.type === 'd') return { err: 'EISDIR' };
      if (!can(r.node, cred, 2)) return { err: 'EACCES' };
      if (!append) { r.node.data = ''; r.node.mtime = this.fs.tick(); }
      return { node: r.node };
    }
    if (!r.parent || r.dangling) return { err: 'ENOENT' };
    if (!can(r.parent, cred, 2) || !can(r.parent, cred, 1)) return { err: 'EACCES' };
    return { node: this.createFile(r.parent, r.name, 0x1b6, cred) };
  };
  Shell.prototype.createFile = function (parent, name, mode, cred) {
    var n = this.fs.node('f', mode & ~this.umask & 0xfff, cred.uid, (parent.mode & 0x400) ? parent.gid : cred.gid);
    n.parent = parent; n.mtime = this.fs.tick(); parent.children[name] = n; parent.mtime = n.mtime; return n;
  };

  /* ---- コマンド実行 ---- */
  var BUILTIN_NAMES = ['cd', 'echo', 'pwd', 'export', 'unset', 'alias', 'unalias', 'type', 'source', '.', 'umask', 'true', 'false', 'test', '[', 'printf', 'history', 'exit', 'read', 'set'];
  VSH.BUILTINS = BUILTIN_NAMES;
  function mkCtx(sh, argv, stdin, o) {
    var chunks = [];
    var c = {
      sh: sh, argv: argv, args: argv.slice(1), name: argv[0], stdin: stdin, tty: !!o.tty, chunks: chunks,
      cred: o.cred || sh.cred(), asRoot: !!o.asRoot,
      out: function (s) { if (s !== '') chunks.push({ fd: 1, s: s }); },
      err: function (s) { chunks.push({ fd: 2, s: s + (s.slice(-1) === '\n' ? '' : '\n') }); },
      fs: sh.fs
    };
    return c;
  }
  Shell.prototype.runCmd = function (argv, stdin, o) {
    // argv で指定した「コマンド」を実行（xargs / find -exec / sudo などから）
    o = o || {};
    var sh = this, name = argv[0];
    var runner = o.asRoot ? sh.sub({ uid: 0, gid: 0, gids: [0], keepVars: true }) : sh;
    if (o.asRoot) { runner.cwd = sh.cwd; runner.vars = sh.vars; runner.exported = sh.exported; runner.umask = sh.umask; }
    return runner.runSimple(argv, stdin == null ? '' : stdin, { tty: false, noAlias: true });
  };
  /* 実際の単一コマンド実行（リダイレクトは呼び出し側で処理済み）。{ chunks, status } を返す */
  Shell.prototype.runSimple = function (argv, stdin, o) {
    o = o || {};
    var sh = this, name = argv[0];
    if (!o.noAlias && sh.aliases[name] !== undefined && !o.aliasDepth) {
      var al = lexSafe(sh.aliases[name]);
      if (al) {
        var words = al.filter(function (t) { return t.word; }).map(function (t) { return sh.expandWord(t.word, true)[0]; });
        return sh.runSimple(words.concat(argv.slice(1)), stdin, { tty: o.tty, aliasDepth: 1 });
      }
    }
    if (name.indexOf('/') >= 0) return sh.runPath(name, argv, stdin, o);
    if (CMDS[name]) {
      var ctx = mkCtx(sh, argv, stdin, o);
      var st;
      try { st = CMDS[name](ctx); } catch (e) { ctx.err(name + ': ' + (e && e.message ? e.message : e)); st = 1; }
      return { chunks: ctx.chunks, status: st === undefined ? 0 : st };
    }
    // PATH 上のスクリプト
    var dirs = (sh.vars.PATH || '').split(':');
    for (var i = 0; i < dirs.length; i++) {
      if (dirs[i] === '') continue;
      var r = sh.stat(dirs[i] + '/' + name, true);
      if (r.node && r.node.type === 'f') return sh.runPath(dirs[i] + '/' + name, [dirs[i] + '/' + name].concat(argv.slice(1)), stdin, o);
    }
    var hint = VSH.NOT_SUPPORTED && VSH.NOT_SUPPORTED[name];
    return { chunks: [{ fd: 2, s: 'bash: ' + name + ': command not found' + (hint ? '（' + hint + '）' : '') + '\n' }], status: 127 };
  };
  function lexSafe(s) { try { return lex(s); } catch (e) { return null; } }
  Shell.prototype.runPath = function (path, argv, stdin, o) {
    var r = this.stat(path, true), msg = function (m, st) { return { chunks: [{ fd: 2, s: 'bash: ' + path + ': ' + m + '\n' }], status: st }; };
    if (r.err) return msg(ERR[r.err], r.err === 'EACCES' ? 126 : 127);
    if (!r.node) return msg(ERR.ENOENT, 127);
    if (r.node.type === 'd') return msg(ERR.EISDIR, 126);
    if (!can(r.node, this.cred(), 1) || (this.uid !== 0 && !(r.node.mode & 73))) return msg(ERR.EACCES, 126);
    if (r.node.data.indexOf('#!ELF') === 0) return { chunks: [], status: 0 };
    if (this.depth > 8) return msg('スクリプトの入れ子が深すぎます', 1);
    var s = this.sub({ keepVars: false });
    s.vars.__args = argv.slice(1).join(' ');
    var lines = r.node.data.split('\n').filter(function (l) { return l.trim() !== '' && l.indexOf('#!') !== 0; });
    var res = s.execLine(lines.join('\n'));
    return { chunks: res.chunks, status: res.status };
  };

  /* ---- 履歴展開 (!! / !n / !文字列) ---- */
  Shell.prototype.histExpand = function (line) {
    var out = '', i = 0, q = false, did = false, h = this.history;
    while (i < line.length) {
      var c = line[i];
      if (c === '\'') { q = !q; out += c; i++; continue; }
      if (c === '\\') { out += line.substr(i, 2); i += 2; continue; }
      if (c === '!' && !q) {
        var m;
        if (line[i + 1] === '!') { if (!h.length) throw new Error('!!: event not found'); out += h[h.length - 1]; i += 2; did = true; continue; }
        if ((m = /^!(\d+)/.exec(line.slice(i)))) { var e = h[+m[1] - 1]; if (e === undefined) throw new Error('!' + m[1] + ': event not found'); out += e; i += m[0].length; did = true; continue; }
        if ((m = /^!([A-Za-z][^\s;&|<>]*)/.exec(line.slice(i)))) {
          var found = null; for (var k = h.length - 1; k >= 0; k--) if (h[k].indexOf(m[1]) === 0) { found = h[k]; break; }
          if (found === null) throw new Error('!' + m[1] + ': event not found');
          out += found; i += m[0].length; did = true; continue;
        }
      }
      out += c; i++;
    }
    return { line: out, did: did };
  };

  /* ---- 1 行の実行 ---- */
  Shell.prototype.execLine = function (line, o) {
    o = o || {};
    var res = { chunks: [], status: 0 };
    var list;
    try { list = VSH.parse(line); } catch (e) { res.chunks.push({ fd: 2, s: 'bash: ' + e.message + '\n' }); res.status = 2; this.status = 2; return res; }
    var skip = false, prevSep = ';';
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (i > 0) {
        var ps = list[i - 1].sep;
        if (ps === '&&' && this.status !== 0) continue;
        if (ps === '||' && this.status === 0) continue;
      }
      var r;
      try { r = this.runPipeline(item.pipe, o); } catch (e2) { r = { chunks: [{ fd: 2, s: 'bash: ' + e2.message + '\n' }], status: 1 }; }
      r.chunks.forEach(function (c) { res.chunks.push(c); });
      this.status = r.status;
    }
    res.status = this.status;
    return res;
  };
  Shell.prototype.runPipeline = function (pipe, o) {
    var sh = this, n = pipe.length, term = [], stdin = (o && o.stdin != null) ? o.stdin : '';
    var status = 0;
    for (var k = 0; k < n; k++) {
      var cmd = pipe[k], last = k === n - 1;
      // 展開
      var argv = [];
      var extraErr = [];
      sh._subErr = [];
      cmd.words.forEach(function (w) { sh.expandWord(w).forEach(function (x) { argv.push(x); }); });
      sh._subErr.forEach(function (c) { term.push(c); });
      var dest = { 1: last ? { t: 'term' } : { t: 'pipe' }, 2: { t: 'term' } };
      var inData = stdin, failed = null, files = [];
      cmd.redirs.forEach(function (rd) {
        if (failed) return;
        if (rd.dup) {
          if (rd.to === '-') { dest[rd.fd] = { t: 'null' }; return; }
          dest[rd.fd] = dest[+rd.to] || dest[1]; return;
        }
        var tw = sh.expandWord(rd.word);
        if (tw.length !== 1) { failed = 'bash: ' + rd.word.segs.map(function (s) { return s.s || ''; }).join('') + ': ambiguous redirect'; return; }
        var target = tw[0];
        if (rd.op === '<') {
          if (target === '/dev/null') { inData = ''; return; }
          var rr = sh.stat(target, true);
          if (rr.err || !rr.node) { failed = 'bash: ' + target + ': ' + ERR[rr.err || 'ENOENT']; return; }
          if (rr.node.type === 'd') { failed = 'bash: ' + target + ': ' + ERR.EISDIR; return; }
          if (!can(rr.node, sh.cred(), 4)) { failed = 'bash: ' + target + ': ' + ERR.EACCES; return; }
          inData = rr.node.data; return;
        }
        var ap = rd.op === '>>' || rd.op === '&>>';
        if (target === '/dev/null') { var nd = { t: 'null' }; if (rd.both) { dest[1] = nd; dest[2] = nd; } else dest[rd.fd] = nd; return; }
        var ow = sh.openWrite(target, ap);
        if (ow.err) { failed = 'bash: ' + target + ': ' + ERR[ow.err]; return; }
        var fd = { t: 'file', node: ow.node, buf: '' };
        if (rd.both) { dest[1] = fd; dest[2] = fd; } else dest[rd.fd] = fd;
      });
      if (failed) { term.push({ fd: 2, s: failed + '\n' }); status = 1; stdin = ''; continue; }
      // 代入のみ
      if (!argv.length) {
        cmd.assigns.forEach(function (a) { var v = sh.expandWord(a.word, true).join(' '); sh.vars[a.name] = v; });
        status = 0; stdin = ''; continue;
      }
      var saved = null;
      if (cmd.assigns.length) {
        saved = {};
        cmd.assigns.forEach(function (a) { saved[a.name] = sh.vars[a.name]; sh.vars[a.name] = sh.expandWord(a.word, true).join(' '); });
      }
      var r = sh.execSimple(argv, inData, { tty: !!(o && o.tty) && dest[1].t === 'term' && last, inPipeline: n > 1, assigns: cmd.assigns.map(function (a) { return a.name; }) });
      if (saved) Object.keys(saved).forEach(function (kk) { if (saved[kk] === undefined) delete sh.vars[kk]; else sh.vars[kk] = saved[kk]; });
      var pipeOut = '';
      r.chunks.forEach(function (c) {
        var d = dest[c.fd];
        if (!d || d.t === 'null') return;
        if (d.t === 'term') term.push(c);
        else if (d.t === 'pipe') pipeOut += c.s;
        else if (d.t === 'file') d.buf += c.s;
      });
      [dest[1], dest[2]].forEach(function (d) {
        if (d && d.t === 'file' && !d.done) { d.done = true; d.node.data += d.buf; d.node.mtime = sh.fs.tick(); }
      });
      stdin = pipeOut; status = r.status;
    }
    return { chunks: term, status: status };
  };
  /* 組み込みコマンドと外部コマンドの振り分け（sudo は呼び出し側のシェルでリダイレクト済み） */
  Shell.prototype.execSimple = function (argv, stdin, o) {
    var sh = this;
    if (o.inPipeline && ['cd', 'export', 'unset', 'umask', 'alias', 'unalias', 'source', '.', 'exit'].indexOf(argv[0]) >= 0) {
      var tmp = sh.sub({ keepVars: true }); tmp.vars = Object.assign({}, sh.vars); tmp.exported = Object.assign({}, sh.exported); tmp.aliases = Object.assign({}, sh.aliases);
      return tmp.runSimple(argv, stdin, o);
    }
    if (argv[0] === 'history' || argv[0] === 'alias' || argv[0] === 'type') return sh.runSimple(argv, stdin, o);
    return sh.runSimple(argv, stdin, o);
  };

  /* ターミナルから呼ぶ入口：履歴展開 → 実行 → 履歴に追加 */
  Shell.prototype.run = function (line) {
    var res = { chunks: [], status: 0, echo: null };
    var l = line;
    try {
      var he = this.histExpand(line);
      l = he.line; if (he.did) res.echo = l;
    } catch (e) { res.chunks.push({ fd: 2, s: 'bash: ' + e.message + '\n' }); res.status = 1; this.status = 1; return res; }
    if (l.trim() !== '') this.history.push(l);
    var r = this.execLine(l, { tty: true });
    res.chunks = r.chunks; res.status = r.status;
    return res;
  };
  Shell.prototype.promptStr = function () {
    var home = this.vars.HOME || '/home/tux', p = this.cwd;
    if (p === home) p = '~'; else if (p.indexOf(home + '/') === 0) p = '~' + p.slice(home.length);
    return (this.uid === 0 ? 'root' : 'tux') + '@lnx01:' + p + (this.uid === 0 ? '# ' : '$ ');
  };
  VSH.Shell = Shell;

  /* ---- 共通ヘルパー（コマンド実装用） ---- */
  VSH.fmtMode = function (n) {
    var m = n.mode, t = n.type === 'd' ? 'd' : n.type === 'l' ? 'l' : '-';
    function tri(bits, sp, ch) {
      var r = (bits & 4 ? 'r' : '-') + (bits & 2 ? 'w' : '-'), x = bits & 1;
      if (sp) r += x ? ch : ch.toUpperCase(); else r += x ? 'x' : '-';
      return r;
    }
    return t + tri((m >> 6) & 7, m & 0x800, 's') + tri((m >> 3) & 7, m & 0x400, 's') + tri(m & 7, m & 0x200, 't');
  };
  VSH.fmtDate = function (ms, now) {
    var d = new Date(ms), p = function (x) { return (x < 10 ? '0' : '') + x; };
    var age = (now || BASE) - ms, six = 182 * 86400000;
    var dd = ('  ' + d.getUTCDate()).slice(-2);
    if (age > six || age < -3600000) return MON[d.getUTCMonth()] + ' ' + dd + '  ' + d.getUTCFullYear();
    return MON[d.getUTCMonth()] + ' ' + dd + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
  };
  VSH.can = can; VSH.ROOT = ROOT; VSH.comps = comps;
  VSH.readNode = function (sh, path, c, cmd) {  // ファイルを読む。失敗時はエラーを出して null
    var r = sh.stat(path, true);
    if (r.err || !r.node) { c.err(cmd + ': ' + path + ': ' + ERR[r.err || 'ENOENT']); return null; }
    if (r.node.type === 'd') { c.err(cmd + ': ' + path + ': ' + ERR.EISDIR); return null; }
    if (!can(r.node, c.cred, 4)) { c.err(cmd + ': ' + path + ': ' + ERR.EACCES); return null; }
    return r.node;
  };
  /* 引数解析。spec = { bool:'abc', val:'nk', long:{ name:'x' }, numeric:bool, stop:bool } */
  VSH.parseArgs = function (args, spec) {
    var o = { multi: {} }, rest = [], end = false;
    function setVal(f, v) { o[f] = v; (o.multi[f] = o.multi[f] || []).push(v); }
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (end || a === '-' || a.charAt(0) !== '-' || a === '') { rest.push(a); if (spec.stop && !end) { end = true; } continue; }
      if (a === '--') { end = true; continue; }
      if (a.indexOf('--') === 0) {
        var nm = a.slice(2), eq = nm.indexOf('='), v = null;
        if (eq >= 0) { v = nm.slice(eq + 1); nm = nm.slice(0, eq); }
        var f = spec.long && spec.long[nm];
        if (f === undefined) {
          var cands = Object.keys(spec.long || {}).filter(function (k) { return k.indexOf(nm) === 0; });
          if (cands.length === 1) f = spec.long[cands[0]];
        }
        if (f === undefined) { if (spec.ignoreLong) continue; return { err: "unrecognized option '" + a + "'" }; }
        if (f === '') continue;
        if ((spec.val || '').indexOf(f) >= 0) { if (v === null) v = args[++i]; if (v === undefined) return { err: "option '--" + nm + "' requires an argument" }; setVal(f, v); }
        else o[f] = (o[f] || 0) + 1;
        continue;
      }
      for (var j = 1; j < a.length; j++) {
        var ch = a[j];
        if (spec.numeric && isDigit(ch)) { var k = j; while (k < a.length && isDigit(a[k])) k++; o.num = a.slice(j, k); j = k - 1; continue; }
        if ((spec.val || '').indexOf(ch) >= 0) {
          var val = a.slice(j + 1); if (val === '') { val = args[++i]; if (val === undefined) return { err: "option requires an argument -- '" + ch + "'" }; }
          setVal(ch, val); break;
        }
        if ((spec.bool || '').indexOf(ch) >= 0) o[ch] = (o[ch] || 0) + 1;
        else return { err: "invalid option -- '" + ch + "'" };
      }
    }
    return { o: o, rest: rest };
  };
  VSH.cmpNum = function (a, b) { return a - b; };
})(typeof window !== 'undefined' ? window : globalThis);
