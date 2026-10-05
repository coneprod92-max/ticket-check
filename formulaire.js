const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const form = document.getElementById("ticketForm");
const message = document.getElementById("formMessage");

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
  return "TC-" + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString().slice(-4);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  message.className = "form-message";
  message.textContent = "Envoi de votre demande...";

  const provider = document.getElementById("provider").value;
  const amount = Number(document.getElementById("amount").value);
  const currency = document.getElementById("currency").value;
  const purchaseDate = document.getElementById("purchase_date").value || null;
  const country = document.getElementById("country").value.trim();
  const customerName = document.getElementById("customer_name").value.trim();
  const customerContact = document.getElementById("customer_contact").value.trim();
  const ticketReference = document.getElementById("ticket_reference").value.trim();
  const extraNotes = document.getElementById("notes").value.trim();

  const notes = `Devise: ${currency}${extraNotes ? "\n" + extraNotes : ""}`;

  const payload = {
    reference: makeReference(),
    provider,
    amount,
    purchase_date: purchaseDate,
    country,
    customer_name: customerName,
    customer_contact: customerContact,
    ticket_reference: ticketReference,
    notes,
    status: "pending",
    result_message: null
  };

  const { error } = await supabaseClient
    .from("ticket_requests")
    .insert(payload);

  if (error) {
    console.error(error);
    message.className = "form-message error";
    message.textContent = "Impossible d'envoyer la demande pour le moment. Réessayez.";
    return;
  }

  message.className = "form-message success";
  message.innerHTML = `✅ Demande envoyée avec succès !<br><strong>Référence : ${payload.reference}</strong><br>Conservez cette référence.`;

  form.reset();
  document.getElementById("currency").value = "EUR";
});