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

function vulClubDropdowns() {
  const thuisSelect = document.getElementById("thuis-club");
  const uitSelect = document.getElementById("uit-club");
  clubs.forEach(club => {
    thuisSelect.innerHTML += `<option value="${club.naam}">${club.naam}</option>`;
    uitSelect.innerHTML += `<option value="${club.naam}">${club.naam}</option>`;
  });
}

function logoVanClub(naam) {
  const club = clubs.find(c => c.naam === naam);
  return club ? club.logo : "";
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
        <img src="${logoVanClub(v.thuis)}" alt="${v.thuis}" class="club-logo" />
        <span>${v.thuis}</span>
        <span style="color:#666">vs</span>
        <span>${v.uit}</span>
        <img src="${logoVanClub(v.uit)}" alt="${v.uit}" class="club-logo" />
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

  if (!thuis || !uit) {
    toonFout("Kies twee clubs.");
    return;
  }
  if (thuis === uit) {
    toonFout("Kies twee verschillende clubs.");
    return;
  }
  if (thuisScore === "" || uitScore === "") {
    toonFout("Vul een score in voor beide clubs.");
    return;
  }

  const lijst = laadVoorspellingen();
  lijst.push({ thuis, uit, thuisScore, uitScore });
  slaOpVoorspellingen(lijst);
  renderLijst();

  document.getElementById("thuis-club").value = "";
  document.getElementById("uit-club").value = "";
  document.getElementById("thuis-score").value = "";
  document.getElementById("uit-score").value = "";
}

function verwijder(index) {
  const lijst = laadVoorspellingen();
  lijst.splice(index, 1);
  slaOpVoorspellingen(lijst);
  renderLijst();
}

function toonFout(bericht) {
  let fout = document.querySelector(".fout");
  if (!fout) {
    fout = document.createElement("p");
    fout.className = "fout";
    document.querySelector(".wedstrijd-maker").appendChild(fout);
  }
  fout.textContent = bericht;
  setTimeout(() => fout.textContent = "", 3000);
}

vulClubDropdowns();
renderLijst();
