const clubs = [
  "Ajax", "PSV", "Feyenoord", "AZ", "FC Utrecht",
  "Twente", "NEC", "Heerenveen", "Groningen", "Vitesse",
  "Sparta", "RKC", "Go Ahead Eagles", "PEC Zwolle", "FC Volendam",
  "Almere City", "NAC Breda", "Willem II"
];

function vulClubDropdowns() {
  const thuisSelect = document.getElementById("thuis-club");
  const uitSelect = document.getElementById("uit-club");
  clubs.forEach(club => {
    thuisSelect.innerHTML += `<option value="${club}">${club}</option>`;
    uitSelect.innerHTML += `<option value="${club}">${club}</option>`;
  });
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
        <span>${v.thuis}</span>
        <span style="color:#666">vs</span>
        <span>${v.uit}</span>
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
