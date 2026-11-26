
import { db } from "./config.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const form = document.getElementById("resultForm");
const msg = document.getElementById("resultMessage");
const box = document.getElementById("resultBox");

const translate = key =>
  window.TicketCheckI18n?.t(key) || key;

form.addEventListener("submit", async event => {
  event.preventDefault();

  msg.className = "form-message";
  msg.textContent = translate("searching");
  box.style.display = "none";

  const reference = document.getElementById("reference").value.trim();
  const lookupCode = document.getElementById("lookupCode").value.trim().toLowerCase();

  if (!/^[a-f0-9]{32}$/.test(lookupCode)) {
    msg.className = "form-message error";
    msg.textContent = translate("invalidCode");
    return;
  }

  try {
    const resultRef = doc(db, "public_results", lookupCode);
    const resultSnap = await getDoc(resultRef);

    if (!resultSnap.exists()) {
      showNotFound();
      return;
    }

    const r = resultSnap.data();

    if (r.lookup_token !== lookupCode || r.reference !== reference) {
      showNotFound();
      return;
    }

    msg.textContent = "";
    box.style.display = "block";

    const status = String(r.status || "");
    const statusClasses = {
      pending: "status-pending",
      processing: "status-processing",
      verified: "status-verified",
      rejected: "status-rejected"
    };

    const statusClass = statusClasses[status] || "";
    const statusLabel = labelStatus(status);

    const resultMessage = r.result_message ||
      translate("resultPending");

    box.innerHTML = `
      <div class="result-status ${statusClass}">
        ${escapeHtml(statusLabel)}
      </div>

      <h3>${escapeHtml(r.provider)}</h3>

      <p>
        <b>${translate("referenceLabel")} :</b>
        ${escapeHtml(r.reference)}
      </p>

      <div class="result-message">
        ${escapeHtml(resultMessage)}
      </div>
    `;

  } catch (error) {
    console.error("Erreur Firebase :", error);

    msg.className = "form-message error";
    msg.textContent = translate("resultError");
  }
});

function showNotFound() {
  msg.className = "form-message error";
  msg.textContent = translate("notFound");
}

function labelStatus(status) {
  const statusKeys = {
    pending: "statusPending",
    processing: "statusProcessing",
    verified: "statusVerified",
    rejected: "statusRejected"
  };

  return statusKeys[status]
    ? translate(statusKeys[status])
    : status;
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
