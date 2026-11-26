import { db } from "./config.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const form = document.getElementById("resultForm");
const msg = document.getElementById("resultMessage");
const box = document.getElementById("resultBox");

form.addEventListener("submit", async event => {
  event.preventDefault();

  msg.className = "form-message";
  msg.textContent = "Recherche en cours...";
  box.style.display = "none";

  const reference = document.getElementById("reference").value.trim();
  const lookupCode = document.getElementById("lookupCode").value.trim().toLowerCase();

  if (!/^[a-f0-9]{32}$/.test(lookupCode)) {
    msg.className = "form-message error";
    msg.textContent = "Le code secret doit contenir exactement 32 caractères valides.";
    return;
  }

  try {
    const resultRef = doc(db, "public_results", lookupCode);
    const resultSnap = await getDoc(resultRef);

    if (!resultSnap.exists()) {
      msg.className = "form-message error";
      msg.textContent = "Aucune demande trouvée avec ces informations.";
      return;
    }

    const r = resultSnap.data();

    if (r.lookup_token !== lookupCode || r.reference !== reference) {
      msg.className = "form-message error";
      msg.textContent = "Aucune demande trouvée avec ces informations.";
      return;
    }

    msg.textContent = "";
    box.style.display = "block";

    box.innerHTML = `
      <div class="result-status status-${escapeHtml(r.status)}">
        ${labelStatus(r.status)}
      </div>
      <h3>${escapeHtml(r.provider)}</h3>
      <p><b>Référence :</b> ${escapeHtml(r.reference)}</p>
      <div class="result-message">
        ${escapeHtml(r.result_message || "Votre demande est encore en cours de traitement.")}
      </div>
    `;

  } catch (error) {
    console.error("Erreur Firebase :", error);
    msg.className = "form-message error";
    msg.textContent = "Impossible de consulter le résultat pour le moment. Réessayez.";
  }
});

function labelStatus(status) {
  return {
    pending: "En attente",
    processing: "En traitement",
    verified: "Vérifié",
    rejected: "Rejeté"
  }[status] || status;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}
