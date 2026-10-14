/* ============================================================
   생각 오락실 통합 계정 — 허브와 모든 게임이 같이 쓰는 로그인
   불러오기: <script src="https://dobbi52.github.io/games/arcade-auth.js"></script>
   쓰는 법
     ArcadeAuth.get()            → 로그인 정보 {nick, pin, links} 또는 null
     ArcadeAuth.open({game, gameName, color, onPlay})
                                 → 로그인·가입·옛 계정 연결 창 (onPlay가 있으면 마지막에 "시작" 버튼)
     ArcadeAuth.onChange(fn)     → 로그인·로그아웃할 때마다 fn(정보) 호출
     ArcadeAuth.refresh()        → 서버에서 연결 상태 다시 받기
     ArcadeAuth.logout()
   ============================================================ */
(function () {
  const API = 'https://script.google.com/macros/s/AKfycbzZlmUD9M4rfo4Y4eEYgNjZH0N8SppUA1Otuo9yMEOqcLfklw8XbS5ZmXj1D3KZY4EG/exec';
  const HUB = 'https://dobbi52.github.io/games/';
  const KEY = 'arcade:auth';
  const OLD_END = '10월 31일';          // 게임마다 따로 하는 예전 로그인을 닫는 날
  const GAMES = [['kordle', '꼬들'], ['semdle', '셈들'], ['garak', '가락 꼬들'], ['queens', '퀸즈']];
  const NICK_RE = /^[가-힣A-Za-z0-9]{2,8}$/;
  const gameName = k => (GAMES.find(g => g[0] === k) || [k, k])[1];

  /* ---------- 저장 ---------- */
  const listeners = [];
  function get() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.nick && v.pin ? v : null; } catch (e) { return null; }
  }
  function save(v) {
    try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch (e) {}
    fire();
  }
  function fire() { const v = get(); listeners.forEach(f => { try { f(v); } catch (e) {} }); }
  addEventListener('storage', e => { if (e.key === KEY) fire(); });   // 다른 탭에서 로그인·로그아웃해도 바로 반영

  /* ---------- 서버 ---------- */
  async function call(action, data) {
    let last = null;
    for (let k = 0; k < 3; k++) {
      try {
        const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action }, data)) });
        const j = await r.json();
        if (j.ok || !j.retry) return j;
        last = j;
      } catch (e) { last = { ok: false, error: '연결하지 못했어요. 인터넷을 확인해 주세요.', net: true }; }
      if (k < 2) await new Promise(r => setTimeout(r, 600 * (k + 1)));
    }
    return last;
  }
  function keep(j, pin) { const v = { nick: j.nick, pin: pin, links: j.links || {}, at: Date.now() }; save(v); return v; }
  async function login(nick, pin) { const j = await call('login', { nick: nick, pin: pin }); if (j.ok) keep(j, pin); return j; }
  async function signup(nick, pin) { const j = await call('signup', { nick: nick, pin: pin }); if (j.ok) keep(j, pin); return j; }
  async function link(game, oldNick, oldPin) {
    const a = get(); if (!a) return { ok: false, error: '먼저 로그인해 주세요.' };
    const j = await call('link', { nick: a.nick, pin: a.pin, game: game, oldNick: oldNick, oldPin: oldPin });
    if (j.ok) keep(j, a.pin);
    return j;
  }
  async function refresh() {
    const a = get(); if (!a) return null;
    const j = await call('me', { nick: a.nick, pin: a.pin });
    if (j.ok) keep(j, a.pin);
    else if (['PIN', 'NOUSER', 'BLOCKED'].indexOf(j.code) >= 0) save(null);   // 선생님이 비밀번호를 바꿨거나 막은 경우
    return j;
  }
  function logout() { save(null); }

  /* ---------- 창 ---------- */
  const CSS = `
@font-face{font-family:'Galmuri11';src:url('https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/Galmuri11.woff2') format('woff2');font-display:swap}
@font-face{font-family:'Galmuri11';font-weight:700;src:url('https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/Galmuri11-Bold.woff2') format('woff2');font-display:swap}
.aa-dim{position:fixed;inset:0;z-index:2147483000;background:rgba(8,6,20,.82);display:none;place-items:center;padding:16px;font-family:'Galmuri11',monospace;-webkit-font-smoothing:none}
.aa-dim.open{display:grid}
.aa-dim *{box-sizing:border-box;margin:0;padding:0;font-family:inherit}
.aa-box{--c:#ffd84a;position:relative;width:100%;max-width:400px;max-height:calc(100vh - 32px);overflow-y:auto;background:#1f1a45;color:#f2f0ff;border:4px solid var(--c);box-shadow:8px 8px 0 #0a0818,0 0 30px color-mix(in srgb,var(--c) 50%,transparent);padding:30px 22px 22px;text-align:center;animation:aaCrt .3s steps(6) both;word-break:keep-all}
@keyframes aaCrt{0%{transform:scale(.1,.02);opacity:0}45%{transform:scale(1,.02);opacity:1}100%{transform:none}}
.aa-x{position:absolute;top:10px;right:10px;width:32px;height:32px;font-size:14px;font-weight:700;cursor:pointer;background:#0d0b20;color:#bdb7e6;border:3px solid #3a3470}
.aa-box h2{font-size:24px;font-weight:700;color:#ffd84a;text-shadow:3px 3px 0 #e2457a;letter-spacing:.04em;padding:0 30px;overflow-wrap:anywhere}
.aa-sub{margin-top:8px;font-size:13px;color:#bdb7e6;line-height:1.6}
.aa-for{margin-top:12px;font-size:14px;color:#14112b;background:var(--c);padding:6px 10px;font-weight:700}
.aa-tabs{display:flex;gap:8px;margin-top:16px}
.aa-tabs button{flex:1;font-size:14px;font-weight:700;cursor:pointer;background:#0d0b20;color:#bdb7e6;border:3px solid #3a3470;padding:8px 0}
.aa-tabs button.on{background:#6ef2d3;border-color:#6ef2d3;color:#14112b}
.aa-box label{display:block;text-align:left;margin-top:14px;font-size:13px;color:#d9d4ff}
.aa-box label small{color:#8f88c9;font-size:11px;margin-left:4px}
.aa-box input{display:block;width:100%;margin-top:6px;height:46px;padding:0 12px;font-size:18px;background:#0d0b20;color:#fff;border:3px solid #3a3470;outline:none;border-radius:0}
.aa-box input:focus{border-color:#6ef2d3}
.aa-msg{min-height:20px;margin-top:10px;font-size:13px;line-height:1.5;color:#ff7a9a}
.aa-msg.ok{color:#6ef2d3}
.aa-btn{display:block;width:100%;margin-top:10px;font-size:15px;font-weight:700;cursor:pointer;padding:11px;background:#0d0b20;color:#d9d4ff;border:3px solid #3a3470;box-shadow:3px 3px 0 #0a0818}
.aa-btn.main{background:var(--c);border-color:var(--c);color:#14112b;font-size:18px;padding:14px;box-shadow:5px 5px 0 #0a0818}
.aa-btn:disabled{opacity:.5;cursor:default}
.aa-btn:active:not(:disabled){transform:translate(2px,2px);box-shadow:1px 1px 0 #0a0818}
.aa-row{display:flex;gap:8px}.aa-row .aa-btn{flex:1}
.aa-note{margin-top:14px;font-size:12px;line-height:1.7;color:#8f88c9;text-align:left}
.aa-note b{color:#ffd84a;font-weight:700}
.aa-games{list-style:none;margin-top:16px;text-align:left;display:flex;flex-direction:column;gap:8px}
.aa-games li{display:flex;align-items:center;gap:8px;background:#0d0b20;border:3px solid #3a3470;padding:9px 10px;font-size:14px}
.aa-games li b{flex:0 0 74px;font-weight:700}
.aa-games li span{flex:1;min-width:0;font-size:12px;color:#8f88c9;overflow-wrap:anywhere}
.aa-games li.on{border-color:#6ef28a}
.aa-games li.on span{color:#6ef28a}
.aa-games li.aa-need{border-color:#ffd84a}
.aa-games li.aa-need span{color:#ffd84a}
.aa-games li.new{animation:aaHit .5s steps(2) 3}
@keyframes aaHit{50%{background:#2a5a3a}}
.aa-games li button{flex:none;font-size:11px;font-weight:700;cursor:pointer;background:#1f1a45;color:#ffd84a;border:2px solid #ffd84a;padding:5px 7px}
@media (prefers-reduced-motion:reduce){.aa-box,.aa-games li.new{animation:none}}
`;
  let dim = null, box = null, opts = {}, view = 'login', note = '', fresh = [], need = [], linkGame = '';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c <= 11171 && c % 28 ? a : b); };

  function setup() {
    if (dim) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    dim = document.createElement('div'); dim.className = 'aa-dim';
    dim.innerHTML = '<div class="aa-box" role="dialog" aria-modal="true" aria-label="생각 오락실 로그인"></div>';
    box = dim.firstChild;
    dim.addEventListener('click', e => { if (e.target === dim) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && dim.classList.contains('open')) close(); });
    document.body.appendChild(dim);
  }
  function open(o) {
    setup();
    opts = o || {};
    box.style.setProperty('--c', opts.color || '#ffd84a');
    view = get() ? 'me' : 'login'; note = ''; fresh = []; need = [];
    draw();
    dim.classList.add('open');
    const cur = get();
    if (cur) call('login', { nick: cur.nick, pin: cur.pin }).then(j => {   // 비밀번호가 달라 연결이 필요한 게임 다시 확인
      if (!j || !j.ok || get() === null || get().nick !== cur.nick) return;
      keep(j, cur.pin); need = j.needLink || [];
      if (dim.classList.contains('open') && view === 'me') draw();
    });
  }
  function close() { if (dim) dim.classList.remove('open'); if (opts.onClose) opts.onClose(); }

  function draw() {
    const a = get();
    const forLine = opts.gameName ? `<p class="aa-for">${esc(josa(opts.gameName, '을', '를'))} 하려면 로그인해 주세요</p>` : '';
    let h = '<button class="aa-x" data-a="close" aria-label="닫기">✕</button>';
    if (view === 'login' || view === 'signup') {
      const su = view === 'signup';
      h += `<h2>${su ? 'NEW PLAYER' : '1P LOGIN'}</h2><p class="aa-sub">생각 오락실 통합 계정 하나로 모든 게임을 해요</p>${forLine}
        <div class="aa-tabs"><button data-a="login" class="${su ? '' : 'on'}">로그인</button><button data-a="signup" class="${su ? 'on' : ''}">처음이에요</button></div>
        <label for="aaNick">닉네임<small>한글·영어·숫자 2~8자</small></label>
        <input id="aaNick" maxlength="8" autocomplete="off" autocapitalize="off" spellcheck="false">
        <label for="aaPin">비밀번호<small>숫자 4자리</small></label>
        <input id="aaPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off">
        ${su ? '<label for="aaPin2">비밀번호 한 번 더</label><input id="aaPin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off">' : ''}
        <p class="aa-msg" id="aaMsg">${esc(note)}</p>
        <button class="aa-btn main" data-a="go">${su ? '가입하고 시작 ▶' : 'START ▶'}</button>
        <p class="aa-note">${su
          ? '· 진짜 이름이나 학교·반이 드러나는 닉네임은 쓰지 마세요.<br>· 꼬들·셈들·가락 꼬들·퀸즈에서 <b>쓰던 닉네임과 비밀번호 그대로</b> 가입하면 예전 기록이 저절로 이어져요.<br>· 비밀번호를 잊으면 선생님께 말씀해 주세요.'
          : `· 아직 통합 계정이 없다면 <b>처음이에요</b>를 눌러 만들어요.<br>· 게임마다 따로 하던 로그인은 <b>${OLD_END}</b>까지만 쓸 수 있어요.`}</p>`;
    } else if (view === 'me' && a) {
      const L = a.links || {};
      const head = note ? `<p class="aa-msg ok">${esc(note)}</p>` : '';
      h += `<h2>1P ${esc(a.nick)}</h2><p class="aa-sub">게임별 기록 연결</p>${head}
        <ul class="aa-games">${GAMES.map(([k, n]) => L[k]
          ? `<li class="on${fresh.indexOf(k) >= 0 ? ' new' : ''}"><b>${n}</b><span>✓ ${L[k] === a.nick ? '예전 기록 이어짐' : esc(L[k]) + ' 기록 이어짐'}</span></li>`
          : need.indexOf(k) >= 0
          ? `<li class="aa-need"><b>${n}</b><span>비밀번호가 달라요</span><button data-a="link" data-g="${k}">${n} 비밀번호로 연결</button></li>`
          : `<li><b>${n}</b><span>새로 시작</span><button data-a="link" data-g="${k}">예전 닉네임 연결</button></li>`).join('')}</ul>
        <p class="aa-note">· <b>새로 시작</b>인 게임은 그냥 하면 이 닉네임으로 새로 시작해요.<br>· 그 게임에서 다른 닉네임을 썼다면 <b>예전 닉네임 연결</b>로 기록을 가져와요.<br>· 순위표에는 이제 <b>${esc(a.nick)}</b>(으)로 보여요.</p>
        ${opts.onPlay ? `<button class="aa-btn main" data-a="play">▶ ${esc(opts.gameName || '게임')} 시작</button>` : ''}
        <div class="aa-row"><button class="aa-btn" data-a="logout">로그아웃</button><button class="aa-btn" data-a="close">닫기</button></div>`;
    } else if (view === 'link') {
      const n = gameName(linkGame);
      h += `<h2>기록 가져오기</h2><p class="aa-sub">${esc(n)}에서 쓰던 닉네임과 비밀번호를 넣어요</p>
        <label for="aaOld">${esc(n)} 닉네임</label>
        <input id="aaOld" maxlength="10" autocomplete="off" autocapitalize="off" spellcheck="false" value="${need.indexOf(linkGame) >= 0 && a ? esc(a.nick) : ''}">
        <label for="aaOldPin">${esc(n)} 비밀번호<small>숫자 4자리</small></label>
        <input id="aaOldPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off">
        <p class="aa-msg" id="aaMsg">${esc(note)}</p>
        <button class="aa-btn main" data-a="dolink">연결하기</button>
        <button class="aa-btn" data-a="back">돌아가기</button>
        <p class="aa-note">· 한 게임에는 예전 계정 하나만 연결할 수 있고, 한 번 연결하면 바꿀 수 없어요.<br>· 잘못 연결했다면 선생님께 말씀해 주세요.</p>`;
    } else { view = 'login'; return draw(); }
    box.innerHTML = h;
    box.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act(b.dataset.a, b)));
    box.querySelectorAll('input').forEach((inp, i, all) => inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (all[i + 1]) all[i + 1].focus(); else act(view === 'link' ? 'dolink' : 'go');
    }));
    const first = box.querySelector('input') || box.querySelector('[data-a="play"]');
    if (first) setTimeout(() => first.focus(), 60);
  }

  const val = id => { const e = box.querySelector('#' + id); return e ? e.value.trim() : ''; };
  function msg(t, ok) { const m = box.querySelector('#aaMsg'); if (m) { m.textContent = t; m.className = 'aa-msg' + (ok ? ' ok' : ''); } }
  function busy(on) { box.querySelectorAll('button,input').forEach(b => { b.disabled = on; }); }

  async function act(a, btn) {
    if (a === 'close') return close();
    if (a === 'login' || a === 'signup') { view = a; note = ''; return draw(); }
    if (a === 'back') { view = 'me'; note = ''; return draw(); }
    if (a === 'logout') { logout(); view = 'login'; note = ''; return draw(); }
    if (a === 'link') { linkGame = btn.dataset.g; view = 'link'; note = ''; return draw(); }
    if (a === 'play') { const f = opts.onPlay; close(); if (f) f(get()); return; }
    if (a === 'go') {
      const su = view === 'signup', nick = val('aaNick'), pin = val('aaPin');
      if (!NICK_RE.test(nick)) return msg('닉네임은 한글·영어·숫자 2~8자로 써 주세요. (띄어쓰기 없이)');
      if (!/^\d{4}$/.test(pin)) return msg('비밀번호는 숫자 4자리로 써 주세요.');
      if (su && pin !== val('aaPin2')) return msg('두 비밀번호가 서로 달라요.');
      busy(true); msg(su ? '가입하는 중… 예전 기록도 찾고 있어요' : '확인하는 중…', true);
      const j = su ? await signup(nick, pin) : await login(nick, pin);
      if (!j.ok) { busy(false); return msg(j.error || '잠시 뒤 다시 해 주세요.'); }
      fresh = j.autoLinked || [];
      need = j.needLink || [];
      const names = fresh.map(gameName);
      note = (su ? '가입 완료! ' : '') + (names.length ? names.join(', ') + ' 예전 기록을 찾아서 이어 붙였어요.' : (su ? '' : '어서 와요!'));
      if (need.length) note += ' ' + need.map(gameName).join('·') + '에도 같은 닉네임이 있는데 비밀번호가 달라요. 아래에서 그 게임 비밀번호로 연결해 주세요.';
      view = 'me';
      return draw();
    }
    if (a === 'dolink') {
      const oldNick = val('aaOld'), oldPin = val('aaOldPin');
      if (!oldNick) return msg('예전 닉네임을 써 주세요.');
      if (!/^\d{4}$/.test(oldPin)) return msg('비밀번호는 숫자 4자리로 써 주세요.');
      busy(true); msg('확인하는 중…', true);
      const j = await link(linkGame, oldNick, oldPin);
      if (!j.ok) { busy(false); return msg(j.error || '잠시 뒤 다시 해 주세요.'); }
      fresh = [linkGame];
      need = need.filter(k => k !== linkGame);
      note = gameName(linkGame) + ' 예전 기록을 이어 붙였어요!';
      view = 'me';
      return draw();
    }
  }

  window.ArcadeAuth = {
    API: API, HUB: HUB, OLD_END: OLD_END, GAMES: GAMES,
    get: get, open: open, close: close, refresh: refresh, logout: logout,
    login: login, signup: signup, link: link,
    onChange: fn => { listeners.push(fn); }
  };
})();
