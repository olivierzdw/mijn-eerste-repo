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

let afcWedstrijden = [];

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
  ajaxWedstrijden.forEach((w, i) => {
    data[w.id] = {
      thuisScore:    document.getElementById(`ajax-thuis-${i}`).value,
      uitScore:      document.getElementById(`ajax-uit-${i}`).value,
      thuisScorers:  document.getElementById(`ajax-scorers-thuis-${i}`).value,
      uitScorers:    document.getElementById(`ajax-scorers-uit-${i}`).value,
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
  document.getElementById("btn-uitslagen").classList.toggle("actief", pagina === "uitslagen");
  document.getElementById("btn-uitslagen").textContent = pagina === "uitslagen" ? "Wedstrijden" : "Uitslagen";
  document.getElementById("btn-stand").classList.toggle("actief", pagina === "stand");
  document.getElementById("btn-stand").textContent = pagina === "stand" ? "Wedstrijden" : "Stand";

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
    item.innerHTML = `
      ${club.logo ? `<img src="${club.logo}" alt="" onerror="this.style.display='none'" />` : ''}
      <span class="zoek-naam">${club.naam}</span>
      <span class="zoek-land">${club.land || ''}</span>
    `;
    item.onclick = () => kiesClub(club);
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
  clubWedstrijden.forEach((w, i) => {
    data[w.id] = {
      thuisScore:   document.getElementById(`club-thuis-${i}`).value,
      uitScore:     document.getElementById(`club-uit-${i}`).value,
      thuisScorers: document.getElementById(`club-scorers-thuis-${i}`).value,
      uitScorers:   document.getElementById(`club-scorers-uit-${i}`).value,
    };
  });
  localStorage.setItem(sleutelClub(gekozenClubId), JSON.stringify(data));
  const btn = document.querySelector("#club-wedstrijden button");
  btn.textContent = "✅ Opgeslagen!";
  setTimeout(() => btn.textContent = "Sla voorspellingen op", 2500);
}

// ── Init ──────────────────────────────────────────────────────

renderGebruikers();
updateLiveMinuten();
setInterval(updateLiveMinuten, 60000);
setInterval(fetchAjaxWedstrijden, 5 * 60 * 1000);
setInterval(fetchAfcWedstrijden, 5 * 60 * 1000);
