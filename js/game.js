/* LinuC 101 ターミナル・クエスト — ゲーム本体
   進捗は localStorage に保存（このブラウザのみ）。 */
(function () {
  'use strict';

  /* ================= データ準備 ================= */
  var TOPICS = window.TOPICS;
  var MEMOS = window.MEMOS || {};
  var SUBS = [];
  var subById = {};
  TOPICS.forEach(function (t) {
    t.subs.forEach(function (s) { s.area = t; SUBS.push(s); subById[s.id] = s; });
  });

  var SAVE_KEY = 'linuc101rpg.v1';
  var PASS_RATE = 500 / 800;

  function defaultSave() {
    return {
      v: 1, name: 'ゆうしゃ', exp: 0,
      items: { hint: 3, potion: 1 },
      stats: { answered: 0, correct: 0, bestCombo: 0, days: {} },
      q: {}, clears: {}, mocks: [], custom: [], sound: true, seenIntro: false
    };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.v === 1) {
        var d = defaultSave();
        Object.keys(d).forEach(function (k) { if (s[k] === undefined) s[k] = d[k]; });
        return s;
      }
    } catch (e) { /* 保存なし or 使用不可 */ }
    return defaultSave();
  }
  var storageOk = true;
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }
    catch (e) { if (storageOk) { storageOk = false; toast('⚠ このブラウザでは進捗を保存できません'); } }
  }
  var S = load();

  var BANK = [];
  function buildBank() {
    BANK = window.QUESTIONS.slice();
    // 自作問題は複製して使う（q.sub を付けても保存データが循環参照にならないように）
    S.custom.forEach(function (c) { BANK.push(Object.assign({}, c)); });
    BANK.forEach(function (q) { q.sub = subById[q.t]; });
  }
  buildBank();

  /* ================= 小物 ================= */
  var app = document.getElementById('app');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  function view(html) { app.innerHTML = html; window.scrollTo(0, 0); }
  function toast(msg, ms) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.className = 'show';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.className = ''; }, ms || 2200);
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function weightedPick(items, wf, n) {
    var pool = items.map(function (x) { return { x: x, w: Math.max(wf(x), 0.01) }; });
    var out = [];
    while (out.length < n && pool.length) {
      var tot = pool.reduce(function (a, b) { return a + b.w; }, 0);
      var r = Math.random() * tot, i = 0;
      for (; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) break; }
      if (i >= pool.length) i = pool.length - 1;
      out.push(pool.splice(i, 1)[0].x);
    }
    return out;
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function streak() {
    var n = 0, d = new Date();
    for (var i = 0; i < 400; i++) {
      var k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      if (S.stats.days[k]) n++; else if (i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }
  function pct(x) { return Math.round(x * 100); }
  function stars(w) { return '★★★★'.slice(0, w) + '☆☆☆☆'.slice(0, 4 - w); }
  function mmss(ms) { var s = Math.floor(ms / 1000); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }

  /* ---- サウンド（WebAudio、ミュート可） ---- */
  var ac = null;
  function beep(seq) {
    if (!S.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var t = ac.currentTime;
      seq.forEach(function (f, i) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.05, t + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.12);
        o.connect(g); g.connect(ac.destination);
        o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.13);
      });
    } catch (e) { /* 無音で続行 */ }
  }
  var SFX = { ok: [660, 880], ng: [220, 160], lv: [523, 659, 784, 1046], clear: [523, 659, 784, 659, 1046] };

  /* ================= 成長・習熟 ================= */
  function levelOf(exp) { return Math.floor(Math.sqrt(exp / 25)) + 1; }
  function expAt(L) { return 25 * (L - 1) * (L - 1); }
  function maxHpOf(L) { return 80 + 10 * L; }
  var TITLES = [[1, '見習いペンギン'], [3, 'ターミナル見習い'], [5, 'シェルの冒険者'], [8, 'パイプの騎士'], [11, 'rootの賢者'], [15, 'LinuC勇者']];
  function titleOf(L) { var t = TITLES[0][1]; TITLES.forEach(function (x) { if (L >= x[0]) t = x[1]; }); return t; }

  function qBox(q) { var s = S.q[q.id]; return s ? s.box : 0; }
  function subQs(id) { return BANK.filter(function (q) { return q.t === id; }); }
  function mastery(id) {
    var qs = subQs(id); if (!qs.length) return 0;
    return qs.reduce(function (a, q) { return a + Math.min(qBox(q), 3) / 3; }, 0) / qs.length;
  }
  function overall() {
    var num = 0, den = 0;
    SUBS.forEach(function (s) { num += mastery(s.id) * s.w; den += s.w; });
    return den ? num / den : 0;
  }
  function reviewPool() {
    return BANK.filter(function (q) { var s = S.q[q.id]; return s && s.ng > 0 && s.box < 3; });
  }
  function recommend() {
    var best = null, bs = -1;
    SUBS.forEach(function (s) {
      if (!subQs(s.id).length) return;
      var sc = s.w * (1 - mastery(s.id)) + (4 - SUBS.indexOf(s) * 0.001);
      if (sc > bs) { bs = sc; best = s; }
    });
    return best;
  }
  function qWeight(q) { var s = S.q[q.id]; if (!s) return 5; return [4, 3, 1.5, 0.7, 0.3][s.box]; }

  function recordAnswer(q, ok) {
    var st = S.q[q.id] || (S.q[q.id] = { box: 0, seen: 0, ok: 0, ng: 0, last: 0 });
    st.seen++; st.last = Date.now();
    if (ok) { st.ok++; st.box = (st.seen === 1) ? 2 : Math.min(4, st.box + 1); }
    else { st.ng++; st.box = 0; }
    S.stats.answered++; if (ok) S.stats.correct++;
    var d = today(); S.stats.days[d] = (S.stats.days[d] || 0) + 1;
  }
  function addExp(n) {
    var before = levelOf(S.exp);
    S.exp += n;
    var after = levelOf(S.exp);
    var up = null;
    if (after > before) {
      var gain = after - before;
      S.items.hint += gain; S.items.potion += gain;
      up = { level: after, gain: gain };
    }
    return up;
  }

  /* ================= 出題の準備・判定 ================= */
  function prepare(q) {
    var v = { q: q, sel: new Set(), gone: new Set(), input: '' };
    if (q.type === 'choice' || q.type === 'multi') {
      var correct = new Set(q.type === 'choice' ? [q.a] : q.a);
      v.opts = shuffle(q.o.map(function (_, i) { return i; })).map(function (i) { return { i: i, text: q.o[i], correct: correct.has(i) }; });
    }
    return v;
  }
  function norm(s) { return String(s).replace(/[　\s]+/g, ' ').trim(); }
  function evaluate(v) {
    var q = v.q;
    if (q.type === 'choice') { return v.sel.size ? v.sel.has(q.a) : null; }
    if (q.type === 'multi') {
      if (!v.sel.size) return null;
      var c = new Set(q.a);
      return v.sel.size === c.size && Array.from(v.sel).every(function (i) { return c.has(i); });
    }
    var val = norm(v.input);
    if (!val) return null;
    return q.ans.some(function (a) { return norm(a) === val; });
  }
  function correctText(q) {
    if (q.type === 'choice') return fmt(q.o[q.a]);
    if (q.type === 'multi') return q.a.map(function (i) { return fmt(q.o[i]); }).join(' ／ ');
    return '<code>' + esc(q.ans[0]) + '</code>' + (q.ans.length > 1 ? ' <span class="muted small">（他の書き方も正解になる場合があります）</span>' : '');
  }
  function typeLabel(q) {
    if (q.type === 'multi') return q.a.length + '個選べ';
    if (q.type === 'input') return 'コマンド入力';
    return '単一選択';
  }

  /* ================= 画面: ホーム ================= */
  var B = null;           // バトル状態
  var timer = null;
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function expBarHTML() {
    var L = levelOf(S.exp), a = expAt(L), b = expAt(L + 1);
    var p = Math.min(100, Math.max(0, (S.exp - a) / (b - a) * 100));
    return '<div class="bar exp" title="次のレベルまで ' + (b - S.exp) + ' EXP"><i style="width:' + p + '%"></i></div>' +
      '<div class="muted small">EXP ' + S.exp + ' ／ 次のレベルまで あと ' + (b - S.exp) + '</div>';
  }

  function showHome() {
    stopTimer(); B = null;
    var L = levelOf(S.exp), ov = overall(), rec = recommend(), rv = reviewPool().length;
    var tdy = S.stats.days[today()] || 0, st = streak();
    var h = '';
    h += '<div class="card hero-card"><div class="row">' +
      '<div class="avatar">🐧</div>' +
      '<div class="grow"><div class="row between"><div><span class="lvl">Lv.' + L + '</span> <span class="title-badge">『' + titleOf(L) + '』</span> <span class="muted">' + esc(S.name) + '</span></div>' +
      '<button class="btn sm ghost" id="sndBtn" title="効果音">' + (S.sound ? '🔊' : '🔇') + '</button></div>' +
      expBarHTML() + '</div></div>' +
      '<div class="stat-chips">' +
      '<span class="chip">総合習熟度 <b>' + pct(ov) + '%</b></span>' +
      '<span class="chip">今日 <b>' + tdy + '</b> 問</span>' +
      '<span class="chip">連続 <b>' + st + '</b> 日</span>' +
      '<span class="chip">📖 ヒント <b>' + S.items.hint + '</b></span>' +
      '<span class="chip">🧪 ポーション <b>' + S.items.potion + '</b></span>' +
      '</div></div>';

    if (!S.seenIntro) {
      h += '<div class="card"><b>🎮 あそびかた</b><ul style="margin:6px 0 0;padding-left:20px">' +
        '<li>ステージを選ぶと敵（＝問題）が現れます。<b>正解でダメージ、不正解でこちらがダメージ</b>。</li>' +
        '<li>間違えた問題は同じ戦闘の最後に<b>もう一度</b>出ます。解説を読めば、そのまま覚えられます。</li>' +
        '<li>最短ルートは「<b>おすすめ</b>」ボタン。重要度が高く、まだ苦手な分野から順に出題します。</li>' +
        '</ul><div style="margin-top:8px"><button class="btn sm" id="introOk">わかった！</button></div></div>';
    }

    if (rec) {
      var rm = mastery(rec.id);
      h += '<div class="card recommend"><div class="muted small">⭐ 最短ルートの次の一手</div>' +
        '<div style="font-weight:800;font-size:1.1rem">' + rec.mon + ' ' + rec.id + ' ' + esc(rec.name) + '</div>' +
        '<div class="muted small">重要度 <span class="star-w">' + stars(rec.w) + '</span> ／ 習熟度 ' + pct(rm) + '%</div>' +
        '<div class="row"><button class="btn primary big" data-stage="' + rec.id + '">⚔️ おすすめに挑戦</button>' +
        '<button class="btn" data-memo="' + rec.id + '">📘 要点メモ</button></div></div>';
    }

    h += '<div class="menu">' +
      '<button class="btn" id="mRandom">🎲 ランダム修行<small>全分野から10問</small></button>' +
      '<button class="btn" id="mReview">📖 復習の洞窟' + (rv ? '<span class="badge">' + rv + '</span>' : '') + '<small>間違えた問題を克服</small></button>' +
      '<button class="btn" id="mMock">👹 魔王城（模擬試験）<small>本番形式で実力チェック</small></button>' +
      '<button class="btn" id="mStats">📊 戦績・設定<small>自作問題・データ管理</small></button>' +
      '</div>';

    TOPICS.forEach(function (t) {
      h += '<div class="card area"><h3>' + t.icon + ' ' + esc(t.name) + ' <span class="muted small">主題' + t.id + '</span></h3>' +
        '<div class="full">' + esc(t.full) + '</div>';
      t.subs.forEach(function (s) {
        var m = mastery(s.id), n = subQs(s.id).length, c = S.clears[s.id] || 0;
        var star = '<span class="stars">' + '★'.repeat(c) + '<span class="off">' + '★'.repeat(3 - c) + '</span></span>';
        h += '<div class="stage"><div><div class="nm"><span class="id">' + s.id + '</span>' + s.mon + ' ' + esc(s.name) +
          (s.w === 4 ? '<span class="tag">最優先</span>' : '') + '</div>' +
          '<div class="meta"><span class="star-w" title="重要度">' + stars(s.w) + '</span><span>' + n + '問</span><span>習熟 ' + pct(m) + '%</span>' + star + '</div></div>' +
          '<div class="acts"><button class="btn sm" data-memo="' + s.id + '">📘</button>' +
          '<button class="btn sm primary" data-stage="' + s.id + '">⚔️ 挑戦</button></div>' +
          '<div class="bar mastery"><i style="width:' + pct(m) + '%"></i></div></div>';
      });
      h += '</div>';
    });

    h += '<details class="card tips"><summary>🧭 最短合格のコツ</summary><ul>' +
      '<li>LinuC-1 101試験は <b>60問・90分</b>、合格目安は<b>500/800点（約62.5%）</b>。範囲は5主題・21小主題。</li>' +
      '<li>重要度★4（最優先タグ）: 1.01.1〜1.01.3 / 1.03.1 / 1.03.3 / 1.05.2 / 1.05.3 から先に。</li>' +
      '<li>コマンドの<b>オプションの意味</b>と<b>ファイルの場所</b>が頻出。「似た名前の違い」（<code>ssh -p</code>と<code>scp -P</code>、<code>umount</code>の綴り等）に注意。</li>' +
      '<li>総合習熟度が <b>70%</b> を超えたら魔王城（模擬試験）で確認 → 間違えた問題は復習の洞窟へ。</li>' +
      '<li>1日10〜20分でも毎日続ける方が、まとめてやるより定着します。</li></ul>' +
      '<div class="muted small">※ 出題範囲・合格基準は <a href="https://linuc.org/" target="_blank" rel="noopener" style="color:var(--blue)">LPI-Japan 公式サイト</a> で最新情報を確認してください。</div></details>';

    view(h);
    bindHome();
  }

  function bindHome() {
    app.querySelectorAll('[data-stage]').forEach(function (b) { b.onclick = function () { startStage(b.dataset.stage); }; });
    app.querySelectorAll('[data-memo]').forEach(function (b) { b.onclick = function () { showMemo(b.dataset.memo); }; });
    var el;
    if ((el = document.getElementById('mRandom'))) el.onclick = startRandom;
    if ((el = document.getElementById('mReview'))) el.onclick = startReview;
    if ((el = document.getElementById('mMock'))) el.onclick = showMockMenu;
    if ((el = document.getElementById('mStats'))) el.onclick = showStats;
    if ((el = document.getElementById('introOk'))) el.onclick = function () { S.seenIntro = true; save(); showHome(); };
    if ((el = document.getElementById('sndBtn'))) el.onclick = function () { S.sound = !S.sound; save(); el.textContent = S.sound ? '🔊' : '🔇'; beep(SFX.ok); };
  }

  /* ---- 要点メモ（モーダル） ---- */
  function showMemo(subId, onClose, startLabel) {
    var s = subById[subId], items = MEMOS[subId] || [];
    var m = document.createElement('div');
    m.id = 'modal';
    m.innerHTML = '<div class="box"><h3>' + s.mon + ' ' + s.id + ' ' + esc(s.name) + '</h3>' +
      '<div class="muted small">要点メモ — 重要度 <span class="star-w">' + stars(s.w) + '</span>　（読まずに問題へ進んでもOK。解説で学べます）</div>' +
      '<ul>' + items.map(function (x) { return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul>' +
      '<div class="row"><button class="btn primary" id="mmGo">' + (startLabel || '⚔️ このステージに挑戦') + '</button><button class="btn" id="mmClose">閉じる</button></div></div>';
    document.body.appendChild(m);
    function close() { if (m.parentNode) m.parentNode.removeChild(m); document.removeEventListener('keydown', esc_); if (onClose) onClose(); }
    function esc_(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc_);
    m.onclick = function (e) { if (e.target === m) close(); };
    m.querySelector('#mmClose').onclick = close;
    m.querySelector('#mmGo').onclick = function () { close(); startStage(subId); };
  }

  /* ================= バトル ================= */
  function newBattle(cfg) {
    stopTimer();
    B = {
      mode: cfg.mode, title: cfg.title, subId: cfg.subId || null, queue: cfg.queue,
      idx: 0, maxHp: maxHpOf(levelOf(S.exp)), hp: maxHpOf(levelOf(S.exp)), combo: 0, bestCombo: 0,
      results: [], expGain: 0, levelUps: [], cur: null, answers: [], t0: Date.now(), cfg: cfg
    };
    showQuestion();
  }

  function startStage(subId) {
    var qs = subQs(subId);
    if (!qs.length) { toast('このステージの問題はまだありません'); return; }
    var picks = weightedPick(qs, qWeight, Math.min(5, qs.length));
    var hi = picks.findIndex(function (q) { return q.hard; });
    if (hi >= 0 && hi !== picks.length - 1) { var b = picks.splice(hi, 1)[0]; picks.push(b); }
    var queue = picks.map(function (q, i) { return { q: q, boss: picks.length >= 3 && i === picks.length - 1 }; });
    var s = subById[subId];
    newBattle({ mode: 'stage', title: s.id + ' ' + s.name, subId: subId, queue: queue });
  }
  function startRandom() {
    var picks = weightedPick(BANK, function (q) { return qWeight(q) * q.sub.w; }, 10);
    newBattle({ mode: 'random', title: '🎲 ランダム修行', queue: picks.map(function (q) { return { q: q }; }) });
  }
  function startReview() {
    var pool = reviewPool();
    if (!pool.length) { toast('復習する問題はありません。いい調子！'); return; }
    var picks = weightedPick(pool, function (q) { return 5 - qBox(q); }, Math.min(10, pool.length));
    newBattle({ mode: 'review', title: '📖 復習の洞窟', queue: picks.map(function (q) { return { q: q }; }) });
  }

  function currentMon(it) {
    var q = it.q, sub = q.sub;
    if (it.boss) return { mon: sub.area.boss.mon, name: sub.area.boss.name, boss: true };
    return { mon: sub.mon, name: sub.monName, boss: false };
  }

  function hpClass() { var p = B.hp / B.maxHp; return p > 0.5 ? '' : (p > 0.25 ? 'warn' : 'danger'); }

  function showQuestion() {
    var it = B.queue[B.idx], q = it.q, v = prepare(q);
    B.cur = { it: it, q: q, v: v, done: false };
    var mock = B.mode === 'mock';
    var mon = currentMon(it);
    var h = '';
    h += '<div class="bhead"><button class="btn sm ghost" id="quit">← ' + (mock ? '中断' : '撤退') + '</button>' +
      '<div class="btitle">' + esc(B.title) + '</div>' +
      '<div class="prog" id="prog">' + (mock ? '<span id="clock">' + mmss(Date.now() - B.t0) + '</span> ' : '') + (B.idx + 1) + '/' + B.queue.length + '</div></div>';

    if (!mock) {
      h += '<div class="hud"><div class="hpwrap"><span>🐧 HP</span><div class="bar hp"><i id="hpbar" class="' + hpClass() + '" style="width:' + (B.hp / B.maxHp * 100) + '%"></i></div><span class="hpnum" id="hpnum">' + B.hp + '/' + B.maxHp + '</span></div>' +
        '<div class="combo' + (B.combo >= 2 ? '' : ' off') + '" id="combo">🔥 ' + B.combo + ' コンボ</div></div>';
      h += '<div class="arena"><div class="side"><div class="sprite" id="hero">🐧</div><div class="sname">Lv.' + levelOf(S.exp) + ' ' + esc(S.name) + '</div></div>' +
        '<div class="side enemy-side' + (mon.boss ? ' boss' : '') + '"><div class="sprite" id="enemy">' + mon.mon + '</div>' +
        '<div class="sname">' + (mon.boss ? '<span class="bosstag">BOSS</span> ' : '') + esc(mon.name) + '</div>' +
        '<div class="bar enemy"><i id="ehp" style="width:100%"></i></div></div></div>';
    } else {
      h += '<div class="bar mastery" style="margin-bottom:12px"><i style="width:' + (B.idx / B.queue.length * 100) + '%"></i></div>';
    }

    h += '<div class="card qcard"><div class="qmeta">' +
      '<span class="pill">' + q.t + '</span><span class="pill type">' + typeLabel(q) + '</span>' +
      (it.revenge ? '<span class="pill revenge">🔁 リベンジ</span>' : '') +
      (it.boss ? '<span class="pill revenge">👑 ボス問題</span>' : '') +
      (q.custom ? '<span class="pill">✏️ 自作</span>' : '') +
      '</div><div class="qtext">' + fmt(q.q) + '</div><div id="ansArea">';

    if (q.type === 'input') {
      h += '<div class="inrow"><span class="prompt">$</span><input id="cmd" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="コマンドを入力して Enter">' +
        '<button class="btn primary" id="submit">' + (mock ? '決定' : '実行') + '</button></div><div class="hintline" id="hintline"></div>';
    } else {
      h += '<div class="opts">' + v.opts.map(function (o, n) {
        return '<button class="opt" data-i="' + o.i + '"><span class="k">' + (n + 1) + '</span><span>' + fmt(o.text) + '</span></button>';
      }).join('') + '</div>';
      if (q.type === 'multi' || mock) h += '<div class="row" style="margin-top:10px"><button class="btn primary" id="submit">' + (mock ? '決定して次へ' : '回答する') + '</button></div>';
    }
    h += '</div>';
    if (!mock) {
      h += '<div class="items"><button class="btn sm" id="useHint">📖 ヒント <b id="hintN">×' + S.items.hint + '</b></button>' +
        '<button class="btn sm" id="usePotion">🧪 ポーション(+40) <b id="potN">×' + S.items.potion + '</b></button></div>';
    }
    h += '</div><div id="fbArea"></div>';
    view(h);
    bindBattle();
    if (q.type === 'input') { var c = document.getElementById('cmd'); if (c) c.focus(); }
  }

  function bindBattle() {
    var c = B.cur, q = c.q, v = c.v, mock = B.mode === 'mock';
    document.getElementById('quit').onclick = function () {
      if (confirm(mock ? '模擬試験を中断しますか？（結果は記録されません）' : '撤退しますか？（これまでの回答は保存されています）')) { showHome(); }
    };
    if (mock && !timer) {
      timer = setInterval(function () { var el = document.getElementById('clock'); if (el) el.textContent = mmss(Date.now() - B.t0); }, 1000);
    }
    app.querySelectorAll('.opt').forEach(function (b) {
      b.onclick = function () {
        if (c.done) return;
        var i = +b.dataset.i;
        if (q.type === 'choice') {
          v.sel = new Set([i]);
          app.querySelectorAll('.opt').forEach(function (x) { x.classList.toggle('sel', +x.dataset.i === i); });
          if (!mock) commit();
        } else {
          if (v.sel.has(i)) v.sel.delete(i); else v.sel.add(i);
          b.classList.toggle('sel', v.sel.has(i));
        }
      };
    });
    var sub = document.getElementById('submit');
    if (sub) sub.onclick = function () { mock ? mockNext() : commit(); };
    var cmd = document.getElementById('cmd');
    if (cmd) cmd.oninput = function () { v.input = cmd.value; };
    var uh = document.getElementById('useHint'); if (uh) uh.onclick = useHint;
    var up = document.getElementById('usePotion'); if (up) up.onclick = usePotion;
    refreshItemButtons();
  }

  function refreshItemButtons() {
    var uh = document.getElementById('useHint'), up = document.getElementById('usePotion');
    if (!uh || !up) return;
    document.getElementById('hintN').textContent = '×' + S.items.hint;
    document.getElementById('potN').textContent = '×' + S.items.potion;
    uh.disabled = B.cur.done || S.items.hint <= 0 || B.cur.hinted;
    up.disabled = S.items.potion <= 0 || B.hp >= B.maxHp || B.hp <= 0;
  }

  function useHint() {
    var c = B.cur, q = c.q, v = c.v;
    if (c.done || S.items.hint <= 0 || c.hinted) return;
    S.items.hint--; c.hinted = true; save();
    if (q.type === 'input') {
      var toks = q.ans[0].split(' ');
      var shown = toks[0] + (toks.length > 1 ? ' ' + toks.slice(1).map(function (t) { return '＿'.repeat(Math.min(Math.max(t.length, 1), 6)); }).join(' ') : '');
      document.getElementById('hintline').textContent = 'ヒント: ' + shown;
    } else {
      var wrong = v.opts.filter(function (o) { return !o.correct && !v.gone.has(o.i); });
      var n = q.type === 'choice' ? 2 : 1;
      shuffle(wrong).slice(0, n).forEach(function (o) {
        v.gone.add(o.i); v.sel.delete(o.i);
        var el = app.querySelector('.opt[data-i="' + o.i + '"]'); if (el) { el.classList.add('gone'); el.classList.remove('sel'); }
      });
    }
    refreshItemButtons();
  }

  function usePotion() {
    if (S.items.potion <= 0 || B.hp >= B.maxHp || B.hp <= 0) return;
    S.items.potion--; B.hp = Math.min(B.maxHp, B.hp + 40); save();
    updateHud(); refreshItemButtons(); beep(SFX.ok);
    floatText('+40', 'hit');
  }

  function updateHud() {
    var bar = document.getElementById('hpbar'), num = document.getElementById('hpnum'), cb = document.getElementById('combo');
    if (bar) { bar.style.width = (B.hp / B.maxHp * 100) + '%'; bar.className = hpClass(); }
    if (num) num.textContent = B.hp + '/' + B.maxHp;
    if (cb) { cb.textContent = '🔥 ' + B.combo + ' コンボ'; cb.classList.toggle('off', B.combo < 2); }
  }
  function floatText(txt, cls) {
    var a = app.querySelector('.arena'); if (!a) return;
    var f = document.createElement('div'); f.className = 'float ' + cls; f.textContent = txt;
    a.appendChild(f); setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 950);
  }
  function anim(id, cls) {
    var el = document.getElementById(id); if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  }

  function commit() {
    var c = B.cur; if (c.done) return;
    var ok = evaluate(c.v);
    if (ok === null) { toast(c.q.type === 'input' ? 'コマンドを入力してね' : '答えを選んでね'); return; }
    c.done = true;
    var it = c.it, q = c.q, boss = !!it.boss, gain = 0, dmg = 0, up = null, drop = '';
    recordAnswer(q, ok);
    B.results.push({ q: q, ok: ok, revenge: !!it.revenge });
    if (ok) {
      B.combo++; B.bestCombo = Math.max(B.bestCombo, B.combo);
      S.stats.bestCombo = Math.max(S.stats.bestCombo, B.combo);
      gain = it.revenge ? 5 : (boss ? 20 : 10);
      gain += Math.min(Math.max(B.combo - 1, 0), 5) * 2;
      B.expGain += gain;
      up = addExp(gain);
      if (up) { B.maxHp = maxHpOf(up.level); B.hp = B.maxHp; B.levelUps.push(up.level); }
      if (boss) { S.items.hint++; drop = '👑 ボス撃破！ ヒントの書を手に入れた'; }
      beep(SFX.ok); if (up) setTimeout(function () { beep(SFX.lv); }, 260);
      anim('enemy', 'defeat'); floatText('+' + gain + ' EXP', 'hit');
      var eh = document.getElementById('ehp'); if (eh) eh.style.width = '0%';
    } else {
      B.combo = 0; dmg = boss ? 30 : 20;
      B.hp = Math.max(0, B.hp - dmg);
      if (!it.revenge) B.queue.push({ q: q, revenge: true });
      beep(SFX.ng); anim('hero', 'shake'); floatText('-' + dmg, 'dmg');
    }
    save();
    updateHud();
    refreshItemButtons();
    showFeedback(ok, gain, up, drop);
  }

  function lockOptions(v, q) {
    app.querySelectorAll('.opt').forEach(function (b) {
      var i = +b.dataset.i; var o = v.opts.find(function (x) { return x.i === i; });
      b.disabled = true; b.classList.remove('sel');
      if (o.correct) b.classList.add('right');
      else if (v.sel.has(i)) b.classList.add('wrong');
    });
    var sub = document.getElementById('submit'); if (sub) sub.disabled = true;
    var cmd = document.getElementById('cmd'); if (cmd) cmd.disabled = true;
  }

  function showFeedback(ok, gain, up, drop) {
    var c = B.cur, q = c.q, v = c.v;
    lockOptions(v, q);
    var last = (B.idx >= B.queue.length - 1) || B.hp <= 0;
    var h = '<div class="fb ' + (ok ? 'ok' : 'ng') + '"><div class="fbhead">' +
      (ok ? '⭕ 正解！ +' + gain + ' EXP' : '❌ 不正解…' + (c.it.revenge ? '' : ' あとでもう一度出るよ')) + '</div>' +
      '<div class="fbans">正解: ' + correctText(q) + '</div>' +
      (q.e ? '<div class="fbexp">' + fmt(q.e) + '</div>' : '') +
      (drop ? '<div class="lvup">' + drop + '</div>' : '') +
      (up ? '<div class="lvup">🎉 レベルアップ！ Lv.' + up.level + ' ／ HP全回復 ／ ヒント・ポーション +' + up.gain + '</div>' : '') +
      (B.hp <= 0 ? '<div class="lvup" style="color:var(--red);border-color:var(--red);background:#3a161c">💀 HPが尽きた…</div>' : '') +
      '<div class="row"><button class="btn primary" id="next">' + (last ? '結果を見る' : '次へ') + ' <span class="kbd">Enter</span></button></div></div>';
    document.getElementById('fbArea').innerHTML = h;
    var nx = document.getElementById('next'); nx.onclick = nextQuestion; nx.focus();
    nx.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function nextQuestion() {
    if (B.hp <= 0) { showResult('defeat'); return; }
    B.idx++;
    if (B.idx >= B.queue.length) { showResult('clear'); return; }
    showQuestion();
  }

  /* ---- 模擬試験 ---- */
  function showMockMenu() {
    var total = BANK.length;
    var h = '<div class="card"><h2>👹 魔王城（模擬試験）</h2>' +
      '<p>HPや敵演出なしの本番形式。<b>回答中は正誤を表示しません</b>。終了後に採点・分野別の結果・解説を表示します。</p>' +
      '<p class="muted small">出題は小主題の重要度に応じた配分。本番は60問・90分・500/800点が合格目安です。</p>' +
      '<div class="row"><button class="btn big" data-n="20">ミニ（20問）</button><button class="btn big" data-n="40">標準（40問）</button>' +
      '<button class="btn big primary" data-n="60">本番形式（60問）</button></div>' +
      '<p class="muted small">問題数 ' + total + '問から選ばれます。</p>' +
      '<button class="btn" id="back">← ホームへ</button></div>';
    view(h);
    app.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { startMock(+b.dataset.n); }; });
    document.getElementById('back').onclick = showHome;
  }

  function startMock(n) {
    n = Math.min(n, BANK.length);
    var bySub = {}; SUBS.forEach(function (s) { bySub[s.id] = shuffle(subQs(s.id)); });
    var picked = [], guard = 0;
    while (picked.length < n && guard++ < 5000) {
      var cand = SUBS.filter(function (s) { return bySub[s.id].length; });
      if (!cand.length) break;
      var s = weightedPick(cand, function (x) { return x.w; }, 1)[0];
      picked.push(bySub[s.id].pop());
    }
    newBattle({ mode: 'mock', title: '👹 模擬試験 ' + picked.length + '問', queue: shuffle(picked).map(function (q) { return { q: q }; }) });
  }

  function mockNext() {
    var c = B.cur, ok = evaluate(c.v);
    B.results.push({ q: c.q, ok: ok === true, skipped: ok === null });
    B.idx++;
    if (B.idx >= B.queue.length) { finishMock(); return; }
    showQuestion();
  }

  function finishMock() {
    stopTimer();
    var total = B.results.length, right = B.results.filter(function (r) { return r.ok; }).length;
    var score = Math.round(right / total * 800), pass = right / total >= PASS_RATE;
    B.results.forEach(function (r) { recordAnswer(r.q, r.ok); });
    var gain = right * 3; var up = addExp(gain);
    S.mocks.push({ date: today(), total: total, right: right, score: score });
    if (S.mocks.length > 20) S.mocks = S.mocks.slice(-20);
    save();
    var per = {};
    B.results.forEach(function (r) {
      var a = r.q.sub.area.id; per[a] = per[a] || { n: 0, ok: 0 }; per[a].n++; if (r.ok) per[a].ok++;
    });
    var h = '<div class="card result center"><div class="muted">模擬試験の結果</div>' +
      '<div class="verdict ' + (pass ? 'pass' : 'fail') + '">' + (pass ? '合格ライン到達！' : 'あと少し…') + '</div>' +
      '<div style="font-size:1.6rem;font-weight:800">' + score + ' <span class="muted" style="font-size:1rem">/ 800点（' + right + '/' + total + '問正解・' + pct(right / total) + '%）</span></div>' +
      '<div class="muted small">所要時間 ' + mmss(Date.now() - B.t0) + ' ／ 合格目安 500点（約62.5%）</div>' +
      '<div style="margin-top:8px">獲得 EXP +' + gain + (up ? '　🎉 レベルアップ！ Lv.' + up.level : '') + '</div></div>';
    h += '<div class="card"><b>分野別</b><table class="tbl" style="margin-top:6px"><tr><th>主題</th><th>正答</th><th style="width:40%">正答率</th></tr>';
    TOPICS.forEach(function (t) {
      var p = per[t.id]; if (!p) return;
      var r = p.ok / p.n;
      h += '<tr><td>' + t.icon + ' ' + t.id + ' ' + esc(t.name) + '</td><td>' + p.ok + '/' + p.n + '</td><td><div class="bar mastery"><i style="width:' + pct(r) + '%"></i></div></td></tr>';
    });
    h += '</table></div>';
    h += missHTML(B.results.filter(function (r) { return !r.ok; }));
    h += '<div class="row"><button class="btn primary" id="again">もう一度挑戦</button><button class="btn" id="review">📖 復習の洞窟へ</button><button class="btn" id="home">ホームへ</button></div>';
    view(h);
    beep(pass ? SFX.clear : SFX.ng);
    document.getElementById('again').onclick = showMockMenu;
    document.getElementById('review').onclick = startReview;
    document.getElementById('home').onclick = showHome;
  }

  /* ---- 結果画面 ---- */
  function missHTML(list) {
    if (!list.length) return '<div class="card">🎉 ミスなし！ 完璧です。</div>';
    var seen = {}, uniq = [];
    list.forEach(function (r) { if (!seen[r.q.id]) { seen[r.q.id] = 1; uniq.push(r); } });
    return '<div class="card"><b>📝 間違えた問題（' + uniq.length + '）</b>' + uniq.map(function (r) {
      return '<div class="miss"><div class="mq">' + fmt(r.q.q) + (r.skipped ? ' <span class="muted small">（未回答）</span>' : '') + '</div>' +
        '<div class="ma">正解: ' + correctText(r.q) + '</div><div class="me">' + fmt(r.q.e || '') + '</div></div>';
    }).join('') + '</div>';
  }

  function showResult(kind) {
    stopTimer();
    var first = B.results.filter(function (r) { return !r.revenge; });
    var total = first.length, right = first.filter(function (r) { return r.ok; }).length;
    var defeated = kind === 'defeat';
    var star = 0;
    if (!defeated && B.mode === 'stage') {
      var rt = total ? right / total : 0;
      star = rt >= 1 ? 3 : (rt >= 0.8 ? 2 : (rt >= 0.6 ? 1 : 0));
      if (star > (S.clears[B.subId] || 0)) S.clears[B.subId] = star;
    }
    save();
    var h = '<div class="card result center"><h2>' + (defeated ? '💀 力尽きた…' : '🏆 ' + (B.mode === 'stage' ? 'ステージクリア！' : 'お疲れさま！')) + '</h2>';
    if (B.mode === 'stage' && !defeated) {
      h += '<div class="bigstars">' + '★'.repeat(star) + '<span class="off">' + '★'.repeat(3 - star) + '</span></div>';
    }
    h += '<div class="muted">' + esc(B.title) + '</div>' +
      '<dl class="kv" style="max-width:360px;margin:10px auto;text-align:left"><dt>正解（初回）</dt><dd>' + right + ' / ' + total + '</dd>' +
      '<dt>獲得 EXP</dt><dd>+' + B.expGain + '</dd><dt>最大コンボ</dt><dd>' + B.bestCombo + '</dd>' +
      '<dt>現在</dt><dd>Lv.' + levelOf(S.exp) + ' 『' + titleOf(levelOf(S.exp)) + '』</dd></dl>' +
      (B.levelUps.length ? '<div class="fb ok" style="display:inline-block">🎉 レベルアップ！ → Lv.' + B.levelUps[B.levelUps.length - 1] + '</div>' : '') +
      (defeated ? '<p class="muted">間違えた問題は「復習の洞窟」に入りました。解説を読んで、もう一度挑戦しよう。</p>' : '') +
      '</div>';
    h += missHTML(B.results.filter(function (r) { return !r.ok; }));
    h += '<div class="row"><button class="btn primary big" id="retry">⚔️ もう一度</button>' +
      (B.mode === 'stage' ? '<button class="btn" id="memo">📘 要点メモ</button>' : '') +
      '<button class="btn" id="home">ホームへ</button></div>';
    var mode = B.mode, subId = B.subId;
    view(h);
    beep(defeated ? SFX.ng : SFX.clear);
    document.getElementById('retry').onclick = function () {
      if (mode === 'stage') startStage(subId); else if (mode === 'random') startRandom(); else startReview();
    };
    var m = document.getElementById('memo'); if (m) m.onclick = function () { showMemo(subId); };
    document.getElementById('home').onclick = showHome;
  }

  /* ================= 戦績・設定 ================= */
  function showStats() {
    stopTimer();
    var st = S.stats, acc = st.answered ? st.correct / st.answered : 0;
    var h = '<div class="row between" style="margin-bottom:10px"><h2>📊 戦績・設定</h2><button class="btn" id="home">← ホームへ</button></div>';
    h += '<div class="card"><div class="stat-chips" style="margin:0">' +
      '<span class="chip">総回答 <b>' + st.answered + '</b></span><span class="chip">正答率 <b>' + pct(acc) + '%</b></span>' +
      '<span class="chip">最大コンボ <b>' + st.bestCombo + '</b></span><span class="chip">総合習熟度 <b>' + pct(overall()) + '%</b></span>' +
      '<span class="chip">問題数 <b>' + BANK.length + '</b></span></div></div>';

    h += '<div class="card"><b>小主題ごとの習熟度</b><table class="tbl" style="margin-top:6px"><tr><th>小主題</th><th>重要度</th><th>習熟</th><th>★</th></tr>';
    SUBS.forEach(function (s) {
      var m = mastery(s.id), c = S.clears[s.id] || 0;
      h += '<tr><td><span class="muted">' + s.id + '</span> ' + esc(s.name) + '</td><td class="star-w">' + stars(s.w) + '</td>' +
        '<td style="min-width:110px"><div class="bar mastery"><i style="width:' + pct(m) + '%"></i></div><span class="muted small">' + pct(m) + '%</span></td>' +
        '<td class="stars">' + '★'.repeat(c) + '</td></tr>';
    });
    h += '</table></div>';

    if (S.mocks.length) {
      h += '<div class="card"><b>模擬試験の履歴</b><table class="tbl" style="margin-top:6px"><tr><th>日付</th><th>正解</th><th>得点</th></tr>' +
        S.mocks.slice().reverse().slice(0, 10).map(function (m) {
          return '<tr><td>' + m.date + '</td><td>' + m.right + '/' + m.total + '</td><td>' + m.score + ' / 800 ' + (m.score >= 500 ? '✅' : '') + '</td></tr>';
        }).join('') + '</table></div>';
    }

    // 自作問題
    h += '<div class="card"><b>✏️ 自作問題を追加</b><div class="muted small">他の問題集や学習中に間違えた論点を、自分の言葉でメモしてゲームに追加できます（このブラウザに保存）。<br>誤答欄を空にすると「コマンド入力問題」になります。</div>' +
      '<label class="f">小主題</label><select class="f-in" id="cSub">' + SUBS.map(function (s) { return '<option value="' + s.id + '">' + s.id + ' ' + esc(s.name) + '</option>'; }).join('') + '</select>' +
      '<label class="f">問題文（`バッククォート` でコード表示）</label><textarea class="f-in" id="cQ"></textarea>' +
      '<label class="f">正解（コマンド入力問題の場合は入力するコマンド）</label><input class="f-in" id="cA">' +
      '<label class="f">誤答の選択肢（3つ・任意）</label><input class="f-in" id="cW1"><input class="f-in" id="cW2" style="margin-top:6px"><input class="f-in" id="cW3" style="margin-top:6px">' +
      '<label class="f">解説（任意）</label><textarea class="f-in" id="cE"></textarea>' +
      '<div class="row" style="margin-top:10px"><button class="btn primary" id="cAdd">追加する</button></div>';
    if (S.custom.length) {
      h += '<div style="margin-top:12px"><b class="small">追加済み（' + S.custom.length + '）</b>' + S.custom.map(function (c, i) {
        return '<div class="miss"><div class="mq">' + c.t + '　' + fmt(c.q) + '</div><button class="btn sm danger" data-del="' + i + '">削除</button></div>';
      }).join('') + '</div>';
    }
    h += '</div>';

    // セーブデータ
    h += '<div class="card"><b>💾 セーブデータ</b><div class="muted small">別のPCやブラウザに移すときは、書き出した文字列を取り込みます。</div>' +
      '<div class="row" style="margin-top:8px"><button class="btn" id="exp">書き出す</button><button class="btn" id="imp">取り込む</button>' +
      '<button class="btn" id="rename">名前を変える</button><button class="btn danger" id="reset">全データ削除</button></div>' +
      '<textarea class="f-in" id="io" style="margin-top:8px" placeholder="ここに書き出し／貼り付け"></textarea></div>';
    view(h);

    document.getElementById('home').onclick = showHome;
    document.getElementById('cAdd').onclick = addCustom;
    app.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () { if (confirm('この自作問題を削除しますか？')) { S.custom.splice(+b.dataset.del, 1); save(); buildBank(); showStats(); } };
    });
    var io = document.getElementById('io');
    document.getElementById('exp').onclick = function () {
      io.value = JSON.stringify(S); io.select();
      try { if (navigator.clipboard) navigator.clipboard.writeText(io.value); toast('書き出しました（コピー済み）'); } catch (e) { toast('書き出しました'); }
    };
    document.getElementById('imp').onclick = function () {
      try {
        var o = JSON.parse(io.value);
        if (!o || o.v !== 1) throw new Error('bad');
        if (!confirm('現在のデータを取り込んだデータで置き換えます。よろしいですか？')) return;
        S = o; var d = defaultSave(); Object.keys(d).forEach(function (k) { if (S[k] === undefined) S[k] = d[k]; });
        save(); buildBank(); toast('取り込みました'); showStats();
      } catch (e) { toast('取り込めませんでした（形式が違います）'); }
    };
    document.getElementById('rename').onclick = function () {
      var n = prompt('名前を入力してください', S.name);
      if (n && n.trim()) { S.name = n.trim().slice(0, 12); save(); toast('名前を変更しました'); }
    };
    document.getElementById('reset').onclick = function () {
      if (confirm('すべての進捗を削除します。元に戻せません。よろしいですか？') && confirm('本当に削除しますか？')) {
        S = defaultSave(); save(); buildBank(); toast('削除しました'); showHome();
      }
    };
  }

  function addCustom() {
    var val = function (id) { return document.getElementById(id).value.trim(); };
    var q = val('cQ'), a = val('cA');
    if (!q || !a) { toast('問題文と正解は必須です'); return; }
    var wr = [val('cW1'), val('cW2'), val('cW3')].filter(Boolean);
    var obj = { id: 'c-' + Date.now().toString(36), t: val('cSub') || document.getElementById('cSub').value, q: q, e: val('cE'), hard: false, custom: true };
    if (wr.length === 0) { obj.type = 'input'; obj.ans = [a]; }
    else if (wr.length === 3) { obj.type = 'choice'; obj.o = [a].concat(wr); obj.a = 0; }
    else { toast('誤答は3つ入力するか、すべて空にしてください'); return; }
    S.custom.push(obj); save(); buildBank(); toast('追加しました'); showStats();
  }

  /* ================= キーボード操作 ================= */
  document.addEventListener('keydown', function (e) {
    if (!B || !B.cur || document.getElementById('modal')) return;
    var tag = (e.target && e.target.tagName) || '';
    var typing = tag === 'INPUT' || tag === 'TEXTAREA';
    var nx = document.getElementById('next');
    if (e.key === 'Enter' && nx) { e.preventDefault(); nx.click(); return; }
    if (B.cur.done) return;
    if (e.key === 'Enter' && typing && B.cur.q.type === 'input') {
      e.preventDefault(); B.mode === 'mock' ? mockNext() : commit(); return;
    }
    if (typing) return;
    if (/^[1-4]$/.test(e.key)) {
      var o = app.querySelectorAll('.opt')[+e.key - 1];
      if (o && !o.classList.contains('gone')) o.click();
    } else if (e.key === 'Enter') {
      var sub = document.getElementById('submit'); if (sub && !sub.disabled) sub.click();
    }
  });

  window.addEventListener('beforeunload', save);
  showHome();
})();
