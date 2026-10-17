// Knowledge base «ИИмерсивный»: one static page that works as a Telegram Mini App (bot @imersivnybot) and as a site.
// Content comes from content/index.json, built by build_index.py from content/<slug>/meta.json.
// Routes: #/ home, #/s/<section> home filtered, #/m/<slug> material, #/m/<slug>/<file index> reader.
'use strict';

const TG = window.Telegram && window.Telegram.WebApp;
const IN_TG = Boolean(TG && TG.initData);
const tgAtLeast = (v) => IN_TG && typeof TG.isVersionAtLeast === 'function' && TG.isVersionAtLeast(v);

const LABEL = { 'гайд': 'Гайд', 'скилл': 'Скилл', 'статья': 'Статья', 'сайт': 'Сайт', 'промпты': 'Промпты', 'подборка': 'Подборка', 'установщик': 'Установщик' };
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
let SITE = null;
let MATS = [];
const TEXTS = new Map(); // file texts fetched ahead, so «Скопировать» can write the clipboard inside the tap itself

// ---------- small helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// one- and two-letter words (и, с, в, на…) stay with the next word, so a line never ends on them
const nb = (t) => esc(t).replace(/(^|[\s ])([А-Яа-яЁё]{1,2}) /g, '$1$2 ');
const ic = (name) => `<svg class="i" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${window.ICONS[name] || ''}</svg>`;
const plural = (n, one, few, many) => { const d = n % 10, h = n % 100; return `${n} ${d === 1 && h !== 11 ? one : d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many}`; };
const fmtDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]}${y !== new Date().getFullYear() ? ' ' + y : ''}`; };

const bySlug = (slug) => MATS.find((m) => m.slug === slug);
const section = (id) => SITE.sections.find((s) => s.id === id) || { id, title: '', short: '' };
const isSite = (m) => m.type === 'сайт';
// A material waits for its post: "draft": true, or "publishAt" still ahead, keeps it out of every list.
// Its startapp link opens it anyway, so the post works the moment it goes out (Arthur, 2026-10-17).
// Preview for Arthur: t.me/imersivnybot?startapp=preview (or ?preview on the web) shows held materials too.
const PREVIEW = new URLSearchParams(location.search).has('preview')
  || Boolean(IN_TG && TG.initDataUnsafe && TG.initDataUnsafe.start_param === 'preview');
const listed = (m) => PREVIEW || (!m.draft && !(m.publishAt && Date.parse(m.publishAt) > Date.now()));
// «Новое»: new for SITE.newDays days after it appeared, unless its meta says "new": true or false
const isNew = (m) => (typeof m.new === 'boolean' ? m.new
  : (Date.now() - Date.parse(m.publishAt || m.date + 'T00:00:00')) / 864e5 <= SITE.newDays);
const asset = (m, name) => `content/${m.slug}/${name}`;
const fileHref = (m, f) => f.url || asset(m, f.name); // relative to the app folder
const absolute = (path) => new URL(path, location.href).href;
const live = (path) => new URL(path, SITE.base).href; // the public address, also when tested locally
const deepLink = (m) => `https://t.me/${SITE.bot}?startapp=${m.slug}`;
const hasAgent = (m) => Boolean(m.agent || m.agentFile);
const agentLine = (m) => m.agent || `Прочитай ${live(asset(m, m.agentFile))} и проведи меня по шагам. Где написано СПРОСИ, спроси меня.`;
const dot = (m) => `<span class="dot" style="background:var(--c-${esc(m.section)})"></span>`;
const filesLabel = (m) => (m.files && m.files.length ? plural(m.files.length, 'файл', 'файла', 'файлов') : '');

// ---------- Telegram ----------
// Arthur 2026-10-17: the app is always white, also in a dark Telegram theme, so Telegram's header and
// background are painted white to match (any colour is allowed from Bot API 6.9).
function paintTelegram() {
  if (tgAtLeast('6.9')) { TG.setHeaderColor('#ffffff'); TG.setBackgroundColor('#ffffff'); }
}
const haptic = () => { if (tgAtLeast('6.1')) TG.HapticFeedback.notificationOccurred('success'); };
function openExternal(url) {
  if (IN_TG) TG.openLink(url);
  else window.open(url, '_blank', 'noopener');
}
function openTelegram(url) {
  if (IN_TG && typeof TG.openTelegramLink === 'function') TG.openTelegramLink(url);
  else window.open(url, '_blank', 'noopener');
}

function toast(text, ms = 1800) {
  const t = document.getElementById('toast');
  t.innerHTML = ic('check') + esc(text);
  t.classList.add('on');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('on'), ms);
}

// ---------- access: channel subscribers only (Arthur, 2026-10-17) ----------
// The server (Hermes, systemd kb-access) verifies Telegram's signed initData and asks Telegram whether the user is in
// the channel. Outside Telegram nobody can be checked, so the web shows the way into the bot. If the check itself
// fails (server or Telegram down), the base stays open: a subscriber must never be locked out by our outage.
const ACCESS_URL = 'https://n8n.arturx.art/kb/access';
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname); // local review sees everything
async function checkAccess() {
  if (LOCAL) return 'open';
  if (!IN_TG) return 'web';
  try {
    const res = await fetch(ACCESS_URL, { method: 'POST', body: TG.initData, cache: 'no-store' });
    if (!res.ok) return 'open';
    return (await res.json()).subscribed ? 'member' : 'locked';
  } catch (e) {
    return 'open';
  }
}
function gate(state) {
  const slug = (location.hash.match(/^#\/m\/([\w-]+)/) || [])[1];
  const inBot = `https://t.me/${SITE.bot}${slug ? `?startapp=${slug}` : '?startapp'}`;
  return `<div class="gate"><p class="hi">База знаний канала</p><h1 class="title">ИИмерсивный</h1>
    <p class="gate-text">${state === 'web'
      ? 'Материалы открыты подписчикам канала. Открой базу в Telegram, там она проверит подписку.'
      : 'Материалы открыты подписчикам канала. Подпишись и нажми «Я подписался», всё бесплатно.'}</p>
    ${state === 'web'
      ? `<div class="gate-actions"><a class="gate-btn" href="${esc(inBot)}">Открыть в Telegram</a></div>`
      : `<div class="gate-actions"><a class="gate-btn" href="${esc(SITE.links.telegram)}" data-tglink>Подписаться на канал</a>
        <button class="gate-btn quiet" data-recheck>Я подписался</button></div>`}</div>`;
}
function copyText(text, msg) {
  const done = () => { toast(msg); haptic(); };
  const fallback = () => {
    const a = document.createElement('textarea');
    a.value = text; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0';
    document.body.appendChild(a); a.select();
    const ok = document.execCommand('copy');
    a.remove();
    ok ? done() : toast('Не скопировалось. Открой файл и выдели текст');
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
  else fallback();
}
function prefetchTexts(m) {
  (m.files || []).forEach((f, i) => {
    const key = `${m.slug}/${i}`;
    if (f.kind !== 'text' || TEXTS.has(key)) return;
    fetch(fileHref(m, f)).then((r) => (r.ok ? r.text() : Promise.reject(r.status))).then((t) => TEXTS.set(key, t)).catch(() => {});
  });
}
function share(m) {
  const link = deepLink(m);
  if (IN_TG) return openTelegram(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(m.title)}`);
  if (navigator.share) return navigator.share({ title: m.title, url: link }).catch(() => {});
  copyText(link, 'Ссылка скопирована');
}

// ---------- «Новое» carousel ----------
function heroCard(m) {
  const left = isSite(m) ? `<span class="pill glass quiet">${esc(m.domain)}</span>`
    : filesLabel(m) ? `<span class="pill glass quiet">${filesLabel(m)}</span>` : '<span></span>';
  const bar = `<div class="media-bar">${left}<span class="pill glass">Открыть</span></div>`;
  let media = '';
  if (m.clip) {
    media = `<video class="clip" src="${esc(asset(m, m.clip.src))}" poster="${esc(asset(m, m.clip.poster))}" data-still="${esc(asset(m, m.clip.still))}"
      muted loop playsinline preload="auto" aria-hidden="true"></video>`;
  } else if (m.cover) {
    media = `<img class="drift" src="${esc(asset(m, m.cover))}" alt="">`;
  } else if (m.files) {
    media = `<div class="sheets">${m.files.slice(0, 3).map((f) => `<span class="sheet">${esc(f.name)}<i></i><i></i><i style="width:70%"></i><i></i><i style="width:55%"></i></span>`).join('')}</div>`;
  }
  return `<div class="hero"><p class="kicker">${dot(m)}Новое · ${LABEL[m.type]}</p><h2 class="title">${nb(m.title)}</h2>
    <button class="hero-media${m.clip ? ' clip-card' : ''}" data-go="#/m/${m.slug}">${media}${bar}</button></div>`;
}

// Autoplay refused (some phones in power saving): show the finished title and turn «N файлов» into «Смотреть».
function offerPlay(v) {
  v.poster = v.dataset.still;
  const pill = v.parentElement.querySelector('.media-bar .pill');
  if (!pill || 'play' in pill.dataset) return;
  pill.dataset.play = pill.textContent;
  pill.className = 'pill glass';
  pill.innerHTML = ic('play-circle-fill') + 'Смотреть';
}

let heroTimer = 0;
let clipWatch = null;
function setupHeroes() {
  clearInterval(heroTimer);
  if (clipWatch) clipWatch.disconnect();
  const rail = document.querySelector('.heroes');
  if (!rail) return;
  const cards = [...rail.children];
  const dots = [...document.querySelectorAll('.hero-dots i')];
  const current = () => Math.round(rail.scrollLeft / (cards[0].offsetWidth + 12));
  let touched = false;
  rail.addEventListener('pointerdown', () => { touched = true; }, { once: true });
  rail.addEventListener('scroll', () => dots.forEach((d, k) => d.classList.toggle('on', k === current())), { passive: true });
  // Arthur 2026-10-17: «Новое» plays by itself for everyone; a clip plays only while it is on screen
  clipWatch = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) e.target.play().catch(() => offerPlay(e.target));
    else e.target.pause();
  }), { threshold: 0.6 });
  rail.querySelectorAll('video.clip').forEach((v) => clipWatch.observe(v));
  if (cards.length < 2) return;
  heroTimer = setInterval(() => {
    if (touched || !rail.isConnected) return clearInterval(heroTimer);
    const next = cards[(current() + 1) % cards.length];
    rail.scrollTo({ left: next.offsetLeft - 20, behavior: 'smooth' });
  }, 11000);
}

// ---------- screens ----------
function post(m) {
  let extra = '';
  if (isSite(m) && m.cover) extra = `<span class="pcover"><img src="${esc(asset(m, m.cover))}" alt="" loading="lazy"><span class="pill glass quiet">${esc(m.domain)}</span></span>`;
  else if (hasAgent(m)) extra = `<div class="chips"><button class="chip" data-agent="${m.slug}">${ic('terminal-window')}Отдать агенту</button></div>`;
  return `<div class="post" data-go="#/m/${m.slug}" role="button" tabindex="0">
    <p class="kicker">${dot(m)}${LABEL[m.type]} · ${fmtDate(m.date)}</p>
    <h3 class="title">${nb(m.title)}</h3><p class="sum">${nb(m.summary)}</p>${extra}</div>`;
}

function home(filter = 'all') {
  const shown = MATS.filter(listed);
  // a clip leads the carousel, own materials before inspiration links
  const heroes = shown.filter(isNew).sort((a, b) => Boolean(b.clip) - Boolean(a.clip) || isSite(a) - isSite(b));
  // Arthur 2026-10-17: new materials stand first in the list too, not only in the carousel above it.
  // Order: own materials before inspiration links, new before old, a clip first; otherwise newest first.
  const feed = shown.filter((m) => filter === 'all' || m.section === filter)
    .sort((a, b) => isSite(a) - isSite(b) || isNew(b) - isNew(a) || Boolean(b.clip) - Boolean(a.clip));
  const liveSections = SITE.sections.filter((s) => shown.some((m) => m.section === s.id)); // empty sections stay hidden
  const name = IN_TG && TG.initDataUnsafe && TG.initDataUnsafe.user && TG.initDataUnsafe.user.first_name;
  const tabs = `<button class="tab" data-go="#/" aria-pressed="${filter === 'all'}">Все</button>
    ${liveSections.map((s) => `<button class="tab" data-go="#/s/${s.id}" aria-pressed="${filter === s.id}">${esc(s.short)}</button>`).join('')}`;
  return `
  <header class="hello"><div><p class="hi">${PREVIEW ? 'Предпросмотр: видно и то, что ждёт поста' : name ? `Привет, ${esc(name)} · база знаний` : 'База знаний канала'}</p><h1 class="title">ИИмерсивный</h1></div>
    <span class="head-links">
      <a href="${esc(SITE.links.telegram)}" target="_blank" rel="noopener" data-tglink aria-label="Канал в Telegram">${ic('telegram-logo-fill')}</a>
      <a href="${esc(SITE.links.youtube)}" target="_blank" rel="noopener" data-ext aria-label="YouTube">${ic('youtube-logo-fill')}</a>
    </span></header>
  ${filter === 'all' && heroes.length ? `<div class="heroes">${heroes.map(heroCard).join('')}</div>
  ${heroes.length > 1 ? `<div class="hero-dots">${heroes.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}` : ''}
  <div class="feed-gap" id="feed"></div>
  ${feed.length ? feed.map(post).join('') : '<p class="empty">Здесь пока пусто. Материалы появятся вместе с постами.</p>'}
  <div class="course"><span class="tag">курс</span>${nb(SITE.course.title)}. ${esc(SITE.course.note)}.</div>
  <nav class="tabbar glass" aria-label="Разделы">${tabs}</nav>`;
}

function material(slug) {
  const m = bySlug(slug);
  if (!m) return notFound();
  const site = isSite(m);
  prefetchTexts(m);
  return `
  <div class="nav"><button class="back" data-go="#/s/${m.section}">${ic('caret-left')}${esc(section(m.section).short)}</button>
    <div class="tools">${site ? `<button class="icon-btn" data-copylink="${esc(m.url)}" aria-label="Скопировать ссылку">${ic('copy')}</button>` : ''}<button class="icon-btn" data-share="${m.slug}" aria-label="Поделиться">${ic('share-network')}</button></div></div>
  ${site && m.cover ? `<div class="mmedia"><div class="hero-media"><img src="${esc(asset(m, m.cover))}" alt=""></div></div>` : ''}
  <div class="mhead"><p class="kicker">${dot(m)}${esc(section(m.section).short)} · ${site ? esc(m.domain) : LABEL[m.type]} · ${fmtDate(m.date)}</p>
    <h1 class="title">${nb(m.title)}</h1><p class="lead">${nb(m.summary)}</p>
    ${m.post_url ? `<a class="post-link" href="${esc(m.post_url)}" target="_blank" rel="noopener" data-tglink>Пост в канале ${ic('arrow-up-right')}</a>` : ''}</div>
  ${hasAgent(m) ? `<div class="sec"><span>Для агента</span><button data-agent="${m.slug}">Копировать</button></div>
  <div class="agent"><span class="cue">›</span> ${esc(agentLine(m))}</div>` : ''}
  ${m.files && m.files.length ? `<div class="sec"><span>Файлы</span><span>${m.files.length}</span></div>
  <div class="list">${m.files.map((f, i) => {
    const text = f.kind === 'text';
    return `<div class="row" ${text ? `data-go="#/m/${m.slug}/${i}" role="button" tabindex="0"` : ''}>
      <span class="fi">${ic(text ? 'file-text' : 'file-zip')}</span>
      <span class="body"><span class="t">${esc(f.name)}</span><span class="s">${esc(f.about || '')}</span></span>
      ${text ? `<button class="icon-btn" data-copyfile="${m.slug}/${i}" aria-label="Скопировать">${ic('copy')}</button>` : ''}
      <a class="icon-btn" href="${esc(fileHref(m, f))}" download="${esc(f.name)}" data-dl="${m.slug}/${i}" aria-label="Скачать">${ic('download-simple')}</a></div>`;
  }).join('')}</div>` : ''}
  ${site ? `<div class="main"><button class="glass" data-open="${esc(m.url)}">Открыть сайт ${ic('arrow-up-right')}</button></div>`
    : hasAgent(m) ? `<div class="main"><button class="glass" data-agent="${m.slug}">${ic('terminal-window')}Скопировать для агента</button></div>` : ''}`;
}

function reader(slug, index) {
  const m = bySlug(slug);
  const f = m && m.files && m.files[index];
  if (!f || f.kind !== 'text') return notFound();
  const key = `${slug}/${index}`;
  setTimeout(async () => {
    const box = document.getElementById('doc');
    try {
      let text = TEXTS.get(key);
      if (text === undefined) {
        const res = await fetch(fileHref(m, f));
        if (!res.ok) throw new Error(res.status);
        text = await res.text();
        TEXTS.set(key, text);
      }
      // only our own files from this repo are rendered; every other string on the page goes through esc()
      if (box.isConnected) box.innerHTML = window.marked.parse(text.replace(/\r\n?/g, '\n'));
    } catch (e) {
      if (box.isConnected) box.innerHTML = '<p class="empty">Файл не открылся. Попробуй скачать его кнопкой вверху.</p>';
    }
  });
  return `
  <div class="nav"><button class="back" data-go="#/m/${slug}">${ic('caret-left')}Назад</button>
    <div class="tools"><button class="icon-btn" data-copyfile="${key}" aria-label="Скопировать">${ic('copy')}</button><a class="icon-btn" href="${esc(fileHref(m, f))}" download="${esc(f.name)}" data-dl="${key}" aria-label="Скачать">${ic('download-simple')}</a></div></div>
  <article class="reader" id="doc"><p style="color:var(--hint)">Открываю ${esc(f.name)}…</p></article>`;
}

function notFound() {
  return `<div class="nav"><button class="back" data-go="#/">${ic('caret-left')}Материалы</button></div>
  <p class="empty">Такого материала нет. Может, ссылка устарела.<br><br><button class="chip" data-go="#/">Все материалы</button></p>`;
}

// ---------- routing ----------
function parentOf(h) {
  let m;
  if ((m = h.match(/^#\/m\/([\w-]+)\/\d+$/))) return `#/m/${m[1]}`;
  if ((m = h.match(/^#\/m\/([\w-]+)$/))) { const mm = bySlug(m[1]); return mm ? `#/s/${mm.section}` : '#/'; }
  return '#/';
}
let wasHome = false;
let ACCESS = 'open';
function render() {
  const h = location.hash;
  const app = document.getElementById('app');
  if (ACCESS === 'locked' || ACCESS === 'web') {
    app.innerHTML = gate(ACCESS);
    if (IN_TG && TG.BackButton) TG.BackButton.hide();
    return;
  }
  const isHome = !/^#\/m\//.test(h);
  const feedMark = document.getElementById('feed');
  const keep = isHome && wasHome && feedMark && window.scrollY > feedMark.offsetTop; // switching sections keeps the reader's place
  let m;
  if ((m = h.match(/^#\/m\/([\w-]+)\/(\d+)$/))) app.innerHTML = reader(m[1], +m[2]);
  else if ((m = h.match(/^#\/m\/([\w-]+)$/))) app.innerHTML = material(m[1]);
  else if ((m = h.match(/^#\/s\/([\w-]+)$/))) app.innerHTML = home(m[1]);
  else app.innerHTML = home();
  if (keep) window.scrollTo(0, document.getElementById('feed').offsetTop);
  else if (!(isHome && wasHome)) window.scrollTo(0, 0);
  const active = document.querySelector('.tab[aria-pressed="true"]');
  if (active) active.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  wasHome = isHome;
  if (isHome) setupHeroes(); else { clearInterval(heroTimer); if (clipWatch) clipWatch.disconnect(); }
  if (IN_TG && TG.BackButton) (/^#\/(m|s)\//.test(h) ? TG.BackButton.show() : TG.BackButton.hide());
}
const go = (hash) => { location.hash = hash; };

// A link like t.me/imersivnybot?startapp=<slug> opens that material (start_param is used for routing only).
function startRoute() {
  const q = new URLSearchParams(location.search);
  const p = (IN_TG && TG.initDataUnsafe && TG.initDataUnsafe.start_param) || q.get('tgWebAppStartParam');
  if (p && /^[a-z0-9-]{1,64}$/.test(p) && bySlug(p)) history.replaceState(null, '', `${location.pathname}${location.search}#/m/${p}`);
}

// ---------- taps ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-recheck],[data-play],[data-dl],[data-agent],[data-copyfile],[data-copylink],[data-open],[data-share],[data-ext],[data-tglink],[data-retry],[data-go]');
  if (!t) return;
  if ('recheck' in t.dataset) {
    t.disabled = true;
    t.textContent = 'Проверяю…';
    return checkAccess().then((state) => {
      ACCESS = state;
      if (state === 'locked') toast('Подписки пока не видно. Подпишись и попробуй ещё раз', 2600);
      else toast('Ты подписан на канал, всё открыто', 2600);
      render();
    });
  }
  if ('play' in t.dataset) {
    e.stopPropagation();
    const v = t.closest('.hero-media').querySelector('video.clip');
    v.play().catch(() => {});
    t.className = 'pill glass quiet'; t.textContent = t.dataset.play; delete t.dataset.play; // back to «N файлов»
    return;
  }
  if (t.dataset.dl) {
    e.stopPropagation();
    if (!IN_TG) return; // on the web the link downloads by itself
    e.preventDefault();
    const [slug, i] = t.dataset.dl.split('/');
    const mm = bySlug(slug);
    const f = mm.files[+i];
    const url = absolute(fileHref(mm, f));
    if (tgAtLeast('8.0')) TG.downloadFile({ url, file_name: f.name });
    else TG.openLink(url);
    return;
  }
  if (t.dataset.agent) { e.stopPropagation(); return copyText(agentLine(bySlug(t.dataset.agent)), 'Скопировано. Вставь в Claude Code'); }
  if (t.dataset.copyfile) {
    e.stopPropagation();
    const [slug, i] = t.dataset.copyfile.split('/');
    const mm = bySlug(slug);
    const f = mm.files[+i];
    const cached = TEXTS.get(t.dataset.copyfile);
    if (cached !== undefined) return copyText(cached, `${f.name} скопирован целиком`);
    return fetch(fileHref(mm, f)).then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then((text) => { TEXTS.set(t.dataset.copyfile, text); copyText(text, `${f.name} скопирован целиком`); })
      .catch(() => toast('Файл не загрузился. Проверь интернет'));
  }
  if (t.dataset.copylink) return copyText(t.dataset.copylink, 'Ссылка скопирована');
  if (t.dataset.open) return openExternal(t.dataset.open);
  if (t.dataset.share) return share(bySlug(t.dataset.share));
  if ('ext' in t.dataset) { e.preventDefault(); return openExternal(t.href); }
  if ('tglink' in t.dataset) { e.preventDefault(); return openTelegram(t.href); }
  if ('retry' in t.dataset) return location.reload();
  if (t.dataset.go) go(t.dataset.go);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('[role="button"][data-go]')) go(e.target.dataset.go);
});

// ---------- start ----------
async function init() {
  if (IN_TG) {
    document.documentElement.classList.add('tg');
    TG.ready();
    TG.expand();
    paintTelegram();
    TG.onEvent('themeChanged', paintTelegram);
    if (TG.BackButton) TG.BackButton.onClick(() => go(parentOf(location.hash)));
  }
  const access = checkAccess(); // runs while the content loads
  try {
    const res = await fetch('content/index.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    SITE = data.site;
    MATS = data.materials;
  } catch (e) {
    document.getElementById('app').innerHTML = '<p class="state">Материалы не загрузились. Проверь интернет и попробуй ещё раз.<br><button data-retry>Обновить</button></p>';
    return;
  }
  startRoute();
  ACCESS = await access;
  render();
  if (ACCESS === 'member') toast('Ты подписан на канал, всё открыто', 2600);
  window.addEventListener('hashchange', render);
}
init();
