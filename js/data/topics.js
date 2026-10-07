/* LinuC レベル1 101試験（Version 10.0）出題範囲 — 主題・小主題・重要度
   重要度は LPI-Japan 公式の出題範囲に基づく（w: 1〜4）。
   mon / monName は各小主題に出てくる敵キャラ。 */
window.TOPICS = [
  {
    id: '1.01', name: '起動の城', full: 'Linuxのインストールと仮想マシン・コンテナの利用', icon: '🏰',
    boss: { mon: '🐉', name: 'ブートローダ・ドラゴン' },
    subs: [
      { id: '1.01.1', name: 'インストール、起動、接続、切断と停止', w: 4, mon: '👻', monName: 'sshゴースト' },
      { id: '1.01.2', name: '仮想マシン・コンテナの概念と利用', w: 4, mon: '📦', monName: 'コンテナ・ミミック' },
      { id: '1.01.3', name: 'ブートプロセスとsystemd', w: 4, mon: '🤖', monName: 'systemdゴーレム' },
      { id: '1.01.4', name: 'プロセスの生成、監視、終了', w: 3, mon: '🧟', monName: 'ゾンビプロセス' },
      { id: '1.01.5', name: 'デスクトップ環境の利用', w: 1, mon: '🐌', monName: 'Xウィンドウ・スネイル' }
    ]
  },
  {
    id: '1.02', name: 'パーミッションの森', full: 'ファイル・ディレクトリの操作と管理', icon: '🌲',
    boss: { mon: '🐻', name: 'ルート・ベア' },
    subs: [
      { id: '1.02.1', name: 'ファイルの所有者とパーミッション', w: 3, mon: '🦉', monName: 'chmodフクロウ' },
      { id: '1.02.2', name: '基本的なファイル管理の実行', w: 3, mon: '🐿️', monName: 'cpリス' },
      { id: '1.02.3', name: 'ハードリンクとシンボリックリンク', w: 2, mon: '🐍', monName: 'シンボリック・スネーク' },
      { id: '1.02.4', name: 'ファイルの配置と検索', w: 2, mon: '🕷️', monName: 'findスパイダー' }
    ]
  },
  {
    id: '1.03', name: 'コマンドの渓谷', full: 'GNUとUnixのコマンド', icon: '⛰️',
    boss: { mon: '🐲', name: 'パイプ・ドラゴン' },
    subs: [
      { id: '1.03.1', name: 'コマンドラインの操作', w: 4, mon: '🦇', monName: 'bashバット' },
      { id: '1.03.2', name: 'フィルタを使ったテキストストリームの処理', w: 3, mon: '🐛', monName: 'フィルタ・ワーム' },
      { id: '1.03.3', name: 'ストリーム、パイプ、リダイレクトの使用', w: 4, mon: '🐙', monName: 'パイプ・オクトパス' },
      { id: '1.03.4', name: '正規表現を使用したテキストファイルの検索', w: 2, mon: '🦂', monName: 'regexスコーピオン' },
      { id: '1.03.5', name: 'エディタを使った基本的なファイル編集の実行', w: 2, mon: '🐺', monName: 'viウルフ' }
    ]
  },
  {
    id: '1.04', name: 'パッケージの市場', full: 'リポジトリとパッケージ管理', icon: '🏪',
    boss: { mon: '👺', name: 'ディペンデンシー・デーモン' },
    subs: [
      { id: '1.04.1', name: 'aptコマンドによるパッケージ管理', w: 3, mon: '🦜', monName: 'aptオウム' },
      { id: '1.04.2', name: 'Debianパッケージ管理', w: 1, mon: '🦆', monName: 'dpkgダック' },
      { id: '1.04.3', name: 'yumコマンドによるパッケージ管理', w: 3, mon: '🐸', monName: 'yumフロッグ' },
      { id: '1.04.4', name: 'RPMパッケージ管理', w: 1, mon: '🦀', monName: 'rpmクラブ' }
    ]
  },
  {
    id: '1.05', name: 'ディスクの洞窟', full: 'ハードウェア、ディスク、パーティション、ファイルシステム', icon: '🕳️',
    boss: { mon: '🗿', name: 'ファイルシステム・タイタン' },
    subs: [
      { id: '1.05.1', name: 'ハードウェアの基礎知識と設定', w: 3, mon: '🦎', monName: 'ハードウェア・リザード' },
      { id: '1.05.2', name: 'ハードディスクのレイアウトとパーティション', w: 4, mon: '🐢', monName: 'パーティション・タートル' },
      { id: '1.05.3', name: 'ファイルシステムの作成と管理、マウント', w: 4, mon: '🦈', monName: 'fsckシャーク' }
    ]
  }
];

/* ---- 問題登録用ヘルパー ----
   qc(小主題, 問題, [選択肢...], 正解index, 解説, hard?)        … 単一選択
   qm(小主題, 問題, [選択肢...], [正解index...], 解説, hard?)   … 複数選択
   qi(小主題, 問題, 正解コマンド(文字列 or 配列), 解説, hard?)  … コマンド入力
   問題文・解説では `バッククォート` で囲むとコード表示になる。 */
window.QUESTIONS = [];
/* 章の定義。第1章=基礎固め（一問一答）、第2章=実戦演習（試験形式・毎回変わる問題）。
   問題ファイルの先頭で window.__ch = 2 のようにすると、以降に登録する問題がその章になる（既定は第1章）。
   ★第1章の問題の文面・ID は変更しないこと（進捗データが問題文のハッシュで紐づいているため）。 */
window.CHAPTERS = [
  { id: 0, name: '第0章', sub: '試験ガイド', icon: '🧭' },
  { id: 1, name: '第1章', sub: '基礎固め（一問一答）', icon: '📘' },
  { id: 2, name: '第2章', sub: '実戦演習（試験形式・毎回変わる問題）', icon: '⚔️' },
  { id: 3, name: '自作ノート', sub: '自分で追加した問題', icon: '✏️' }
];
(function () {
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  function add(o) {
    o.ch = window.__ch || 1;
    o.id = (o.ch === 1 ? '' : 'c' + o.ch + '-') + o.t + '-' + hash(o.q);
    window.QUESTIONS.push(o);
  }
  window.qc = function (t, q, o, a, e, hard) { add({ t: t, type: 'choice', q: q, o: o, a: a, e: e || '', hard: !!hard }); };
  window.qm = function (t, q, o, a, e, hard) { add({ t: t, type: 'multi', q: q, o: o, a: a, e: e || '', hard: !!hard }); };
  window.qi = function (t, q, ans, e, hard) { add({ t: t, type: 'input', q: q, ans: [].concat(ans), e: e || '', hard: !!hard }); };
  /* qg(小主題, キー, 生成関数, hard?) … 出題のたびに数値・文字列が変わる問題。
     生成関数は { type, q, o, a, e }（または ans）を返す。 */
  window.qg = function (t, key, fn, hard) {
    var ch = window.__ch || 1;
    window.QUESTIONS.push({ t: t, type: 'gen', gen: fn, hard: !!hard, ch: ch, id: 'c' + ch + 'g-' + t + '-' + key });
  };
})();
