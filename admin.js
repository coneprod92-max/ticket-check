const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const requestsBox = document.getElementById("requests");
const logoutBtn = document.getElementById("logoutBtn");

async function showSession() {
  const { data } = await client.auth.getSession();
  if (data.session) {
    loginBox.style.display = "none";
    dashboard.style.display = "block";
    loadRequests();
  } else {
    loginBox.style.display = "block";
    dashboard.style.display = "none";
  }
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMessage.textContent = "Connexion...";
  const { error } = await client.auth.signInWithPassword({
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value
  });
  if (error) {
    loginMessage.className = "form-message error";
    loginMessage.textContent = error.message;
    return;
  }
  loginMessage.textContent = "";
  showSession();
});

logoutBtn?.addEventListener("click", async () => {
  await client.auth.signOut();
  showSession();
});

async function loadRequests() {
  requestsBox.innerHTML = "<p class='form-message'>Chargement...</p>";
  const { data, error } = await client.from("ticket_requests").select("*").order("created_at", { ascending:false });
  if (error) {
    requestsBox.innerHTML = `<p class="form-message error">${error.message}</p>`;
    return;
  }
  if (!data.length) {
    requestsBox.innerHTML = "<p class='form-message'>Aucune demande pour le moment.</p>";
    return;
  }

  requestsBox.innerHTML = data.map(item => `
    <article style="background:#07111f;border:1px solid rgba(255,255,255,.08);padding:18px;border-radius:16px;margin:15px 0">
      <strong style="color:#4cc9ff">${item.reference}</strong>
      <p><b>${item.provider}</b> — ${item.amount ?? "-"} ${item.notes?.match(/Devise:\s*(EUR|USD)/)?.[1] || ""}</p>
      <p>Client : ${escapeHtml(item.customer_name)}<br>Contact : ${escapeHtml(item.customer_contact)}</p>
      <p>Pays : ${escapeHtml(item.country)}<br>Référence ticket : ${escapeHtml(item.ticket_reference)}</p>
      <p>Statut : <b>${escapeHtml(item.status)}</b></p>
      <p style="color:#8498aa;font-size:13px">${escapeHtml(item.notes || "")}</p>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));
}

client.auth.onAuthStateChange(() => showSession());
showSession();