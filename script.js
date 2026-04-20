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
  const data = await fbChatLees();
  chatBerichten = chatObjectNaarLijst(data);
  startChatSync();
}

// ── Gebruikers ────────────────────────────────────────────────

function laadGebruikers() {
  return JSON.parse(localStorage.getItem("olliebet-gebruikers") || "[]");
}

function slaGebruikersOp(lijst) {
  localStorage.setItem("olliebet-gebruikers", JSON.stringify(lijst));
  fbSchrijf(lijst);
}

function actiefGebruiker() {
  return localStorage.getItem("olliebet-actief") || null;
}

function setActiefGebruiker(naam) {
  localStorage.setItem("olliebet-actief", naam);
}

function renderGebruikers() {
  const lijst = laadGebruikers();
  let actief = actiefGebruiker();
  if (lijst.length > 0 && (!actief || !lijst.includes(actief))) {
    actief = lijst[0];
    setActiefGebruiker(actief);
  }
  const container = document.getElementById("gebruikers-lijst");
  container.innerHTML = "";

  lijst.forEach(naam => {
    const wrap = document.createElement("div");
    wrap.className = "gebruiker-wrap";

    const btn = document.createElement("button");
    btn.className = "gebruiker-btn" + (naam === actief ? " actief" : "");
    btn.textContent = naam;
    btn.onclick = () => wisselGebruiker(naam);

    const del = document.createElement("button");
    del.className = "gebruiker-verwijder";
    del.textContent = "✕";
    del.title = `${naam} verwijderen`;
    del.onclick = (e) => { e.stopPropagation(); verwijderGebruiker(naam); };

    wrap.appendChild(btn);
    wrap.appendChild(del);
    container.appendChild(wrap);
  });

  const heeftGebruiker = actief && lijst.includes(actief);
  document.getElementById("main-inhoud").classList.toggle("hidden", !heeftGebruiker);
  document.getElementById("geen-gebruiker").classList.toggle("hidden", heeftGebruiker);

  if (heeftGebruiker) {
    fetchAjaxWedstrijden();
    fetchAfcWedstrijden();
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
    localStorage.setItem("olliebet-actief", lijst[0] || "");
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
  if (lijst.includes(naam)) {
    alert(`"${naam}" bestaat al.`);
    return;
  }
  lijst.push(naam);
  slaGebruikersOp(lijst);
  setActiefGebruiker(naam);
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

async function fetchAfcWedstrijden() {
  try {
    const res = await fetch(`data/afc-matches.json?t=${Date.now()}`);
    afcWedstrijden = await res.json();
    renderAfcWedstrijden();
  } catch (e) {
    document.getElementById("afc-wedstrijden").innerHTML =
      `<p style="color:#666;text-align:center">Kon wedstrijden niet laden.</p>`;
  }
}

async function fetchLiveEredivisie() {
  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/DED/matches?status=LIVE', {
      headers: { 'X-Auth-Token': FOOTBALL_API_KEY }
    });
    const data = await res.json();
    return data.matches || [];
  } catch (e) {
    return [];
  }
}

async function updateLiveMinuten() {
  const wedstrijden = await fetchLiveEredivisie();

  ajaxWedstrijden.forEach((w, i) => {
    const badge = document.getElementById(`live-ajax-${i}`);
    if (!badge) return;

    const match = wedstrijden.find(m => {
      const thuis = clubNaamMapping[m.homeTeam.name];
      const uit   = clubNaamMapping[m.awayTeam.name];
      return thuis === w.thuis && uit === w.uit;
    });

    if (match) {
      const minuut = match.minute || match.score?.duration || "?";
      badge.textContent = `⏱ ${minuut}'`;
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
    try {
      if (gekozenClub && gekozenClub.competitie) {
        document.getElementById("stand-titel").textContent = `${gekozenClub.competitieNaam || gekozenClub.competitie} stand`;
        if (!competitionStands) {
          const res = await fetch(`data/competition-stands.json?t=${Date.now()}`);
          competitionStands = await res.json();
        }
        const stand = competitionStands[gekozenClub.competitie] || [];
        renderStand(stand, gekozenClub.naam);
      } else {
        document.getElementById("stand-titel").textContent = `Eredivisie stand`;
        const res = await fetch(`data/eredivisie-stand.json?t=${Date.now()}`);
        renderStand(await res.json(), "Ajax");
      }
    } catch(e) {
      document.getElementById("stand-lijst").innerHTML = `<p style="text-align:center;color:#666">Kon stand niet laden.</p>`;
    }
  }

  if (pagina === "stand-afc") {
    document.getElementById("stand-afc-lijst").innerHTML = `<p style="text-align:center;color:#666">Laden...</p>`;
    try {
      const res = await fetch(`data/afc-stand.json?t=${Date.now()}`);
      renderAfcStand(await res.json());
    } catch(e) {
      document.getElementById("stand-afc-lijst").innerHTML = `<p style="text-align:center;color:#666">Kon stand niet laden.</p>`;
    }
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

function renderAfcStand(stand) {
  const container = document.getElementById("stand-afc-lijst");
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
          <tr class="${t.club === 'AFC JO11-4' ? 'ajax-rij' : ''}">
            <td class="pos">${t.positie}</td>
            <td class="logo-cel">${t.logo ? `<img src="${t.logo}" alt="${t.club}" />` : ''}</td>
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
    const results = (clubsResults[String(samenvattingClubId)] || []).slice().reverse().slice(0, 15);
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
  const scorersLijst = document.getElementById("werkelijke-scorers-lijst");
  lijst.innerHTML = `<p style="text-align:center;color:#666;padding:1rem">Laden...</p>`;
  scorersLijst.innerHTML = "";

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
  `;

  // Werkelijke scorers invoer
  const recenteMatches = Object.values(matches)
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 20);

  if (recenteMatches.length === 0) {
    scorersLijst.innerHTML = `<p class="gokstand-hint">Nog geen afgelopen wedstrijden.</p>`;
    return;
  }

  recenteMatches.forEach(m => {
    const ws = werkelijkeScorers[m.id] || { thuisScorers: '', uitScorers: '' };
    const div = document.createElement("div");
    div.className = "werkelijke-match";
    div.innerHTML = `
      <div class="werkelijke-match-kop">
        <span>${escapeHTML(m.datum || '')} — ${escapeHTML(m.thuis)} vs ${escapeHTML(m.uit)}</span>
        <span class="score">${m.thuisScore} – ${m.uitScore}</span>
      </div>
      <div class="werkelijke-match-invul">
        <input type="text" placeholder="Scorers ${escapeHTML(m.thuis)}" value="${escapeHTML(ws.thuisScorers || '')}" id="ws-t-${m.id}" />
        <input type="text" placeholder="Scorers ${escapeHTML(m.uit)}" value="${escapeHTML(ws.uitScorers || '')}" id="ws-u-${m.id}" />
        <button>Opslaan</button>
      </div>
    `;
    div.querySelector("button").onclick = async () => {
      const thuisScorers = document.getElementById(`ws-t-${m.id}`).value.trim();
      const uitScorers  = document.getElementById(`ws-u-${m.id}`).value.trim();
      const btn = div.querySelector("button");
      btn.textContent = "...";
      await fbWerkelijkSchrijf(m.id, { thuisScorers, uitScorers });
      btn.textContent = "✓";
      setTimeout(() => btn.textContent = "Opslaan", 1500);
    };
    scorersLijst.appendChild(div);
  });
}

async function laadGokstandEnStart() {
  alleVoorspellingen = await fbVoorspelAllesLees();
  werkelijkeScorers = await fbWerkelijkAllesLees();
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

async function laadClubsLijst() {
  if (clubsLijst) return;
  try {
    const res = await fetch(`data/clubs.json?t=${Date.now()}`);
    clubsLijst = await res.json();
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
  const gevonden = clubsLijst.filter(c => c.naam.toLowerCase().includes(q));
  toonZoekResultaten(gevonden);
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
    `;
    container.appendChild(div);
  });

  const btn = document.createElement("button");
  btn.textContent = "Sla voorspellingen op";
  btn.onclick = slaClubOp;
  container.appendChild(btn);
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
setInterval(fetchAjaxWedstrijden, 5 * 60 * 1000);
setInterval(fetchAfcWedstrijden, 5 * 60 * 1000);

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
