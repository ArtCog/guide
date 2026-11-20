// Knowledge base «ИИмерсивный»: one static page that works as a Telegram Mini App (bot @imersivnybot) and as a site.
// Content comes from content/index.json, built by build_index.py from content/<slug>/meta.json.
// Routes: #/ home, #/t/<guides|skills|inspo> tabs (old #/s/<section> lands on home, #/t/more on «Гайды»),
// #/m/<slug> material, #/m/<slug>/<file index> reader.
'use strict';

const TG = window.Telegram && window.Telegram.WebApp;
const IN_TG = Boolean(TG && TG.initData);
const tgAtLeast = (v) => IN_TG && typeof TG.isVersionAtLeast === 'function' && TG.isVersionAtLeast(v);

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
let SITE = null;
let MATS = [];
const TEXTS = new Map(); // file texts fetched ahead, so «Скопировать» can write the clipboard inside the tap itself

// ---------- small helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// one- and two-letter words (и, с, в, на…) stay with the next word, so a line never ends on them
const nb = (t) => esc(t).replace(/(^|[\s ])([А-Яа-яЁё]{1,2}) /g, '$1$2 ');
const ic = (name) => `<svg class="i" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${window.ICONS[name] || ''}</svg>`;
const fmtDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]}${y !== new Date().getFullYear() ? ' ' + y : ''}`; };

const bySlug = (slug) => MATS.find((m) => m.slug === slug);
const isSite = (m) => m.type === 'сайт';
// A material waits for its post: "draft": true, or "publishAt" still ahead, keeps it out of every list.
// Its startapp link opens it anyway, so the post works the moment it goes out (Arthur, 2026-10-17).
// Preview for Arthur: t.me/imersivnybot?startapp=preview (or ?preview on the web) shows held materials too.
const PREVIEW = new URLSearchParams(location.search).has('preview')
  || Boolean(IN_TG && TG.initDataUnsafe && TG.initDataUnsafe.start_param === 'preview');
const listed = (m) => PREVIEW || (!m.draft && !(m.publishAt && Date.parse(m.publishAt) > Date.now()));
const asset = (m, name) => `content/${m.slug}/${name}`;
const fileHref = (m, f) => f.url || asset(m, f.name); // relative to the app folder
const absolute = (path) => new URL(path, location.href).href;
const live = (path) => new URL(path, SITE.base).href; // the public address, also when tested locally
const deepLink = (m) => `https://t.me/${SITE.bot}?startapp=${m.slug}`;
const hasAgent = (m) => Boolean(m.agent || m.agentFile);
const agentLine = (m) => m.agent || `Прочитай ${live(asset(m, m.agentFile))} и проведи меня по шагам. Где написано СПРОСИ, спроси меня.`;
const appeared = (m) => Date.parse(m.publishAt || m.date); // newest first wherever materials are listed
const pdfIndex = (m) => (m.files || []).findIndex((f) => f.kind === 'pdf'); // a guide's main file
const fileIcon = (f) => (f.kind === 'text' ? 'file-text' : f.kind === 'pdf' ? 'file-pdf' : 'file-zip');
// «Graphify: полная инструкция» → name «Graphify» (as said in the Reel)
const nameOf = (m) => m.pinTitle || m.title.split(':')[0].trim(); // pinTitle: the name the video used, same line as in the pinned post

// ---------- Telegram ----------
// Arthur 2026-10-17: the app keeps its own light page, also in a dark Telegram theme, so Telegram's header and
// background are painted in the page colour (--page, warm paper since 2026-11-20; any colour is allowed from Bot API 6.9).
function paintTelegram() {
  const page = getComputedStyle(document.documentElement).getPropertyValue('--page').trim() || '#ffffff';
  if (tgAtLeast('6.9')) { TG.setHeaderColor(page); TG.setBackgroundColor(page); }
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
const ACCESS_URL = 'https://hermes-srv.tail7ba1c3.ts.net:8443/kb/access'; // Tailscale Funnel on Hermes (arturx.art expired, moved 2026-11-06); empty = check off, base open
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname); // local review sees everything
async function checkAccess() {
  if (LOCAL || !ACCESS_URL) return 'open';
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
  const m = slug && bySlug(slug);
  const head = m
    ? `${m.cover ? `<div class="gate-cover"><img src="${esc(asset(m, m.cover))}" alt=""></div>` : ''}<p class="hi">Гайд готов</p><h1 class="title">${nb(m.title)}</h1>`
    : '<p class="hi">База знаний канала</p><h1 class="title">ИИмерсивный</h1>';
  return `<div class="gate">${head}
    <p class="gate-text">${state === 'web'
      ? 'Гайды открыты подписчикам канала. Открой базу в Telegram, там она проверит подписку.'
      : m ? 'Гайд бесплатный для подписчиков канала «ИИмерсивный». Подпишись и вернись сюда: гайд откроется сам.'
        : 'Всё бесплатно для подписчиков канала «ИИмерсивный». Подпишись и вернись сюда: база откроется сама.'}</p>
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

// ---------- screens ----------
// Arthur 2026-11-20, look F («тёплая бумага»): four tabs in a glass bar at the bottom. «Главная»: the newest guide big,
// the course card (now «скоро»), «Недавние» as a 2×2 grid, a way to all guides; a viewer from a Reel sees the fresh guide
// at once. «Гайды»: step-by-step guides (PDF, files for the agent). «Скиллы и плагины»: what is downloaded and installed
// as a skill or plugin. «Вдохновение»: sites. The tab is meta «kind» (build_index.py fills it from «type» when missing).
// «Главная» takes guides and skills together, so a fresh skill from a Reel shows there too.
// Covers: the guide's own cover.jpg (a PDF spread, 16:10) whole, not zoomed (Arthur: the zoomed spread was a mess).
const TABS = [
  { id: 'home', hash: '#/', title: 'Главная', icon: 'star-fill' },
  { id: 'guides', hash: '#/t/guides', title: 'Гайды', icon: 'book-open-text-fill' },
  { id: 'skills', hash: '#/t/skills', title: 'Скиллы', full: 'Скиллы и плагины', icon: 'puzzle-piece-fill' },
  { id: 'inspo', hash: '#/t/inspo', title: 'Вдохновение', icon: 'sparkle-fill' },
];
const FIRST = 10; // a tab shows 10, the rest behind «Показать ещё»; search when there are about 30
const LATEST = 4; // «Главная»: the newest big plus this many
let showAll = false;
let lastTab = ''; // the tab a guide was opened from, so «назад» returns there; opened by a link: its own tab
const tabOf = (m) => TABS.find((x) => x.id === m.kind) || TABS[1];
const backOf = (m) => TABS.find((x) => x.hash === lastTab) || tabOf(m);
const when = (m) => fmtDate((m.publishAt || m.date).slice(0, 10));
const byNew = (a, b) => appeared(b) - appeared(a);
const inTab = (t) => MATS.filter((m) => listed(m) && tabOf(m) === t).sort(byNew);
const fresh = () => MATS.filter((m) => listed(m) && !isSite(m)).sort(byNew); // guides and skills together
const kindOf = (m) => (tabOf(m) === TABS[2] ? (m.type === 'скилл' ? 'Скилл' : 'Плагин') : pdfIndex(m) >= 0 ? 'Гайд · PDF' : 'Гайд для агента');
const newLabel = (m) => (tabOf(m) === TABS[2] ? 'Новый скилл' : 'Новый гайд');
const label = (m) => (isSite(m) ? m.title : nameOf(m));
const go1 = (m) => `data-go="#/m/${m.slug}" role="button" tabindex="0"`;
// cover.jpg is 16:10 (a guide's PDF spread, a site's screenshot) and the frame is 16:10, so nothing is cut;
// without a cover (skills, guides for the agent) the same frame holds the file icon and the kind
const cover = (m) => (m.cover
  ? `<span class="pic"><img src="${esc(asset(m, m.cover))}" alt="" loading="lazy"></span>`
  : `<span class="pic none">${ic(pdfIndex(m) >= 0 ? 'file-pdf' : tabOf(m) === TABS[2] ? 'puzzle-piece-fill' : 'file-text')}<b>${isSite(m) ? esc(m.domain) : kindOf(m)}</b></span>`);

// one line of a calm list (a guide's «Другие гайды»)
function row(x, small) {
  return `<div class="row" data-go="#/m/${x.slug}" role="button" tabindex="0">${cover(x)}
    <span class="body"><span class="tt">${nb(label(x))}</span><span class="s">${esc(small)}</span></span>${ic('caret-right')}</div>`;
}

const course = () => `<div class="prod"><span class="prod-i">${ic('graduation-cap-fill')}</span>
  <span class="prod-t title">${nb(SITE.course.title)}</span><span class="prod-soon">${esc(SITE.course.note)}</span></div>`;
const card = (m) => `<div class="card" ${go1(m)}>${cover(m)}<span class="ct title">${nb(label(m))}</span>
  <span class="s">${isSite(m) ? esc(m.domain) : when(m)}</span></div>`;
const line = (m) => `<div class="line" ${go1(m)}>${cover(m)}
  <span class="body"><span class="ct title">${nb(label(m))}</span><span class="s">${isSite(m) ? esc(m.domain) : `${kindOf(m)} · ${when(m)}`}</span>
  <span class="sum">${nb(m.summary)}</span></span></div>`;
const allLink = () => `<button class="all" data-go="#/t/guides">Все гайды · ${inTab(TABS[1]).length}</button>`;

function homeTab() {
  const all = fresh();
  const top = all[0];
  if (!top) return course() + '<p class="empty">Гайды появятся вместе с роликами.</p>';
  return `<div class="lead" ${go1(top)}>${cover(top)}<span class="body">
    <span class="kicker"><span class="dot"></span>${newLabel(top)} · ${when(top)}</span><span class="lt title">${nb(nameOf(top))}</span></span></div>
  ${course()}
  <div class="shelf-h"><span class="title">Недавние</span>${allLink()}</div>
  <div class="grid">${all.slice(1, 1 + LATEST).map(card).join('')}</div>`;
}

function home(hash) {
  const tab = TABS.find((x) => x.hash === hash) || (hash === '#/t/more' ? TABS[1] : TABS[0]);
  lastTab = tab.hash;
  const user = IN_TG && TG.initDataUnsafe && TG.initDataUnsafe.user && TG.initDataUnsafe.user.first_name;
  let body;
  if (tab === TABS[0]) body = homeTab();
  else {
    const items = inTab(tab);
    const cut = showAll ? items : items.slice(0, FIRST);
    body = `<div class="tabh"><h2 class="title">${tab.full || tab.title}</h2><span>${items.length}</span></div>
    ${items.length ? `<div class="lines">${cut.map(line).join('')}</div>` : '<p class="empty">Здесь пока пусто.</p>'}
    ${items.length > cut.length ? `<button class="more" data-more>Показать ещё (${items.length - cut.length})</button>` : ''}`;
  }
  return `
  <header class="hello"><div><p class="hi">${PREVIEW ? 'Предпросмотр: видно и то, что ждёт поста' : user ? `Привет, ${esc(user)} · база знаний` : 'База знаний канала'}</p><h1 class="title">ИИмерсивный</h1></div>
    <span class="head-links">
      <a href="${esc(SITE.links.telegram)}" target="_blank" rel="noopener" data-tglink aria-label="Канал в Telegram">${ic('telegram-logo-fill')}</a>
      <a href="${esc(SITE.links.youtube)}" target="_blank" rel="noopener" data-ext aria-label="YouTube">${ic('youtube-logo-fill')}</a>
    </span></header>
  <nav class="tabs" aria-label="Разделы">${TABS.map((x) => `<button class="tab" data-go="${x.hash}" aria-pressed="${x === tab}">${ic(x.icon)}<span>${x.title}</span></button>`).join('')}</nav>
  <div class="tabbody">${body}</div>`;
}

function material(slug) {
  const m = bySlug(slug);
  if (!m) return notFound();
  const site = isSite(m);
  prefetchTexts(m);
  return `
  <div class="nav"><button class="back" data-go="${backOf(m).hash}">${ic('caret-left')}${backOf(m).title}</button>
    <div class="tools">${site ? `<button class="icon-btn" data-copylink="${esc(m.url)}" aria-label="Скопировать ссылку">${ic('copy')}</button>` : ''}<button class="icon-btn" data-share="${m.slug}" aria-label="Поделиться">${ic('share-network')}</button></div></div>
  ${m.cover ? `<div class="mmedia"><div class="hero-media"><img src="${esc(asset(m, m.cover))}" alt=""></div></div>` : ''}
  <div class="mhead"><p class="kicker">${site ? esc(m.domain) : kindOf(m)} · ${fmtDate(m.date)}</p>
    <h1 class="title">${nb(m.title)}</h1><p class="msum">${nb(m.summary)}</p>
    ${m.post_url ? `<a class="post-link" href="${esc(m.post_url)}" target="_blank" rel="noopener" data-tglink>Пост в канале ${ic('arrow-up-right')}</a>` : ''}</div>
  ${about(m)}
  ${hasAgent(m) ? `<div class="sec"><span>Для агента</span><button data-agent="${m.slug}">Копировать</button></div>
  <div class="agent"><span class="cue">›</span> ${esc(agentLine(m))}</div>` : ''}
  ${m.files && m.files.length ? `<div class="sec"><span>Файлы</span><span>${m.files.length}</span></div>
  <div class="list">${m.files.map((f, i) => {
    const text = f.kind === 'text';
    return `<div class="row" ${text ? `data-go="#/m/${m.slug}/${i}" role="button" tabindex="0"` : ''}>
      <span class="fi ${esc(f.kind)}">${ic(fileIcon(f))}</span>
      <span class="body"><span class="t">${esc(f.name)}</span><span class="s">${esc(f.about || '')}</span></span>
      ${text ? `<button class="icon-btn" data-copyfile="${m.slug}/${i}" aria-label="Скопировать">${ic('copy')}</button>` : ''}
      <a class="icon-btn" href="${esc(fileHref(m, f))}" download="${esc(f.name)}" data-dl="${m.slug}/${i}" aria-label="Скачать">${ic('download-simple')}</a></div>`;
  }).join('')}</div>` : ''}
  ${site ? '' : moreGuides(m)}
  ${site ? `<div class="main"><button class="glass" data-open="${esc(m.url)}">Открыть сайт ${ic('arrow-up-right')}</button></div>`
    : pdfIndex(m) >= 0 ? `<div class="main"><a class="glass pdf-main" href="${esc(fileHref(m, m.files[pdfIndex(m)]))}" download="${esc(m.files[pdfIndex(m)].name)}" data-dl="${m.slug}/${pdfIndex(m)}">${ic('file-pdf')}Скачать гайд PDF</a></div>`
    : hasAgent(m) ? `<div class="main"><button class="glass" data-agent="${m.slug}">${ic('terminal-window')}Скопировать для агента</button></div>` : ''}`;
}

// The bio link is one for every Reel and opens the newest guide; a viewer of an older Reel finds theirs here,
// by its cover and title (Arthur, 2026-11-02).
function moreGuides(m) {
  const others = MATS.filter((x) => listed(x) && !isSite(x) && x.slug !== m.slug)
    .sort((a, b) => Boolean(b.fromVideo) - Boolean(a.fromVideo) || appeared(b) - appeared(a)).slice(0, 6);
  if (!others.length) return '';
  return `<div class="sec"><span>Другие гайды</span><button data-go="#/t/guides">Все гайды</button></div>
  <div class="list">${others.map((x) => row(x, `${kindOf(x)} · ${fmtDate(x.date)}`)).join('')}</div>`;
}

// Arthur 2026-11-02: a material reads like a guide's card in a bot: what is inside (summary), the original on GitHub,
// the quickest install and the fine print. All three are optional meta fields.
function about(m) {
  if (!m.github && !m.quick) return m.note ? `<p class="note"><span class="warn" aria-hidden="true">⚠️</span><span>${nb(m.note)}</span></p>` : '';
  const repo = m.github ? m.github.replace(/^https:\/\/github\.com\//, '') : '';
  return `<div class="about">
    ${m.github ? `<a class="arow" href="${esc(m.github)}" target="_blank" rel="noopener" data-ext><span class="ai gh">${ic('github-logo')}</span><span class="body"><b>GitHub</b><span>${esc(repo)}</span></span>${ic('arrow-up-right')}</a>` : ''}
    ${m.quick ? `<div class="arow"><span class="ai bolt">${ic('lightning')}</span><span class="body"><b>Быстрая установка</b><span>${nb(m.quick)}</span></span></div>` : ''}
  </div>${m.note ? `<p class="note"><span class="warn" aria-hidden="true">⚠️</span><span>${nb(m.note)}</span></p>` : ''}`;
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
  return `<div class="nav"><button class="back" data-go="#/">${ic('caret-left')}Все гайды</button></div>
  <p class="empty">Такого гайда нет. Может, ссылка устарела.<br><br><button class="chip" data-go="#/">Все гайды</button></p>`;
}

// ---------- routing ----------
function parentOf(h) {
  let m;
  if ((m = h.match(/^#\/m\/([\w-]+)\/\d+$/))) return `#/m/${m[1]}`;
  const mm = (m = h.match(/^#\/m\/([\w-]+)$/)) && bySlug(m[1]);
  return mm ? backOf(mm).hash : '#/'; // back to the tab the guide was opened from
}
let lastHash = null;
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
  let m;
  if ((m = h.match(/^#\/m\/([\w-]+)\/(\d+)$/))) app.innerHTML = reader(m[1], +m[2]);
  else if ((m = h.match(/^#\/m\/([\w-]+)$/))) app.innerHTML = material(m[1]);
  else app.innerHTML = home(h || '#/'); // #/, #/t/<tab>; old #/s/<section> links land on «Главная»
  if (h !== lastHash) window.scrollTo(0, 0); // «Показать ещё» re-renders in place
  lastHash = h;
  if (IN_TG && TG.BackButton) (isHome ? TG.BackButton.hide() : TG.BackButton.show());
}
const go = (hash) => { location.hash = hash; };

// A link like t.me/imersivnybot?startapp=<slug> opens that material (start_param is used for routing only).
// site.json «bioPin»: the slug the bio link (startapp=new) opens instead of the newest guide, so the Instagram bio never
// changes when an older Reel takes off (Arthur, 2026-11-05); empty or missing: the newest.
const newest = () => {
  if (SITE.bioPin && bySlug(SITE.bioPin)) return SITE.bioPin;
  const own = MATS.filter((m) => listed(m) && m.fromVideo); // the bio link belongs to the Reels
  own.sort((a, b) => Date.parse(b.publishAt || b.date) - Date.parse(a.publishAt || a.date));
  return own.length ? own[0].slug : '';
};
function startRoute() {
  const q = new URLSearchParams(location.search);
  const p = (IN_TG && TG.initDataUnsafe && TG.initDataUnsafe.start_param) || q.get('tgWebAppStartParam');
  // Arthur 2026-11-02: the Instagram bio links t.me/<bot>?startapp=new, which opens the newest guide.
  // No start_param (t.me/<bot>?startapp, the pinned post) or «preview»: the home page with the catalog on top.
  const tab = TABS.find((x) => x.id === p && x !== TABS[0]); // startapp=guides | skills | inspo opens that tab
  if (tab) return history.replaceState(null, '', `${location.pathname}${location.search}${tab.hash}`);
  const slug = p === 'new' ? newest() : p;
  if (slug && /^[a-z0-9-]{1,64}$/.test(slug) && bySlug(slug)) history.replaceState(null, '', `${location.pathname}${location.search}#/m/${slug}`);
}

// ---------- taps ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-more],[data-recheck],[data-dl],[data-agent],[data-copyfile],[data-copylink],[data-open],[data-share],[data-ext],[data-tglink],[data-retry],[data-go]');
  if (!t) return;
  if ('more' in t.dataset) { showAll = true; return render(); }
  if ('recheck' in t.dataset) {
    t.disabled = true;
    t.textContent = 'Проверяю…';
    return recheck(false);
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
// The viewer subscribes in the channel and comes back: check again by itself, no button needed (Arthur 2026-11-02).
let rechecking = false;
async function recheck(loud) {
  if (rechecking || ACCESS !== 'locked') return;
  rechecking = true;
  const state = await checkAccess();
  rechecking = false;
  if (state === 'locked') {
    if (loud) { toast('Подписки пока не видно. Подпишись и попробуй ещё раз', 2600); render(); }
    return;
  }
  ACCESS = state;
  toast(/^#\/m\//.test(location.hash) ? 'Подписка есть, гайд открыт' : 'Подписка есть, всё открыто', 2600);
  render();
}

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
    document.getElementById('app').innerHTML = '<p class="state">Гайды не загрузились. Проверь интернет и попробуй ещё раз.<br><button data-retry>Обновить</button></p>';
    return;
  }
  startRoute();
  ACCESS = await access;
  render();
  if (ACCESS === 'member') toast('Ты подписан на канал, всё открыто', 2600);
  window.addEventListener('hashchange', render);
  if (IN_TG) TG.onEvent('activated', () => recheck(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) recheck(false); });
  window.addEventListener('focus', () => recheck(false));
}
init();
