/* vsh — コマンド（その1）: シェル組み込み・ファイル操作・find・tar・sudo など */
(function (G) {
  'use strict';
  var VSH = G.VSH, CMDS = VSH.CMDS, ERR = VSH.ERR, can = VSH.can, cmpStr = VSH.cmpStr, parseArgs = VSH.parseArgs, BASE = VSH.BASE;
  function reg(names, fn) { [].concat(names).forEach(function (n) { CMDS[n] = fn; }); }
  function base(p) { var s = p.replace(/\/+$/, ''); if (s === '') return p.charAt(0) === '/' ? '/' : ''; return s.slice(s.lastIndexOf('/') + 1); }
  function dirOf(p) { var s = p.replace(/\/+$/, ''); var i = s.lastIndexOf('/'); if (i < 0) return '.'; if (i === 0) return '/'; return s.slice(0, i); }
  function join(d, n) { return d === '' ? n : (d.slice(-1) === '/' ? d + n : d + '/' + n); }
  VSH.base = base; VSH.dirOf = dirOf; VSH.joinPath = join;
  function bad(c, name, r) { c.err(name + ': ' + r.err); return 2; }
  function pe(c, name, res) { c.err(name + ': ' + res.err + "\nTry '" + name + " --help' for more information."); return 2; }
  function q(s) { return "'" + s + "'"; }

  /* ---------- シェル組み込み ---------- */
  reg('pwd', function (c) { c.out(c.sh.cwd + '\n'); });
  reg('true', function () { return 0; });
  reg('false', function () { return 1; });
  reg(':', function () { return 0; });
  reg('exit', function () { return 0; });
  reg('clear', function (c) { c.out('\u0000CLEAR'); });
  reg('cd', function (c) {
    var sh = c.sh, a = c.args[0];
    if (c.args.length > 1) { c.err('bash: cd: too many arguments'); return 1; }
    var t = a === undefined ? sh.vars.HOME : (a === '-' ? sh.vars.OLDPWD : a);
    if (t === undefined || t === '') { c.err('bash: cd: ' + (a === '-' ? 'OLDPWD' : 'HOME') + ' not set'); return 1; }
    var r = sh.stat(t, true);
    if (r.err || !r.node) { c.err('bash: cd: ' + t + ': ' + ERR[r.err || 'ENOENT']); return 1; }
    if (r.node.type !== 'd') { c.err('bash: cd: ' + t + ': ' + ERR.ENOTDIR); return 1; }
    if (!can(r.node, c.cred, 1)) { c.err('bash: cd: ' + t + ': ' + ERR.EACCES); return 1; }
    sh.vars.OLDPWD = sh.cwd; sh.cwd = sh.abs(t); sh.vars.PWD = sh.cwd;
    if (a === '-') c.out(sh.cwd + '\n');
    return 0;
  });
  reg('echo', function (c) {
    var args = c.args.slice(), nl = true, esc = false;
    while (args.length && /^-[neE]+$/.test(args[0])) {
      var f = args.shift();
      if (f.indexOf('n') >= 0) nl = false;
      if (f.indexOf('e') >= 0) esc = true;
      if (f.indexOf('E') >= 0) esc = false;
    }
    var s = args.join(' ');
    if (esc) s = s.replace(/\\(n|t|\\|a|r|0[0-7]{0,3}|c)/g, function (m, x) { return x === 'n' ? '\n' : x === 't' ? '\t' : x === '\\' ? '\\' : x === 'a' ? '\u0007' : x === 'r' ? '\r' : x === 'c' ? '' : String.fromCharCode(parseInt(x.slice(1) || '0', 8)); });
    c.out(s + (nl ? '\n' : ''));
  });
  reg('export', function (c) {
    var sh = c.sh;
    if (!c.args.length) { Object.keys(sh.exported).sort().forEach(function (k) { c.out('declare -x ' + k + '="' + sh.getVar(k) + '"\n'); }); return 0; }
    c.args.forEach(function (a) {
      if (a === '-p') return;
      var eq = a.indexOf('=');
      if (eq > 0) { sh.vars[a.slice(0, eq)] = a.slice(eq + 1); sh.exported[a.slice(0, eq)] = 1; }
      else { if (sh.vars[a] === undefined) sh.vars[a] = ''; sh.exported[a] = 1; }
    });
    return 0;
  });
  reg('unset', function (c) { c.args.forEach(function (a) { if (a[0] !== '-') { delete c.sh.vars[a]; delete c.sh.exported[a]; } }); return 0; });
  reg('env', function (c) {
    var sh = c.sh;
    if (!c.args.length) { Object.keys(sh.exported).sort().forEach(function (k) { c.out(k + '=' + sh.getVar(k) + '\n'); }); return 0; }
    var r = sh.runCmd(c.args, c.stdin, {}); r.chunks.forEach(function (x) { c.chunks.push(x); }); return r.status;
  });
  reg('printenv', function (c) {
    var sh = c.sh;
    if (!c.args.length) { Object.keys(sh.exported).sort().forEach(function (k) { c.out(k + '=' + sh.getVar(k) + '\n'); }); return 0; }
    var st = 0; c.args.forEach(function (k) { if (sh.exported[k]) c.out(sh.getVar(k) + '\n'); else st = 1; }); return st;
  });
  reg('set', function (c) { Object.keys(c.sh.vars).sort().forEach(function (k) { c.out(k + '=' + c.sh.vars[k] + '\n'); }); return 0; });
  reg('alias', function (c) {
    var sh = c.sh;
    if (!c.args.length) { Object.keys(sh.aliases).sort().forEach(function (k) { c.out("alias " + k + "='" + sh.aliases[k] + "'\n"); }); return 0; }
    var st = 0;
    c.args.forEach(function (a) {
      var eq = a.indexOf('=');
      if (eq > 0) sh.aliases[a.slice(0, eq)] = a.slice(eq + 1);
      else if (sh.aliases[a] !== undefined) c.out("alias " + a + "='" + sh.aliases[a] + "'\n");
      else { c.err('bash: alias: ' + a + ': not found'); st = 1; }
    });
    return st;
  });
  reg('unalias', function (c) {
    var st = 0;
    c.args.forEach(function (a) { if (a === '-a') c.sh.aliases = {}; else if (c.sh.aliases[a] !== undefined) delete c.sh.aliases[a]; else { c.err('bash: unalias: ' + a + ': not found'); st = 1; } });
    return st;
  });
  reg('history', function (c) {
    var h = c.sh.history; h.forEach(function (l, i) { c.out(('     ' + (i + 1)).slice(-5) + '  ' + l + '\n'); });
  });
  reg('umask', function (c) {
    var sh = c.sh, a = c.args;
    if (a[0] === '-S') {
      var m = ~sh.umask & 511, t = function (b) { return (b & 4 ? 'r' : '') + (b & 2 ? 'w' : '') + (b & 1 ? 'x' : ''); };
      c.out('u=' + t(m >> 6) + ',g=' + t((m >> 3) & 7) + ',o=' + t(m & 7) + '\n'); return 0;
    }
    if (!a.length) { c.out(('0000' + sh.umask.toString(8)).slice(-4) + '\n'); return 0; }
    if (!/^[0-7]{1,4}$/.test(a[0])) { c.err('bash: umask: ' + a[0] + ': invalid octal number'); return 1; }
    sh.umask = parseInt(a[0], 8) & 511; return 0;
  });
  reg(['source', '.'], function (c) {
    if (!c.args.length) { c.err('bash: ' + c.name + ': filename argument required'); return 2; }
    var n = VSH.readNode(c.sh, c.args[0], c, 'bash: ' + c.name); if (!n) return 1;
    var r = c.sh.execLine(n.data.split('\n').filter(function (l) { return l.indexOf('#!') !== 0; }).join('\n'));
    r.chunks.forEach(function (x) { c.chunks.push(x); }); return r.status;
  });
  reg(['bash', 'sh'], function (c) {
    var a = c.args.slice(), cmd = null;
    while (a.length && a[0][0] === '-') { var f = a.shift(); if (f === '-c') { cmd = a.shift(); break; } }
    var sh = c.sh, sub = sh.sub({ uid: c.cred.uid, gid: c.cred.gid, gids: c.cred.gids });
    if (cmd === null) {
      if (a.length) {
        var n = VSH.readNode(sh, a[0], c, 'bash'); if (!n) return 127;
        cmd = n.data.split('\n').filter(function (l) { return l.indexOf('#!') !== 0; }).join('\n');
      } else cmd = c.stdin || '';
    }
    var r = sub.execLine(cmd); r.chunks.forEach(function (x) { c.chunks.push(x); }); return r.status;
  });
  reg('sudo', function (c) {
    var a = c.args.slice();
    while (a.length && a[0][0] === '-') a.shift();
    if (!a.length) { c.err('usage: sudo command'); return 1; }
    var r = c.sh.runCmd(a, c.stdin, { asRoot: true });
    r.chunks.forEach(function (x) { c.chunks.push(x); }); return r.status;
  });
  reg('whoami', function (c) { c.out(VSH.USERS[c.cred.uid] + '\n'); });
  reg('id', function (c) {
    var u = c.cred.uid, g = c.cred.gid, nm = VSH.USERS, gn = VSH.GROUPS;
    c.out('uid=' + u + '(' + nm[u] + ') gid=' + g + '(' + gn[g] + ') groups=' + c.cred.gids.map(function (x) { return x + '(' + gn[x] + ')'; }).join(',') + '\n');
  });
  reg('groups', function (c) { c.out(c.cred.gids.map(function (x) { return VSH.GROUPS[x]; }).join(' ') + '\n'); });
  reg('hostname', function (c) { c.out('lnx01\n'); });
  reg('uname', function (c) {
    var a = c.args.join(' ');
    c.out(/-a/.test(a) ? 'Linux lnx01 5.15.0-91-generic #101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux\n' : /-r/.test(a) ? '5.15.0-91-generic\n' : 'Linux\n');
  });
  reg('date', function (c) {
    var d = new Date(c.sh.fs.clock), D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], p = function (x) { return (x < 10 ? '0' : '') + x; };
    var fm = (c.args.filter(function (x) { return x[0] === '+'; })[0] || '').slice(1);
    if (fm) {
      c.out(fm.replace(/%([YmdHMSFTa])/g, function (m, x) {
        return x === 'Y' ? d.getUTCFullYear() : x === 'm' ? p(d.getUTCMonth() + 1) : x === 'd' ? p(d.getUTCDate()) : x === 'H' ? p(d.getUTCHours()) : x === 'M' ? p(d.getUTCMinutes()) : x === 'S' ? p(d.getUTCSeconds()) :
          x === 'F' ? d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) : x === 'T' ? p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) : D[d.getUTCDay()];
      }) + '\n'); return 0;
    }
    c.out(D[d.getUTCDay()] + ' ' + VSH.MON[d.getUTCMonth()] + ' ' + ('  ' + d.getUTCDate()).slice(-2) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + ' UTC ' + d.getUTCFullYear() + '\n');
  });
  reg('basename', function (c) { var b = base(c.args[0] || ''); if (c.args[1] && b.slice(-c.args[1].length) === c.args[1] && b !== c.args[1]) b = b.slice(0, -c.args[1].length); c.out(b + '\n'); });
  reg('dirname', function (c) { c.out(dirOf(c.args[0] || '') + '\n'); });
  reg('readlink', function (c) {
    var f = c.args.indexOf('-f') >= 0, p = c.args.filter(function (x) { return x[0] !== '-'; })[0];
    var r = c.sh.stat(p, false);
    if (!r.node) return 1;
    if (f) { c.out(c.sh.abs(p) + '\n'); return 0; }
    if (r.node.type !== 'l') return 1;
    c.out(r.node.target + '\n');
  });
  reg(['which'], function (c) {
    var st = 0;
    c.args.forEach(function (n) {
      if (n[0] === '-') return;
      if (CMDS[n] && VSH.BUILTINS.indexOf(n) < 0 || ['echo', 'pwd', 'true', 'false', 'test', 'printf'].indexOf(n) >= 0) { c.out('/usr/bin/' + n + '\n'); return; }
      var dirs = (c.sh.vars.PATH || '').split(':'), found = false;
      for (var i = 0; i < dirs.length && !found; i++) { var r = c.sh.stat(dirs[i] + '/' + n, true); if (r.node && r.node.type === 'f') { c.out(dirs[i] + '/' + n + '\n'); found = true; } }
      if (!found) st = 1;
    });
    return st;
  });
  reg('whereis', function (c) {
    c.args.forEach(function (n) {
      if (n[0] === '-') return;
      c.out(n + ':' + (CMDS[n] && VSH.BUILTINS.indexOf(n) < 0 ? ' /usr/bin/' + n + ' /usr/share/man/man1/' + n + '.1.gz' : '') + '\n');
    });
  });
  reg('type', function (c) {
    var st = 0;
    c.args.forEach(function (n) {
      if (n[0] === '-') return;
      if (c.sh.aliases[n] !== undefined) c.out(n + " is aliased to `" + c.sh.aliases[n] + "'\n");
      else if (VSH.BUILTINS.indexOf(n) >= 0) c.out(n + ' is a shell builtin\n');
      else if (CMDS[n]) c.out(n + ' is /usr/bin/' + n + '\n');
      else {
        var dirs = (c.sh.vars.PATH || '').split(':'), found = false;
        for (var i = 0; i < dirs.length && !found; i++) { var r = c.sh.stat(dirs[i] + '/' + n, true); if (r.node && r.node.type === 'f') { c.out(n + ' is ' + dirs[i] + '/' + n + '\n'); found = true; } }
        if (!found) { c.err('bash: type: ' + n + ': not found'); st = 1; }
      }
    });
    return st;
  });
  reg(['test', '['], function (c) {
    var a = c.args.slice();
    if (c.name === '[') { if (a[a.length - 1] !== ']') { c.err("bash: [: missing `]'"); return 2; } a.pop(); }
    var sh = c.sh;
    function ev(a) {
      if (a[0] === '!') return !ev(a.slice(1));
      if (a.length === 0) return false;
      if (a.length === 1) return a[0] !== '';
      if (a.length === 2) {
        var op = a[0], p = a[1], r = (/^-[efdrwxsLh]$/.test(op)) ? sh.stat(p, op !== '-L' && op !== '-h') : null;
        if (op === '-z') return p === ''; if (op === '-n') return p !== '';
        if (!r) return false;
        if (!r.node) return false;
        if (op === '-e') return true; if (op === '-f') return r.node.type === 'f'; if (op === '-d') return r.node.type === 'd';
        if (op === '-L' || op === '-h') return r.node.type === 'l';
        if (op === '-s') return r.node.type === 'f' && r.node.data.length > 0;
        if (op === '-r') return can(r.node, c.cred, 4); if (op === '-w') return can(r.node, c.cred, 2); if (op === '-x') return can(r.node, c.cred, 1);
        return false;
      }
      if (a.length === 3) {
        var x = a[0], o = a[1], y = a[2];
        if (o === '=' || o === '==') return x === y; if (o === '!=') return x !== y;
        var nx = +x, ny = +y;
        if (o === '-eq') return nx === ny; if (o === '-ne') return nx !== ny; if (o === '-gt') return nx > ny; if (o === '-lt') return nx < ny; if (o === '-ge') return nx >= ny; if (o === '-le') return nx <= ny;
      }
      return false;
    }
    return ev(a) ? 0 : 1;
  });
  reg('printf', function (c) {
    var f = c.args[0]; if (f === undefined) return 1;
    var args = c.args.slice(1), ai = 0, out = '', used;
    function once() {
      used = 0;
      var s = f.replace(/\\(n|t|\\|r|a|0[0-7]{0,3})/g, function (m, x) { return x === 'n' ? '\n' : x === 't' ? '\t' : x === '\\' ? '\\' : x === 'r' ? '\r' : x === 'a' ? '\u0007' : String.fromCharCode(parseInt(x.slice(1) || '0', 8)); });
      return s.replace(/%(-?0?\d*)(?:\.(\d+))?([sdicxXo%])/g, function (m, w, pr, t) {
        if (t === '%') return '%';
        var v = args[ai++]; used++; if (v === undefined) v = (t === 's' || t === 'c') ? '' : '0';
        var r = t === 's' ? (pr ? String(v).slice(0, +pr) : String(v)) : t === 'c' ? String(v).charAt(0) : t === 'x' ? (+v).toString(16) : t === 'X' ? (+v).toString(16).toUpperCase() : t === 'o' ? (+v).toString(8) : String(parseInt(v, 10) || 0);
        var wd = parseInt(w.replace(/^-?0*/, ''), 10) || 0, left = /^-/.test(w), zero = /^0/.test(w) && t !== 's', aw = wd;
        while (r.length < aw) r = left ? r + ' ' : (zero ? '0' : ' ') + r;
        return r;
      });
    }
    out += once();
    while (ai < args.length && used > 0) out += once();
    c.out(out);
  });

  /* ---------- ls ---------- */
  function human(n) {
    if (n < 1024) return String(n);
    var u = ['K', 'M', 'G', 'T'], i = 0, v = n / 1024;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return (v < 10 ? (Math.ceil(v * 10) / 10).toFixed(1) : String(Math.ceil(v))) + u[i];
  }
  function blocks(n) { return n.type === 'd' ? 4 : (n.type === 'f' && n.data.length > 0 ? Math.ceil(n.data.length / 4096) * 4 : 0); }
  function nlinkOf(n) { if (n.type !== 'd') return n.nlink; var k = 2; Object.keys(n.children).forEach(function (x) { if (n.children[x].type === 'd') k++; }); return k; }
  VSH.nlinkOf = nlinkOf;
  function listing(c, o, entries) {          // entries: [{name, node}]
    var lines = [], long = o.l, ino = o.i;
    if (long) {
      var w = { n: 0, u: 0, g: 0, s: 0, i: 0 }, rows = entries.map(function (e) {
        var n = e.node, r = { mode: VSH.fmtMode(n), nl: String(nlinkOf(n)), u: VSH.USERS[n.uid] || String(n.uid), g: VSH.GROUPS[n.gid] || String(n.gid), sz: o.h ? human(n.type === 'f' ? n.data.length : n.type === 'l' ? n.target.length : 4096) : String(n.type === 'f' ? n.data.length : n.type === 'l' ? n.target.length : 4096), dt: VSH.fmtDate(n.mtime), nm: e.name, ino: String(n.ino) };
        if (n.type === 'l') r.nm += ' -> ' + n.target;
        r.nm += o.F ? (n.type === 'd' ? '/' : (n.type === 'f' && (n.mode & 73) ? '*' : '')) : '';
        w.n = Math.max(w.n, r.nl.length); w.u = Math.max(w.u, r.u.length); w.g = Math.max(w.g, r.g.length); w.s = Math.max(w.s, r.sz.length); w.i = Math.max(w.i, r.ino.length); return r;
      });
      var pad = function (s, n) { while (s.length < n) s = ' ' + s; return s; }, padr = function (s, n) { while (s.length < n) s += ' '; return s; };
      rows.forEach(function (r) { lines.push((ino ? pad(r.ino, w.i) + ' ' : '') + r.mode + ' ' + pad(r.nl, w.n) + ' ' + padr(r.u, w.u) + ' ' + padr(r.g, w.g) + ' ' + pad(r.sz, w.s) + ' ' + r.dt + ' ' + r.nm); });
      return lines;
    }
    var names = entries.map(function (e) {
      var s = e.name, n = e.node;
      if (o.F) s += n.type === 'd' ? '/' : n.type === 'l' ? '@' : (n.mode & 73 ? '*' : '');
      return (ino ? n.ino + ' ' : '') + s;
    });
    if (!c.tty || o['1'] || !names.length) return names;
    var W = 80, best = 1, best_cols = null;
    for (var cols = Math.min(names.length, 40); cols >= 1; cols--) {
      var rowsN = Math.ceil(names.length / cols), cw = [], tot = 0;
      for (var k = 0; k < cols; k++) { var m = 0; for (var r2 = 0; r2 < rowsN; r2++) { var nm = names[k * rowsN + r2]; if (nm !== undefined) m = Math.max(m, nm.length); } cw.push(m); tot += m; }
      tot += 2 * (cols - 1);
      if (tot <= W) { best = cols; best_cols = cw; break; }
    }
    if (!best_cols) { best = 1; best_cols = [Math.max.apply(null, names.map(function (x) { return x.length; }))]; }
    var rN = Math.ceil(names.length / best);
    for (var r3 = 0; r3 < rN; r3++) {
      var line = '';
      for (var k2 = 0; k2 < best; k2++) {
        var nm2 = names[k2 * rN + r3]; if (nm2 === undefined) continue;
        var more = k2 < best - 1 && names[(k2 + 1) * rN + r3] !== undefined;
        line += more ? nm2 + ' '.repeat(best_cols[k2] + 2 - nm2.length) : nm2;
      }
      lines.push(line);
    }
    return lines;
  }
  reg('ls', function (c) {
    var res = parseArgs(c.args, { bool: 'lahAdiR1FtrSUsp', long: { all: 'a', 'almost-all': 'A', directory: 'd', recursive: 'R', color: '', 'human-readable': 'h', reverse: 'r', classify: 'F' }, ignoreLong: true });
    if (res.err) return pe(c, 'ls', res);
    var o = res.o, sh = c.sh, paths = res.rest.length ? res.rest : ['.'], st = 0;
    var files = [], dirs = [];
    function sortE(es) {
      es.sort(function (a, b) {
        var d = 0;
        if (o.t) d = b.node.mtime - a.node.mtime;
        else if (o.S) d = (b.node.type === 'f' ? b.node.data.length : 0) - (a.node.type === 'f' ? a.node.data.length : 0);
        if (d === 0) d = cmpStr(a.name, b.name);
        return o.r ? -d : d;
      });
      return es;
    }
    paths.forEach(function (p) {
      var r = sh.stat(p, true);
      var rl = sh.stat(p, false);
      if ((r.err || !r.node) && rl.node && rl.node.type === 'l' && (o.l || o.d)) r = rl;     // 壊れたリンクも -l / -d なら表示できる
      if (r.err || !r.node) { c.err("ls: cannot access " + q(p) + ': ' + ERR[r.err || 'ENOENT']); st = 2; return; }
      var n = (o.l || o.d) && rl.node && rl.node.type === 'l' && !/\/$/.test(p) ? rl.node : r.node;
      if (n.type === 'd' && !o.d) dirs.push({ name: p, node: n }); else files.push({ name: p, node: n });
    });
    var multi = paths.length > 1 || o.R, first = true;
    if (files.length) { listing(c, o, sortE(files)).forEach(function (l) { c.out(l + '\n'); }); first = false; }
    function doDir(name, node, display) {
      if (!first) c.out('\n');
      first = false;
      if (multi || display) c.out(name + ':\n');
      if (!can(node, c.cred, 4)) { c.err('ls: cannot open directory ' + q(name) + ': ' + ERR.EACCES); st = 2; return; }
      var es = Object.keys(node.children).map(function (nm) { return { name: nm, node: node.children[nm] }; });
      if (o.a) { es.push({ name: '.', node: node }, { name: '..', node: node.parent }); }
      else if (!o.A) es = es.filter(function (e) { return e.name[0] !== '.'; });
      else es = es.filter(function (e) { return e.name !== '.' && e.name !== '..'; });
      sortE(es);
      if (o.l || o.s) c.out('total ' + es.reduce(function (a, e) { return a + blocks(e.node); }, 0) + '\n');
      listing(c, o, es).forEach(function (l) { c.out(l + '\n'); });
      if (o.R) es.forEach(function (e) { if (e.node.type === 'd' && e.name !== '.' && e.name !== '..') doDir(join(name, e.name), e.node); });
    }
    dirs.sort(function (a, b) { return cmpStr(a.name, b.name); }).forEach(function (d) { doDir(d.name === '.' && o.R ? '.' : d.name, d.node); });
    return st;
  });
  reg('dir', function (c) { return CMDS.ls(c); });

  /* ---------- 作成・削除・コピー・移動 ---------- */
  function parentOf(c, path, cmd, what) {
    // 新規作成先の親ディレクトリを調べる。成功 {parent,name}、失敗は null（メッセージ出力済み）
    var r = c.sh.stat(path, false);
    if (r.err) { c.err(cmd + ': cannot ' + what + ' ' + q(path) + ': ' + ERR[r.err]); return null; }
    if (r.node) { c.err(cmd + ': cannot ' + what + ' ' + q(path) + ': ' + ERR.EEXIST); return null; }
    if (!r.parent) { c.err(cmd + ': cannot ' + what + ' ' + q(path) + ': ' + ERR.ENOENT); return null; }
    if (!can(r.parent, c.cred, 2) || !can(r.parent, c.cred, 1)) { c.err(cmd + ': cannot ' + what + ' ' + q(path) + ': ' + ERR.EACCES); return null; }
    return r;
  }
  function newNode(c, type, mode, parent) {
    var fs = c.sh.fs, n = fs.node(type, mode, c.cred.uid, (parent.mode & 0x400) ? parent.gid : c.cred.gid);
    if (type === 'd' && (parent.mode & 0x400)) n.mode |= 0x400;
    n.parent = parent; n.mtime = fs.tick(); return n;
  }
  reg('mkdir', function (c) {
    var res = parseArgs(c.args, { bool: 'pv', val: 'm', long: { parents: 'p', mode: 'm', verbose: 'v' } });
    if (res.err) return pe(c, 'mkdir', res);
    var st = 0, mode = res.o.m !== undefined ? parseInt(res.o.m, 8) : 511 & ~c.sh.umask;
    if (!res.rest.length) { c.err('mkdir: missing operand'); return 1; }
    res.rest.forEach(function (p) {
      if (res.o.p) {
        var cs = VSH.comps(p), cur = p.charAt(0) === '/' ? '/' : '', ok = true;
        cs.forEach(function (x, idx) {
          if (!ok) return;
          cur = cur === '' ? x : join(cur, x);
          var r = c.sh.stat(cur, true);
          if (r.node) { if (r.node.type !== 'd') { c.err('mkdir: cannot create directory ' + q(p) + ': ' + ERR.ENOTDIR); ok = false; st = 1; } return; }
          var pr = parentOf(c, cur, 'mkdir', 'create directory'); if (!pr) { ok = false; st = 1; return; }
          var n = newNode(c, 'd', mode, pr.parent); pr.parent.children[pr.name] = n; pr.parent.mtime = n.mtime;
          if (res.o.v) c.out("mkdir: created directory " + q(cur) + '\n');
        });
        return;
      }
      var pr = parentOf(c, p.replace(/\/+$/, ''), 'mkdir', 'create directory'); if (!pr) { st = 1; return; }
      var n = newNode(c, 'd', mode, pr.parent); pr.parent.children[pr.name] = n; pr.parent.mtime = n.mtime;
      if (res.o.v) c.out("mkdir: created directory " + q(p) + '\n');
    });
    return st;
  });
  reg('rmdir', function (c) {
    var st = 0;
    c.args.filter(function (a) { return a[0] !== '-'; }).forEach(function (p) {
      var r = c.sh.stat(p.replace(/\/+$/, ''), false);
      if (r.err || !r.node) { c.err('rmdir: failed to remove ' + q(p) + ': ' + ERR[r.err || 'ENOENT']); st = 1; return; }
      if (r.node.type !== 'd') { c.err('rmdir: failed to remove ' + q(p) + ': ' + ERR.ENOTDIR); st = 1; return; }
      if (Object.keys(r.node.children).length) { c.err('rmdir: failed to remove ' + q(p) + ': ' + ERR.ENOTEMPTY); st = 1; return; }
      if (!can(r.parent, c.cred, 2) || !can(r.parent, c.cred, 1)) { c.err('rmdir: failed to remove ' + q(p) + ': ' + ERR.EACCES); st = 1; return; }
      delete r.parent.children[r.name]; r.parent.mtime = c.sh.fs.tick();
    });
    return st;
  });
  function parseTouchDate(s, now) {
    var m;
    if ((m = /^(\d+)\s*(second|minute|hour|day|week)s?\s+ago$/.exec(s.trim()))) {
      var mult = { second: 1000, minute: 60000, hour: 3600000, day: 86400000, week: 604800000 }[m[2]];
      return now - (+m[1]) * mult;
    }
    if (/^yesterday$/.test(s.trim())) return now - 86400000;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s.trim()))) return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    return null;
  }
  reg('touch', function (c) {
    var res = parseArgs(c.args, { bool: 'cam', val: 'dtr', long: { date: 'd', reference: 'r' } });
    if (res.err) return pe(c, 'touch', res);
    var fs = c.sh.fs, st = 0, when = null;
    if (res.o.d !== undefined) { when = parseTouchDate(res.o.d, fs.clock); if (when === null) { c.err("touch: invalid date format " + q(res.o.d)); return 1; } }
    if (res.o.r !== undefined) { var rr = c.sh.stat(res.o.r, true); if (!rr.node) { c.err('touch: failed to get attributes of ' + q(res.o.r) + ': ' + ERR[rr.err || 'ENOENT']); return 1; } when = rr.node.mtime; }
    if (!res.rest.length) { c.err('touch: missing file operand'); return 1; }
    res.rest.forEach(function (p) {
      var r = c.sh.stat(p, true);
      if (r.err) { c.err('touch: cannot touch ' + q(p) + ': ' + ERR[r.err]); st = 1; return; }
      if (r.node) {
        if (!can(r.node, c.cred, 2) && c.cred.uid !== r.node.uid && c.cred.uid !== 0) { c.err('touch: cannot touch ' + q(p) + ': ' + ERR.EACCES); st = 1; return; }
        r.node.mtime = when === null ? fs.tick() : when; return;
      }
      if (res.o.c) return;
      if (!r.parent || r.dangling) { c.err('touch: cannot touch ' + q(p) + ': ' + ERR.ENOENT); st = 1; return; }
      if (!can(r.parent, c.cred, 2) || !can(r.parent, c.cred, 1)) { c.err('touch: cannot touch ' + q(p) + ': ' + ERR.EACCES); st = 1; return; }
      var n = c.sh.createFile(r.parent, r.name, 0x1b6, c.cred); if (when !== null) n.mtime = when;
    });
    return st;
  });
  function unlink(sh, parent, name) {
    var n = parent.children[name];
    delete parent.children[name]; parent.mtime = sh.fs.tick();
    if (n.type !== 'd') n.nlink--;
  }
  function removable(c, parent, node) {
    if (!can(parent, c.cred, 2) || !can(parent, c.cred, 1)) return false;
    if ((parent.mode & 0x200) && c.cred.uid !== 0 && c.cred.uid !== node.uid && c.cred.uid !== parent.uid) return false;
    return true;
  }
  reg('rm', function (c) {
    var res = parseArgs(c.args, { bool: 'rRfivd', long: { recursive: 'r', force: 'f', verbose: 'v', dir: 'd', interactive: 'i' }, ignoreLong: true });
    if (res.err) return pe(c, 'rm', res);
    var o = res.o, rec = o.r || o.R, st = 0;
    if (!res.rest.length) { if (!o.f) { c.err("rm: missing operand"); return 1; } return 0; }
    function rmNode(p, parent, name, node) {
      if (node.type === 'd') {
        if (!rec && !o.d) { c.err('rm: cannot remove ' + q(p) + ': ' + ERR.EISDIR); st = 1; return; }
        if (!rec && o.d) { if (Object.keys(node.children).length) { c.err('rm: cannot remove ' + q(p) + ': ' + ERR.ENOTEMPTY); st = 1; return; } }
        if (rec) {
          if (!can(node, c.cred, 2) || !can(node, c.cred, 1) || !can(node, c.cred, 4)) { if (Object.keys(node.children).length) { c.err('rm: cannot remove ' + q(p) + ': ' + ERR.EACCES); st = 1; return; } }
          Object.keys(node.children).forEach(function (nm) { rmNode(join(p, nm), node, nm, node.children[nm]); });
          if (Object.keys(node.children).length) { st = 1; return; }
        }
      }
      if (!removable(c, parent, node)) { c.err('rm: cannot remove ' + q(p) + ': ' + ERR.EACCES); st = 1; return; }
      if (!o.f && node.type === 'f' && !can(node, c.cred, 2) && c.cred.uid !== 0 && c.tty) { c.out('rm: remove write-protected regular ' + (node.data.length ? 'file' : 'empty file') + ' ' + q(p) + '? （道場では確認に答えられないため、削除しません。-f を付けると削除されます）\n'); return; }
      unlink(c.sh, parent, name);
      if (o.v) c.out('removed ' + q(p) + '\n');
    }
    res.rest.forEach(function (p) {
      if (p === '.' || p === '..' || /\/\.\.?$/.test(p)) { c.err("rm: refusing to remove '.' or '..' directory: skipping " + q(p)); st = 1; return; }
      var r = c.sh.stat(p.replace(/(.)\/+$/, '$1'), false);
      if (r.err || !r.node) { if (!o.f) { c.err('rm: cannot remove ' + q(p) + ': ' + ERR[r.err || 'ENOENT']); st = 1; } return; }
      rmNode(p, r.parent, r.name, r.node);
    });
    return st;
  });
  function copyTree(c, src, dst, p, o, st) {
    // src ノードを複製して返す
    var fs = c.sh.fs, n = fs.node(src.type, src.mode, o.p ? src.uid : c.cred.uid, o.p ? src.gid : c.cred.gid);
    if (src.type === 'f') n.data = src.data;
    if (src.type === 'l') n.target = src.target;
    if (!o.p) { n.mode = src.type === 'l' ? src.mode : (src.mode & ~c.sh.umask & 0xfff); if (src.type === 'd') n.mode = (src.mode & ~c.sh.umask) & 0xfff; if (src.type === 'f') n.mode = src.mode & ~c.sh.umask & 0x1ff; }
    n.mtime = o.p ? src.mtime : fs.tick();
    return n;
  }
  reg('cp', function (c) {
    var res = parseArgs(c.args, { bool: 'rRapivnuflHPdTt', long: { recursive: 'r', archive: 'a', preserve: 'p', verbose: 'v', 'no-clobber': 'n', force: 'f', interactive: 'i', update: 'u' }, ignoreLong: true });
    if (res.err) return pe(c, 'cp', res);
    var o = res.o, rec = o.r || o.R || o.a, pres = o.p || o.a, sh = c.sh, fs = sh.fs, st = 0, a = res.rest;
    if (a.length < 2) { c.err(a.length ? "cp: missing destination file operand after " + q(a[0]) : 'cp: missing file operand'); return 1; }
    var dst = a[a.length - 1], srcs = a.slice(0, -1), dr = sh.stat(dst, true);
    var dstIsDir = dr.node && dr.node.type === 'd';
    if (srcs.length > 1 && !dstIsDir) { c.err('cp: target ' + q(dst) + ' is not a directory'); return 1; }
    function put(srcNode, srcPath, destPath) {
      // destPath に srcNode を複製
      var r = sh.stat(destPath, false);
      if (r.err) { c.err('cp: cannot create ' + (srcNode.type === 'd' ? 'directory' : 'regular file') + ' ' + q(destPath) + ': ' + ERR[r.err]); st = 1; return; }
      if (srcNode.type === 'd') {
        var target = r.node;
        if (target && target.type !== 'd') { c.err('cp: cannot overwrite non-directory ' + q(destPath) + ' with directory ' + q(srcPath)); st = 1; return; }
        if (!target) {
          if (!r.parent || !can(r.parent, c.cred, 2) || !can(r.parent, c.cred, 1)) { c.err('cp: cannot create directory ' + q(destPath) + ': ' + ERR[r.parent ? 'EACCES' : 'ENOENT']); st = 1; return; }
          target = newNode(c, 'd', srcNode.mode & ~sh.umask & 0xfff, r.parent);
          if (pres) { target.mode = srcNode.mode; target.uid = c.cred.uid === 0 ? srcNode.uid : target.uid; target.mtime = srcNode.mtime; }
          r.parent.children[r.name] = target;
        }
        if (o.v) c.out(q(srcPath) + ' -> ' + q(destPath) + '\n');
        Object.keys(srcNode.children).sort(cmpStr).forEach(function (nm) {
          if (srcNode.children[nm] === target) return;
          if (!can(srcNode, c.cred, 4)) { c.err('cp: cannot open directory ' + q(srcPath) + ' for reading: ' + ERR.EACCES); st = 1; return; }
          put(srcNode.children[nm], join(srcPath, nm), join(destPath, nm));
        });
        return;
      }
      if (r.node) {
        if (r.node === srcNode) { c.err('cp: ' + q(srcPath) + ' and ' + q(destPath) + ' are the same file'); st = 1; return; }
        if (o.n) return;
        if (o.i) { c.out('cp: overwrite ' + q(destPath) + '? （道場では確認に答えられないため、上書きしません）\n'); return; }
        if (r.node.type === 'd') { c.err('cp: cannot overwrite directory ' + q(destPath) + ' with non-directory'); st = 1; return; }
        if (!can(r.node, c.cred, 2)) { c.err('cp: cannot create regular file ' + q(destPath) + ': ' + ERR.EACCES); st = 1; return; }
        r.node.data = srcNode.type === 'f' ? srcNode.data : r.node.data; r.node.mtime = pres ? srcNode.mtime : fs.tick();
        if (pres) r.node.mode = srcNode.mode;
        if (o.v) c.out(q(srcPath) + ' -> ' + q(destPath) + '\n');
        return;
      }
      if (!r.parent || r.dangling || !can(r.parent, c.cred, 2) || !can(r.parent, c.cred, 1)) { c.err('cp: cannot create regular file ' + q(destPath) + ': ' + ERR[(r.parent && !r.dangling) ? 'EACCES' : 'ENOENT']); st = 1; return; }
      var n = copyTree(c, srcNode, null, destPath, { p: pres }, st);
      if (r.parent.mode & 0x400) n.gid = r.parent.gid;
      n.parent = r.parent; r.parent.children[r.name] = n; r.parent.mtime = fs.tick();
      if (o.v) c.out(q(srcPath) + ' -> ' + q(destPath) + '\n');
    }
    srcs.forEach(function (s) {
      var follow = !(rec && !o.L), sr = sh.stat(s, !rec && true);
      if (rec) sr = sh.stat(s, false);
      if (sr.err || !sr.node) { c.err('cp: cannot stat ' + q(s) + ': ' + ERR[sr.err || 'ENOENT']); st = 1; return; }
      var node = sr.node;
      if (node.type === 'd' && !rec) { c.err('cp: -r not specified; omitting directory ' + q(s)); st = 1; return; }
      if (node.type === 'f' && !can(node, c.cred, 4)) { c.err('cp: cannot open ' + q(s) + ' for reading: ' + ERR.EACCES); st = 1; return; }
      var dest = dstIsDir ? join(dst, base(s)) : dst;
      if (node.type === 'd' && dstIsDir) {
        var chk = sh.stat(dest, true);
        // 自分自身の内側へはコピーできない
        var t = dr.node; while (t && t !== t.parent) { if (t === node) { c.err('cp: cannot copy a directory, ' + q(s) + ', into itself, ' + q(dest)); st = 1; return; } t = t.parent; }
      }
      put(node, s, dest);
    });
    return st;
  });
  reg('mv', function (c) {
    var res = parseArgs(c.args, { bool: 'ifnuvT', long: { force: 'f', interactive: 'i', 'no-clobber': 'n', verbose: 'v' } });
    if (res.err) return pe(c, 'mv', res);
    var o = res.o, sh = c.sh, fs = sh.fs, a = res.rest, st = 0;
    if (a.length < 2) { c.err(a.length ? 'mv: missing destination file operand after ' + q(a[0]) : 'mv: missing file operand'); return 1; }
    var dst = a[a.length - 1], srcs = a.slice(0, -1), dr = sh.stat(dst, true), dstIsDir = dr.node && dr.node.type === 'd';
    if (srcs.length > 1 && !dstIsDir) { c.err('mv: target ' + q(dst) + ' is not a directory'); return 1; }
    srcs.forEach(function (s) {
      var sr = sh.stat(s.replace(/(.)\/+$/, '$1'), false);
      if (sr.err || !sr.node) { c.err('mv: cannot stat ' + q(s) + ': ' + ERR[sr.err || 'ENOENT']); st = 1; return; }
      var dest = dstIsDir ? join(dst, base(s)) : dst, r = sh.stat(dest, false);
      if (r.err) { c.err('mv: cannot move ' + q(s) + ' to ' + q(dest) + ': ' + ERR[r.err]); st = 1; return; }
      if (!r.parent) { c.err('mv: cannot move ' + q(s) + ' to ' + q(dest) + ': ' + ERR.ENOENT); st = 1; return; }
      if (r.node === sr.node) { c.err('mv: ' + q(s) + ' and ' + q(dest) + ' are the same file'); st = 1; return; }
      if (sr.node.type === 'd') { var t = r.parent; while (t && t !== t.parent) { if (t === sr.node) { c.err('mv: cannot move ' + q(s) + ' to a subdirectory of itself, ' + q(dest)); st = 1; return; } t = t.parent; } }
      if (!removable(c, sr.parent, sr.node) || !can(r.parent, c.cred, 2) || !can(r.parent, c.cred, 1)) { c.err('mv: cannot move ' + q(s) + ' to ' + q(dest) + ': ' + ERR.EACCES); st = 1; return; }
      if (r.node) {
        if (o.n) return;
        if (o.i) { c.out('mv: overwrite ' + q(dest) + '? （道場では確認に答えられないため、上書きしません）\n'); return; }
        if (r.node.type === 'd' && sr.node.type !== 'd') { c.err('mv: cannot overwrite directory ' + q(dest) + ' with non-directory'); st = 1; return; }
        if (r.node.type !== 'd' && sr.node.type === 'd') { c.err('mv: cannot overwrite non-directory ' + q(dest) + ' with directory ' + q(s)); st = 1; return; }
        if (r.node.type === 'd' && Object.keys(r.node.children).length) { c.err('mv: cannot move ' + q(s) + ' to ' + q(dest) + ': ' + ERR.ENOTEMPTY); st = 1; return; }
        if (r.node.type !== 'd') r.node.nlink--;
      }
      delete sr.parent.children[sr.name]; sr.parent.mtime = fs.tick();
      r.parent.children[r.name] = sr.node; if (sr.node.type === 'd') sr.node.parent = r.parent; r.parent.mtime = fs.tick();
      if (o.v) c.out("renamed " + q(s) + ' -> ' + q(dest) + '\n');
    });
    return st;
  });
  reg('ln', function (c) {
    var res = parseArgs(c.args, { bool: 'sfvn', long: { symbolic: 's', force: 'f', verbose: 'v' } });
    if (res.err) return pe(c, 'ln', res);
    var o = res.o, sh = c.sh, fs = sh.fs, a = res.rest;
    if (!a.length) { c.err('ln: missing file operand'); return 1; }
    var target = a[0], link = a[1];
    if (link === undefined) link = base(target);
    var lr = sh.stat(link, true);
    if (lr.node && lr.node.type === 'd') link = join(link, base(target));
    var r = sh.stat(link, false);
    if (r.err || !r.parent) { c.err('ln: failed to create ' + (o.s ? 'symbolic' : 'hard') + ' link ' + q(link) + ': ' + ERR[r.err || 'ENOENT']); return 1; }
    if (r.node) {
      if (!o.f) { c.err('ln: failed to create ' + (o.s ? 'symbolic' : 'hard') + ' link ' + q(link) + ': ' + ERR.EEXIST); return 1; }
      if (r.node.type !== 'd') { delete r.parent.children[r.name]; r.node.nlink--; }
    }
    if (!can(r.parent, c.cred, 2) || !can(r.parent, c.cred, 1)) { c.err('ln: failed to create ' + (o.s ? 'symbolic' : 'hard') + ' link ' + q(link) + ': ' + ERR.EACCES); return 1; }
    if (o.s) {
      var n = newNode(c, 'l', 0x1ff, r.parent); n.target = target; r.parent.children[r.name] = n; r.parent.mtime = n.mtime;
    } else {
      var tr = sh.stat(target, false);
      if (tr.err || !tr.node) { c.err('ln: failed to access ' + q(target) + ': ' + ERR[tr.err || 'ENOENT']); return 1; }
      if (tr.node.type === 'd') { c.err('ln: ' + q(link) + ': hard link not allowed for directory'); return 1; }
      tr.node.nlink++; r.parent.children[r.name] = tr.node; r.parent.mtime = fs.tick();
    }
    if (o.v) c.out(q(link) + ' ' + (o.s ? '->' : '=>') + ' ' + q(target) + '\n');
    return 0;
  });

  /* ---------- 権限・所有者 ---------- */
  function applyMode(old, spec, umask, isDir) {
    if (/^[0-7]+$/.test(spec)) return parseInt(spec, 8) & 0xfff;
    var mode = old, ok = true;
    spec.split(',').forEach(function (cl) {
      var m = /^([ugoa]*)(([+\-=])([rwxXst]*|[ugo]))+$/.exec(cl);
      if (!m) { ok = false; return; }
      var who = /^[ugoa]*/.exec(cl)[0], rest = cl.slice(who.length), noWho = who === '';
      if (noWho || who.indexOf('a') >= 0) who = 'ugo';
      var re = /([+\-=])([ugo]|[rwxXst]*)/g, mm;
      while ((mm = re.exec(rest))) {
        var op = mm[1], pm = mm[2], bits = 0, sp = 0;
        if (/^[ugo]$/.test(pm)) { var src = mm[2] === 'u' ? (mode >> 6) & 7 : mm[2] === 'g' ? (mode >> 3) & 7 : mode & 7; bits = src; }
        else pm.split('').forEach(function (ch) { if (ch === 'r') bits |= 4; else if (ch === 'w') bits |= 2; else if (ch === 'x') bits |= 1; else if (ch === 'X') { if (isDir || (old & 73)) bits |= 1; } else if (ch === 's') sp |= 1; else if (ch === 't') sp |= 2; });
        who.split('').forEach(function (w) {
          var sh = w === 'u' ? 6 : w === 'g' ? 3 : 0, b = bits;
          if (noWho) b &= ~(umask >> sh) & 7;
          var special = 0;
          if (sp & 1) special |= (w === 'u' ? 0x800 : w === 'g' ? 0x400 : 0);
          if (sp & 2) special |= (w === 'o' ? 0x200 : 0);
          if (op === '+') mode |= (b << sh) | special;
          else if (op === '-') mode &= ~((b << sh) | special);
          else { mode = (mode & ~(7 << sh)) | (b << sh); mode &= ~(w === 'u' ? 0x800 : w === 'g' ? 0x400 : 0x200); mode |= special; }
        });
      }
    });
    return ok ? mode & 0xfff : null;
  }
  VSH.applyMode = applyMode;
  reg('chmod', function (c) {
    // chmod は `-w` のような記号モードが先頭に来ることがあるので、オプションは -R -v -c -f だけを自前で解釈する
    var res = { o: {}, rest: [] }, endOpt = false;
    c.args.forEach(function (x) {
      if (!endOpt && x === '--') { endOpt = true; return; }
      if (!endOpt && /^-[Rvcf]+$/.test(x)) { x.slice(1).split('').forEach(function (ch) { res.o[ch] = 1; }); return; }
      if (!endOpt && x === '--recursive') { res.o.R = 1; return; }
      res.rest.push(x);
    });
    var a = res.rest, sh = c.sh, st = 0;
    if (a.length < 2) { c.err(a.length ? 'chmod: missing operand after ' + q(a[0]) : 'chmod: missing operand'); return 1; }
    var spec = a[0];
    if (applyMode(0, spec, sh.umask, false) === null) { c.err('chmod: invalid mode: ' + q(spec) + "\nTry 'chmod --help' for more information."); return 1; }
    function doOne(p, node) {
      if (c.cred.uid !== 0 && c.cred.uid !== node.uid) { c.err('chmod: changing permissions of ' + q(p) + ': ' + ERR.EPERM); st = 1; return; }
      var nm = applyMode(node.mode, spec, sh.umask, node.type === 'd');
      if (/^[0-7]+$/.test(spec) && node.type === 'd' && spec.length < 5) nm = (nm & 0x1ff) | (spec.length === 4 ? (nm & 0xe00) : (node.mode & 0xc00));
      node.mode = nm;
    }
    function rec(p, node) {
      doOne(p, node);
      if (res.o.R && node.type === 'd') Object.keys(node.children).sort(cmpStr).forEach(function (nm) { var ch = node.children[nm]; if (ch.type !== 'l') rec(join(p, nm), ch); });
    }
    a.slice(1).forEach(function (p) {
      var r = sh.stat(p, true);
      if (r.err || !r.node) { c.err('chmod: cannot access ' + q(p) + ': ' + ERR[r.err || 'ENOENT']); st = 1; return; }
      rec(p, r.node);
    });
    return st;
  });
  function chownImpl(c, name, mode) {
    var res = parseArgs(c.args, { bool: 'Rv', long: { recursive: 'R', verbose: 'v' } });
    if (res.err) return pe(c, name, res);
    var a = res.rest, sh = c.sh, st = 0;
    if (a.length < 2) { c.err(name + ': missing operand'); return 1; }
    var uid = null, gid = null, spec = a[0];
    if (mode === 'chgrp') { gid = VSH.gidOf(spec); if (gid === null) { c.err('chgrp: invalid group: ' + q(spec)); return 1; } }
    else {
      var m = /^([^:.]*)(?:[:.](.*))?$/.exec(spec);
      if (m[1] !== '') { uid = VSH.uidOf(m[1]); if (uid === null) { c.err('chown: invalid user: ' + q(spec)); return 1; } }
      if (m[2] !== undefined && m[2] !== '') { gid = VSH.gidOf(m[2]); if (gid === null) { c.err('chown: invalid group: ' + q(spec)); return 1; } }
    }
    function one(p, node) {
      if (uid !== null && uid !== node.uid && c.cred.uid !== 0) { c.err(name + ': changing ownership of ' + q(p) + ': ' + ERR.EPERM); st = 1; return; }
      if (gid !== null && gid !== node.gid && c.cred.uid !== 0 && !(c.cred.uid === node.uid && c.cred.gids.indexOf(gid) >= 0)) { c.err(name + ': changing group of ' + q(p) + ': ' + ERR.EPERM); st = 1; return; }
      if (uid !== null) node.uid = uid; if (gid !== null) node.gid = gid;
      if (node.type === 'f' && (uid !== null || gid !== null)) node.mode &= ~0xc00;      // 所有者が変わると setuid/setgid は外れる
    }
    function rec(p, node) { one(p, node); if (res.o.R && node.type === 'd') Object.keys(node.children).forEach(function (nm) { if (node.children[nm].type !== 'l') rec(join(p, nm), node.children[nm]); }); }
    a.slice(1).forEach(function (p) {
      var r = sh.stat(p, true);
      if (r.err || !r.node) { c.err(name + ': cannot access ' + q(p) + ': ' + ERR[r.err || 'ENOENT']); st = 1; return; }
      rec(p, r.node);
    });
    return st;
  }
  reg('chown', function (c) { return chownImpl(c, 'chown', 'chown'); });
  reg('chgrp', function (c) { return chownImpl(c, 'chgrp', 'chgrp'); });
  reg('stat', function (c) {
    var st = 0;
    c.args.filter(function (a) { return a[0] !== '-'; }).forEach(function (p) {
      var r = c.sh.stat(p, false);
      if (r.err || !r.node) { c.err('stat: cannot statx ' + q(p) + ': ' + ERR[r.err || 'ENOENT']); st = 1; return; }
      var n = r.node, sz = n.type === 'f' ? n.data.length : n.type === 'l' ? n.target.length : 4096, d = function (ms) { var x = new Date(ms), p2 = function (v) { return (v < 10 ? '0' : '') + v; }; return x.getUTCFullYear() + '-' + p2(x.getUTCMonth() + 1) + '-' + p2(x.getUTCDate()) + ' ' + p2(x.getUTCHours()) + ':' + p2(x.getUTCMinutes()) + ':00.000000000 +0000'; };
      c.out('  File: ' + p + (n.type === 'l' ? ' -> ' + n.target : '') + '\n  Size: ' + sz + '\t\tBlocks: ' + (blocks(n) * 2) + '\t   IO Block: 4096   ' + (n.type === 'd' ? 'directory' : n.type === 'l' ? 'symbolic link' : (sz ? 'regular file' : 'regular empty file')) + '\n' +
        'Device: 801h/2049d\tInode: ' + n.ino + '  Links: ' + nlinkOf(n) + '\nAccess: (' + ('0000' + (n.mode & 0xfff).toString(8)).slice(-4) + '/' + VSH.fmtMode(n) + ')  Uid: (' + ('     ' + n.uid).slice(-5) + '/' + ('        ' + VSH.USERS[n.uid]).slice(-8) + ')   Gid: (' + ('     ' + n.gid).slice(-5) + '/' + ('        ' + VSH.GROUPS[n.gid]).slice(-8) + ')\nModify: ' + d(n.mtime) + '\n');
    });
    return st;
  });
  reg('file', function (c) {
    var st = 0;
    c.args.filter(function (a) { return a[0] !== '-'; }).forEach(function (p) {
      var r = c.sh.stat(p, false);
      if (r.err || !r.node) { c.out(p + ': cannot open `' + p + "' (No such file or directory)\n"); st = 1; return; }
      var n = r.node, t = n.type === 'd' ? 'directory' : n.type === 'l' ? 'symbolic link to ' + n.target : n.data.indexOf('#!ELF') === 0 ? 'ELF 64-bit LSB pie executable, x86-64' : /^#!\/bin\/(ba)?sh/.test(n.data) ? 'Bourne-Again shell script, ASCII text executable' : n.data === '' ? 'empty' : n.data.indexOf('\u0000GZ') === 0 ? 'gzip compressed data' : n.data.indexOf('\u0000BZ') === 0 ? 'bzip2 compressed data' : n.data.indexOf('\u0000XZ') === 0 ? 'XZ compressed data' : n.data.indexOf('\u0000TAR') === 0 ? 'POSIX tar archive' : /[^\x00-\x7f]/.test(n.data) ? 'Unicode text, UTF-8 text' : 'ASCII text';
      c.out(p + ': ' + t + '\n');
    });
    return st;
  });

  /* ---------- find ---------- */
  function globRe(p, ci) {
    var s = '^';
    for (var i = 0; i < p.length; i++) {
      var ch = p[i];
      if (ch === '*') s += '.*'; else if (ch === '?') s += '.';
      else if (ch === '[') { var j = p.indexOf(']', i + 2); if (j < 0) s += '\\['; else { var b = p.slice(i + 1, j); if (b[0] === '!') b = '^' + b.slice(1); s += '[' + b + ']'; i = j; } }
      else if (ch === '\\' && i + 1 < p.length) { s += p[i + 1].replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); i++; }
      else s += ch.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    }
    return new RegExp(s + '$', ci ? 'i' : '');
  }
  VSH.globRe = globRe;
  reg('find', function (c) {
    var a = c.args.slice(), sh = c.sh, paths = [];
    while (a.length && a[0][0] !== '-' && a[0] !== '!' && a[0] !== '(' && a[0] !== '\\(') paths.push(a.shift());
    if (!paths.length) paths.push('.');
    var maxd = Infinity, mind = 0, now = sh.fs.clock, st = 0, depthFirst = false;
    // 式の構文解析（-o / -a / ! / \( \) 対応）
    var pos = 0, hasAction = false;
    function parseOr() { var l = parseAnd(); while (a[pos] === '-o' || a[pos] === '-or') { pos++; var r = parseAnd(); l = (function (x, y) { return function (e) { return x(e) || y(e); }; })(l, r); } return l; }
    function parseAnd() {
      var l = parseNot();
      while (pos < a.length && a[pos] !== '-o' && a[pos] !== '-or' && a[pos] !== ')' && a[pos] !== '\\)') {
        if (a[pos] === '-a' || a[pos] === '-and') pos++;
        var r = parseNot(); l = (function (x, y) { return function (e) { return x(e) && y(e); }; })(l, r);
      }
      return l;
    }
    function parseNot() {
      if (a[pos] === '!' || a[pos] === '-not') { pos++; var p = parseNot(); return function (e) { return !p(e); }; }
      return parsePrim();
    }
    function num(s, v, unit) { var m = /^([+-]?)(\d+)$/.exec(s); if (!m) throw new Error('find: invalid argument `' + s + '\''); var n = +m[2]; return m[1] === '+' ? v > n : m[1] === '-' ? v < n : v === n; }
    function parsePrim() {
      var t = a[pos++];
      if (t === '(' || t === '\\(') { var e = parseOr(); if (a[pos] === ')' || a[pos] === '\\)') pos++; return e; }
      var arg;
      switch (t) {
        case '-name': arg = a[pos++]; { var re = globRe(arg); return function (e) { return re.test(e.name); }; }
        case '-iname': arg = a[pos++]; { var re2 = globRe(arg, true); return function (e) { return re2.test(e.name); }; }
        case '-path': case '-wholename': arg = a[pos++]; { var re3 = globRe(arg); return function (e) { return re3.test(e.path); }; }
        case '-type': arg = a[pos++]; return function (e) { return e.node.type === ({ f: 'f', d: 'd', l: 'l' }[arg]); };
        case '-user': arg = a[pos++]; { var u = VSH.uidOf(arg); return function (e) { return e.node.uid === u; }; }
        case '-group': arg = a[pos++]; { var g = VSH.gidOf(arg); return function (e) { return e.node.gid === g; }; }
        case '-empty': return function (e) { return e.node.type === 'd' ? !Object.keys(e.node.children).length : (e.node.type === 'f' && e.node.data.length === 0); };
        case '-mtime': arg = a[pos++]; return function (e) { return num(arg, Math.floor((now - e.node.mtime) / 86400000)); };
        case '-mmin': arg = a[pos++]; return function (e) { return num(arg, Math.ceil((now - e.node.mtime) / 60000)); };
        case '-newer': arg = a[pos++]; { var nr = sh.stat(arg, true); return function (e) { return nr.node && e.node.mtime > nr.node.mtime; }; }
        case '-size': arg = a[pos++]; return function (e) {
          var m = /^([+-]?)(\d+)([bckMGw]?)$/.exec(arg); if (!m) throw new Error('find: invalid argument `' + arg + "' to `-size'");
          var unit = { b: 512, '': 512, c: 1, k: 1024, M: 1048576, G: 1073741824, w: 2 }[m[3]], sz = e.node.type === 'f' ? e.node.data.length : e.node.type === 'l' ? e.node.target.length : 4096;
          var v = Math.ceil(sz / unit), n = +m[2]; return m[1] === '+' ? v > n : m[1] === '-' ? v < n : v === n;
        };
        case '-perm': arg = a[pos++]; return function (e) {
          var m = e.node.mode & 0xfff, mt = /^([-\/]?)(.*)$/.exec(arg), kind = mt[1], sp = mt[2], want;
          if (/^[0-7]+$/.test(sp)) want = parseInt(sp, 8); else { want = VSH.applyMode(0, sp, 0, false); if (want === null) throw new Error('find: Invalid mode `' + arg + "'"); }
          if (kind === '-') return (m & want) === want; if (kind === '/') return (m & want) !== 0; return m === want;
        };
        case '-maxdepth': maxd = +a[pos++]; return function () { return true; };
        case '-mindepth': mind = +a[pos++]; return function () { return true; };
        case '-depth': depthFirst = true; return function () { return true; };
        case '-true': return function () { return true; };
        case '-print': hasAction = true; return function (e) { c.out(e.path + '\n'); return true; };
        case '-print0': hasAction = true; return function (e) { c.out(e.path + '\u0000'); return true; };
        case '-delete': hasAction = true; depthFirst = true; return function (e) {
          if (e.path === e.start && false) return true;
          var pr = e.parent; if (!pr) return true;
          if (e.node.type === 'd' && Object.keys(e.node.children).length) return true;
          if (!removable(c, pr, e.node)) { c.err('find: cannot delete ' + q(e.path) + ': ' + ERR.EACCES); st = 1; return false; }
          unlink(sh, pr, e.name); return true;
        };
        case '-exec': case '-execdir': case '-ok': {
          hasAction = true; var cmd = []; while (pos < a.length && a[pos] !== ';' && a[pos] !== '\\;' && a[pos] !== '+') cmd.push(a[pos++]);
          var plus = a[pos] === '+'; pos++;
          if (plus) { var batch = []; execAfter.push(function () { if (!batch.length) return; var argv = []; cmd.forEach(function (x) { if (x === '{}') batch.forEach(function (b) { argv.push(b); }); else argv.push(x); }); var r = sh.runCmd(argv, '', {}); r.chunks.forEach(function (x) { c.chunks.push(x); }); }); return function (e) { batch.push(e.path); return true; }; }
          return function (e) { var argv = cmd.map(function (x) { return x === '{}' ? e.path : x.replace(/\{\}/g, e.path); }); var r = sh.runCmd(argv, '', {}); r.chunks.forEach(function (x) { c.chunks.push(x); }); return r.status === 0; };
        }
        default: throw new Error('find: unknown predicate `' + t + "'");
      }
    }
    var execAfter = [], expr;
    try {
      expr = a.length ? parseOr() : function () { return true; };
      if (pos < a.length) throw new Error("find: paths must precede expression: `" + a[pos] + "'");
    } catch (e) { c.err(e.message); return 1; }
    var show = function (e) { if (!hasAction) c.out(e.path + '\n'); };
    function visit(path, node, parent, name, depth, start) {
      var e = { path: path, node: node, parent: parent, name: name, start: start };
      var kids = [];
      if (node.type === 'd' && depth < maxd) {
        if (!can(node, c.cred, 4) || !can(node, c.cred, 1)) c.err('find: ' + q(path) + ': ' + ERR.EACCES);
        else kids = Object.keys(node.children).sort(cmpStr);
      }
      var test = function () { if (depth >= mind) { var ok; try { ok = expr(e); } catch (er) { c.err(er.message); st = 1; ok = false; } if (ok) show(e); } };
      if (!depthFirst) test();
      kids.forEach(function (nm) { visit(join(path, nm), node.children[nm], node, nm, depth + 1, start); });
      if (depthFirst) test();
    }
    paths.forEach(function (p) {
      var r = sh.stat(p, false);
      if (r.err || !r.node) { c.err('find: ' + q(p) + ': ' + ERR[r.err || 'ENOENT']); st = 1; return; }
      visit(p, r.node, r.parent, base(p), 0, p);
    });
    execAfter.forEach(function (f) { f(); });
    return st;
  });

  /* ---------- tar / 圧縮 ---------- */
  function collect(c, p, entries, tarName, o) {
    var r = c.sh.stat(p, false);
    if (r.err || !r.node) { c.err('tar: ' + p + ': Cannot stat: ' + ERR[r.err || 'ENOENT']); return false; }
    var name = p.replace(/^\/+/, '').replace(/\/+$/, '');
    function add(path, n) {
      if (n.type === 'f' && !can(n, c.cred, 4)) { c.err('tar: ' + path + ': Cannot open: ' + ERR.EACCES); return; }
      entries.push({ path: path + (n.type === 'd' ? '/' : ''), type: n.type, mode: n.mode, uid: n.uid, gid: n.gid, mtime: n.mtime, data: n.data, target: n.target });
      if (o.v) c.out(path + (n.type === 'd' ? '/' : '') + '\n');
      if (n.type === 'd') Object.keys(n.children).sort(cmpStr).forEach(function (nm) { add(path + '/' + nm, n.children[nm]); });
    }
    add(name, r.node); return true;
  }
  var COMP = { z: ['GZ', '.gz'], j: ['BZ', '.bz2'], J: ['XZ', '.xz'] };
  reg('tar', function (c) {
    var a = c.args.slice();
    if (!a.length) { c.err("tar: You must specify one of the '-Acdtrux' options"); return 2; }
    var first = a[0], opts = {}, argsRest = [], file = null, dir = null, i = 0;
    if (first[0] !== '-' || /^-[A-Za-z]+$/.test(first)) {
      var letters = first.replace(/^-/, '').split('');
      a.shift();
      letters.forEach(function (ch) {
        if (ch === 'f') { opts.f = true; file = a.shift(); }
        else if (ch === 'C') { dir = a.shift(); }
        else opts[ch] = true;
      });
    }
    var rest = [];
    for (i = 0; i < a.length; i++) {
      if (a[i] === '-f') { file = a[++i]; opts.f = true; }
      else if (a[i] === '-C') dir = a[++i];
      else if (/^-[A-Za-z]+$/.test(a[i]) && !opts.noMore) { a[i].slice(1).split('').forEach(function (ch) { if (ch === 'f') { file = a[++i]; opts.f = true; } else opts[ch] = true; }); }
      else if (a[i] === '--') { }
      else rest.push(a[i]);
    }
    if (!opts.f || file === undefined || file === null) { c.err('tar: Refusing to read archive contents from terminal (missing -f option?)'); return 2; }
    var sh = c.sh, saveCwd = sh.cwd, st = 0;
    if (dir) { var dr = sh.stat(dir, true); if (!dr.node || dr.node.type !== 'd') { c.err('tar: ' + dir + ': Cannot open: ' + ERR[dr.err || 'ENOENT']); return 2; } }
    var cwdBefore = sh.cwd, fileName = file;
    file = sh.abs(file);                 // アーカイブは -C で移動する前のカレントディレクトリ基準で開く
    if (dir) sh.cwd = sh.abs(dir);
    try {
      var ops = ['c', 'x', 't'].filter(function (k) { return opts[k]; });
      if (ops.length !== 1) { c.err("tar: You must specify one of the '-Acdtrux' options"); return 2; }
      var comp = opts.z ? 'z' : opts.j ? 'j' : opts.J ? 'J' : '';
      if (opts.c) {
        if (!rest.length) { c.err('tar: Cowardly refusing to create an empty archive'); return 2; }
        var entries = [], removed = false;
        rest.forEach(function (p) { if (p.charAt(0) === '/') removed = true; if (!collect(c, p, entries, file, opts)) st = 2; });
        if (removed) c.err("tar: Removing leading `/' from member names");
        var ow = sh.openWrite(file, false);
        if (ow.err) { c.err('tar: ' + fileName + ': Cannot open: ' + ERR[ow.err]); return 2; }
        ow.node.data = '\u0000TAR' + JSON.stringify(entries);
        if (comp) ow.node.data = '\u0000' + COMP[comp][0] + ow.node.data;
        ow.node.mtime = sh.fs.tick(); return st;
      }
      var r = sh.stat(file, true);
      if (r.err || !r.node) { c.err('tar: ' + fileName + ': Cannot open: ' + ERR[r.err || 'ENOENT']); c.err('tar: Error is not recoverable: exiting now'); return 2; }
      var d = r.node.data, hdr = d.slice(1, 3);
      if (d.slice(0, 1) !== '\u0000' || (hdr !== 'TA' && hdr !== 'GZ' && hdr !== 'BZ' && hdr !== 'XZ')) { c.err('tar: This does not look like a tar archive'); c.err('tar: Skipping to next header'); c.err('tar: Exiting with failure status due to previous errors'); return 2; }
      var payload = hdr === 'TA' ? d.slice(4) : (d.slice(3, 7) === '\u0000TAR' ? d.slice(7) : null), ents;
      if (payload === null) { c.err('tar: This does not look like a tar archive'); return 2; }
      if (hdr === 'TA' && comp) { c.err((comp === 'z' ? 'gzip' : comp === 'j' ? 'bzip2' : 'xz') + ': stdin: not in ' + (comp === 'z' ? 'gzip' : comp === 'j' ? 'bzip2' : 'xz') + ' format'); c.err('tar: Child returned status 1'); c.err('tar: Error is not recoverable: exiting now'); return 2; }
      try { ents = JSON.parse(payload); } catch (e) { c.err('tar: This does not look like a tar archive'); return 2; }
      if (opts.t) {
        ents.forEach(function (e) {
          if (rest.length && !rest.some(function (x) { return e.path.replace(/\/$/, '') === x || e.path.indexOf(x.replace(/\/$/, '') + '/') === 0; })) return;
          if (opts.v) { var n = { type: e.type, mode: e.mode }; var x = new Date(e.mtime), p2 = function (v) { return (v < 10 ? '0' : '') + v; }; c.out(VSH.fmtMode(n) + ' ' + VSH.USERS[e.uid] + '/' + VSH.GROUPS[e.gid] + ' ' + ('       ' + (e.type === 'f' ? e.data.length : 0)).slice(-7) + ' ' + x.getUTCFullYear() + '-' + p2(x.getUTCMonth() + 1) + '-' + p2(x.getUTCDate()) + ' ' + p2(x.getUTCHours()) + ':' + p2(x.getUTCMinutes()) + ' ' + e.path + '\n'); }
          else c.out(e.path + '\n');
        });
        return 0;
      }
      // 展開
      ents.forEach(function (e) {
        if (rest.length && !rest.some(function (x) { return e.path.replace(/\/$/, '') === x || e.path.indexOf(x.replace(/\/$/, '') + '/') === 0; })) return;
        var p = e.path.replace(/\/$/, ''), rr = sh.stat(p, false);
        var parentPath = VSH.dirOf(p), pr = sh.stat(parentPath, true);
        if (!pr.node || pr.node.type !== 'd') { c.err('tar: ' + p + ': Cannot open: ' + ERR.ENOENT); st = 2; return; }
        if (!can(pr.node, c.cred, 2) || !can(pr.node, c.cred, 1)) { c.err('tar: ' + p + ': Cannot open: ' + ERR.EACCES); st = 2; return; }
        var node = rr.node;
        if (e.type === 'd') {
          if (!node) { node = newNode(c, 'd', e.mode & ~sh.umask & 0xfff, pr.node); pr.node.children[base(p)] = node; }
          node.mtime = e.mtime;
        } else if (e.type === 'l') {
          if (node) unlink(sh, pr.node, base(p));
          var ln = newNode(c, 'l', 0x1ff, pr.node); ln.target = e.target; pr.node.children[base(p)] = ln;
        } else {
          if (node && node.type === 'f') { if (!can(node, c.cred, 2)) { c.err('tar: ' + p + ': Cannot open: ' + ERR.EACCES); st = 2; return; } node.data = e.data; }
          else { node = newNode(c, 'f', e.mode & 0xfff & ~sh.umask, pr.node); node.data = e.data; pr.node.children[base(p)] = node; }
          node.mode = (e.mode & 0x1ff & ~sh.umask) | (e.mode & 0xe00 ? 0 : 0); node.mtime = e.mtime;
        }
        if (opts.v) c.out(e.path + '\n');
      });
      return st;
    } finally { sh.cwd = cwdBefore; }
  });
  function compress(name, tag, ext, uncmd) {
    reg(name, function (c) {
      var res = parseArgs(c.args, { bool: 'kdcfv123456789', long: { keep: 'k', decompress: 'd', stdout: 'c', force: 'f', verbose: 'v' }, ignoreLong: true });
      if (res.err) return pe(c, name, res);
      var o = res.o, sh = c.sh, st = 0;
      if (!res.rest.length) { c.err(name + ': compressed data not written to a terminal. Use -f to force compression.'); return 1; }
      res.rest.forEach(function (p) {
        var r = sh.stat(p, true);
        if (r.err || !r.node) { c.err(name + ': ' + p + ': ' + ERR[r.err || 'ENOENT']); st = 1; return; }
        if (r.node.type === 'd') { c.err(name + ': ' + p + ' is a directory -- ignored'); st = 1; return; }
        if (!can(r.node, c.cred, 4)) { c.err(name + ': ' + p + ': ' + ERR.EACCES); st = 1; return; }
        var d = r.node.data;
        if (o.d) {
          if (p.slice(-ext.length) !== ext) { c.err(name + ': ' + p + ': unknown suffix -- ignored'); st = 1; return; }
          if (d.indexOf('\u0000' + tag) !== 0) { c.err(name + ': ' + p + ': not in ' + name + ' format'); st = 1; return; }
          var orig = d.slice(3);
          if (o.c) { c.out(orig); return; }
          var out = p.slice(0, -ext.length), ow = sh.openWrite(out, false);
          if (ow.err) { c.err(name + ': ' + out + ': ' + ERR[ow.err]); st = 1; return; }
          ow.node.data = orig; ow.node.mtime = r.node.mtime; ow.node.mode = r.node.mode;
          if (!o.k) unlink(sh, r.parent, r.name); return;
        }
        if (p.slice(-ext.length) === ext) { c.err(name + ': ' + p + ' already has ' + ext + ' suffix -- unchanged'); st = 1; return; }
        if (o.c) { c.out('\u0000' + tag + d); return; }
        var out2 = p + ext, ow2 = sh.openWrite(out2, false);
        if (ow2.err) { c.err(name + ': ' + out2 + ': ' + ERR[ow2.err]); st = 1; return; }
        ow2.node.data = '\u0000' + tag + d; ow2.node.mtime = r.node.mtime; ow2.node.mode = r.node.mode;
        if (!o.k) unlink(sh, r.parent, r.name);
      });
      return st;
    });
    reg(uncmd, function (c) { return CMDS[name](Object.assign({}, c, { args: ['-d'].concat(c.args) })); });
  }
  compress('gzip', 'GZ', '.gz', 'gunzip'); compress('bzip2', 'BZ', '.bz2', 'bunzip2'); compress('xz', 'XZ', '.xz', 'unxz');
  reg('zcat', function (c) { return CMDS.gzip(Object.assign({}, c, { args: ['-dc'].concat(c.args) })); });
})(typeof window !== 'undefined' ? window : globalThis);
