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
  { naam: "NAC Breda",       logo: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Logo_NAC_Breda.svg" },
  { naam: "Willem II",       logo: "https://upload.wikimedia.org/wikipedia/en/7/77/Willem_II_logo.svg" },
];

let ajaxWedstrijden = [];

const afcLogos = {
  "AFC JO11-4":          "images/afc.png",
  "ASV Blauw-Wit JO11-5":"images/blauw-wit.png",
  "DTA Fortius JO11-2":  "images/fortius.png",
  "Sloterdijk JO11-1":   "images/sloterdijk.png",
};

const afcWedstrijden = [
  { datum: "za 9 mei 11:15",  thuis: "ASV Blauw-Wit JO11-5", uit: "AFC JO11-4" },
  { datum: "za 16 mei 08:30", thuis: "AFC JO11-4",            uit: "DTA Fortius JO11-2" },
  { datum: "za 30 mei 10:00", thuis: "Sloterdijk JO11-1",     uit: "AFC JO11-4" },
];

// ── Gebruikers ────────────────────────────────────────────────

function laadGebruikers() {
  return JSON.parse(localStorage.getItem("olliebet-gebruikers") || "[]");
}

function slaGebruikersOp(lijst) {
  localStorage.setItem("olliebet-gebruikers", JSON.stringify(lijst));
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
    renderAfcWedstrijden();
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
  ajaxWedstrijden.forEach((w, i) => {
    data[w.id] = {
      thuisScore: document.getElementById(`ajax-thuis-${i}`).value,
      uitScore:   document.getElementById(`ajax-uit-${i}`).value,
    };
  });
  localStorage.setItem(sleutel("ajax"), JSON.stringify(data));
  const btn = document.querySelector("#ajax-wedstrijden button");
  btn.textContent = "✅ Opgeslagen!";
  setTimeout(() => btn.textContent = "Sla Ajax voorspellingen op", 2500);
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
          <img src="${afcLogos[w.thuis] || ""}" alt="${w.thuis}" />
          <span>${w.thuis}</span>
        </div>
        <div class="score-midden-klein">
          <input type="number" min="0" max="20" placeholder="0" value="${v.thuisScore ?? ""}" id="afc-thuis-${i}" />
          <span>–</span>
          <input type="number" min="0" max="20" placeholder="0" value="${v.uitScore ?? ""}" id="afc-uit-${i}" />
        </div>
        <div class="club-blok-klein rechts">
          <img src="${afcLogos[w.uit] || ""}" alt="${w.uit}" />
          <span>${w.uit}</span>
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
      thuisScore: document.getElementById(`afc-thuis-${i}`).value,
      uitScore:   document.getElementById(`afc-uit-${i}`).value,
    };
  });
  localStorage.setItem(sleutel("afc"), JSON.stringify(data));
  const btn = document.querySelector("#afc-wedstrijden button");
  btn.textContent = "✅ Opgeslagen!";
  setTimeout(() => btn.textContent = "Sla AFC voorspellingen op", 2500);
}

// ── Init ──────────────────────────────────────────────────────

renderGebruikers();
updateLiveMinuten();
setInterval(updateLiveMinuten, 60000);
setInterval(fetchAjaxWedstrijden, 5 * 60 * 1000);
