/* vsh — コマンド（その2）: テキスト処理（cat head tail wc sort uniq cut tr paste grep sed tee xargs ほか） */
(function (G) {
  'use strict';
  var VSH = G.VSH, CMDS = VSH.CMDS, ERR = VSH.ERR, can = VSH.can, cmpStr = VSH.cmpStr, parseArgs = VSH.parseArgs;
  function reg(names, fn) { [].concat(names).forEach(function (n) { CMDS[n] = fn; }); }
  function q(s) { return "'" + s + "'"; }
  function pe(c, name, res) { c.err(name + ': ' + res.err + "\nTry '" + name + " --help' for more information."); return 2; }
  function lines(data) { if (data === '') return []; var l = data.split('\n'); if (l[l.length - 1] === '') l.pop(); return l; }
  /* 入力ファイルを読む。files が空なら標準入力。[{name, data}] */
  function inputs(c, files, cmd) {
    var out = [], st = 0;
    if (!files.length) return { list: [{ name: '-', data: c.stdin || '' }], status: 0 };
    files.forEach(function (f) {
      if (f === '-') { out.push({ name: '-', data: c.stdin || '' }); return; }
      var n = VSH.readNode(c.sh, f, c, cmd);
      if (!n) { st = 1; return; }
      out.push({ name: f, data: n.data });
    });
    return { list: out, status: st };
  }
  VSH.inputs = inputs; VSH.lines = lines;

  /* ---------- 正規表現（POSIX BRE/ERE → JavaScript） ---------- */
  var CLS = { alpha: 'A-Za-z', digit: '0-9', alnum: 'A-Za-z0-9', upper: 'A-Z', lower: 'a-z', space: ' \\t\\n\\r\\f\\v', blank: ' \\t', punct: '!-\\/:-@\\[-`{-~', xdigit: '0-9A-Fa-f', word: 'A-Za-z0-9_' };
  function reEsc(ch) { return ch.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); }
  function translate(p, ere) {
    var out = '', i = 0, n = p.length;
    function prevIsStart() { return out === '' || /(\(|\|)$/.test(out) && !/\\(\(|\|)$/.test(out); }
    while (i < n) {
      var ch = p[i];
      if (ch === '\\') {
        var nx = p[i + 1]; i += 2;
        if (nx === undefined) { out += '\\\\'; continue; }
        if (!ere && '(){}|+?'.indexOf(nx) >= 0) { out += nx; continue; }
        if (ere && '(){}|+?'.indexOf(nx) >= 0) { out += '\\' + nx; continue; }
        if (nx === '<') { out += '\\b(?=\\w)'; continue; }
        if (nx === '>') { out += '\\b(?<=\\w)'; continue; }
        if ('wWsSbB'.indexOf(nx) >= 0 || /\d/.test(nx)) { out += '\\' + nx; continue; }
        if (nx === 'n') { out += '\\n'; continue; }
        if (nx === 't') { out += '\\t'; continue; }
        out += reEsc(nx); continue;
      }
      if (ch === '[') {
        var j = i + 1, neg = false, body = '';
        if (p[j] === '^') { neg = true; j++; }
        if (p[j] === ']') { body += '\\]'; j++; }
        while (j < n && p[j] !== ']') {
          if (p[j] === '[' && p[j + 1] === ':') { var e = p.indexOf(':]', j + 2); if (e > 0) { body += CLS[p.slice(j + 2, e)] || ''; j = e + 2; continue; } }
          if (p[j] === '\\') { body += '\\\\'; j++; continue; }
          if (p[j] === '[') { body += '\\['; j++; continue; }
          if (p[j] === '^') { body += '\\^'; j++; continue; }
          body += p[j]; j++;
        }
        if (j >= n) { out += '\\['; i++; continue; }
        out += '[' + (neg ? '^' : '') + body + ']'; i = j + 1; continue;
      }
      if (ch === '*') { out += (prevIsStart() || /\^$/.test(out)) && !ere ? '\\*' : (out === '' ? '\\*' : '*'); i++; continue; }
      if (ch === '^') { if (ere || i === 0 || /\\\(|\\\|$/.test(p.slice(Math.max(0, i - 2), i))) out += '^'; else out += '\\^'; i++; continue; }
      if (ch === '$') { if (ere || i === n - 1 || /^\\[)|]/.test(p.slice(i + 1, i + 3))) out += '$'; else out += '\\$'; i++; continue; }
      if (ch === '.') { out += '.'; i++; continue; }
      if (ere && '(){}|+?'.indexOf(ch) >= 0) { out += ch; i++; continue; }
      if (!ere && '(){}|+?'.indexOf(ch) >= 0) { out += '\\' + ch; i++; continue; }
      out += reEsc(ch); i++;
    }
    return out;
  }
  VSH.translate = translate;
  function mkRe(p, ere, ci, g) {
    try { return new RegExp(translate(p, ere), (ci ? 'i' : '') + (g ? 'g' : '')); }
    catch (e) { throw new Error('Invalid regular expression'); }
  }

  /* ---------- cat ---------- */
  reg(['cat', 'less', 'more'], function (c) {
    var res = parseArgs(c.args, { bool: 'nbAETsv', long: { 'number': 'n', 'number-nonblank': 'b', 'show-all': 'A', 'show-ends': 'E', 'show-tabs': 'T' } });
    if (res.err) return pe(c, c.name, res);
    var o = res.o, inp = inputs(c, res.rest, c.name), no = 0, st = inp.status, out = '';
    inp.list.forEach(function (f) {
      var d = f.data;
      if (!(o.n || o.b || o.A || o.E || o.T || o.s)) { out += d; return; }
      var ls = d.split('\n'), endNl = ls[ls.length - 1] === ''; if (endNl) ls.pop();
      var prevBlank = false;
      ls.forEach(function (l, i) {
        if (o.s && l === '' && prevBlank) return;
        prevBlank = l === '';
        var t = l;
        if (o.A || o.T) t = t.replace(/\t/g, '^I');
        if (o.A) t = t.replace(/[\x00-\x08\x0b-\x1f]/g, function (ch) { return '^' + String.fromCharCode(ch.charCodeAt(0) + 64); });
        if (o.A || o.E) t += (endNl || i < ls.length - 1 ? '$' : '');
        if (o.b ? l !== '' : o.n) { no++; t = ('      ' + no).slice(-6) + '\t' + t; }
        out += t + (endNl || i < ls.length - 1 ? '\n' : '');
      });
    });
    c.out(out);
    return st;
  });

  /* ---------- head / tail ---------- */
  function headTail(c, isHead) {
    var res = parseArgs(c.args, { bool: 'qvf', val: 'nc', numeric: true, long: { lines: 'n', bytes: 'c', quiet: 'q', silent: 'q', verbose: 'v', follow: 'f' }, ignoreLong: true });
    if (res.err) return pe(c, isHead ? 'head' : 'tail', res);
    var o = res.o, nm = isHead ? 'head' : 'tail', mode = 'n', val = '10';
    if (o.n !== undefined) val = o.n; else if (o.num !== undefined) val = o.num;
    if (o.c !== undefined) { mode = 'c'; val = o.c; }
    var m = /^([+-]?)(\d+)$/.exec(String(val));
    if (!m) { c.err(nm + ': invalid number of ' + (mode === 'c' ? 'bytes' : 'lines') + ': ' + q(val)); return 1; }
    var plus = m[1] === '+', minus = m[1] === '-', n = +m[2], files = res.rest, inp = inputs(c, files, nm), multi = inp.list.length > 1 && !o.q || o.v;
    inp.list.forEach(function (f, idx) {
      if (multi) c.out((idx ? '\n' : '') + '==> ' + (f.name === '-' ? 'standard input' : f.name) + ' <==\n');
      var d = f.data;
      if (mode === 'c') {
        if (isHead) c.out(minus ? d.slice(0, Math.max(0, d.length - n)) : d.slice(0, n));
        else c.out(plus ? d.slice(Math.max(0, n - 1)) : (n === 0 ? '' : d.slice(-n)));
        return;
      }
      var ls = d.split('\n'), endNl = ls[ls.length - 1] === ''; if (endNl) ls.pop();
      var sel;
      if (isHead) sel = minus ? ls.slice(0, Math.max(0, ls.length - n)) : ls.slice(0, n);
      else sel = plus ? ls.slice(Math.max(0, n - 1)) : (n === 0 ? [] : ls.slice(-n));
      var withNl = endNl || (isHead ? sel.length < ls.length : false) || (!isHead && sel.length && sel[sel.length - 1] !== ls[ls.length - 1]);
      if (!isHead && sel.length && sel[sel.length - 1] === ls[ls.length - 1]) withNl = endNl;
      c.out(sel.join('\n') + (sel.length ? (withNl || endNl ? '\n' : '') : ''));
    });
    return inp.status;
  }
  reg('head', function (c) { return headTail(c, true); });
  reg('tail', function (c) { return headTail(c, false); });
  reg('tac', function (c) {
    var inp = inputs(c, c.args.filter(function (a) { return a[0] !== '-' || a === '-'; }), 'tac');
    inp.list.forEach(function (f) { c.out(lines(f.data).reverse().map(function (l) { return l + '\n'; }).join('')); });
    return inp.status;
  });
  reg('rev', function (c) {
    var inp = inputs(c, c.args, 'rev');
    inp.list.forEach(function (f) { c.out(lines(f.data).map(function (l) { return l.split('').reverse().join('') + '\n'; }).join('')); });
    return inp.status;
  });
  reg('nl', function (c) {
    var inp = inputs(c, c.args.filter(function (a) { return a[0] !== '-'; }), 'nl'), no = 0;
    inp.list.forEach(function (f) { c.out(lines(f.data).map(function (l) { if (l === '') return '       \n'; no++; return ('      ' + no).slice(-6) + '\t' + l + '\n'; }).join('')); });
    return inp.status;
  });
  reg('seq', function (c) {
    var wflag = false, nums = [], sepv;
    for (var si = 0; si < c.args.length; si++) {
      var ta = c.args[si];
      if (ta === '-s') sepv = c.args[++si]; else if (/^-s./.test(ta)) sepv = ta.slice(2); else if (ta === '-w') wflag = true; else nums.push(ta);
    }
    var res = { o: { w: wflag, s: sepv } };
    var a = nums.map(Number), sep = sepv === undefined ? '\n' : sepv;
    if (!a.length || a.some(isNaN)) { c.err("seq: invalid floating point argument"); return 1; }
    var from = 1, step = 1, to;
    if (a.length === 1) to = a[0]; else if (a.length === 2) { from = a[0]; to = a[1]; } else { from = a[0]; step = a[1]; to = a[2]; }
    if (step === 0) { c.err("seq: invalid Zero increment value: '0'"); return 1; }
    var out = [];
    for (var x = from; step > 0 ? x <= to : x >= to; x += step) { out.push(String(x)); if (out.length > 100000) break; }
    if (res.o.w) { var w = Math.max.apply(null, out.map(function (s) { return s.length; })); out = out.map(function (s) { while (s.length < w) s = '0' + s; return s; }); }
    if (out.length) c.out(out.join(sep) + '\n');
  });

  /* ---------- wc ---------- */
  reg('wc', function (c) {
    var res = parseArgs(c.args, { bool: 'lwcmL', long: { lines: 'l', words: 'w', bytes: 'c', chars: 'm' } });
    if (res.err) return pe(c, 'wc', res);
    var o = res.o, cols = [];
    var any = o.l || o.w || o.c || o.m || o.L;
    if (!any) { o.l = o.w = o.c = 1; }
    if (o.l) cols.push('l'); if (o.w) cols.push('w'); if (o.m) cols.push('m'); if (o.c) cols.push('c'); if (o.L) cols.push('L');
    var inp = inputs(c, res.rest, 'wc'), rows = [];
    function enc(s) { return unescape(encodeURIComponent(s)).length; }
    inp.list.forEach(function (f) {
      var d = f.data, r = { name: res.rest.length ? f.name : '' };
      r.l = (d.match(/\n/g) || []).length; r.w = (d.match(/\S+/g) || []).length; r.c = enc(d); r.m = Array.from(d).length;
      r.L = d.split('\n').reduce(function (a, l) { return Math.max(a, l.length); }, 0);
      rows.push(r);
    });
    if (rows.length > 1) { var t = { name: 'total', l: 0, w: 0, c: 0, m: 0, L: 0 }; rows.forEach(function (r) { t.l += r.l; t.w += r.w; t.c += r.c; t.m += r.m; t.L = Math.max(t.L, r.L); }); rows.push(t); }
    var width = 1;
    if (!res.rest.length) width = cols.length > 1 ? 7 : 1;
    else if (cols.length > 1 || rows.length > 1) {
      var tot = 0, stdinUsed = res.rest.indexOf('-') >= 0;
      inp.list.forEach(function (f) { tot += enc(f.data); });
      width = Math.max(String(tot).length, stdinUsed ? 7 : 1);
    }
    rows.forEach(function (r) { c.out(cols.map(function (k) { var s = String(r[k]); while (s.length < width) s = ' ' + s; return s; }).join(' ') + (r.name ? ' ' + r.name : '') + '\n'); });
    return inp.status;
  });

  /* ---------- sort / uniq ---------- */
  function fieldsOf(line, sep) {
    if (sep !== undefined && sep !== null) return line.split(sep);
    return line.match(/[ \t]*[^ \t]+/g) || [];
  }
  function parseNumber(s) { var m = /^\s*([+-]?\d*\.?\d+|[+-]?\d+\.?)/.exec(s); return m ? parseFloat(m[1]) : 0; }
  reg('sort', function (c) {
    var res = parseArgs(c.args, { bool: 'nrufbmcsVh', val: 'kto', long: { 'numeric-sort': 'n', reverse: 'r', unique: 'u', 'field-separator': 't', key: 'k', 'ignore-case': 'f', output: 'o', 'stable': 's' }, ignoreLong: true });
    if (res.err) return pe(c, 'sort', res);
    var o = res.o, sep = o.t, keys = [];
    (o.multi.k || []).forEach(function (k) {
      var m = /^(\d+)(?:\.(\d+))?([bnrfh]*)(?:,(\d+)(?:\.(\d+))?([bnrfh]*))?$/.exec(k);
      if (!m) throw new Error("sort: invalid number at field start: invalid count at start of '" + k + "'");
      var fl = (m[3] || '') + (m[6] || '');
      keys.push({ a: +m[1], b: m[4] ? +m[4] : null, n: fl.indexOf('n') >= 0 || fl.indexOf('h') >= 0 && false, r: fl.indexOf('r') >= 0, f: fl.indexOf('f') >= 0, bl: fl.indexOf('b') >= 0 });
    });
    var inp = inputs(c, res.rest, 'sort'), ls = [];
    inp.list.forEach(function (f) { ls = ls.concat(lines(f.data)); });
    function keyText(line, k) {
      if (!keys.length) return line;
      var fs = fieldsOf(line, sep), end = k.b === null ? fs.length : k.b;
      var t = fs.slice(k.a - 1, end).join(sep === undefined ? '' : sep);
      if (sep === undefined && k.b === null) t = fs.slice(k.a - 1).join('');
      return k.bl || o.b ? t.replace(/^[ \t]+/, '') : t;
    }
    function cmpKey(a, b, k) {
      var x = keyText(a, k), y = keyText(b, k), d;
      var num = k.n || (o.n && !keys.length) || (o.n && keys.length && !k.n && false);
      if (keys.length === 0) num = !!o.n; else num = k.n || (!!o.n && !keys.some(function (kk) { return kk.n; }) && false);
      if (o.n && keys.length && !k.n && !/[nbrf]/.test('')) num = k.n || o.n;
      if (num) d = parseNumber(x) - parseNumber(y);
      else { if (k.f || o.f) { x = x.toUpperCase(); y = y.toUpperCase(); } d = cmpStr(x, y); }
      return k.r ? -d : d;
    }
    var ks = keys.length ? keys : [{ a: 1, b: null, n: !!o.n, r: false, f: !!o.f, bl: false }];
    function cmpKeys(a, b) { for (var i = 0; i < ks.length; i++) { var d = cmpKey(a, b, ks[i]); if (d !== 0) return d; } return 0; }
    var idx = ls.map(function (l, i) { return { l: l, i: i }; });
    idx.sort(function (x, y) {
      var d = cmpKeys(x.l, y.l);
      if (d === 0 && !o.s && !o.u) d = cmpStr(x.l, y.l);
      if (d === 0) d = x.i - y.i;
      return o.r ? -(d === 0 ? 0 : d) || (x.i - y.i) : d;
    });
    var out = idx.map(function (x) { return x.l; });
    if (o.u) { var r2 = []; out.forEach(function (l, i) { if (i === 0 || cmpKeys(r2[r2.length - 1], l) !== 0) r2.push(l); }); out = r2; }
    var text = out.map(function (l) { return l + '\n'; }).join('');
    if (o.o !== undefined) { var ow = c.sh.openWrite(o.o, false, c.cred); if (ow.err) { c.err('sort: open failed: ' + o.o + ': ' + ERR[ow.err]); return 2; } ow.node.data = text; return 0; }
    c.out(text);
    return inp.status;
  });
  reg('uniq', function (c) {
    var res = parseArgs(c.args, { bool: 'cduiD', long: { count: 'c', repeated: 'd', unique: 'u', 'ignore-case': 'i' } });
    if (res.err) return pe(c, 'uniq', res);
    var o = res.o, inp = inputs(c, res.rest.slice(0, 1), 'uniq'), ls = [];
    inp.list.forEach(function (f) { ls = ls.concat(lines(f.data)); });
    var groups = [];
    ls.forEach(function (l) {
      var last = groups[groups.length - 1], same = last && (o.i ? last.l.toLowerCase() === l.toLowerCase() : last.l === l);
      if (same) last.n++; else groups.push({ l: l, n: 1 });
    });
    groups.forEach(function (g) {
      if (o.d && g.n < 2) return; if (o.u && g.n > 1) return;
      c.out((o.c ? ('       ' + g.n).slice(-7) + ' ' : '') + g.l + '\n');
    });
    return inp.status;
  });

  /* ---------- cut / tr / paste / split / join ---------- */
  function rangesOf(s) {
    return s.split(',').map(function (p) {
      var m = /^(\d*)-(\d*)$/.exec(p);
      if (m) return { a: m[1] === '' ? 1 : +m[1], b: m[2] === '' ? Infinity : +m[2] };
      if (/^\d+$/.test(p)) return { a: +p, b: +p };
      return null;
    });
  }
  reg('cut', function (c) {
    var res = parseArgs(c.args, { bool: 's', val: 'dfcb', long: { delimiter: 'd', fields: 'f', characters: 'c', 'only-delimited': 's' } });
    if (res.err) return pe(c, 'cut', res);
    var o = res.o, delim = o.d === undefined ? '\t' : o.d;
    var spec = o.f !== undefined ? o.f : (o.c !== undefined ? o.c : o.b);
    if (spec === undefined) { c.err('cut: you must specify a list of bytes, characters, or fields'); return 1; }
    var rg = rangesOf(spec);
    if (rg.some(function (r) { return r === null; })) { c.err('cut: invalid byte, character or field list'); return 1; }
    var inp = inputs(c, res.rest, 'cut');
    inp.list.forEach(function (f) {
      lines(f.data).forEach(function (l) {
        if (o.f !== undefined) {
          if (l.indexOf(delim) < 0) { if (!o.s) c.out(l + '\n'); return; }
          var parts = l.split(delim), sel = [];
          parts.forEach(function (p, i) { if (rg.some(function (r) { return i + 1 >= r.a && i + 1 <= r.b; })) sel.push(p); });
          c.out(sel.join(delim) + '\n');
        } else {
          var chs = Array.from(l), out = '';
          chs.forEach(function (ch, i) { if (rg.some(function (r) { return i + 1 >= r.a && i + 1 <= r.b; })) out += ch; });
          c.out(out + '\n');
        }
      });
    });
    return inp.status;
  });
  function expandSet(s) {
    var out = [], i = 0;
    function one() {
      var ch = s[i];
      if (ch === '[' && s[i + 1] === ':') { var e = s.indexOf(':]', i); if (e > 0) { var nm = s.slice(i + 2, e); i = e + 2; return { cls: nm }; } }
      if (ch === '\\') { var nx = s[i + 1]; i += 2; return { ch: nx === 'n' ? '\n' : nx === 't' ? '\t' : nx === 'r' ? '\r' : nx === '\\' ? '\\' : nx }; }
      i++; return { ch: ch };
    }
    function clsChars(nm) {
      var all = ''; for (var k = 0; k < 128; k++) all += String.fromCharCode(k);
      var re = { alpha: /[A-Za-z]/, digit: /[0-9]/, alnum: /[A-Za-z0-9]/, upper: /[A-Z]/, lower: /[a-z]/, space: /[ \t\n\r\f\v]/, blank: /[ \t]/, punct: /[!-\/:-@\[-`{-~]/, xdigit: /[0-9A-Fa-f]/ }[nm];
      return re ? all.split('').filter(function (x) { return re.test(x); }) : [];
    }
    while (i < s.length) {
      var a = one();
      if (a.cls) { clsChars(a.cls).forEach(function (x) { out.push(x); }); continue; }
      if (s[i] === '-' && i + 1 < s.length) {
        i++; var b = one();
        if (b.ch !== undefined) { for (var k = a.ch.charCodeAt(0); k <= b.ch.charCodeAt(0); k++) out.push(String.fromCharCode(k)); continue; }
      }
      out.push(a.ch);
    }
    return out;
  }
  reg('tr', function (c) {
    var res = parseArgs(c.args, { bool: 'dsc', long: { delete: 'd', squeeze: 's', complement: 'c', 'squeeze-repeats': 's' } });
    if (res.err) return pe(c, 'tr', res);
    var o = res.o, a = res.rest;
    if (!a.length) { c.err("tr: missing operand"); return 1; }
    if (!o.d && !o.s && a.length < 2) { c.err("tr: missing operand after " + q(a[0]) + "\nTwo strings must be given when translating."); return 1; }
    var s1 = expandSet(a[0]), s2 = a[1] !== undefined ? expandSet(a[1]) : [];
    var set1 = s1;
    var comp = !!o.c, inSet1 = function (ch) { var f = set1.indexOf(ch) >= 0; return comp ? !f : f; };
    var out = '', lastCh = null, d = c.stdin || '';
    if (o.d) { for (var i = 0; i < d.length; i++) if (!inSet1(d[i])) { out += d[i]; } if (o.s && s2.length) { var o2 = '', l2 = null; for (var j = 0; j < out.length; j++) { if (s2.indexOf(out[j]) >= 0 && out[j] === l2) continue; o2 += out[j]; l2 = out[j]; } out = o2; } c.out(out); return 0; }
    var map = {};
    if (a[1] !== undefined && !comp) { s1.forEach(function (ch, i) { map[ch] = s2.length ? (i < s2.length ? s2[i] : s2[s2.length - 1]) : ch; }); }
    var squeezeSet = o.s ? (a[1] !== undefined ? s2 : s1) : null;
    for (var k = 0; k < d.length; k++) {
      var ch = d[k], res2 = ch;
      if (a[1] !== undefined) { if (comp) { if (inSet1(ch)) res2 = s2[s2.length - 1]; } else if (map[ch] !== undefined) res2 = map[ch]; }
      if (squeezeSet && ((comp && a[1] === undefined) ? !set1.includes(res2) : squeezeSet.indexOf(res2) >= 0) && lastCh === res2) continue;
      out += res2; lastCh = res2;
    }
    c.out(out);
  });
  reg('paste', function (c) {
    var res = parseArgs(c.args, { bool: 's', val: 'd' }), delim = res.o.d === undefined ? '\t' : res.o.d;
    var inp = inputs(c, res.rest, 'paste'), cols = inp.list.map(function (f) { return lines(f.data); });
    if (res.o.s) { cols.forEach(function (col) { c.out(col.join(delim) + '\n'); }); return inp.status; }
    var n = Math.max.apply(null, cols.map(function (x) { return x.length; }).concat([0]));
    for (var i = 0; i < n; i++) c.out(cols.map(function (col) { return col[i] === undefined ? '' : col[i]; }).join(delim) + '\n');
    return inp.status;
  });
  reg('split', function (c) {
    var res = parseArgs(c.args, { val: 'lb', numeric: false }), n = +(res.o.l || 1000);
    var f = res.rest[0], prefix = res.rest[1] || 'x';
    var inp = inputs(c, f ? [f] : [], 'split'); if (inp.status) return 1;
    var ls = lines(inp.list[0].data), k = 0, alpha = 'abcdefghijklmnopqrstuvwxyz';
    for (var i = 0; i < ls.length; i += n, k++) {
      var nm = prefix + alpha[Math.floor(k / 26)] + alpha[k % 26], ow = c.sh.openWrite(nm, false, c.cred);
      if (ow.err) { c.err('split: ' + nm + ': ' + ERR[ow.err]); return 1; }
      ow.node.data = ls.slice(i, i + n).join('\n') + '\n';
    }
  });
  reg('join', function (c) {
    var res = parseArgs(c.args, { val: 't1 2' }), a = res.rest;
    if (a.length < 2) { c.err('join: missing operand'); return 1; }
    var sep = res.o.t, A = inputs(c, [a[0]], 'join'), B = inputs(c, [a[1]], 'join');
    if (A.status || B.status) return 1;
    var split = function (l) { return sep ? l.split(sep) : l.trim().split(/\s+/); }, js = sep || ' ';
    var bm = {}; lines(B.list[0].data).forEach(function (l) { var f = split(l); (bm[f[0]] = bm[f[0]] || []).push(f.slice(1)); });
    lines(A.list[0].data).forEach(function (l) { var f = split(l); (bm[f[0]] || []).forEach(function (r) { c.out([f[0]].concat(f.slice(1), r).join(js) + '\n'); }); });
  });

  /* ---------- tee / xargs ---------- */
  reg('tee', function (c) {
    var res = parseArgs(c.args, { bool: 'ai', long: { append: 'a' } }), st = 0, d = c.stdin || '';
    res.rest.forEach(function (f) {
      var ow = c.sh.openWrite(f, !!res.o.a, c.cred);
      if (ow.err) { c.err('tee: ' + f + ': ' + ERR[ow.err]); st = 1; return; }
      ow.node.data += d; ow.node.mtime = c.sh.fs.tick();
    });
    c.out(d);
    return st;
  });
  function xargsTokens(s, nul) {
    if (nul) return s.split('\u0000').filter(function (x) { return x !== ''; });
    var out = [], cur = '', has = false, i = 0;
    while (i < s.length) {
      var ch = s[i];
      if (ch === '\'' || ch === '"') { var e = s.indexOf(ch, i + 1); if (e < 0) throw new Error('unmatched ' + (ch === '"' ? 'double' : 'single') + ' quote; by default quotes are special to xargs unless you use the -0 option'); cur += s.slice(i + 1, e); has = true; i = e + 1; continue; }
      if (ch === '\\' && i + 1 < s.length) { cur += s[i + 1]; has = true; i += 2; continue; }
      if (/\s/.test(ch)) { if (has || cur !== '') { out.push(cur); cur = ''; has = false; } i++; continue; }
      cur += ch; has = true; i++;
    }
    if (has || cur !== '') out.push(cur);
    return out;
  }
  reg('xargs', function (c) {
    var res = parseArgs(c.args, { bool: 'rt0p', val: 'nIEds', stop: true, long: { 'max-args': 'n', 'null': '0', replace: 'I', 'no-run-if-empty': 'r' }, ignoreLong: true });
    if (res.err) return pe(c, 'xargs', res);
    var o = res.o, cmd = res.rest.length ? res.rest : ['echo'], toks;
    try { toks = xargsTokens(c.stdin || '', !!o['0']); } catch (e) { c.err('xargs: ' + e.message); return 1; }
    var st = 0;
    function run(argv) {
      if (o.t) c.err(argv.join(' '));
      var r = c.sh.runCmd(argv, '', { asRoot: c.cred.uid === 0 && c.sh.uid !== 0 });
      r.chunks.forEach(function (x) { c.chunks.push(x); });
      if (r.status !== 0) st = r.status === 127 ? 127 : 123;
    }
    if (o.I !== undefined) {
      (c.stdin || '').split('\n').forEach(function (ln) {
        if (ln.trim() === '') return;
        var t; try { t = xargsTokens(ln, false).join(' '); } catch (e) { t = ln.trim(); }
        run(cmd.map(function (x) { return x.split(o.I).join(t); }));
      });
      return st;
    }
    if (!toks.length) { if (!o.r) run(cmd); return st; }
    var n = o.n !== undefined ? +o.n : Infinity;
    for (var i = 0; i < toks.length; i += n === Infinity ? toks.length : n) run(cmd.concat(toks.slice(i, i + (n === Infinity ? toks.length : n))));
    return st;
  });

  /* ---------- grep ---------- */
  function grepImpl(c, defE, defF) {
    var res = parseArgs(c.args, { bool: 'ivnclLrRwxoqsFEHhP', val: 'eABCm', long: { 'ignore-case': 'i', 'invert-match': 'v', 'line-number': 'n', count: 'c', recursive: 'r', 'files-with-matches': 'l', 'files-without-match': 'L', 'word-regexp': 'w', 'line-regexp': 'x', 'only-matching': 'o', quiet: 'q', silent: 'q', 'fixed-strings': 'F', 'extended-regexp': 'E', regexp: 'e', 'with-filename': 'H', 'no-filename': 'h', 'no-messages': 's', color: '' }, ignoreLong: true });
    if (res.err) return pe(c, 'grep', res);
    var o = res.o, files = res.rest, pats;
    if (o.multi.e) pats = o.multi.e.reduce(function (a, p) { return a.concat(p.split('\n')); }, []);
    else { if (!files.length) { c.err('Usage: grep [OPTION]... PATTERNS [FILE]...'); return 2; } pats = files.shift().split('\n'); }
    var ere = !!(o.E || defE), fixed = !!(o.F || defF), re;
    try {
      var srcs = pats.map(function (p) { return fixed ? reEsc(p) : translate(p, ere); });
      var src = srcs.length === 1 ? srcs[0] : srcs.map(function (s) { return '(?:' + s + ')'; }).join('|');
      if (o.x) src = '^(?:' + src + ')$';
      else if (o.w) src = '(?<![A-Za-z0-9_])(?:' + src + ')(?![A-Za-z0-9_])';
      re = new RegExp(src, o.i ? 'i' : '');
    } catch (e) { c.err('grep: Invalid regular expression'); return 2; }
    var reG = new RegExp(re.source, re.flags + 'g');
    var recursive = o.r || o.R, st = 1, hadErr = false, list = [];
    var multi;
    if (recursive) {
      var starts = files.length ? files : ['.'], implicit = !files.length;
      starts.forEach(function (p) {
        var r = c.sh.stat(p, true);
        if (r.err || !r.node) { if (!o.s) c.err('grep: ' + p + ': ' + ERR[r.err || 'ENOENT']); hadErr = true; return; }
        (function walk(path, node, shown) {
          if (node.type === 'd') {
            if (!can(node, c.cred, 4)) { if (!o.s) c.err('grep: ' + path + ': ' + ERR.EACCES); hadErr = true; return; }
            Object.keys(node.children).sort(cmpStr).forEach(function (nm) { var ch = node.children[nm]; if (ch.type === 'l') return; walk(path === '.' && implicit ? nm : VSH.joinPath(path, nm), ch); });
          } else if (node.type === 'f') {
            if (!can(node, c.cred, 4)) { if (!o.s) c.err('grep: ' + path + ': ' + ERR.EACCES); hadErr = true; return; }
            list.push({ name: path, data: node.data });
          }
        })(p, r.node);
      });
      multi = starts.length > 1 || starts.some(function (p) { var r = c.sh.stat(p, true); return r.node && r.node.type === 'd'; });
    } else if (!files.length) { list = [{ name: '(standard input)', data: c.stdin || '' }]; multi = false; }
    else {
      files.forEach(function (f) {
        if (f === '-') { list.push({ name: '(standard input)', data: c.stdin || '' }); return; }
        var r = c.sh.stat(f, true);
        if (r.err || !r.node) { if (!o.s) c.err('grep: ' + f + ': ' + ERR[r.err || 'ENOENT']); hadErr = true; return; }
        if (r.node.type === 'd') { if (!o.s) c.err('grep: ' + f + ': Is a directory'); hadErr = true; return; }
        if (!can(r.node, c.cred, 4)) { if (!o.s) c.err('grep: ' + f + ': ' + ERR.EACCES); hadErr = true; return; }
        list.push({ name: f, data: r.node.data });
      });
      multi = files.length > 1;
    }
    var showName = o.H ? true : (o.h ? false : multi), maxc = o.m !== undefined ? +o.m : Infinity, quitEarly = false;
    list.forEach(function (f) {
      if (quitEarly) return;
      var ls = lines(f.data), cnt = 0, outs = [];
      for (var i = 0; i < ls.length && cnt < maxc; i++) {
        var l = ls[i], m = re.test(l);
        if (o.v ? m : !m) continue;
        cnt++;
        if (o.q) { quitEarly = true; st = 0; break; }
        if (o.l || o.L || o.c) continue;
        var pre = (showName ? f.name + ':' : '') + (o.n ? (i + 1) + ':' : '');
        if (o.o && !o.v) { reG.lastIndex = 0; var mm; while ((mm = reG.exec(l))) { if (mm[0] === '') { reG.lastIndex++; continue; } outs.push(pre + mm[0]); } }
        else outs.push(pre + l);
      }
      if (cnt > 0) st = 0;
      if (o.q) return;
      if (o.l) { if (cnt > 0) c.out(f.name + '\n'); return; }
      if (o.L) { if (cnt === 0) c.out(f.name + '\n'); return; }
      if (o.c) { c.out((showName ? f.name + ':' : '') + cnt + '\n'); return; }
      outs.forEach(function (x) { c.out(x + '\n'); });
    });
    if (o.L) return list.some(function (f) { return false; }) ? 0 : (hadErr ? 2 : 0);
    if (o.q) return st === 0 ? 0 : (hadErr ? 2 : 1);
    return hadErr && st !== 0 ? 2 : (hadErr ? 2 : st);
  }
  reg('grep', function (c) { return grepImpl(c, false, false); });
  reg('egrep', function (c) { return grepImpl(c, true, false); });
  reg('fgrep', function (c) { return grepImpl(c, false, true); });

  /* ---------- sed ---------- */
  function parseSed(script, ere) {
    var cmds = [], i = 0, n = script.length;
    function skipWs() { while (i < n && /[ \t]/.test(script[i])) i++; }
    function readDelimited(delim) {          // delim で終わる文字列を読む（\delim は delim そのもの）
      var s = '';
      while (i < n && script[i] !== delim) {
        if (script[i] === '\\' && i + 1 < n) { if (script[i + 1] === delim) { s += delim; } else s += '\\' + script[i + 1]; i += 2; continue; }
        s += script[i]; i++;
      }
      if (i >= n) throw new Error('unterminated `s\' command');
      i++; return s;
    }
    while (i < n) {
      skipWs();
      if (i >= n) break;
      if (script[i] === ';' || script[i] === '\n') { i++; continue; }
      var cmd = { a1: null, a2: null, neg: false };
      function addr() {
        skipWs();
        var m;
        if (script[i] === '$') { i++; return { t: 'last' }; }
        if ((m = /^\d+/.exec(script.slice(i)))) { i += m[0].length; if (script[i] === '~') { i++; var st = /^\d+/.exec(script.slice(i)); i += st[0].length; return { t: 'step', a: +m[0], b: +st[0] }; } return { t: 'line', n: +m[0] }; }
        if (script[i] === '/') { i++; var re = readDelimited('/'), ic = false; if (script[i] === 'I') { ic = true; i++; } return { t: 're', re: mkRe(re, ere, ic) }; }
        return null;
      }
      cmd.a1 = addr();
      if (cmd.a1 && script[i] === ',') {
        i++; skipWs();
        if (script[i] === '+') { i++; var mm = /^\d+/.exec(script.slice(i)); i += mm[0].length; cmd.a2 = { t: 'plus', n: +mm[0] }; }
        else cmd.a2 = addr();
        if (!cmd.a2) throw new Error('unexpected `,\'');
      }
      skipWs();
      if (script[i] === '!') { cmd.neg = true; i++; skipWs(); }
      var ch = script[i++];
      if (ch === undefined) throw new Error('missing command');
      cmd.c = ch;
      if (ch === 's') {
        var delim = script[i++], re = readDelimited(delim), rep = readDelimited(delim), flags = '';
        while (i < n && /[gpiI0-9w]/.test(script[i])) { flags += script[i]; i++; }
        var g = flags.indexOf('g') >= 0, ci = /[iI]/.test(flags), nth = /\d+/.exec(flags);
        cmd.re = mkRe(re, ere, ci, true); cmd.rep = rep; cmd.g = g; cmd.p = flags.indexOf('p') >= 0; cmd.nth = nth ? +nth[0] : 1;
      } else if (ch === 'y') {
        var d2 = script[i++], from = readDelimited(d2), to = readDelimited(d2);
        if (from.length !== to.length) throw new Error('strings for `y\' command are different lengths');
        cmd.map = {}; for (var k = 0; k < from.length; k++) cmd.map[from[k]] = to[k];
      } else if (ch === 'a' || ch === 'i' || ch === 'c') {
        skipWs(); if (script[i] === '\\') { i++; if (script[i] === '\n') i++; }
        var e = script.indexOf('\n', i); if (e < 0) e = n; cmd.text = script.slice(i, e); i = e;
      } else if ('pdq=PDnN'.indexOf(ch) < 0) throw new Error('unknown command: `' + ch + "'");
      cmds.push(cmd);
    }
    return cmds;
  }
  function sedReplace(m, rep) {          // m: RegExp の match 配列
    var out = '';
    for (var i = 0; i < rep.length; i++) {
      var ch = rep[i];
      if (ch === '\\' && i + 1 < rep.length) {
        var nx = rep[++i];
        if (/\d/.test(nx)) out += m[+nx] === undefined ? '' : m[+nx];
        else if (nx === 'n') out += '\n'; else if (nx === 't') out += '\t'; else out += nx;
      } else if (ch === '&') out += m[0];
      else out += ch;
    }
    return out;
  }
  reg('sed', function (c) {
    var res = parseArgs(c.args, { bool: 'nEriszu', val: 'ef', long: { quiet: 'n', silent: 'n', 'regexp-extended': 'E', expression: 'e', 'in-place': 'i', 'separate': 's' }, ignoreLong: true });
    if (res.err) return pe(c, 'sed', res);
    var o = res.o, files = res.rest, script;
    if (o.multi.e) script = o.multi.e.join('\n'); else { if (!files.length) { c.err('Usage: sed [OPTION]... {script-only-if-no-other-script} [input-file]...'); return 1; } script = files.shift(); }
    var cmds;
    try { cmds = parseSed(script, !!(o.E || o.r)); } catch (e) { c.err('sed: -e expression #1, char ' + (script.length) + ': ' + e.message); return 1; }
    var inp = inputs(c, files, 'sed');
    var inplace = o.i !== undefined;
    function process(data) {
      var ls = data.split('\n'), endNl = ls[ls.length - 1] === ''; if (endNl) ls.pop();
      var out = [], total = ls.length, quit = false;
      cmds.forEach(function (cm) { cm.active = false; cm.remain = 0; });
      for (var ln = 1; ln <= total && !quit; ln++) {
        var ps = ls[ln - 1], deleted = false, appendQ = [];
        for (var ci = 0; ci < cmds.length && !deleted && !quit; ci++) {
          var cm = cmds[ci], hit = false;
          function test(a) {
            if (a.t === 'line') return ln === a.n; if (a.t === 'last') return ln === total; if (a.t === 're') return a.re.test(ps);
            if (a.t === 'step') return a.b === 0 ? ln === a.a : (ln >= a.a && (ln - a.a) % a.b === 0); return false;
          }
          if (!cm.a1) hit = true;
          else if (!cm.a2) hit = test(cm.a1);
          else {
            if (cm.active) {
              hit = true;
              if (cm.a2.t === 'plus') { cm.remain--; if (cm.remain <= 0) cm.active = false; }
              else if (cm.a2.t === 'line') { if (ln >= cm.a2.n) cm.active = false; }
              else if (test(cm.a2)) cm.active = false;
            } else if (test(cm.a1)) {
              hit = true;
              if (cm.a2.t === 'plus') { cm.remain = cm.a2.n; cm.active = cm.remain > 0; }
              else if (cm.a2.t === 'line') cm.active = cm.a2.n > ln;
              else cm.active = !(cm.a2.t === 'last' && ln === total);
            }
          }
          if (cm.neg) hit = !hit;
          if (!hit) continue;
          switch (cm.c) {
            case 'p': out.push(ps); break;
            case 'd': deleted = true; break;
            case 'q': quit = true; break;
            case '=': out.push(String(ln)); break;
            case 'a': appendQ.push(cm.text); break;
            case 'i': out.push(cm.text); break;
            case 'c': out.push(cm.text); deleted = true; break;
            case 'y': ps = ps.split('').map(function (x) { return cm.map[x] !== undefined ? cm.map[x] : x; }).join(''); break;
            case 's': {
              var cnt = 0, did = false;
              cm.re.lastIndex = 0;
              var np = ps.replace(cm.re, function () {
                var args = Array.prototype.slice.call(arguments), m = [], gi = 0;
                for (; gi < args.length; gi++) { if (typeof args[gi] === 'number') break; m.push(args[gi]); }
                cnt++;
                if (did && !cm.g) return m[0];
                if (cnt < cm.nth) return m[0];
                did = true; return sedReplace(m, cm.rep);
              });
              if (did) { ps = np; if (cm.p) out.push(ps); }
              break;
            }
          }
        }
        if (!deleted && !o.n) out.push(ps);
        appendQ.forEach(function (t) { out.push(t); });
      }
      return out.length ? out.join('\n') + '\n' : '';
    }
    if (inplace) {
      var st = inp.status;
      files.forEach(function (f) {
        var r = c.sh.stat(f, true);
        if (r.err || !r.node) { c.err("sed: can't read " + f + ': ' + ERR[r.err || 'ENOENT']); st = 4; return; }
        if (!can(r.node, c.cred, 4) || !can(r.node, c.cred, 2) && false) { c.err("sed: couldn't open file " + f + ': ' + ERR.EACCES); st = 4; return; }
        var data = process(r.node.data);
        var dp = r.parent;
        if (!can(dp, c.cred, 2)) { c.err("sed: couldn't open temporary file " + VSH.dirOf(f) + '/sedXXXX: ' + ERR.EACCES); st = 4; return; }
        r.node.data = data; r.node.mtime = c.sh.fs.tick();
      });
      return st;
    }
    var all = inp.list.map(function (f) { return f.data; });
    // 複数ファイルは連結して1つのストリームとして処理（GNU sed と同じ）
    c.out(process(all.map(function (d, i) { return d === '' || d.slice(-1) === '\n' || i === all.length - 1 ? d : d + '\n'; }).join('')));
    return inp.status;
  });

  /* ---------- 道場で動かないコマンドの案内 ---------- */
  VSH.NOT_SUPPORTED = {};
  ['systemctl', 'journalctl', 'apt', 'apt-get', 'dpkg', 'yum', 'dnf', 'rpm', 'fdisk', 'lsblk', 'blkid', 'mount', 'umount', 'lvcreate', 'pvcreate', 'vgcreate', 'docker', 'virsh', 'ssh', 'scp', 'ps', 'top', 'kill', 'df', 'du', 'free', 'lspci', 'lsusb', 'lsmod', 'modprobe', 'ip', 'ping', 'vi', 'vim', 'nano', 'man']
    .forEach(function (n) { VSH.NOT_SUPPORTED[n] = 'このコマンドは道場では動きません。ファイル操作・テキスト処理系のコマンドを練習する場所です'; });
})(typeof window !== 'undefined' ? window : globalThis);
