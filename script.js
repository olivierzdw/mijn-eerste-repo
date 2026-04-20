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

const ajaxWedstrijden = [
  { datum: "za 26 april", thuis: "NAC Breda",  uit: "Ajax" },
  { datum: "za 2 mei",    thuis: "Ajax",        uit: "PSV" },
  { datum: "zo 10 mei",   thuis: "Ajax",        uit: "FC Utrecht" },
  { datum: "zo 17 mei",   thuis: "Heerenveen",  uit: "Ajax" },
];

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
  const actief = actiefGebruiker();
  const container = document.getElementById("gebruikers-lijst");
  container.innerHTML = "";

  lijst.forEach(naam => {
    const btn = document.createElement("button");
    btn.className = "gebruiker-btn" + (naam === actief ? " actief" : "");
    btn.textContent = naam;
    btn.onclick = () => wisselGebruiker(naam);
    container.appendChild(btn);
  });

  const heeftGebruiker = actief && lijst.includes(actief);
  document.getElementById("main-inhoud").classList.toggle("hidden", !heeftGebruiker);
  document.getElementById("geen-gebruiker").classList.toggle("hidden", heeftGebruiker);

  if (heeftGebruiker) {
    renderLijst();
    renderAjaxWedstrijden();
    renderAfcWedstrijden();
  }
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

// ── Helpers ───────────────────────────────────────────────────

function logoVanClub(naam) {
  const club = clubs.find(c => c.naam === naam);
  return club ? club.logo : "";
}

function vulClubDropdowns() {
  const thuisSelect = document.getElementById("thuis-club");
  const uitSelect   = document.getElementById("uit-club");
  clubs.forEach(club => {
    thuisSelect.innerHTML += `<option value="${club.naam}">${club.naam}</option>`;
    uitSelect.innerHTML   += `<option value="${club.naam}">${club.naam}</option>`;
  });
}

function updateLogo(kant) {
  const select = document.getElementById(`${kant}-club`);
  const img    = document.getElementById(`${kant}-logo`);
  const naam   = select.value;
  if (naam) {
    img.src = logoVanClub(naam);
    img.alt = naam;
    img.classList.add("actief");
  } else {
    img.src = "";
    img.alt = "";
    img.classList.remove("actief");
  }
}

// ── Vrije voorspellingen ──────────────────────────────────────

function sleutel(type) {
  return `olliebet-${type}-${actiefGebruiker()}`;
}

function laadVoorspellingen() {
  return JSON.parse(localStorage.getItem(sleutel("vrij")) || "[]");
}

function renderLijst() {
  const lijst     = laadVoorspellingen();
  const container = document.getElementById("lijst");
  container.innerHTML = "";

  if (lijst.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:#666;">Nog geen voorspellingen toegevoegd.</p>`;
    return;
  }

  lijst.forEach((v, i) => {
    const div = document.createElement("div");
    div.className = "voorspelling";
    div.innerHTML = `
      <div class="clubs">
        <img src="${logoVanClub(v.thuis)}" alt="${v.thuis}" />
        <span>${v.thuis}</span>
        <span style="color:#666">vs</span>
        <span>${v.uit}</span>
        <img src="${logoVanClub(v.uit)}" alt="${v.uit}" />
      </div>
      <div class="score">${v.thuisScore} – ${v.uitScore}</div>
      <button class="verwijder" onclick="verwijder(${i})">✕</button>
    `;
    container.appendChild(div);
  });
}

function voegToe() {
  const thuis      = document.getElementById("thuis-club").value;
  const uit        = document.getElementById("uit-club").value;
  const thuisScore = document.getElementById("thuis-score").value;
  const uitScore   = document.getElementById("uit-score").value;
  const fout       = document.getElementById("fout-melding");

  if (!thuis || !uit)                              { fout.textContent = "Kies twee clubs."; return; }
  if (thuis === uit)                               { fout.textContent = "Kies twee verschillende clubs."; return; }
  if (thuisScore === "" || uitScore === "")        { fout.textContent = "Vul een score in voor beide clubs."; return; }

  fout.textContent = "";
  const lijst = laadVoorspellingen();
  lijst.push({ thuis, uit, thuisScore, uitScore });
  localStorage.setItem(sleutel("vrij"), JSON.stringify(lijst));
  renderLijst();

  document.getElementById("thuis-club").value  = "";
  document.getElementById("uit-club").value    = "";
  document.getElementById("thuis-score").value = "";
  document.getElementById("uit-score").value   = "";
  updateLogo("thuis");
  updateLogo("uit");
}

function verwijder(index) {
  const lijst = laadVoorspellingen();
  lijst.splice(index, 1);
  localStorage.setItem(sleutel("vrij"), JSON.stringify(lijst));
  renderLijst();
}

// ── Ajax wedstrijden ──────────────────────────────────────────

function renderAjaxWedstrijden() {
  const container  = document.getElementById("ajax-wedstrijden");
  const opgeslagen = JSON.parse(localStorage.getItem(sleutel("ajax")) || "{}");
  container.innerHTML = "";

  ajaxWedstrijden.forEach((w, i) => {
    const v   = opgeslagen[i] || {};
    const div = document.createElement("div");
    div.className = "ajax-wedstrijd";
    div.innerHTML = `
      <span class="datum">${w.datum}</span>
      <div class="ajax-match">
        <div class="club-blok-klein">
          <img src="${logoVanClub(w.thuis)}" alt="${w.thuis}" />
          <span>${w.thuis}</span>
        </div>
        <div class="score-midden-klein">
          <input type="number" min="0" max="20" placeholder="0" value="${v.thuisScore ?? ""}" id="ajax-thuis-${i}" />
          <span>–</span>
          <input type="number" min="0" max="20" placeholder="0" value="${v.uitScore ?? ""}" id="ajax-uit-${i}" />
        </div>
        <div class="club-blok-klein rechts">
          <img src="${logoVanClub(w.uit)}" alt="${w.uit}" />
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
  ajaxWedstrijden.forEach((_, i) => {
    data[i] = {
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
          <span>${w.thuis}</span>
        </div>
        <div class="score-midden-klein">
          <input type="number" min="0" max="20" placeholder="0" value="${v.thuisScore ?? ""}" id="afc-thuis-${i}" />
          <span>–</span>
          <input type="number" min="0" max="20" placeholder="0" value="${v.uitScore ?? ""}" id="afc-uit-${i}" />
        </div>
        <div class="club-blok-klein rechts">
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

vulClubDropdowns();
renderGebruikers();
