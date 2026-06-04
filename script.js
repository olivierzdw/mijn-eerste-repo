const clubs = [
  { naam: "Ajax",            logo: "https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg" },
  { naam: "PSV",             logo: "https://upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg" },
  { naam: "Feyenoord",       logo: "https://upload.wikimedia.org/wikipedia/en/f/f1/Feyenoord_logo.svg" },
  { naam: "AZ",              logo: "https://upload.wikimedia.org/wikipedia/commons/e/e0/AZ_Alkmaar.svg" },
  { naam: "FC Utrecht",      logo: "https://upload.wikimedia.org/wikipedia/commons/4/48/FC_Utrecht.svg" },
  { naam: "Twente",          logo: "https://upload.wikimedia.org/wikipedia/en/e/e3/FC_Twente.svg" },
  { naam: "NEC",             logo: "https://upload.wikimedia.org/wikipedia/commons/b/b4/NEC_Logo.png" },
  { naam: "Heerenveen",      logo: "https://upload.wikimedia.org/wikipedia/en/e/e1/SC_Heerenveen_logo.svg" },
  { naam: "Groningen",       logo: "https://upload.wikimedia.org/wikipedia/commons/2/2c/FC_Groningen_logo.svg" },
  { naam: "Sparta",          logo: "https://upload.wikimedia.org/wikipedia/en/9/9f/Sparta_Rotterdam_logo.svg" },
  { naam: "RKC",             logo: "https://upload.wikimedia.org/wikipedia/en/6/67/RKC_Waalwijk_logo.svg" },
  { naam: "Go Ahead Eagles", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Go_Ahead_Eagles_logo.svg" },
  { naam: "NAC Breda",       logo: "images/nac-breda-v2.png" },
  { naam: "Willem II",       logo: "https://upload.wikimedia.org/wikipedia/en/7/77/Willem_II_logo.svg" },
];

let ajaxWedstrijden = [];

const afcLogos = {
  "AFC JO11-4":          "images/afc.png",
  "ASV Blauw-Wit JO11-5":"images/blauw-wit.png",
  "DTA Fortius JO11-2":  "images/fortius.png",
  "Sloterdijk JO11-1":   "images/sloterdijk.png",
};

let afcWedstrijden = [];

// ── Firebase sync ─────────────────────────────────────────────

const FIREBASE_URL = 'https://olliebet-default-rtdb.europe-west1.firebasedatabase.app';

async function fbLees() {
  if (!FIREBASE_URL) return null;
  try {
    const res = await fetch(`${FIREBASE_URL}/spelers.json`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch(e) { return null; }
}

async function fbSchrijf(lijst) {
  if (!FIREBASE_URL) return;
  try {
    await fetch(`${FIREBASE_URL}/spelers.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lijst),
    });
  } catch(e) {}
}

function startFirebaseSync() {
  if (!FIREBASE_URL) return;
  const es = new EventSource(`${FIREBASE_URL}/spelers.json`);
  es.addEventListener('put', e => {
    const { data } = JSON.parse(e.data);
    if (!Array.isArray(data)) return;
    localStorage.setItem("olliebet-gebruikers", JSON.stringify(data));
    renderGebruikers();
  });
  es.addEventListener('error', () => {
    es.close();
    setTimeout(startFirebaseSync, 30000);
  });
}

// ── Chat ──────────────────────────────────────────────────────

let chatBerichten = [];

async function fbChatLees() {
  if (!FIREBASE_URL) return {};
  try {
    const res = await fetch(`${FIREBASE_URL}/chat.json`);
    const data = await res.json();
    return data && typeof data === 'object' ? data : {};
  } catch(e) { return {}; }
}

// Reset chat elke 24 uur. Een gedeelde timestamp in Firebase
// (/chat-meta/lastReset) zorgt dat alleen de eerste client die de
// drempel passeert daadwerkelijk wist; de rest ziet dan een lege chat
// via de bestaande sync.
const CHAT_RESET_MS = 24 * 60 * 60 * 1000;
async function checkChatReset() {
  if (!FIREBASE_URL) return;
  try {
    const res = await fetch(`${FIREBASE_URL}/chat-meta/lastReset.json`);
    const last = await res.json();
    const nu = Date.now();
    if (!last || (nu - Number(last)) >= CHAT_RESET_MS) {
      // Markeer eerst de nieuwe reset-tijd om dubbele resets te voorkomen
      await fetch(`${FIREBASE_URL}/chat-meta/lastReset.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nu),
      });
      await fetch(`${FIREBASE_URL}/chat.json`, { method: 'DELETE' });
    }
  } catch(e) { /* stil falen, geen reset is geen ramp */ }
}

async function fbChatPush(bericht) {
  if (!FIREBASE_URL) return null;
  try {
    const res = await fetch(`${FIREBASE_URL}/chat.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bericht),
    });
    return await res.json();
  } catch(e) { return null; }
}

function chatObjectNaarLijst(obj) {
  if (!obj) return [];
  return Object.entries(obj)
    .map(([id, m]) => ({ id, ...m }))
    .sort((a, b) => (a.tijd || 0) - (b.tijd || 0));
}

function startChatSync() {
  if (!FIREBASE_URL) return;
  const es = new EventSource(`${FIREBASE_URL}/chat.json`);
  es.addEventListener('put', e => {
    const { path, data } = JSON.parse(e.data);
    if (path === '/') {
      chatBerichten = chatObjectNaarLijst(data);
    } else {
      const id = path.replace(/^\//, '');
      if (data === null) {
        chatBerichten = chatBerichten.filter(m => m.id !== id);
      } else {
        const idx = chatBerichten.findIndex(m => m.id === id);
        const nieuw = { id, ...data };
        if (idx >= 0) chatBerichten[idx] = nieuw;
        else chatBerichten.push(nieuw);
        chatBerichten.sort((a, b) => (a.tijd || 0) - (b.tijd || 0));
      }
    }
    renderChat();
  });
  es.addEventListener('patch', e => {
    const { path, data } = JSON.parse(e.data);
    if (path === '/' && data && typeof data === 'object') {
      for (const [id, m] of Object.entries(data)) {
        const idx = chatBerichten.findIndex(x => x.id === id);
        const nieuw = { id, ...m };
        if (idx >= 0) chatBerichten[idx] = nieuw;
        else chatBerichten.push(nieuw);
      }
      chatBerichten.sort((a, b) => (a.tijd || 0) - (b.tijd || 0));
      renderChat();
    }
  });
  es.addEventListener('error', () => {
    es.close();
    setTimeout(startChatSync, 30000);
  });
}

function formatChatTijd(t) {
  if (!t) return "";
  const d = new Date(t);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function escapeHTML(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderChat() {
  const container = document.getElementById("chat-berichten");
  if (!container) return;
  const actief = actiefGebruiker();
  const hint   = document.getElementById("chat-hint");
  const input  = document.getElementById("chat-input");
  const btn    = document.getElementById("chat-verstuur");

  input.disabled = false;
  btn.disabled = false;
  if (!actief) {
    hint.textContent = "Kies eerst een speler om te kunnen versturen.";
    btn.disabled = true;
  } else {
    hint.textContent = `Je chat als ${actief}`;
  }

  if (chatBerichten.length === 0) {
    container.innerHTML = `<div class="chat-leeg">Nog geen berichten. Begin het gesprek!</div>`;
    return;
  }

  const bijnaBeneden = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
  container.innerHTML = chatBerichten.map(m => {
    const eigen = m.afzender === actief;
    return `
      <div class="chat-bericht${eigen ? ' eigen' : ''}">
        <span class="afzender">${escapeHTML(m.afzender || 'onbekend')}</span>
        <span class="tekst">${escapeHTML(m.tekst || '')}</span>
        <span class="tijd">${formatChatTijd(m.tijd)}</span>
      </div>
    `;
  }).join("");

  if (bijnaBeneden) container.scrollTop = container.scrollHeight;
}

async function verstuurBericht() {
  const input  = document.getElementById("chat-input");
  const actief = actiefGebruiker();
  if (!actief) return;
  const tekst  = input.value.trim();
  if (!tekst) return;

  const bericht = { afzender: actief, tekst, tijd: Date.now() };
  input.value = "";

  // Direct tonen zonder wachten op roundtrip
  chatBerichten.push({ id: `tmp-${Date.now()}`, ...bericht });
  renderChat();

  const container = document.getElementById("chat-berichten");
  if (container) container.scrollTop = container.scrollHeight;

  await fbChatPush(bericht);
}

async function laadChatEnStart() {
  await checkChatReset();
  const data = await fbChatLees();
  chatBerichten = chatObjectNaarLijst(data);
  startChatSync();
  // Ook periodiek checken zodat een open tab vanzelf reset na 24u
  setInterval(checkChatReset, 60 * 60 * 1000); // elk uur
}

// ── Gebruikers ────────────────────────────────────────────────

function laadGebruikers() {
  return JSON.parse(localStorage.getItem("olliebet-gebruikers") || "[]");
}

function slaGebruikersOp(lijst) {
  localStorage.setItem("olliebet-gebruikers", JSON.stringify(lijst));
  fbSchrijf(lijst);
}

// Bij ELKE page load (inclusief refresh) ben je nog niemand: je moet
// eerst je naam typen via "+ Speler". Voorspellingen blijven onder
// die naam bewaard in Firebase + localStorage, dus als je dezelfde
// naam intypt krijg je je oude data terug. De spelerslijst zelf
// blijft staan zodat predictions en gokstand kunnen koppelen — maar
// hij wordt verborgen in de UI tot je deze sessie hebt getypt.
try { localStorage.removeItem("olliebet-actief"); } catch(e) {}
try { sessionStorage.removeItem("olliebet-actief"); } catch(e) {}
try { sessionStorage.removeItem("olliebet-naam-getypt"); } catch(e) {}

function actiefGebruiker() {
  return sessionStorage.getItem("olliebet-actief") || null;
}

function setActiefGebruiker(naam) {
  if (naam) sessionStorage.setItem("olliebet-actief", naam);
  else sessionStorage.removeItem("olliebet-actief");
}

function renderGebruikers() {
  const lijst = laadGebruikers();
  let actief = actiefGebruiker();
  // Auto-select niet meer: speler moet zelf zijn naam typen.
  // Wel: als de opgeslagen actieve naam niet meer bestaat, wis 'm.
  if (actief && !lijst.includes(actief)) {
    setActiefGebruiker(null);
    actief = null;
  }
  const container = document.getElementById("gebruikers-lijst");
  container.innerHTML = "";

  // Toon ALLEEN de actieve gebruiker als knop (degene die deze sessie
  // z'n naam heeft getypt). Andere spelers staan wel in de Firebase-
  // lijst (nodig voor gokstand etc.) maar zijn niet zichtbaar als
  // aanklikbare knop — typen is verplicht.
  if (actief) {
    const wrap = document.createElement("div");
    wrap.className = "gebruiker-wrap";

    const btn = document.createElement("button");
    btn.className = "gebruiker-btn actief";
    btn.textContent = actief;

    wrap.appendChild(btn);
    container.appendChild(wrap);
  }

  const heeftGebruiker = actief && lijst.includes(actief);
  document.getElementById("main-inhoud").classList.toggle("hidden", !heeftGebruiker);
  document.getElementById("geen-gebruiker").classList.toggle("hidden", heeftGebruiker);

  if (heeftGebruiker) {
    // Ajax + AFC JO11-4 staan niet meer vast op het beginscherm —
    // de speler vindt ze (en elke andere club / elk AFC team) via
    // de zoekbalk bovenaan.
  } else {
    // Geen actieve gebruiker: open meteen het naam-invoerveld zodat
    // de speler direct kan typen. Typen is verplicht.
    const form = document.getElementById("nieuwe-gebruiker-form");
    if (form && form.classList.contains("hidden")) {
      form.classList.remove("hidden");
      const inp = document.getElementById("nieuwe-naam");
      if (inp) { try { inp.focus(); } catch(e) {} }
    }
  }
}

function verwijderGebruiker(naam) {
  if (!confirm(`Wil je ${naam} verwijderen?`)) return;
  let lijst = laadGebruikers();
  lijst = lijst.filter(n => n !== naam);
  slaGebruikersOp(lijst);
  localStorage.removeItem(`olliebet-vrij-${naam}`);
  localStorage.removeItem(`olliebet-ajax-${naam}`);
  localStorage.removeItem(`olliebet-afc-${naam}`);
  if (actiefGebruiker() === naam) {
    setActiefGebruiker(null);
  }
  renderGebruikers();
}

function wisselGebruiker(naam) {
  setActiefGebruiker(naam);
  renderGebruikers();
  renderFavorieten();
  updateGokstandBadge();
}

function toonNieuweGebruiker() {
  document.getElementById("nieuwe-gebruiker-form").classList.remove("hidden");
  document.getElementById("nieuwe-naam").focus();
}

function verbergNieuweGebruiker() {
  document.getElementById("nieuwe-gebruiker-form").classList.add("hidden");
  document.getElementById("nieuwe-naam").value = "";
}

function voegGebruikerToe() {
  const naam = document.getElementById("nieuwe-naam").value.trim();
  if (!naam) return;
  const lijst = laadGebruikers();
  // Naam bestaat al? Dan log je gewoon in als die naam (je oude
  // voorspellingen komen terug). Anders toevoegen.
  if (!lijst.includes(naam)) {
    lijst.push(naam);
    slaGebruikersOp(lijst);
  }
  setActiefGebruiker(naam);
  sessionStorage.setItem("olliebet-naam-getypt", "1");
  verbergNieuweGebruiker();
  renderGebruikers();
}

// Enter-toets in naamveld
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nieuwe-naam").addEventListener("keydown", e => {
    if (e.key === "Enter") voegGebruikerToe();
  });
});

// ── Live wedstrijd data ───────────────────────────────────────

const FOOTBALL_API_KEY = 'eb6f5903b47f4cb3a34ef8598e83ee08';

const clubNaamMapping = {
  "AFC Ajax": "Ajax", "Ajax": "Ajax",
  "PSV Eindhoven": "PSV", "PSV": "PSV",
  "Feyenoord": "Feyenoord",
  "AZ Alkmaar": "AZ", "AZ": "AZ",
  "FC Utrecht": "FC Utrecht",
  "FC Twente": "Twente", "Twente": "Twente",
  "NEC Nijmegen": "NEC", "NEC": "NEC",
  "SC Heerenveen": "Heerenveen", "Heerenveen": "Heerenveen",
  "FC Groningen": "Groningen", "Groningen": "Groningen",
  "Sparta Rotterdam": "Sparta", "Sparta": "Sparta",
  "RKC Waalwijk": "RKC", "RKC": "RKC",
  "Go Ahead Eagles": "Go Ahead Eagles",
  "NAC Breda": "NAC Breda",
  "Willem II": "Willem II",
};

const dagNamen = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const maandNamen = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];

function formatDatum(utcDate) {
  const d = new Date(utcDate);
  const dag = dagNamen[d.getDay()];
  const maand = maandNamen[d.getMonth()];
  const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
  return `${dag} ${d.getDate()} ${maand} ${tijd}`;
}

function clubNaam(apiNaam) {
  return clubNaamMapping[apiNaam] || apiNaam;
}

async function fetchAjaxWedstrijden() {
  try {
    const res = await fetch(`data/ajax-matches.json?t=${Date.now()}`);
    ajaxWedstrijden = await res.json();
    renderAjaxWedstrijden();
    updateLiveMinuten();
  } catch (e) {
    document.getElementById("ajax-wedstrijden").innerHTML =
      `<p style="color:#666;text-align:center">Kon wedstrijden niet laden.</p>`;
  }
}

// Parse Nederlandse datum string als "za 25 april 20:00" naar Date object.
// Geen jaar in de string: huidig jaar, of volgend jaar als de datum > 2 maanden terug ligt.
function parseNlDatum(s) {
  if (!s) return null;
  const maanden = {
    'januari':0,'februari':1,'maart':2,'april':3,'mei':4,'juni':5,
    'juli':6,'augustus':7,'september':8,'oktober':9,'november':10,'december':11
  };
  const m = s.match(/(\d{1,2})\s+([a-z]+)(?:\s+(\d{1,2}):(\d{2}))?/i);
  if (!m) return null;
  const dag   = parseInt(m[1], 10);
  const maand = maanden[m[2].toLowerCase()];
  if (maand === undefined) return null;
  const uur   = m[3] !== undefined ? parseInt(m[3], 10) : 12;
  const min   = m[4] !== undefined ? parseInt(m[4], 10) : 0;
  const nu    = new Date();
  let jaar    = nu.getFullYear();
  let d       = new Date(jaar, maand, dag, uur, min);
  // Als datum meer dan 60 dagen terug ligt, neem aan dat het volgend jaar bedoeld is
  const tweeMaandenGeleden = new Date(nu.getTime() - 60 * 24 * 3600 * 1000);
  if (d < tweeMaandenGeleden) {
    d = new Date(jaar + 1, maand, dag, uur, min);
  }
  return d;
}

// Houd alleen wedstrijden die nog niet (of net) gespeeld zijn over.
// Drempel: 3 uur na aftrap is de wedstrijd "voorbij".
function filterToekomstigeWedstrijden(arr) {
  const drempel = Date.now() - 3 * 3600 * 1000;
  return (arr || []).filter(w => {
    const d = parseNlDatum(w.datum);
    if (!d) return true;  // onbekend formaat? laat staan
    return d.getTime() > drempel;
  });
}

async function fetchAfcWedstrijden() {
  try {
    const res = await fetch(`data/afc-matches.json?t=${Date.now()}`);
    const ruw = await res.json();
    afcWedstrijden = filterToekomstigeWedstrijden(ruw);
    renderAfcWedstrijden();
  } catch (e) {
    document.getElementById("afc-wedstrijden").innerHTML =
      `<p style="color:#666;text-align:center">Kon wedstrijden niet laden.</p>`;
  }
}

async function fetchLiveMatches() {
  try {
    const res = await fetch('https://api.football-data.org/v4/matches?status=LIVE,IN_PLAY,PAUSED', {
      headers: { 'X-Auth-Token': FOOTBALL_API_KEY }
    });
    const data = await res.json();
    return data.matches || [];
  } catch (e) {
    return [];
  }
}

async function updateLiveMinuten() {
  const wedstrijden = await fetchLiveMatches();
  // Match op id (uniek over alle competities) ipv naam
  const liveMap = {};
  wedstrijden.forEach(m => {
    const home = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0;
    const away = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0;
    liveMap[m.id] = {
      minuut:     m.minute ?? m.score?.duration ?? '?',
      thuisScore: home,
      uitScore:   away,
      status:     m.status,
    };
  });

  ajaxWedstrijden.forEach((w, i) => {
    const badge = document.getElementById(`live-ajax-${i}`);
    if (!badge) return;
    const live = liveMap[w.id];
    if (live) {
      const minuutLabel = live.status === 'PAUSED' ? 'rust' : `${live.minuut}'`;
      badge.textContent = `🔴 ${live.thuisScore}-${live.uitScore} · ${minuutLabel}`;
      badge.classList.add("live");
    } else {
      badge.textContent = "";
      badge.classList.remove("live");
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────

function logoVanClub(naam) {
  const club = clubs.find(c => c.naam === naam);
  return club ? club.logo : "";
}

function sleutel(type) {
  return `olliebet-${type}-${actiefGebruiker()}`;
}

// ── Ajax wedstrijden ──────────────────────────────────────────

function renderAjaxWedstrijden() {
  const container  = document.getElementById("ajax-wedstrijden");
  const opgeslagen = JSON.parse(localStorage.getItem(sleutel("ajax")) || "{}");
  container.innerHTML = "";

  if (ajaxWedstrijden.length === 0) {
    container.innerHTML = `<p style="color:#666;text-align:center">Wedstrijden laden...</p>`;
    return;
  }

  ajaxWedstrijden.forEach((w, i) => {
    const v   = opgeslagen[w.id] || {};
    const div = document.createElement("div");
    div.className = "ajax-wedstrijd";
    div.innerHTML = `
      <span class="datum">${w.datum}</span>
      <div class="ajax-match">
        <div class="club-blok-klein">
          <img src="${w.thuisLogo || logoVanClub(w.thuis)}" alt="${w.thuis}" />
          <span>${w.thuis}</span>
          <input class="scorer-input" type="text" placeholder="Scorers..." value="${v.thuisScorers ?? ""}" id="ajax-scorers-thuis-${i}" />
        </div>
        <div class="score-midden-klein">
          <input type="number" min="0" max="20" placeholder="0" value="${v.thuisScore ?? ""}" id="ajax-thuis-${i}" />
          <span>–</span>
          <input type="number" min="0" max="20" placeholder="0" value="${v.uitScore ?? ""}" id="ajax-uit-${i}" />
          <span class="live-minuut" id="live-ajax-${i}"></span>
        </div>
        <div class="club-blok-klein rechts">
          <img src="${w.uitLogo || logoVanClub(w.uit)}" alt="${w.uit}" />
          <span>${w.uit}</span>
          <input class="scorer-input" type="text" placeholder="Scorers..." value="${v.uitScorers ?? ""}" id="ajax-scorers-uit-${i}" />
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  const btn = document.createElement("button");
  btn.textContent = "Sla Ajax voorspellingen op";
  btn.onclick = slaAjaxOp;
  container.appendChild(btn);
}

function slaAjaxOp() {
  const data = {};
  const speler = actiefGebruiker();
  ajaxWedstrijden.forEach((w, i) => {
    const v = {
      thuisScore:    document.getElementById(`ajax-thuis-${i}`).value,
      uitScore:      document.getElementById(`ajax-uit-${i}`).value,
      thuisScorers:  document.getElementById(`ajax-scorers-thuis-${i}`).value,
      uitScorers:    document.getElementById(`ajax-scorers-uit-${i}`).value,
    };
    data[w.id] = v;
    fbVoorspelSchrijf(w.id, speler, v);
  });
  localStorage.setItem(sleutel("ajax"), JSON.stringify(data));
  const btn = document.querySelector("#ajax-wedstrijden button");
  btn.textContent = "✅ Opgeslagen!";
  setTimeout(() => btn.textContent = "Sla Ajax voorspellingen op", 2500);
  updateGokstandBadge();
}

// ── AFC wedstrijden ───────────────────────────────────────────

function renderAfcWedstrijden() {
  const container  = document.getElementById("afc-wedstrijden");
  const opgeslagen = JSON.parse(localStorage.getItem(sleutel("afc")) || "{}");
  container.innerHTML = "";

  afcWedstrijden.forEach((w, i) => {
    const v   = opgeslagen[i] || {};
    const div = document.createElement("div");
    div.className = "ajax-wedstrijd";
    div.innerHTML = `
      <span class="datum">${w.datum}</span>
      <div class="ajax-match">
        <div class="club-blok-klein">
          <img src="${w.thuisLogo || ""}" alt="${w.thuis}" />
          <span>${w.thuis}</span>
          <input class="scorer-input" type="text" placeholder="Scorers..." value="${v.thuisScorers ?? ""}" id="afc-scorers-thuis-${i}" />
        </div>
        <div class="score-midden-klein">
          <input type="number" min="0" max="20" placeholder="0" value="${v.thuisScore ?? ""}" id="afc-thuis-${i}" />
          <span>–</span>
          <input type="number" min="0" max="20" placeholder="0" value="${v.uitScore ?? ""}" id="afc-uit-${i}" />
        </div>
        <div class="club-blok-klein rechts">
          <img src="${w.uitLogo || ""}" alt="${w.uit}" />
          <span>${w.uit}</span>
          <input class="scorer-input" type="text" placeholder="Scorers..." value="${v.uitScorers ?? ""}" id="afc-scorers-uit-${i}" />
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  const btn = document.createElement("button");
  btn.textContent = "Sla AFC voorspellingen op";
  btn.onclick = slaAfcOp;
  container.appendChild(btn);
}

function slaAfcOp() {
  const data = {};
  afcWedstrijden.forEach((_, i) => {
    data[i] = {
      thuisScore:   document.getElementById(`afc-thuis-${i}`).value,
      uitScore:     document.getElementById(`afc-uit-${i}`).value,
      thuisScorers: document.getElementById(`afc-scorers-thuis-${i}`).value,
      uitScorers:   document.getElementById(`afc-scorers-uit-${i}`).value,
    };
  });
  localStorage.setItem(sleutel("afc"), JSON.stringify(data));
  const btn = document.querySelector("#afc-wedstrijden button");
  btn.textContent = "✅ Opgeslagen!";
  setTimeout(() => btn.textContent = "Sla AFC voorspellingen op", 2500);
}

// ── Uitslagen ─────────────────────────────────────────────────

let activePagina = "wedstrijden";

async function toonPagina(pagina) {
  if (activePagina === pagina) {
    pagina = "wedstrijden";
  }
  activePagina = pagina;

  document.getElementById("main-inhoud").classList.toggle("hidden", pagina !== "wedstrijden");
  document.getElementById("uitslagen-panel").classList.toggle("hidden", pagina !== "uitslagen");
  document.getElementById("stand-panel").classList.toggle("hidden", pagina !== "stand");
  document.getElementById("chat-panel").classList.toggle("hidden", pagina !== "chat");
  document.getElementById("samenvattingen-panel").classList.toggle("hidden", pagina !== "samenvattingen");
  document.getElementById("spelletje-panel").classList.toggle("hidden", pagina !== "spelletje");
  document.getElementById("btn-spelletje").classList.toggle("actief", pagina === "spelletje");
  document.getElementById("btn-spelletje").textContent = pagina === "spelletje" ? "Wedstrijden" : "Spelletje";
  if (pagina === "spelletje") {
    kiesSpelletje(huidigSpel);
  } else {
    stopSnake();
  }
  document.getElementById("btn-uitslagen").classList.toggle("actief", pagina === "uitslagen");
  document.getElementById("btn-uitslagen").textContent = pagina === "uitslagen" ? "Wedstrijden" : "Uitslagen";
  document.getElementById("btn-stand").classList.toggle("actief", pagina === "stand");
  document.getElementById("btn-stand").textContent = pagina === "stand" ? "Wedstrijden" : "Stand";
  document.getElementById("btn-chat").classList.toggle("actief", pagina === "chat");
  document.getElementById("btn-chat").textContent = pagina === "chat" ? "Wedstrijden" : "Chat";
  document.getElementById("btn-samenvattingen").classList.toggle("actief", pagina === "samenvattingen");
  document.getElementById("btn-samenvattingen").textContent = pagina === "samenvattingen" ? "Wedstrijden" : "Samenvattingen";

  if (pagina === "samenvattingen") {
    renderSamenvattingen();
  }

  document.getElementById("btn-gokstand").classList.toggle("actief", pagina === "gokstand");
  document.getElementById("btn-gokstand").firstChild.textContent = pagina === "gokstand" ? "Wedstrijden " : "Stand van het gokken ";
  document.getElementById("gokstand-panel").classList.toggle("hidden", pagina !== "gokstand");

  if (pagina === "gokstand") {
    renderGokstand();
  }

  if (pagina === "chat") {
    renderChat();
    setTimeout(() => {
      const el = document.getElementById("chat-berichten");
      if (el) el.scrollTop = el.scrollHeight;
      const inp = document.getElementById("chat-input");
      if (inp) inp.focus();
    }, 50);
  }

  if (pagina === "uitslagen") {
    document.getElementById("uitslagen-lijst").innerHTML = `<p style="text-align:center;color:#666">Laden...</p>`;
    try {
      if (gekozenClub) {
        document.getElementById("uitslagen-titel").textContent = `Uitslagen ${gekozenClub.naam}`;
        if (!clubsResults) {
          const res = await fetch(`data/clubs-results.json?t=${Date.now()}`);
          clubsResults = await res.json();
        }
        const results = clubsResults[String(gekozenClubId)] || [];
        renderUitslagen(results, `club-${gekozenClubId}`);
      } else {
        document.getElementById("uitslagen-titel").textContent = `Uitslagen Ajax`;
        const res = await fetch(`data/ajax-results.json?t=${Date.now()}`);
        renderUitslagen(await res.json(), "ajax");
      }
    } catch(e) {
      document.getElementById("uitslagen-lijst").innerHTML = `<p style="text-align:center;color:#666">Kon uitslagen niet laden.</p>`;
    }
  }

  if (pagina === "stand") {
    document.getElementById("stand-lijst").innerHTML = `<p style="text-align:center;color:#666">Laden...</p>`;
    const toggle = document.getElementById("stand-toggle");
    try {
      if (gekozenClub && gekozenClub.amateurScraper) {
        if (toggle) toggle.classList.add("hidden");
        document.getElementById("stand-titel").textContent = `${gekozenClub.naam} stand`;
        const res = await fetch(`data/afc-teams/${gekozenClub.basis}-stand.json?t=${Date.now()}`);
        if (!res.ok) throw new Error('niet beschikbaar');
        renderAfcStand(await res.json(), gekozenClub.naam);
      } else if (gekozenClub && gekozenClub.competitie) {
        if (toggle) toggle.classList.add("hidden");
        document.getElementById("stand-titel").textContent = `${gekozenClub.competitieNaam || gekozenClub.competitie} stand`;
        if (!competitionStands) {
          const res = await fetch(`data/competition-stands.json?t=${Date.now()}`);
          competitionStands = await res.json();
        }
        const stand = competitionStands[gekozenClub.competitie] || [];
        renderStand(stand, gekozenClub.naam);
      } else {
        // Geen club gekozen → géén automatische Eredivisie/AFC stand meer.
        // Speler moet eerst een club zoeken bovenaan.
        if (toggle) toggle.classList.add("hidden");
        document.getElementById("stand-titel").textContent = "Stand";
        document.getElementById("stand-lijst").innerHTML =
          `<p style="text-align:center;color:#666;padding:30px 10px">Zoek bovenaan een club om hun stand te zien.</p>`;
      }
    } catch(e) {
      document.getElementById("stand-lijst").innerHTML = `<p style="text-align:center;color:#666">Kon stand niet laden.</p>`;
    }
  }

}

// Welke stand wordt getoond als geen club gekozen is: 'eredivisie' of 'afc'
let standType = localStorage.getItem('olliebet-stand-type') || 'eredivisie';

function kiesStand(type) {
  standType = type;
  localStorage.setItem('olliebet-stand-type', type);
  document.querySelectorAll('.stand-toggle-btn').forEach(b => {
    b.classList.toggle('actief', b.dataset.stand === type);
  });
  toonGekozenStand();
}

async function toonGekozenStand() {
  // Synchroniseer knop-actief stijl met huidige standType
  document.querySelectorAll('.stand-toggle-btn').forEach(b => {
    b.classList.toggle('actief', b.dataset.stand === standType);
  });
  document.getElementById("stand-lijst").innerHTML = `<p style="text-align:center;color:#666">Laden...</p>`;
  try {
    if (standType === 'afc') {
      document.getElementById("stand-titel").textContent = `AFC JO11-4 stand`;
      const res = await fetch(`data/afc-teams/afc-jo11-4-stand.json?t=${Date.now()}`);
      renderAfcStand(await res.json());
    } else {
      document.getElementById("stand-titel").textContent = `Eredivisie stand`;
      const res = await fetch(`data/eredivisie-stand.json?t=${Date.now()}`);
      renderStand(await res.json(), "Ajax");
    }
  } catch (e) {
    document.getElementById("stand-lijst").innerHTML = `<p style="text-align:center;color:#666">Kon stand niet laden.</p>`;
  }
}

function renderStand(stand, accentClub = 'Ajax') {
  const container = document.getElementById("stand-lijst");
  container.innerHTML = `
    <table class="stand-tabel">
      <thead>
        <tr>
          <th>#</th>
          <th colspan="2">Club</th>
          <th>G</th>
          <th>P</th>
          <th>DS</th>
        </tr>
      </thead>
      <tbody>
        ${stand.map(t => `
          <tr class="${t.club === accentClub ? 'ajax-rij' : ''}">
            <td class="pos">${t.positie}</td>
            <td class="logo-cel"><img src="${t.logo}" alt="${t.club}" /></td>
            <td class="club-naam">${t.club}</td>
            <td>${t.gespeeld}</td>
            <td class="punten">${t.punten}</td>
            <td class="${t.doelsaldo > 0 ? 'pos-ds' : t.doelsaldo < 0 ? 'neg-ds' : ''}">${t.doelsaldo > 0 ? '+' : ''}${t.doelsaldo}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderAfcStand(stand, accentClub = 'AFC JO11-4') {
  const container = document.getElementById("stand-lijst");
  const accentLower = (accentClub || '').toLowerCase();
  container.innerHTML = `
    <table class="stand-tabel">
      <thead>
        <tr>
          <th>#</th>
          <th colspan="2">Club</th>
          <th>G</th>
          <th>P</th>
          <th>DS</th>
        </tr>
      </thead>
      <tbody>
        ${stand.map(t => {
          const naamLower = (t.club || '').toLowerCase();
          const isAccent = naamLower === accentLower
            || naamLower.includes(accentLower)
            || accentLower.includes(naamLower);
          return `
          <tr class="${isAccent ? 'ajax-rij' : ''}">
            <td class="pos">${t.positie}</td>
            <td class="logo-cel">${t.logo ? `<img src="${t.logo}" alt="${t.club}" />` : ''}</td>
            <td class="club-naam">${t.club}</td>
            <td>${t.gespeeld}</td>
            <td class="punten">${t.punten}</td>
            <td class="${t.doelsaldo > 0 ? 'pos-ds' : t.doelsaldo < 0 ? 'neg-ds' : ''}">${t.doelsaldo > 0 ? '+' : ''}${t.doelsaldo}</td>
          </tr>
        `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function besteVoorspeller(matchId, actueleThuis, actueleUit, type = 'ajax') {
  const gebruikers = laadGebruikers();
  let beste = null;
  let besteAfstand = Infinity;

  gebruikers.forEach(naam => {
    const voorspellingen = JSON.parse(localStorage.getItem(`olliebet-${type}-${naam}`) || "{}");
    const v = voorspellingen[matchId];
    if (!v || v.thuisScore === "" || v.uitScore === "") return;

    const afstand = Math.abs(Number(v.thuisScore) - actueleThuis) +
                    Math.abs(Number(v.uitScore)   - actueleUit);

    if (afstand < besteAfstand) {
      besteAfstand = afstand;
      beste = { naam, afstand };
    } else if (afstand === besteAfstand && beste) {
      beste.naam += ` & ${naam}`;
    }
  });

  return beste;
}

function renderUitslagen(results, type = 'ajax') {
  const container = document.getElementById("uitslagen-lijst");
  container.innerHTML = "";

  [...results].reverse().forEach(m => {
    const ajaxWon  = (m.thuis === "Ajax" && m.thuisScore > m.uitScore) ||
                     (m.uit   === "Ajax" && m.uitScore  > m.thuisScore);
    const ajaxDraw = m.thuisScore === m.uitScore;
    const winnaar  = besteVoorspeller(m.id, m.thuisScore, m.uitScore, type);

    const div = document.createElement("div");
    div.className = "uitslag-rij";
    div.innerHTML = `
      <span class="uitslag-datum">${m.datum}</span>
      <div class="uitslag-clubs">
        <img src="${m.thuisLogo}" alt="${m.thuis}" />
        <span class="${m.thuis === 'Ajax' && (ajaxWon || ajaxDraw) ? 'winnaar' : ''}">${m.thuis}</span>
      </div>
      <span class="uitslag-score">${m.thuisScore} – ${m.uitScore}</span>
      <div class="uitslag-clubs">
        <span class="${m.uit === 'Ajax' && (ajaxWon || ajaxDraw) ? 'winnaar' : ''}">${m.uit}</span>
        <img src="${m.uitLogo}" alt="${m.uit}" />
      </div>
      ${winnaar ? `<span class="beste-voorspeller">🏆 ${winnaar.naam}</span>` : ''}
    `;
    container.appendChild(div);
  });
}

// ── Club zoeken ───────────────────────────────────────────────

let zoekTimeout = null;
let gekozenClub = null;
let gekozenClubId = null;
let clubWedstrijden = [];
let clubsLijst = null;
let clubsMatches = null;
let clubsResults = null;
let competitionStands = null;

function sleutelClub(teamId) {
  return `olliebet-club-${teamId}-${actiefGebruiker()}`;
}

// ── Favoriete clubs ───────────────────────────────────────────

function laadFavorieten() {
  try {
    return JSON.parse(localStorage.getItem("olliebet-favorieten") || "[]");
  } catch(e) { return []; }
}

function slaFavorietenOp(lijst) {
  localStorage.setItem("olliebet-favorieten", JSON.stringify(lijst));
}

function isFavoriet(clubId) {
  return laadFavorieten().some(c => c.id === clubId);
}

function toggleFavoriet(club) {
  const lijst = laadFavorieten();
  const idx   = lijst.findIndex(c => c.id === club.id);
  if (idx >= 0) lijst.splice(idx, 1);
  else lijst.push({ id: club.id, naam: club.naam, logo: club.logo || '', land: club.land || '' });
  slaFavorietenOp(lijst);
  renderFavorieten();
}

function verwijderFavoriet(clubId) {
  const lijst = laadFavorieten().filter(c => c.id !== clubId);
  slaFavorietenOp(lijst);
  renderFavorieten();
}

async function renderFavorieten() {
  const container = document.getElementById("favorieten-sectie");
  if (!container) return;
  const favs = laadFavorieten();
  container.innerHTML = "";
  if (favs.length === 0) return;

  // Zorg dat clubsMatches geladen is
  if (!clubsMatches) {
    try {
      const res = await fetch(`data/clubs-matches.json?t=${Date.now()}`);
      clubsMatches = await res.json();
    } catch(e) {
      clubsMatches = {};
    }
  }

  for (const fav of favs) {
    const matches = clubsMatches[String(fav.id)] || [];
    const opgeslagen = JSON.parse(localStorage.getItem(sleutelClub(fav.id)) || "{}");

    const kop = document.createElement("div");
    kop.className = "favoriet-kop";
    kop.innerHTML = `
      <h2 class="sectie-titel" style="margin:0">Komende ${escapeHTML(fav.naam)} wedstrijden</h2>
      <button class="favoriet-verwijder" title="Verwijder favoriet">✕</button>
    `;
    kop.querySelector(".favoriet-verwijder").onclick = () => verwijderFavoriet(fav.id);
    container.appendChild(kop);

    const wrap = document.createElement("div");
    wrap.className = "ajax-wedstrijden";

    if (matches.length === 0) {
      wrap.innerHTML = `<p style="color:#666;text-align:center">Geen geplande wedstrijden gevonden.</p>`;
    } else {
      matches.forEach((w, i) => {
        const v = opgeslagen[w.id] || {};
        const div = document.createElement("div");
        div.className = "ajax-wedstrijd";
        div.innerHTML = `
          <span class="datum">${w.datum}</span>
          <div class="ajax-match">
            <div class="club-blok-klein">
              <img src="${w.thuisLogo}" alt="${escapeHTML(w.thuis)}" onerror="this.style.display='none'" />
              <span>${escapeHTML(w.thuis)}</span>
              <input class="scorer-input" type="text" placeholder="Scorers..." value="${escapeHTML(v.thuisScorers ?? '')}" data-fav-id="${fav.id}" data-veld="thuisScorers" data-match="${w.id}" />
            </div>
            <div class="score-midden-klein">
              <input type="number" min="0" max="20" placeholder="0" value="${v.thuisScore ?? ''}" data-fav-id="${fav.id}" data-veld="thuisScore" data-match="${w.id}" />
              <span>–</span>
              <input type="number" min="0" max="20" placeholder="0" value="${v.uitScore ?? ''}" data-fav-id="${fav.id}" data-veld="uitScore" data-match="${w.id}" />
            </div>
            <div class="club-blok-klein rechts">
              <img src="${w.uitLogo}" alt="${escapeHTML(w.uit)}" onerror="this.style.display='none'" />
              <span>${escapeHTML(w.uit)}</span>
              <input class="scorer-input" type="text" placeholder="Scorers..." value="${escapeHTML(v.uitScorers ?? '')}" data-fav-id="${fav.id}" data-veld="uitScorers" data-match="${w.id}" />
            </div>
          </div>
        `;
        wrap.appendChild(div);
      });

      const btn = document.createElement("button");
      btn.textContent = "Sla voorspellingen op";
      btn.onclick = () => slaFavorietOp(fav.id, btn);
      wrap.appendChild(btn);
    }
    container.appendChild(wrap);
  }
}

function slaFavorietOp(clubId, btn) {
  const data = {};
  const speler = actiefGebruiker();
  document.querySelectorAll(`[data-fav-id="${clubId}"]`).forEach(inp => {
    const mid = inp.dataset.match;
    const v   = inp.dataset.veld;
    data[mid] = data[mid] || {};
    data[mid][v] = inp.value;
  });
  for (const [mid, v] of Object.entries(data)) {
    fbVoorspelSchrijf(mid, speler, v);
  }
  localStorage.setItem(sleutelClub(clubId), JSON.stringify(data));
  btn.textContent = "✅ Opgeslagen!";
  setTimeout(() => btn.textContent = "Sla voorspellingen op", 2500);
  updateGokstandBadge();
}

// ── Samenvattingen ────────────────────────────────────────────

let samenvattingClubId = null;

async function renderSamenvattingen() {
  const keuze = document.getElementById("samenvattingen-keuze");
  const lijst = document.getElementById("samenvattingen-lijst");
  const titel = document.getElementById("samenvattingen-titel");
  const favs  = laadFavorieten();

  if (favs.length === 0) {
    keuze.innerHTML = "";
    titel.textContent = "Samenvattingen";
    lijst.innerHTML = `<div class="samenvatting-leeg">Voeg eerst een favoriete club toe via de zoekbalk (klik op het sterretje).</div>`;
    return;
  }

  if (!samenvattingClubId || !favs.some(f => f.id === samenvattingClubId)) {
    samenvattingClubId = favs[0].id;
  }

  keuze.innerHTML = "";
  favs.forEach(f => {
    const btn = document.createElement("button");
    if (f.id === samenvattingClubId) btn.classList.add("actief");
    btn.innerHTML = `${f.logo ? `<img src="${f.logo}" alt="" onerror="this.style.display='none'" />` : ''}<span>${escapeHTML(f.naam)}</span>`;
    btn.onclick = () => {
      samenvattingClubId = f.id;
      renderSamenvattingen();
    };
    keuze.appendChild(btn);
  });

  const club = favs.find(f => f.id === samenvattingClubId);
  titel.textContent = `Samenvattingen ${club.naam}`;
  lijst.innerHTML = `<div class="samenvatting-leeg">Laden...</div>`;

  try {
    if (!clubsResults) {
      const res = await fetch(`data/clubs-results.json?t=${Date.now()}`);
      clubsResults = await res.json();
    }
    // Sorteer op datum aflopend (meest recent eerst). Gebruik datumIso
    // als die er is; anders val terug op oorspronkelijke arrayvolgorde
    // (API geeft chronologisch ascending terug, dus reverse = newest first).
    const ruw = (clubsResults[String(samenvattingClubId)] || []).slice();
    const heeftIso = ruw.some(r => r.datumIso);
    let gesorteerd;
    if (heeftIso) {
      gesorteerd = ruw.sort((a, b) => (b.datumIso || '').localeCompare(a.datumIso || ''));
    } else {
      gesorteerd = ruw.reverse();
    }
    const results = gesorteerd.slice(0, 15);
    if (results.length === 0) {
      lijst.innerHTML = `<div class="samenvatting-leeg">Nog geen uitslagen gevonden voor deze club.</div>`;
      return;
    }
    lijst.innerHTML = "";
    results.forEach(m => {
      const a = document.createElement("a");
      a.className = "samenvatting-item";
      a.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${m.thuis} ${m.uit} samenvatting`)}`;
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = `
        <span class="samenvatting-datum">${escapeHTML(m.datum || '')}</span>
        <div class="samenvatting-clubs">
          <img src="${m.thuisLogo || ''}" alt="" onerror="this.style.display='none'" />
          <span>${escapeHTML(m.thuis)}</span>
          <span class="samenvatting-score">${m.thuisScore} – ${m.uitScore}</span>
          <span>${escapeHTML(m.uit)}</span>
          <img src="${m.uitLogo || ''}" alt="" onerror="this.style.display='none'" />
        </div>
        <span class="samenvatting-play">▶ Bekijk</span>
      `;
      lijst.appendChild(a);
    });
  } catch(e) {
    lijst.innerHTML = `<div class="samenvatting-leeg">Kon uitslagen niet laden.</div>`;
  }
}

// ── Stand van het gokken ──────────────────────────────────────

let alleVoorspellingen = {};   // { matchId: { speler: {thuisScore, uitScore, thuisScorers, uitScorers} } }
let werkelijkeScorers = {};    // { matchId: { thuisScorers, uitScorers } }

async function fbVoorspelSchrijf(matchId, speler, v) {
  if (!FIREBASE_URL || !speler || !matchId) return;
  try {
    await fetch(`${FIREBASE_URL}/voorspellingen/${matchId}/${encodeURIComponent(speler)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    });
  } catch(e) {}
}

async function fbVoorspelAllesLees() {
  if (!FIREBASE_URL) return {};
  try {
    const res = await fetch(`${FIREBASE_URL}/voorspellingen.json`);
    return (await res.json()) || {};
  } catch(e) { return {}; }
}

async function fbWerkelijkSchrijf(matchId, val) {
  if (!FIREBASE_URL) return;
  try {
    await fetch(`${FIREBASE_URL}/werkelijk/${matchId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(val),
    });
  } catch(e) {}
}

async function fbWerkelijkAllesLees() {
  if (!FIREBASE_URL) return {};
  try {
    const res = await fetch(`${FIREBASE_URL}/werkelijk.json`);
    return (await res.json()) || {};
  } catch(e) { return {}; }
}

function startGokstandSync() {
  if (!FIREBASE_URL) return;
  const es1 = new EventSource(`${FIREBASE_URL}/voorspellingen.json`);
  es1.addEventListener('put', e => {
    const { path, data } = JSON.parse(e.data);
    if (path === '/') {
      alleVoorspellingen = data || {};
    } else {
      const [_, mid, speler] = path.split('/');
      if (mid && speler) {
        alleVoorspellingen[mid] = alleVoorspellingen[mid] || {};
        if (data === null) delete alleVoorspellingen[mid][decodeURIComponent(speler)];
        else alleVoorspellingen[mid][decodeURIComponent(speler)] = data;
      } else if (mid) {
        if (data === null) delete alleVoorspellingen[mid];
        else alleVoorspellingen[mid] = data;
      }
    }
    updateGokstandBadge();
    if (activePagina === "gokstand") renderGokstand();
  });
  es1.addEventListener('error', () => { es1.close(); setTimeout(startGokstandSync, 30000); });

  const es2 = new EventSource(`${FIREBASE_URL}/werkelijk.json`);
  es2.addEventListener('put', e => {
    const { path, data } = JSON.parse(e.data);
    if (path === '/') {
      werkelijkeScorers = data || {};
    } else {
      const mid = path.replace(/^\//, '');
      if (data === null) delete werkelijkeScorers[mid];
      else werkelijkeScorers[mid] = data;
    }
    updateGokstandBadge();
    if (activePagina === "gokstand") renderGokstand();
  });
  es2.addEventListener('error', () => { es2.close(); });
}

function normaliseerNaam(s) {
  return (s || '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function scorerMatch(voorspeldeTekst, werkelijkeNaam) {
  const v = normaliseerNaam(voorspeldeTekst);
  const w = normaliseerNaam(werkelijkeNaam);
  if (!v || !w) return false;
  // Split actual name into words, check if the last word (achternaam) or full is in predicted
  const woorden = w.split(' ').filter(Boolean);
  if (woorden.length === 0) return false;
  // Full name match
  if (v.includes(w)) return true;
  // Last word (achternaam) match as whole word
  const achter = woorden[woorden.length - 1];
  if (achter.length < 3) return false;
  const regex = new RegExp(`\\b${achter}\\b`);
  return regex.test(v);
}

function berekenPuntenVoorMatch(voorspelling, werkelijkScore, werkelijkScorers) {
  if (!voorspelling) return 0;
  const vT = parseInt(voorspelling.thuisScore, 10);
  const vU = parseInt(voorspelling.uitScore, 10);
  if (isNaN(vT) || isNaN(vU)) return 0;

  let pt = 0;
  if (vT === werkelijkScore.thuis && vU === werkelijkScore.uit) {
    pt += 5;
  } else {
    const vRes = Math.sign(vT - vU);
    const wRes = Math.sign(werkelijkScore.thuis - werkelijkScore.uit);
    if (vRes === wRes) pt += 2;
  }

  if (werkelijkScorers) {
    const voorspeldeTekst = `${voorspelling.thuisScorers || ''} ${voorspelling.uitScorers || ''}`;
    const werkelijkLijst = [
      ...(werkelijkScorers.thuisScorers || '').split(/[,;]/),
      ...(werkelijkScorers.uitScorers || '').split(/[,;]/),
    ].map(s => s.trim()).filter(Boolean);

    werkelijkLijst.forEach(naam => {
      if (scorerMatch(voorspeldeTekst, naam)) pt += 3;
    });
  }
  return pt;
}

async function laadAlleResultaten() {
  if (!clubsResults) {
    try {
      const res = await fetch(`data/clubs-results.json?t=${Date.now()}`);
      clubsResults = await res.json();
    } catch(e) { clubsResults = {}; }
  }
  // Maak unieke lijst van finished matches
  const map = {};
  Object.values(clubsResults).forEach(arr => {
    (arr || []).forEach(m => {
      if (m && m.id && m.thuisScore != null && m.uitScore != null) {
        map[m.id] = m;
      }
    });
  });
  return map;
}

async function laadAlleMatchInfo() {
  // Alle bekende wedstrijden (afgerond + komend) op id
  const map = {};
  if (!clubsResults) {
    try {
      const res = await fetch(`data/clubs-results.json?t=${Date.now()}`);
      clubsResults = await res.json();
    } catch(e) { clubsResults = {}; }
  }
  if (!clubsMatches) {
    try {
      const res = await fetch(`data/clubs-matches.json?t=${Date.now()}`);
      clubsMatches = await res.json();
    } catch(e) { clubsMatches = {}; }
  }
  Object.values(clubsResults || {}).forEach(arr => {
    (arr || []).forEach(m => { if (m && m.id) map[m.id] = m; });
  });
  Object.values(clubsMatches || {}).forEach(arr => {
    (arr || []).forEach(m => { if (m && m.id && !map[m.id]) map[m.id] = m; });
  });
  return map;
}

function berekenPuntenPerSpeler(alleMatches) {
  const spelers = laadGebruikers();
  const totalen = {};
  spelers.forEach(s => totalen[s] = { totaal: 0, exact: 0, uitslag: 0, scorers: 0 });

  Object.values(alleMatches).forEach(m => {
    const actueel = { thuis: m.thuisScore, uit: m.uitScore };
    const ws = werkelijkeScorers[m.id];
    const voorspels = alleVoorspellingen[m.id] || {};
    spelers.forEach(speler => {
      const v = voorspels[speler];
      if (!v) return;
      const vT = parseInt(v.thuisScore, 10);
      const vU = parseInt(v.uitScore, 10);
      if (isNaN(vT) || isNaN(vU)) return;
      if (vT === actueel.thuis && vU === actueel.uit) {
        totalen[speler].exact += 1;
        totalen[speler].totaal += 5;
      } else if (Math.sign(vT - vU) === Math.sign(actueel.thuis - actueel.uit)) {
        totalen[speler].uitslag += 1;
        totalen[speler].totaal += 2;
      }
      if (ws) {
        const voorspeldeTekst = `${v.thuisScorers || ''} ${v.uitScorers || ''}`;
        const werkelijkLijst = [
          ...(ws.thuisScorers || '').split(/[,;]/),
          ...(ws.uitScorers || '').split(/[,;]/),
        ].map(s => s.trim()).filter(Boolean);
        werkelijkLijst.forEach(naam => {
          if (scorerMatch(voorspeldeTekst, naam)) {
            totalen[speler].scorers += 1;
            totalen[speler].totaal += 3;
          }
        });
      }
    });
  });
  return totalen;
}

async function updateGokstandBadge() {
  const btn = document.getElementById("gokstand-badge");
  if (!btn) return;
  const speler = actiefGebruiker();
  if (!speler) { btn.classList.add("hidden"); return; }
  const matches = await laadAlleResultaten();
  const totalen = berekenPuntenPerSpeler(matches);
  const pt = totalen[speler] ? totalen[speler].totaal : 0;
  btn.textContent = pt;
  btn.classList.toggle("hidden", pt === 0);
}

async function renderGokstand() {
  const lijst = document.getElementById("gokstand-lijst");
  lijst.innerHTML = `<p style="text-align:center;color:#666;padding:1rem">Laden...</p>`;

  const matches = await laadAlleResultaten();
  const totalen = berekenPuntenPerSpeler(matches);
  const spelers = laadGebruikers();

  if (spelers.length === 0) {
    lijst.innerHTML = `<p style="text-align:center;color:#666;padding:1rem">Voeg spelers toe om een stand te zien.</p>`;
    return;
  }

  const gesorteerd = spelers
    .map(s => ({ naam: s, ...totalen[s] }))
    .sort((a, b) => b.totaal - a.totaal);

  // Voorspellingen per speler verzamelen (incl. komende wedstrijden)
  const matchInfo = await laadAlleMatchInfo();
  const voorspellingenPerSpeler = {};
  spelers.forEach(s => voorspellingenPerSpeler[s] = []);
  Object.entries(alleVoorspellingen || {}).forEach(([mid, perSpeler]) => {
    const m = matchInfo[mid];
    Object.entries(perSpeler || {}).forEach(([speler, v]) => {
      if (!voorspellingenPerSpeler[speler]) return;
      const vT = parseInt(v.thuisScore, 10);
      const vU = parseInt(v.uitScore, 10);
      if (isNaN(vT) || isNaN(vU)) return;
      voorspellingenPerSpeler[speler].push({
        datum:      (m && m.datum) || '',
        thuis:      (m && m.thuis) || '(onbekend)',
        uit:        (m && m.uit) || '(onbekend)',
        thuisLogo:  (m && m.thuisLogo) || '',
        uitLogo:    (m && m.uitLogo) || '',
        vT, vU,
        wT:         m && m.thuisScore != null ? m.thuisScore : null,
        wU:         m && m.uitScore   != null ? m.uitScore   : null,
      });
    });
  });
  // Sorteer elke spelers-lijst: gespeelde wedstrijden eerst (nieuwste boven)
  Object.values(voorspellingenPerSpeler).forEach(lst => {
    lst.sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  });

  const voorspellingenHTML = gesorteerd.map(r => {
    const lst = voorspellingenPerSpeler[r.naam] || [];
    if (lst.length === 0) return '';
    const rijen = lst.map(d => {
      const heeftResultaat = d.wT != null && d.wU != null;
      const uitslagHTML = heeftResultaat
        ? `<span class="vp-werkelijk">${d.wT}–${d.wU}</span>`
        : `<span class="vp-wacht">—</span>`;
      return `
        <div class="vp-rij">
          <span class="vp-datum">${escapeHTML(d.datum)}</span>
          <span class="vp-wedstrijd">
            <img src="${d.thuisLogo}" alt="" onerror="this.style.display='none'" class="vp-logo" />
            <span class="vp-club">${escapeHTML(d.thuis)}</span>
            <span class="vp-voorspel">${d.vT}–${d.vU}</span>
            <span class="vp-club">${escapeHTML(d.uit)}</span>
            <img src="${d.uitLogo}" alt="" onerror="this.style.display='none'" class="vp-logo" />
          </span>
          ${uitslagHTML}
        </div>
      `;
    }).join('');
    return `
      <div class="vp-speler-blok">
        <h4 class="vp-speler-naam">${escapeHTML(r.naam)}</h4>
        ${rijen}
      </div>
    `;
  }).join('');

  lijst.innerHTML = `
    <table class="gokstand-tabel">
      <thead>
        <tr>
          <th>#</th>
          <th>Speler</th>
          <th>Punten</th>
          <th title="Exacte score (5 pt)">EX</th>
          <th title="Juiste uitslag (2 pt)">UI</th>
          <th title="Goede scorer (3 pt)">SC</th>
        </tr>
      </thead>
      <tbody>
        ${gesorteerd.map((r, i) => {
          const kl = i === 0 ? 'goud' : i === 1 ? 'zilver' : i === 2 ? 'brons' : '';
          return `
            <tr class="${kl}">
              <td>${i+1}</td>
              <td class="speler">${escapeHTML(r.naam)}</td>
              <td class="punten">${r.totaal}</td>
              <td>${r.exact}</td>
              <td>${r.uitslag}</td>
              <td>${r.scorers}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    ${voorspellingenHTML ? `<h3 class="vp-kop">Voorspellingen per speler</h3>${voorspellingenHTML}` : ''}
  `;
}

async function laadScorersJson() {
  try {
    const resp = await fetch("data/scorers.json?t=" + Date.now());
    if (!resp.ok) return {};
    return await resp.json();
  } catch (e) {
    return {};
  }
}

async function laadGokstandEnStart() {
  alleVoorspellingen = await fbVoorspelAllesLees();
  const fbWerkelijk = await fbWerkelijkAllesLees();
  const autoScorers = await laadScorersJson();
  // Auto-opgehaalde scorers als basis, handmatige (Firebase) mag overschrijven
  werkelijkeScorers = Object.assign({}, autoScorers, fbWerkelijk);
  startGokstandSync();
  // Upload lokale voorspellingen van huidige speler naar Firebase (voor de leaderboard)
  uploadLokaleVoorspellingen();
  updateGokstandBadge();
}

function uploadLokaleVoorspellingen() {
  const speler = actiefGebruiker();
  if (!speler) return;
  // Ajax
  try {
    const aj = JSON.parse(localStorage.getItem(`olliebet-voorspellingen-ajax-${speler}`) || "{}");
    for (const [mid, v] of Object.entries(aj)) fbVoorspelSchrijf(mid, speler, v);
  } catch(e) {}
  // Clubs (inc favorieten)
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("olliebet-club-") || !k.endsWith(`-${speler}`)) continue;
    try {
      const obj = JSON.parse(localStorage.getItem(k) || "{}");
      for (const [mid, v] of Object.entries(obj)) fbVoorspelSchrijf(mid, speler, v);
    } catch(e) {}
  }
}

// Amateurteams waarvoor wij een eigen scraper hebben.
// Wordt geladen uit data/afc-teams.json (door de workflow automatisch
// gevuld met ALLE AFC teams — senioren, jeugd, vrouwen, meisjes,
// veteranen). Per team:
//   basis = afc.nl slug (gebruikt voor data/afc-teams/<slug>-…)
//   naam  = zichtbare naam (bv. "AFC JO11-4")
//   land  = "Amateur · AFC · <soort>"
let gescrapedeAmateurTeams = [];

async function laadAfcTeams() {
  if (gescrapedeAmateurTeams.length) return;
  try {
    const res = await fetch(`data/afc-teams.json?t=${Date.now()}`);
    if (!res.ok) return;
    const lijst = await res.json();
    gescrapedeAmateurTeams = lijst.map(t => ({
      basis: t.slug,
      naam:  t.naam,
      land:  `Amateur · AFC · ${t.soort || ''}`.replace(/ · $/, ''),
    }));
  } catch (e) {
    // Laat leeg — zoekresultaten tonen dan geen AFC teams.
  }
}

async function laadClubsLijst() {
  if (clubsLijst) return;
  await laadAfcTeams();
  try {
    const [proRes, amateurRes] = await Promise.all([
      fetch(`data/clubs.json?t=${Date.now()}`),
      fetch(`data/amateur-clubs.json?t=${Date.now()}`).catch(() => null),
    ]);
    const pro = await proRes.json();
    let amateur = [];
    if (amateurRes && amateurRes.ok) {
      const ruw = await amateurRes.json();
      amateur = ruw.map(c => ({
        id: `amateur-${c.naam.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        naam: c.naam,
        logo: '',
        land: `Amateur · ${c.provincie}`,
        provincie: c.provincie,
        wiki: c.wiki || c.naam,
        amateur: true,
      }));
    }
    // Gescrapede teams als eigen entries (logo: AFC)
    const gescraped = gescrapedeAmateurTeams.map(t => ({
      id: `scraped-${t.basis}`,
      naam: t.naam,
      logo: 'images/afc.png',
      land: t.land,
      basis: t.basis,
      amateurScraper: true,
    }));
    clubsLijst = [...gescraped, ...pro, ...amateur];
  } catch(e) {
    clubsLijst = [];
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("club-zoek-input");
  input.addEventListener("input", e => {
    clearTimeout(zoekTimeout);
    const q = e.target.value.trim();
    if (q.length < 2) {
      document.getElementById("club-zoek-resultaten").classList.add("hidden");
      return;
    }
    zoekTimeout = setTimeout(() => zoekClubs(q), 200);
  });

  document.addEventListener("click", e => {
    if (!document.getElementById("club-zoek").contains(e.target)) {
      document.getElementById("club-zoek-resultaten").classList.add("hidden");
    }
  });
});

async function zoekClubs(query) {
  await laadClubsLijst();
  const q = query.toLowerCase();
  const matches = clubsLijst.filter(c => c.naam.toLowerCase().includes(q));
  // Sorteer: 1) gescrapede amateurteams eerst (echte data!), 2) start-match boven contains-match,
  // 3) pro boven generieke amateurclubs (zonder scraper), 4) alfabetisch.
  matches.sort((a, b) => {
    const aPrio = a.amateurScraper ? 0 : (a.amateur ? 2 : 1);
    const bPrio = b.amateurScraper ? 0 : (b.amateur ? 2 : 1);
    if (aPrio !== bPrio) return aPrio - bPrio;
    const aStart = a.naam.toLowerCase().startsWith(q) ? 0 : 1;
    const bStart = b.naam.toLowerCase().startsWith(q) ? 0 : 1;
    if (aStart !== bStart) return aStart - bStart;
    return a.naam.localeCompare(b.naam);
  });
  toonZoekResultaten(matches);
}

function toonZoekResultaten(clubs) {
  const container = document.getElementById("club-zoek-resultaten");
  container.innerHTML = "";
  if (clubs.length === 0) {
    container.innerHTML = `<div class="zoek-geen">Geen clubs gevonden</div>`;
    container.classList.remove("hidden");
    return;
  }
  clubs.slice(0, 8).forEach(club => {
    const item = document.createElement("div");
    item.className = "zoek-item";
    const favKlasse = isFavoriet(club.id) ? " favoriet" : "";
    item.innerHTML = `
      ${club.logo ? `<img src="${club.logo}" alt="" onerror="this.style.display='none'" />` : ''}
      <span class="zoek-naam">${escapeHTML(club.naam)}</span>
      <span class="zoek-land">${escapeHTML(club.land || '')}</span>
      <button class="zoek-ster${favKlasse}" title="Zet op homepagina">★</button>
    `;
    item.onclick = () => kiesClub(club);
    const ster = item.querySelector(".zoek-ster");
    ster.onclick = (e) => {
      e.stopPropagation();
      toggleFavoriet(club);
      ster.classList.toggle("favoriet", isFavoriet(club.id));
    };
    container.appendChild(item);
  });
  container.classList.remove("hidden");
}

async function kiesClub(club) {
  gekozenClub = club;
  gekozenClubId = club.id;
  document.getElementById("club-zoek-input").value = club.naam;
  document.getElementById("club-zoek-resultaten").classList.add("hidden");
  document.getElementById("club-sectie-titel").textContent = `Komende ${club.naam} wedstrijden`;
  document.getElementById("club-sectie").classList.remove("hidden");
  document.getElementById("club-wedstrijden").innerHTML =
    `<p style="color:#666;text-align:center">Laden...</p>`;

  // Gescraped amateur team (eigen scraper, AFC team): laad uit lokale JSON
  if (club.amateurScraper) {
    try {
      const res = await fetch(`data/afc-teams/${club.basis}-matches.json?t=${Date.now()}`);
      clubWedstrijden = res.ok ? await res.json() : [];
    } catch (e) {
      clubWedstrijden = [];
    }
    renderClubWedstrijden();
    return;
  }

  // Amateur clubs zonder eigen scraper: toon placeholder
  if (club.amateur) {
    clubWedstrijden = [];
    await toonAmateurInfo(club);
    return;
  }

  try {
    if (!clubsMatches) {
      const res = await fetch(`data/clubs-matches.json?t=${Date.now()}`);
      clubsMatches = await res.json();
    }
    const lokaal = clubsMatches[String(club.id)];
    if (lokaal && lokaal.length > 0) {
      clubWedstrijden = lokaal;
      renderClubWedstrijden();
    } else {
      // Fallback: directe API-call (werkt op localhost)
      const res = await fetch(
        `https://api.football-data.org/v4/teams/${club.id}/matches?status=SCHEDULED,TIMED`,
        { headers: { 'X-Auth-Token': FOOTBALL_API_KEY } }
      );
      const data = await res.json();
      clubWedstrijden = (data.matches || []).map(m => ({
        id:        m.id,
        datum:     formatDatum(m.utcDate),
        thuis:     m.homeTeam.name,
        thuisLogo: m.homeTeam.crest || '',
        uit:       m.awayTeam.name,
        uitLogo:   m.awayTeam.crest || '',
      }));
      renderClubWedstrijden();
    }
  } catch(e) {
    document.getElementById("club-wedstrijden").innerHTML =
      `<p style="color:#666;text-align:center">Kon wedstrijden niet laden.</p>`;
  }
}

// Plaatshouder voor amateurclubs zonder eigen scraper
async function toonAmateurInfo(club) {
  const container = document.getElementById("club-wedstrijden");
  container.innerHTML = `
    <div class="amateur-info">
      <h3>${escapeHTML(club.naam)}</h3>
      <p class="amateur-beschr">Amateurclub uit ${escapeHTML(club.provincie || 'Nederland')}</p>
      <p class="amateur-extract">
        Wedstrijden en stand van amateurclubs zijn niet via een gratis publieke
        API beschikbaar. Voor specifieke clubs (zoals AFC JO11-4) kan een
        eigen scraper worden toegevoegd. Laat weten welke amateurclub je
        wilt toevoegen.
      </p>
    </div>
  `;
}

function renderClubWedstrijden() {
  const container  = document.getElementById("club-wedstrijden");
  const opgeslagen = JSON.parse(localStorage.getItem(sleutelClub(gekozenClubId)) || "{}");
  container.innerHTML = "";

  if (clubWedstrijden.length === 0) {
    container.innerHTML = `<p style="color:#666;text-align:center">Geen geplande wedstrijden gevonden.</p>`;
    return;
  }

  clubWedstrijden.forEach((w, i) => {
    const v   = opgeslagen[w.id] || {};
    const div = document.createElement("div");
    div.className = "ajax-wedstrijd";
    div.innerHTML = `
      <span class="datum">${w.datum}</span>
      <div class="ajax-match">
        <div class="club-blok-klein">
          <img src="${w.thuisLogo}" alt="${w.thuis}" onerror="this.style.display='none'" />
          <span>${w.thuis}</span>
          <input class="scorer-input" type="text" placeholder="Scorers..." value="${v.thuisScorers ?? ""}" id="club-scorers-thuis-${i}" />
        </div>
        <div class="score-midden-klein">
          <input type="number" min="0" max="20" placeholder="0" value="${v.thuisScore ?? ""}" id="club-thuis-${i}" />
          <span>–</span>
          <input type="number" min="0" max="20" placeholder="0" value="${v.uitScore ?? ""}" id="club-uit-${i}" />
        </div>
        <div class="club-blok-klein rechts">
          <img src="${w.uitLogo}" alt="${w.uit}" onerror="this.style.display='none'" />
          <span>${w.uit}</span>
          <input class="scorer-input" type="text" placeholder="Scorers..." value="${v.uitScorers ?? ""}" id="club-scorers-uit-${i}" />
        </div>
      </div>
      ${gekozenClub && gekozenClub.competitie ? `
        <button class="opstelling-btn" data-i="${i}">📋 Toon opstellingen</button>
        <div class="opstelling-wrap hidden" id="opstelling-${i}"></div>
      ` : ''}
    `;
    container.appendChild(div);
  });

  // Opstelling-knop handlers
  container.querySelectorAll(".opstelling-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleOpstelling(parseInt(btn.dataset.i, 10), btn));
  });

  const btn = document.createElement("button");
  btn.textContent = "Sla voorspellingen op";
  btn.onclick = slaClubOp;
  container.appendChild(btn);
}

// ── Opstellingen via ESPN ──────────────────────────────────────
// ESPN heeft een open scoreboard/summary endpoint met lineups (gratis,
// geen key). We mappen onze football-data competition codes naar de
// ESPN league code en zoeken het event op datum + teamnamen.
const ESPN_LEAGUE = {
  PL: 'eng.1', PD: 'esp.1', BL1: 'ger.1', SA: 'ita.1', FL1: 'fra.1',
  DED: 'ned.1', PPL: 'por.1', BSA: 'bra.1', ELC: 'eng.2',
  CL: 'uefa.champions', EL: 'uefa.europa',
};

function normTeam(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(fc|sc|afc|vv|de|the|club|sv|cf|ac|as|ssc|rc|cd|sd|ud)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function fetchOpstelling(wedstrijd) {
  const league = ESPN_LEAGUE[gekozenClub.competitie];
  if (!league) return { fout: 'Competitie niet ondersteund door ESPN.' };
  const d = parseNlDatum(wedstrijd.datum);
  if (!d) return { fout: 'Datum onbekend.' };
  // ESPN scoreboard accepteert YYYYMMDD; pak een 2-dagen window voor
  // tijdzone-verschillen.
  const ymd = (dd) => `${dd.getFullYear()}${String(dd.getMonth()+1).padStart(2,'0')}${String(dd.getDate()).padStart(2,'0')}`;
  const dayBefore = new Date(d.getTime() - 24*3600*1000);
  const dayAfter  = new Date(d.getTime() + 24*3600*1000);
  const dates = [ymd(dayBefore), ymd(d), ymd(dayAfter)];
  const want = normTeam(wedstrijd.thuis) + normTeam(wedstrijd.uit);
  let event = null;
  for (const ds of dates) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${ds}`;
      const data = await (await fetch(url)).json();
      for (const ev of data.events || []) {
        const cs = ev.competitions?.[0]?.competitors || [];
        const home = cs.find(c => c.homeAway === 'home')?.team?.displayName || '';
        const away = cs.find(c => c.homeAway === 'away')?.team?.displayName || '';
        const key1 = normTeam(home) + normTeam(away);
        const key2 = normTeam(away) + normTeam(home);
        if (key1 === want || key2 === want
            || key1.includes(normTeam(wedstrijd.thuis)) && key1.includes(normTeam(wedstrijd.uit))) {
          event = ev;
          break;
        }
      }
      if (event) break;
    } catch (e) { /* probeer volgende datum */ }
  }
  if (!event) return { fout: 'Wedstrijd niet gevonden bij ESPN.' };
  try {
    const sumUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${event.id}`;
    const sum = await (await fetch(sumUrl)).json();
    const rosters = sum.rosters || [];
    if (!rosters.length || !rosters.some(r => (r.roster || []).length)) {
      return { fout: 'Opstelling nog niet bekend (komt vaak ~1 uur voor aftrap).' };
    }
    return { rosters };
  } catch (e) {
    return { fout: 'Kon opstelling niet ophalen.' };
  }
}

async function toggleOpstelling(i, btn) {
  const wrap = document.getElementById(`opstelling-${i}`);
  if (!wrap) return;
  if (!wrap.classList.contains("hidden")) {
    wrap.classList.add("hidden");
    btn.textContent = "📋 Toon opstellingen";
    return;
  }
  wrap.classList.remove("hidden");
  wrap.innerHTML = `<p style="text-align:center;color:#666;padding:10px">Opstelling laden…</p>`;
  btn.textContent = "📋 Verberg opstellingen";
  const result = await fetchOpstelling(clubWedstrijden[i]);
  if (result.fout) {
    wrap.innerHTML = `<p style="text-align:center;color:#888;padding:10px">${escapeHTML(result.fout)}</p>`;
    return;
  }
  wrap.innerHTML = result.rosters.map(r => {
    const teamNaam = (r.team || {}).displayName || '';
    const formatie = r.formation ? ` — ${r.formation}` : '';
    const starters = (r.roster || []).filter(p => p.starter);
    const bench    = (r.roster || []).filter(p => !p.starter);
    const speler = (p) => {
      const naam = (p.athlete || {}).displayName || '';
      const pos  = (p.position && p.position.abbreviation) || '';
      const rug  = p.jersey || '';
      return `<li><span class="ops-rug">${escapeHTML(rug)}</span> <span class="ops-naam">${escapeHTML(naam)}</span> <span class="ops-pos">${escapeHTML(pos)}</span></li>`;
    };
    return `
      <div class="ops-team">
        <h4>${escapeHTML(teamNaam)}${escapeHTML(formatie)}</h4>
        <ul class="ops-lijst ops-starters">${starters.map(speler).join('')}</ul>
        ${bench.length ? `<details class="ops-bank"><summary>Bank (${bench.length})</summary><ul class="ops-lijst">${bench.map(speler).join('')}</ul></details>` : ''}
      </div>
    `;
  }).join('');
}

function slaClubOp() {
  const data = {};
  const speler = actiefGebruiker();
  clubWedstrijden.forEach((w, i) => {
    const v = {
      thuisScore:   document.getElementById(`club-thuis-${i}`).value,
      uitScore:     document.getElementById(`club-uit-${i}`).value,
      thuisScorers: document.getElementById(`club-scorers-thuis-${i}`).value,
      uitScorers:   document.getElementById(`club-scorers-uit-${i}`).value,
    };
    data[w.id] = v;
    fbVoorspelSchrijf(w.id, speler, v);
  });
  localStorage.setItem(sleutelClub(gekozenClubId), JSON.stringify(data));
  const btn = document.querySelector("#club-wedstrijden button");
  btn.textContent = "✅ Opgeslagen!";
  setTimeout(() => btn.textContent = "Sla voorspellingen op", 2500);
  updateGokstandBadge();
}

// ── Init ──────────────────────────────────────────────────────

renderGebruikers();
renderFavorieten();
updateLiveMinuten();
setInterval(updateLiveMinuten, 60000);
// Ajax + AFC JO11-4 staan niet meer op het beginscherm; de zoekbalk
// haalt hun data ad hoc op als je ze kiest. Geen vaste interval nodig.

// Firebase: laad spelerslijst bij opstarten en blijf in sync
(async () => {
  const remote = await fbLees();
  if (remote !== null) {
    localStorage.setItem("olliebet-gebruikers", JSON.stringify(remote));
    renderGebruikers();
  }
  startFirebaseSync();
  laadChatEnStart();
  laadGokstandEnStart();
})();

// Chat: Enter-toets versturen
(function bindChatEnter() {
  const inp = document.getElementById("chat-input");
  if (inp) {
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        verstuurBericht();
      }
    });
  }
})();

// ── Toegangscode ─────────────────────────────────────────────
const TOEGANGSCODE = "1011";

function controleerCode() {
  const input = document.getElementById("code-input");
  const fout  = document.getElementById("code-fout");
  if (input.value === TOEGANGSCODE) {
    sessionStorage.setItem("olliebet-toegang", "ja");
    document.getElementById("code-gate").classList.add("hidden");
  } else {
    fout.classList.remove("hidden");
    input.value = "";
    input.focus();
  }
}

// ── Spelletjes ────────────────────────────────────────────────

let huidigSpel = "penalty";

function kiesSpelletje(spel) {
  huidigSpel = spel;
  document.querySelectorAll(".spelletje-keuze-btn").forEach(b => {
    b.classList.toggle("actief", b.dataset.spel === spel);
  });
  stopSnake();
  if (spel === "penalty") renderPenalty();
  else if (spel === "snake") renderSnake();
}

// ── Penalty game ───────
let penaltyState = JSON.parse(localStorage.getItem("olliebet-penalty") || '{"goals":0,"saves":0,"pogingen":0}');

function slaPenaltyOp() {
  localStorage.setItem("olliebet-penalty", JSON.stringify(penaltyState));
}

function renderPenalty() {
  const el = document.getElementById("spelletje-inhoud");
  el.innerHTML = `
    <div class="penalty-game">
      <div class="penalty-score" id="penalty-score"></div>
      <div class="penalty-goal">
        <div class="penalty-net"></div>
        <div class="penalty-keeper" id="penalty-keeper">🧤</div>
        <div class="penalty-zones" id="penalty-zones">
          ${[0,1,2,3,4,5,6,7,8].map(i => `<div class="penalty-zone" data-zone="${i}"></div>`).join('')}
        </div>
        <div class="penalty-bal hidden" id="penalty-bal">⚽</div>
      </div>
      <div class="penalty-msg" id="penalty-msg">Klik in het doel om te schieten</div>
      <div class="penalty-acties">
        <button onclick="resetPenalty()" class="penalty-reset">Reset score</button>
      </div>
    </div>
  `;
  updatePenaltyScore();
  el.querySelectorAll(".penalty-zone").forEach(z => {
    z.addEventListener("click", () => schietPenalty(parseInt(z.dataset.zone, 10)));
  });
}

function updatePenaltyScore() {
  const el = document.getElementById("penalty-score");
  if (!el) return;
  const p = penaltyState;
  const perc = p.pogingen ? Math.round(100 * p.goals / p.pogingen) : 0;
  el.innerHTML = `⚽ <b>${p.goals}</b> goals · 🧤 <b>${p.saves}</b> saves · ${p.pogingen} pogingen (${perc}%)`;
}

let penaltyBezig = false;
function schietPenalty(zoneSpeler) {
  if (penaltyBezig) return;
  penaltyBezig = true;
  const zoneKeeper = Math.floor(Math.random() * 9);
  const keeperEl = document.getElementById("penalty-keeper");
  const balEl    = document.getElementById("penalty-bal");
  const msgEl    = document.getElementById("penalty-msg");
  const zonesEl  = document.getElementById("penalty-zones");
  const zoneSpEl = zonesEl.querySelector(`[data-zone="${zoneSpeler}"]`);
  const zoneKpEl = zonesEl.querySelector(`[data-zone="${zoneKeeper}"]`);

  // Bal animeren naar geschoten vak
  const goalRect = zonesEl.getBoundingClientRect();
  const spRect   = zoneSpEl.getBoundingClientRect();
  const kpRect   = zoneKpEl.getBoundingClientRect();
  balEl.classList.remove("hidden");
  balEl.style.left = `50%`;
  balEl.style.top  = `100%`;
  balEl.style.transform = `translate(-50%, -50%) scale(1)`;
  // Geef een tick zodat browser de start-state oppikt voordat we naar eind animeren
  requestAnimationFrame(() => {
    balEl.style.transition = "left 0.5s ease-out, top 0.5s ease-out, transform 0.5s ease-out";
    const x = ((spRect.left + spRect.width/2) - goalRect.left) / goalRect.width * 100;
    const y = ((spRect.top  + spRect.height/2) - goalRect.top)  / goalRect.height * 100;
    balEl.style.left = `${x}%`;
    balEl.style.top  = `${y}%`;
    balEl.style.transform = `translate(-50%, -50%) scale(0.6)`;
  });

  // Keeper duikt naar zijn vak
  const kx = ((kpRect.left + kpRect.width/2)  - goalRect.left) / goalRect.width * 100;
  const ky = ((kpRect.top  + kpRect.height/2) - goalRect.top)  / goalRect.height * 100;
  keeperEl.style.transition = "left 0.45s ease-out, top 0.45s ease-out";
  keeperEl.style.left = `${kx}%`;
  keeperEl.style.top  = `${ky}%`;

  setTimeout(() => {
    penaltyState.pogingen++;
    if (zoneKeeper === zoneSpeler) {
      penaltyState.saves++;
      msgEl.innerHTML = `🧤 <b>Gepakt!</b> De keeper koos hetzelfde vak.`;
      msgEl.className = "penalty-msg save";
    } else {
      penaltyState.goals++;
      msgEl.innerHTML = `⚽ <b>GOAL!</b> De keeper dook naar het verkeerde vak.`;
      msgEl.className = "penalty-msg goal";
    }
    slaPenaltyOp();
    updatePenaltyScore();
    // Reset na een tijdje
    setTimeout(() => {
      balEl.classList.add("hidden");
      balEl.style.transition = "none";
      keeperEl.style.transition = "left 0.4s ease-in-out, top 0.4s ease-in-out";
      keeperEl.style.left = "50%";
      keeperEl.style.top  = "85%";
      msgEl.className = "penalty-msg";
      msgEl.textContent = "Klik in het doel om te schieten";
      penaltyBezig = false;
    }, 1400);
  }, 500);
}

function resetPenalty() {
  if (!confirm("Score op 0 zetten?")) return;
  penaltyState = { goals: 0, saves: 0, pogingen: 0 };
  slaPenaltyOp();
  updatePenaltyScore();
}

// ── Snake game ───────
let snakeState = null;
let snakeLoop  = null;

function renderSnake() {
  const best = parseInt(localStorage.getItem("olliebet-snake-best") || "0", 10);
  const el = document.getElementById("spelletje-inhoud");
  el.innerHTML = `
    <div class="snake-game">
      <div class="snake-info">Score: <b id="snake-score">0</b> · Best: <b id="snake-best">${best}</b></div>
      <canvas id="snake-canvas" width="400" height="400" tabindex="0"></canvas>
      <div class="snake-hint">Pijltjes (of WASD) om te bewegen · swipen werkt op mobiel</div>
      <div class="penalty-acties">
        <button onclick="startSnake()">▶ Start / Restart</button>
      </div>
    </div>
  `;
  startSnake();
}

function startSnake() {
  stopSnake();
  const canvas = document.getElementById("snake-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const grid = 20;             // 20x20 cellen
  const cell = canvas.width / grid;
  snakeState = {
    canvas, ctx, grid, cell,
    snake: [{x: 10, y: 10}],
    dir:   {x: 1,  y: 0},
    nextDir: {x: 1, y: 0},
    food:  randomFood(grid, [{x:10,y:10}]),
    score: 0,
    dood:  false,
  };
  canvas.focus();
  tekenSnake();
  snakeLoop = setInterval(stapSnake, 120);

  // Toetsen
  const handler = (e) => {
    if (!snakeState) return;
    const map = {
      ArrowUp:    {x:0, y:-1}, w:{x:0, y:-1}, W:{x:0, y:-1},
      ArrowDown:  {x:0, y: 1}, s:{x:0, y: 1}, S:{x:0, y: 1},
      ArrowLeft:  {x:-1,y: 0}, a:{x:-1,y: 0}, A:{x:-1,y: 0},
      ArrowRight: {x: 1,y: 0}, d:{x: 1,y: 0}, D:{x: 1,y: 0},
    };
    const nd = map[e.key];
    if (!nd) return;
    // Niet 180° omkeren
    if (nd.x === -snakeState.dir.x && nd.y === -snakeState.dir.y) return;
    snakeState.nextDir = nd;
    e.preventDefault();
  };
  snakeState.keyHandler = handler;
  document.addEventListener("keydown", handler);

  // Touch swipes
  let tx=0, ty=0;
  const touchStart = (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; };
  const touchEnd = (e) => {
    if (!snakeState) return;
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    let nd;
    if (Math.abs(dx) > Math.abs(dy)) nd = {x: dx>0?1:-1, y:0};
    else                              nd = {x:0, y: dy>0?1:-1};
    if (nd.x === -snakeState.dir.x && nd.y === -snakeState.dir.y) return;
    snakeState.nextDir = nd;
  };
  canvas.addEventListener("touchstart", touchStart, {passive:true});
  canvas.addEventListener("touchend", touchEnd, {passive:true});
  snakeState.touchStart = touchStart;
  snakeState.touchEnd = touchEnd;
}

function stopSnake() {
  if (snakeLoop) { clearInterval(snakeLoop); snakeLoop = null; }
  if (snakeState && snakeState.keyHandler) {
    document.removeEventListener("keydown", snakeState.keyHandler);
  }
  if (snakeState && snakeState.canvas) {
    snakeState.canvas.removeEventListener("touchstart", snakeState.touchStart);
    snakeState.canvas.removeEventListener("touchend",   snakeState.touchEnd);
  }
  snakeState = null;
}

function randomFood(grid, snake) {
  while (true) {
    const f = { x: Math.floor(Math.random()*grid), y: Math.floor(Math.random()*grid) };
    if (!snake.some(s => s.x === f.x && s.y === f.y)) return f;
  }
}

function stapSnake() {
  const s = snakeState;
  if (!s || s.dood) return;
  s.dir = s.nextDir;
  const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
  // Muur?
  if (head.x < 0 || head.y < 0 || head.x >= s.grid || head.y >= s.grid) return gameOverSnake();
  // Zichzelf?
  if (s.snake.some(seg => seg.x === head.x && seg.y === head.y)) return gameOverSnake();
  s.snake.unshift(head);
  if (head.x === s.food.x && head.y === s.food.y) {
    s.score++;
    document.getElementById("snake-score").textContent = s.score;
    s.food = randomFood(s.grid, s.snake);
  } else {
    s.snake.pop();
  }
  tekenSnake();
}

function tekenSnake() {
  const s = snakeState;
  if (!s) return;
  const { ctx, canvas, cell } = s;
  ctx.fillStyle = "#0a1929";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Voer
  ctx.fillStyle = "#e94560";
  ctx.beginPath();
  ctx.arc(s.food.x*cell + cell/2, s.food.y*cell + cell/2, cell/2 - 2, 0, Math.PI*2);
  ctx.fill();
  // Slang
  s.snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? "#7ee787" : "#4caf50";
    ctx.fillRect(seg.x*cell + 1, seg.y*cell + 1, cell - 2, cell - 2);
  });
}

function gameOverSnake() {
  const s = snakeState;
  if (!s) return;
  s.dood = true;
  const best = parseInt(localStorage.getItem("olliebet-snake-best") || "0", 10);
  if (s.score > best) {
    localStorage.setItem("olliebet-snake-best", String(s.score));
    document.getElementById("snake-best").textContent = s.score;
  }
  const { ctx, canvas } = s;
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", canvas.width/2, canvas.height/2 - 10);
  ctx.font = "20px sans-serif";
  ctx.fillText(`Score: ${s.score}`, canvas.width/2, canvas.height/2 + 24);
  if (snakeLoop) { clearInterval(snakeLoop); snakeLoop = null; }
}

(function initCodeGate() {
  const gate = document.getElementById("code-gate");
  if (!gate) return;
  if (sessionStorage.getItem("olliebet-toegang") === "ja") {
    gate.classList.add("hidden");
    return;
  }
  const input = document.getElementById("code-input");
  input.focus();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") controleerCode();
  });
})();
