const wedstrijden = [
  { thuis: "Ajax", uit: "PSV" },
  { thuis: "Feyenoord", uit: "AZ" },
  { thuis: "FC Utrecht", uit: "Vitesse" },
  { thuis: "NEC", uit: "Twente" },
  { thuis: "Heerenveen", uit: "Groningen" },
  { thuis: "Sparta", uit: "RKC" },
];

function renderWedstrijden() {
  const container = document.getElementById("wedstrijden");
  container.innerHTML = "";

  wedstrijden.forEach((w, i) => {
    const opgeslagen = JSON.parse(localStorage.getItem("voorspellingen") || "{}");
    const thuisScore = opgeslagen[i]?.thuis ?? "";
    const uitScore = opgeslagen[i]?.uit ?? "";

    const div = document.createElement("div");
    div.className = "wedstrijd";
    div.innerHTML = `
      <div class="club thuis">${w.thuis}</div>
      <div class="score-invoer">
        <input type="number" min="0" max="20" id="thuis-${i}" value="${thuisScore}" placeholder="0" />
        <span>–</span>
        <input type="number" min="0" max="20" id="uit-${i}" value="${uitScore}" placeholder="0" />
      </div>
      <div class="club uit">${w.uit}</div>
    `;
    container.appendChild(div);
  });
}

function slaOpVoorspellingen() {
  const voorspellingen = {};
  wedstrijden.forEach((_, i) => {
    voorspellingen[i] = {
      thuis: document.getElementById(`thuis-${i}`).value,
      uit: document.getElementById(`uit-${i}`).value,
    };
  });
  localStorage.setItem("voorspellingen", JSON.stringify(voorspellingen));

  const bevestiging = document.getElementById("bevestiging");
  bevestiging.classList.remove("hidden");
  setTimeout(() => bevestiging.classList.add("hidden"), 3000);
}

function resetVoorspellingen() {
  localStorage.removeItem("voorspellingen");
  renderWedstrijden();
}

renderWedstrijden();
