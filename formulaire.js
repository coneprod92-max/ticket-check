
import { db } from "./config.js";
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const form = document.getElementById("ticketForm");
const message = document.getElementById("formMessage");

const translate = key =>
  window.TicketCheckI18n?.t(key) || key;

const params = new URLSearchParams(window.location.search);
const requestedType = params.get("type");

if (requestedType) {
  const provider = document.getElementById("provider");

  [...provider.options].forEach(option => {
    if (option.value.toLowerCase() === requestedType.toLowerCase()) {
      provider.value = option.value;
    }
  });
}

function makeReference() {
  return "TC-" +
    Math.random().toString(36).substring(2, 8).toUpperCase() +
    Date.now().toString().slice(-4);
}

function makeLookupToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  return [...bytes]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  message.className = "form-message";
  message.textContent = translate("sending");

  const reference = makeReference();
  const lookupToken = makeLookupToken();
  const extra = document.getElementById("notes").value.trim();

  const payload = {
    reference,
    provider: document.getElementById("provider").value,
    amount: Number(document.getElementById("amount").value),
    purchase_date: document.getElementById("purchase_date").value || null,
    country: document.getElementById("country").value.trim(),
    customer_name: document.getElementById("customer_name").value.trim(),
    customer_contact: document.getElementById("customer_contact").value.trim(),
    ticket_reference: document.getElementById("ticket_reference").value.trim(),
    notes: `Devise: EUR${extra ? "\n" + extra : ""}`,
    status: "pending",
    result_message: null,
    lookup_token: lookupToken,
    created_at: serverTimestamp()
  };

  try {
    const batch = writeBatch(db);

    const privateRequest = doc(collection(db, "ticket_requests"));
    const publicResult = doc(db, "public_results", lookupToken);

    batch.set(privateRequest, payload);

    batch.set(publicResult, {
      lookup_token: lookupToken,
      reference,
      provider: payload.provider,
      status: "pending",
      result_message: null
    });

    await batch.commit();

    form.reset();
    document.getElementById("country").value = "France";

    message.className = "form-message success";

    message.innerHTML = `
      <strong>✅ ${translate("requestSuccess")}</strong>
      <p>${translate("yourReference")} : <strong>${reference}</strong></p>
      <p>${translate("yourSecretCode")} : <strong>${lookupToken}</strong></p>
      <p>${translate("saveCodes")}</p>
    `;

  } catch (error) {
    console.error("Erreur Firebase :", error);

    message.className = "form-message error";
    message.textContent = translate("sendError");
  }
});
