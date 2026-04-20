const clubs = [
  { naam: "Ajax", logo: "https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg" },
  { naam: "PSV", logo: "https://upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg" },
  { naam: "Feyenoord", logo: "https://upload.wikimedia.org/wikipedia/en/f/f1/Feyenoord_logo.svg" },
  { naam: "AZ", logo: "https://upload.wikimedia.org/wikipedia/en/5/5c/AZ_Alkmaar.svg" },
  { naam: "FC Utrecht", logo: "https://upload.wikimedia.org/wikipedia/en/5/5e/FC_Utrecht.svg" },
  { naam: "Twente", logo: "https://upload.wikimedia.org/wikipedia/en/5/5b/FC_Twente.svg" },
  { naam: "NEC", logo: "https://upload.wikimedia.org/wikipedia/en/c/c1/NEC_Nijmegen.svg" },
  { naam: "Heerenveen", logo: "https://upload.wikimedia.org/wikipedia/en/3/39/SC_Heerenveen.svg" },
  { naam: "Groningen", logo: "https://upload.wikimedia.org/wikipedia/en/5/5e/FC_Groningen.svg" },
  { naam: "Sparta", logo: "https://upload.wikimedia.org/wikipedia/en/6/6f/Sparta_Rotterdam.svg" },
  { naam: "RKC", logo: "https://upload.wikimedia.org/wikipedia/en/6/67/RKC_Waalwijk.svg" },
  { naam: "Go Ahead Eagles", logo: "https://upload.wikimedia.org/wikipedia/en/c/c8/Go_Ahead_Eagles.svg" },
  { naam: "NAC Breda", logo: "https://upload.wikimedia.org/wikipedia/en/f/f2/NAC_Breda.svg" },
  { naam: "Willem II", logo: "https://upload.wikimedia.org/wikipedia/en/b/b8/Willem_II_Tilburg.svg" },
];

function logoVanClub(naam) {
  const club = clubs.find(c => c.naam === naam);
  return club ? club.logo : "";
}

function vulClubDropdowns() {
  const thuisSelect = document.getElementById("thuis-club");
  const uitSelect = document.getElementById("uit-club");
  clubs.forEach(club => {
    thuisSelect.innerHTML += `<option value="${club.naam}">${club.naam}</option>`;
    uitSelect.innerHTML += `<option value="${club.naam}">${club.naam}</option>`;
  });
}

function updateLogo(kant) {
  const select = document.getElementById(`${kant}-club`);
  const img = document.getElementById(`${kant}-logo`);
  const naam = select.value;
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

function laadVoorspellingen() {
  return JSON.parse(localStorage.getItem("olliebet") || "[]");
}

function slaOpVoorspellingen(lijst) {
  localStorage.setItem("olliebet", JSON.stringify(lijst));
}

function renderLijst() {
  const lijst = laadVoorspellingen();
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
  const thuis = document.getElementById("thuis-club").value;
  const uit = document.getElementById("uit-club").value;
  const thuisScore = document.getElementById("thuis-score").value;
  const uitScore = document.getElementById("uit-score").value;
  const fout = document.getElementById("fout-melding");

  if (!thuis || !uit) { fout.textContent = "Kies twee clubs."; return; }
  if (thuis === uit) { fout.textContent = "Kies twee verschillende clubs."; return; }
  if (thuisScore === "" || uitScore === "") { fout.textContent = "Vul een score in voor beide clubs."; return; }

  fout.textContent = "";
  const lijst = laadVoorspellingen();
  lijst.push({ thuis, uit, thuisScore, uitScore });
  slaOpVoorspellingen(lijst);
  renderLijst();

  document.getElementById("thuis-club").value = "";
  document.getElementById("uit-club").value = "";
  document.getElementById("thuis-score").value = "";
  document.getElementById("uit-score").value = "";
  updateLogo("thuis");
  updateLogo("uit");
}

function verwijder(index) {
  const lijst = laadVoorspellingen();
  lijst.splice(index, 1);
  slaOpVoorspellingen(lijst);
  renderLijst();
}

const ajaxWedstrijden = [
  { datum: "za 26 april", thuis: "NAC Breda", uit: "Ajax" },
  { datum: "za 2 mei",    thuis: "Ajax",      uit: "PSV" },
  { datum: "zo 10 mei",   thuis: "Ajax",      uit: "FC Utrecht" },
  { datum: "zo 17 mei",   thuis: "Heerenveen",uit: "Ajax" },
];

function laadAjaxVoorspellingen() {
  return JSON.parse(localStorage.getItem("olliebet-ajax") || "{}");
}

function renderAjaxWedstrijden() {
  const container = document.getElementById("ajax-wedstrijden");
  const opgeslagen = laadAjaxVoorspellingen();
  container.innerHTML = "";

  ajaxWedstrijden.forEach((w, i) => {
    const v = opgeslagen[i] || {};
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
        <div class="club-blok-klein">
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
  localStorage.setItem("olliebet-ajax", JSON.stringify(data));
  const btn = document.querySelector("#ajax-wedstrijden button");
  btn.textContent = "✅ Opgeslagen!";
  setTimeout(() => btn.textContent = "Sla Ajax voorspellingen op", 2500);
}

vulClubDropdowns();
renderLijst();
renderAjaxWedstrijden();
