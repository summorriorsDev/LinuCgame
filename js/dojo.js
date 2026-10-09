/* ターミナル道場 — ブラウザ内の簡易ターミナルで、実際にコマンドを打って練習する画面。
   中核は js/vsh/（仮想ファイルシステム + bash 風シェル）。ゲーム本体（game.js）の API を window.GAME 経由で使う。 */
(function (G) {
  'use strict';
  var D = G.DOJO = {};
  var VSH = G.VSH, MISSIONS = G.MISSIONS;
  var GA = function () { return G.GAME; };
  var REWARD = 30, REWARD_SOL = 10;
  var cur = null;           // 現在のターミナル状態 { st, mission, solved, usedSol, hist, hidx }

  function subOf(id) { return GA().subById[id]; }
  function done(id) { var d = GA().S().dojo; return d && d[id]; }
  function countDone() { return MISSIONS.filter(function (m) { return done(m.id); }).length; }
  D.progressText = function () { return '道場 ' + countDone() + '/' + MISSIONS.length; };

  /* 優先順（重要度の高い小主題 → 低い）で未クリアを探す */
  function order() {
    var A = GA(), subs = A.SUBS.slice().sort(function (a, b) { return b.w - a.w || A.SUBS.indexOf(a) - A.SUBS.indexOf(b); });
    var out = [];
    subs.forEach(function (s) { MISSIONS.forEach(function (m) { if (m.sub === s.id) out.push(m); }); });
    return out;
  }
  function nextUndone(afterId) {
    var o = order(), i = afterId ? o.findIndex(function (m) { return m.id === afterId; }) : -1;
    for (var k = 1; k <= o.length; k++) { var m = o[(i + k) % o.length]; if (!done(m.id) && m.id !== afterId) return m; }
    return null;
  }

  /* ---------- 一覧画面 ---------- */
  D.show = function () {
    var A = GA(), h = A.heroHTML() + A.tabsHTML(4);
    var n = countDone(), total = MISSIONS.length, rec = nextUndone(null);
    h += '<div class="card chhead"><b style="font-size:1.1rem">🖥️ ターミナル道場</b>' +
      '<div class="muted small" style="margin:4px 0 8px">ブラウザの中の「練習用Linux」で、実際にコマンドを打って確かめる場所です。問題を解くだけでは身につきにくい、<b>リダイレクト・パイプ・権限・find・tar・sed</b> などを、結果を見ながら練習できます。' +
      '<br>ファイルはブラウザ内の仮想のもの（本物のPCには何も影響しません）。操作の手順や書き方は、実際のLinuxと同じです。</div>' +
      '<div class="stat-chips" style="margin:0"><span class="chip">クリア <b>' + n + '/' + total + '</b></span><span class="chip">報酬 <b>+' + REWARD + ' EXP</b>／ミッション</span></div></div>';
    if (rec) {
      var s = subOf(rec.sub);
      h += '<div class="card recommend"><div class="muted small">⭐ 次のおすすめ（重要度の高い分野から）</div>' +
        '<div style="font-weight:800">' + s.mon + ' ' + s.id + ' ' + A.esc(rec.title) + '</div>' +
        '<div class="row"><button class="btn primary big" data-m="' + rec.id + '">▶ 挑戦する</button></div></div>';
    }
    h += '<div class="row" style="margin-bottom:12px"><button class="btn" id="dFree">🧪 自由に試す（サンドボックス）</button></div>';
    A.TOPICS.forEach(function (t) {
      var rows = t.subs.filter(function (s) { return MISSIONS.some(function (m) { return m.sub === s.id; }); });
      if (!rows.length) return;
      h += '<div class="card area"><h3>' + t.icon + ' ' + A.esc(t.name) + '</h3>';
      rows.forEach(function (s) {
        var ms = MISSIONS.filter(function (m) { return m.sub === s.id; }), dn = ms.filter(function (m) { return done(m.id); }).length;
        h += '<div class="dsub"><div class="nm"><span class="id">' + s.id + '</span>' + s.mon + ' ' + A.esc(s.name) + ' <span class="star-w">' + A.stars(s.w) + '</span> <span class="muted small">（' + dn + '/' + ms.length + '）</span></div>';
        ms.forEach(function (m) {
          h += '<button class="mrow' + (done(m.id) ? ' ok' : '') + '" data-m="' + m.id + '"><span class="mk">' + (done(m.id) ? '✅' : '▶') + '</span><span>' + A.esc(m.title) + '</span></button>';
        });
        h += '</div>';
      });
      h += '</div>';
    });
    A.view(h);
    A.bindCommon();
    document.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { D.open(b.dataset.m); }; });
    var f = document.getElementById('dFree'); if (f) f.onclick = function () { D.open(null); };
  };

  /* ---------- ミッション／サンドボックス画面 ---------- */
  D.open = function (id) {
    var A = GA(), m = id ? MISSIONS.find(function (x) { return x.id === id; }) : null;
    cur = { st: m ? VSH.buildMission(m) : VSH.freeShell(), m: m, solved: false, usedSol: false, hist: [], hidx: 0 };
    var s = m ? subOf(m.sub) : null, idx = m ? order().findIndex(function (x) { return x.id === m.id; }) + 1 : 0;
    var h = '<div class="bhead"><button class="btn sm ghost" id="dBack">← 道場へ</button><div class="btitle">' + (m ? A.esc(m.title) : '🧪 サンドボックス') + '</div><div class="prog">' + (m ? idx + '/' + MISSIONS.length : '') + '</div></div>';
    if (m) {
      h += '<div class="card mission"><div class="muted small">' + s.mon + ' ' + s.id + ' ' + A.esc(s.name) + (done(m.id) ? '　✅ クリア済み' : '') + '</div>' +
        '<div class="goal">' + A.fmt(m.goal) + '</div>' +
        '<div class="row" style="margin-top:8px"><button class="btn sm" id="dHint">💡 ヒント</button><button class="btn sm" id="dSol">📖 模範解答（見ると EXP は少なめ）</button><button class="btn sm" id="dReset">↺ やり直す</button></div>' +
        '<div id="dBox"></div></div>';
    } else {
      h += '<div class="card mission"><div class="goal">自由に試せる練習環境です。作業場所は <code>~</code>（<code>/home/tux</code>）。<code>memo.txt</code> <code>names.txt</code> <code>docs/</code> などのファイルがあります。<code>help</code> で使えるコマンドの一覧が出ます。</div>' +
        '<div class="row" style="margin-top:8px"><button class="btn sm" id="dReset">↺ 最初の状態に戻す</button></div></div>';
    }
    h += '<div class="term" id="term"><div class="termout" id="tout"></div>' +
      '<div class="termin"><span class="pr" id="tpr"></span><input id="tin" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="コマンド入力" placeholder="コマンドを入力して Enter（Tab で補完、↑↓ で履歴）"></div></div>' +
      '<div id="dRes"></div>';
    A.view(h);
    document.getElementById('dBack').onclick = D.show;
    var r = document.getElementById('dReset'); if (r) r.onclick = function () { D.open(id); };
    var hb = document.getElementById('dHint'); if (hb) hb.onclick = function () { document.getElementById('dBox').innerHTML = '<div class="hintbox">💡 ' + A.fmt(m.hint) + '</div>'; };
    var sb = document.getElementById('dSol');
    if (sb) sb.onclick = function () {
      cur.usedSol = true;
      document.getElementById('dBox').innerHTML = '<div class="hintbox">📖 模範解答の一例（他の書き方でも正解になることがあります）<pre class="blk">' + A.esc(m.sol.join('\n')) + '</pre></div>';
    };
    var tin = document.getElementById('tin'), term = document.getElementById('term');
    setPrompt();
    term.onclick = function (e) { if (!window.getSelection().toString()) tin.focus(); };
    tin.onkeydown = onKey;
    printLine('info', m ? '練習用の端末です。下に入力してください。（help で使えるコマンド一覧）' : 'サンドボックスへようこそ。help で使えるコマンドが分かります。');
    tin.focus();
  };

  function setPrompt() { var pr = document.getElementById('tpr'); if (pr) pr.textContent = cur.st.sh.promptStr(); }
  function printLine(kind, text, prompt) {
    var out = document.getElementById('tout'); if (!out) return;
    var d = document.createElement('div');
    d.className = 'tl ' + kind;
    if (kind === 'cmd') { var p = document.createElement('span'); p.className = 'pr'; p.textContent = prompt; d.appendChild(p); d.appendChild(document.createTextNode(text)); }
    else d.textContent = text;
    out.appendChild(d);
    var term = document.getElementById('term'); out.scrollTop = out.scrollHeight;
  }
  function onKey(e) {
    var tin = e.target;
    if (e.key === 'Enter') { e.preventDefault(); submit(tin.value); tin.value = ''; cur.hidx = cur.hist.length; return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (cur.hidx > 0) { cur.hidx--; tin.value = cur.hist[cur.hidx]; } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (cur.hidx < cur.hist.length - 1) { cur.hidx++; tin.value = cur.hist[cur.hidx]; } else { cur.hidx = cur.hist.length; tin.value = ''; } return; }
    if (e.key === 'Tab') { e.preventDefault(); complete(tin); return; }
    if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); document.getElementById('tout').innerHTML = ''; return; }
  }
  /* Tab 補完: 先頭の語ならコマンド名、それ以外ならパス */
  function complete(tin) {
    var v = tin.value, sh = cur.st.sh, m = /(^|\s)([^\s]*)$/.exec(v), word = m ? m[2] : '', before = v.slice(0, v.length - word.length);
    var first = !/\S\s+\S*$/.test(v) && before.trim() === '' || /(\||&&|\|\||;)\s*$/.test(before);
    var cands = [];
    if (first && word.indexOf('/') < 0) {
      cands = Object.keys(VSH.CMDS).concat(Object.keys(sh.aliases)).filter(function (n) { return n.indexOf(word) === 0 && n !== '.' && n !== ':' && n !== '['; });
    } else {
      var slash = word.lastIndexOf('/'), dirPart = slash >= 0 ? word.slice(0, slash + 1) : '', base = word.slice(slash + 1);
      var r = sh.stat(dirPart === '' ? '.' : dirPart, true);
      if (r.node && r.node.type === 'd') {
        cands = Object.keys(r.node.children).filter(function (n) { return n.indexOf(base) === 0 && (base !== '' || n[0] !== '.'); }).map(function (n) {
          var ch = r.node.children[n], t = ch.type === 'd' ? '/' : (ch.type === 'l' ? (function () { var rr = sh.stat(dirPart + n, true); return rr.node && rr.node.type === 'd' ? '/' : ''; })() : '');
          return dirPart + n + t;
        });
      }
    }
    cands.sort();
    if (!cands.length) return;
    function lcp(a) { var p = a[0]; a.forEach(function (x) { while (x.indexOf(p) !== 0) p = p.slice(0, -1); }); return p; }
    var common = lcp(cands);
    if (cands.length === 1) { tin.value = before + common + (/\/$/.test(common) ? '' : ' '); return; }
    if (common.length > word.length) { tin.value = before + common; return; }
    printLine('cmd', v, sh.promptStr()); printLine('out', cands.join('  '));
  }

  function submit(line) {
    var st = cur.st;
    if (line.trim() === '') { printLine('cmd', '', st.sh.promptStr()); return; }
    cur.hist.push(line);
    printLine('cmd', line, st.sh.promptStr());
    var r = VSH.runLine(st, line);
    if (r.echo) printLine('info', '↳ ' + r.echo);
    var clear = false;
    r.chunks.forEach(function (c) {
      if (c.s.indexOf('\u0000CLEAR') >= 0) { clear = true; return; }
      var s = c.s.replace(/\n$/, '');
      s.split('\n').forEach(function (l) { printLine(c.fd === 2 ? 'err' : 'out', l); });
    });
    if (clear) document.getElementById('tout').innerHTML = '';
    setPrompt();
    if (cur.m) judge();
  }

  function judge() {
    var A = GA(), m = cur.m, res = VSH.checkMission(cur.st), box = document.getElementById('dRes');
    if (res.ok && !cur.solved) {
      cur.solved = true;
      var S = A.S(), first = !(S.dojo && S.dojo[m.id]), gain = 0, up = null;
      if (first) {
        S.dojo = S.dojo || {};
        S.dojo[m.id] = { t: Date.now(), sol: cur.usedSol };
        gain = cur.usedSol ? REWARD_SOL : REWARD;
        up = A.addExp(gain); A.save();
      }
      A.beep(A.SFX.clear);
      var nx = nextUndone(m.id);
      box.innerHTML = '<div class="fb ok"><div class="fbhead">🎉 ミッションクリア！' + (first ? ' +' + gain + ' EXP' : '（クリア済み）') + '</div>' +
        '<div class="fbexp">' + A.fmt(m.explain) + '</div>' + (up ? '<div class="lvup">🎉 レベルアップ！ Lv.' + up.level + '</div>' : '') +
        '<div class="row">' + (nx ? '<button class="btn primary" id="dNext">次のミッション ▶</button>' : '') + '<button class="btn" id="dList">道場の一覧へ</button><span class="muted small">（このまま端末で試し続けてもOK）</span></div></div>';
      var nb = document.getElementById('dNext'); if (nb) nb.onclick = function () { D.open(nx.id); };
      document.getElementById('dList').onclick = D.show;
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      var tin = document.getElementById('tin'); if (tin) tin.focus();
    } else if (res.solved && !res.mustOk && !cur.solved) {
      box.innerHTML = '<div class="fb ng"><div class="fbhead">🔎 結果は合っています</div><div class="fbexp">ただし、このミッションは<b>指定の書き方</b>で解く練習です。ヒントを見て、使うコマンドやオプションを確認してやり直してみよう。（やり直すボタンで最初から）</div></div>';
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
