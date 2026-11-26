import { auth, db } from "./config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  writeBatch,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const requestsBox = document.getElementById("requests");
const logoutBtn = document.getElementById("logoutBtn");
const adminManagement = document.getElementById("adminManagement");
const adminsBox = document.getElementById("admins");
const addAdminForm = document.getElementById("addAdminForm");
const adminMessage = document.getElementById("adminMessage");

let currentUser = null;
let currentRole = null;

function showLogin(message = "") {
  loginBox.style.display = "block";
  dashboard.style.display = "none";
  logoutBtn.style.display = "none";
  adminManagement.style.display = "none";

  if (message) {
    loginMessage.className = "form-message error";
    loginMessage.textContent = message;
  }
}

function showDashboard() {
  loginBox.style.display = "none";
  dashboard.style.display = "block";
  logoutBtn.style.display = "inline-block";
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  loginMessage.className = "form-message";
  loginMessage.textContent = "Connexion en cours...";

  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("email").value.trim(),
      document.getElementById("password").value
    );

    loginMessage.textContent = "";
  } catch (error) {
    loginMessage.className = "form-message error";
    loginMessage.textContent = "Connexion impossible. Vérifiez votre email et votre mot de passe.";
    console.error("Erreur de connexion Firebase :", error);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    currentUser = null;
    currentRole = null;
    showLogin();
  } catch (error) {
    alert("Erreur lors de la déconnexion : " + error.message);
  }
});

onAuthStateChanged(auth, async user => {
  currentUser = user;
  currentRole = null;

  if (!user) {
    showLogin();
    return;
  }

  try {
    const adminRef = doc(db, "admin", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
      await signOut(auth);
      showLogin("Ce compte n'est pas autorisé à accéder à l'administration.");
      return;
    }

    const adminData = adminSnap.data();

    if (!["admin", "super_admin"].includes(adminData.role)) {
      await signOut(auth);
      showLogin("Ce compte n'est pas autorisé à accéder à l'administration.");
      return;
    }

    currentRole = adminData.role;
    showDashboard();

    if (currentRole === "super_admin") {
      adminManagement.style.display = "block";
      await loadAdmins();
    } else {
      adminManagement.style.display = "none";
    }

    await loadRequests();

  } catch (error) {
    console.error("Erreur de vérification administrateur :", error);
    await signOut(auth);
    showLogin("Impossible de vérifier les autorisations. Réessayez.");
  }
});

async function loadRequests() {
  requestsBox.innerHTML = "<p class='form-message'>Chargement des demandes...</p>";

  try {
    const requestsQuery = query(
      collection(db, "ticket_requests"),
      orderBy("created_at", "desc")
    );

    const snapshot = await getDocs(requestsQuery);

    if (snapshot.empty) {
      requestsBox.innerHTML = "<p class='form-message'>Aucune demande pour le moment.</p>";
      return;
    }

    requestsBox.innerHTML = snapshot.docs.map(document => {
      const item = document.data();
      const id = document.id;
      const createdAt = item.created_at?.toDate
        ? item.created_at.toDate().toLocaleString("fr-FR")
        : "Date indisponible";

      return `
        <article class="admin-item">
          <div class="admin-item-head">
            <div>
              <div class="ref">${escapeHtml(item.reference)}</div>
              <small>${escapeHtml(createdAt)}</small>
            </div>
            <span class="status-badge status-${escapeHtml(item.status)}">
              ${statusLabel(item.status)}
            </span>
          </div>

          <p><b>${escapeHtml(item.provider)}</b> — ${escapeHtml(item.amount)} €</p>

          <p>
            Client : ${escapeHtml(item.customer_name)}<br>
            Contact : ${escapeHtml(item.customer_contact)}
          </p>

          <p>
            Pays : ${escapeHtml(item.country)}<br>
            Référence ticket : ${escapeHtml(item.ticket_reference)}
          </p>

          <p>
            Informations :<br>
            ${escapeHtml(item.notes || "Aucune")}
          </p>

          <div class="admin-actions">
            <label>Statut
              <select id="status-${escapeHtml(id)}">
                <option value="pending" ${item.status === "pending" ? "selected" : ""}>En attente</option>
                <option value="processing" ${item.status === "processing" ? "selected" : ""}>En traitement</option>
                <option value="verified" ${item.status === "verified" ? "selected" : ""}>Vérifié</option>
                <option value="rejected" ${item.status === "rejected" ? "selected" : ""}>Rejeté</option>
              </select>
            </label>

            <label>Résultat
              <textarea
                id="result-${escapeHtml(id)}"
                rows="4"
                placeholder="Écrivez le résultat de votre vérification..."
              >${escapeHtml(item.result_message || "")}</textarea>
            </label>

            <button
              class="submit-btn"
              type="button"
              onclick="saveRequest('${escapeHtml(id)}')"
            >
              Enregistrer le traitement
            </button>
          </div>
        </article>
      `;
    }).join("");

  } catch (error) {
    console.error("Erreur chargement demandes :", error);
    requestsBox.innerHTML =
      `<p class="form-message error">${escapeHtml(error.message)}</p>`;
  }
}

window.saveRequest = async function(id) {
  const status = document.getElementById("status-" + id).value;
  const result_message =
    document.getElementById("result-" + id).value.trim() || null;

  const allowedStatuses = ["pending", "processing", "verified", "rejected"];

  if (!allowedStatuses.includes(status)) {
    alert("Statut invalide.");
    return;
  }

  try {
    const requestRef = doc(db, "ticket_requests", id);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      alert("Cette demande est introuvable.");
      return;
    }

    const lookupToken = requestSnap.data().lookup_token;

    if (!lookupToken) {
      alert("Code secret introuvable pour cette demande.");
      return;
    }

    const batch = writeBatch(db);

    batch.update(requestRef, {
      status,
      result_message,
      updated_at: serverTimestamp()
    });

    batch.update(doc(db, "public_results", lookupToken), {
      status,
      result_message
    });

    await batch.commit();

    alert("Traitement enregistré avec succès !");
    await loadRequests();

  } catch (error) {
    console.error("Erreur enregistrement :", error);
    alert("Erreur : " + error.message);
  }
};

async function loadAdmins() {
  adminsBox.innerHTML = "<p class='form-message'>Chargement...</p>";

  try {
    const snapshot = await getDocs(collection(db, "admin"));

    if (snapshot.empty) {
      adminsBox.innerHTML = "<p class='form-message'>Aucun administrateur.</p>";
      return;
    }

    adminsBox.innerHTML = snapshot.docs.map(document => {
      const admin = document.data();
      const uid = document.id;
      const isSuperAdmin = admin.role === "super_admin";
      const isCurrentUser = uid === currentUser?.uid;

      return `
        <div class="admin-user-row">
          <div>
            <b>${escapeHtml(admin.email || "Email non renseigné")}</b>
            <small>
              ${isSuperAdmin ? "Administrateur principal" : "Administrateur"}
            </small>
          </div>

          ${
            !isCurrentUser && !isSuperAdmin
              ? `<button class="danger-btn" onclick="removeAdmin('${escapeHtml(uid)}')">Retirer</button>`
              : `<span class="admin-owner">Principal</span>`
          }
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("Erreur chargement administrateurs :", error);
    adminsBox.innerHTML =
      `<p class="form-message error">${escapeHtml(error.message)}</p>`;
  }
}

addAdminForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (currentRole !== "super_admin") {
    return;
  }

  const email = document.getElementById("newAdminEmail")
    .value.trim().toLowerCase();

  const uid = document.getElementById("newAdminUid")
    .value.trim();

  adminMessage.className = "form-message";
  adminMessage.textContent = "Ajout de l'administrateur...";

  if (!email || !uid) {
    adminMessage.className = "form-message error";
    adminMessage.textContent = "Renseignez l'email et l'UID Firebase.";
    return;
  }

  try {
    const adminRef = doc(db, "admin", uid);
    const existingAdmin = await getDoc(adminRef);

    if (existingAdmin.exists()) {
      adminMessage.className = "form-message error";
      adminMessage.textContent = "Cet administrateur est déjà autorisé.";
      return;
    }

    await setDoc(adminRef, {
      email,
      role: "admin"
    });

    adminMessage.className = "form-message success";
    adminMessage.textContent =
      "Administrateur ajouté avec succès.";

    addAdminForm.reset();
    await loadAdmins();

  } catch (error) {
    console.error("Erreur ajout administrateur :", error);
    adminMessage.className = "form-message error";
    adminMessage.textContent = error.message;
  }
});

window.removeAdmin = async function(uid) {
  if (currentRole !== "super_admin") {
    return;
  }

  if (!confirm("Retirer cet administrateur de la liste ?")) {
    return;
  }

  try {
    const adminRef = doc(db, "admin", uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists() || adminSnap.data().role !== "admin") {
      adminMessage.className = "form-message error";
      adminMessage.textContent = "Cet administrateur ne peut pas être retiré.";
      return;
    }

    await deleteDoc(adminRef);

    adminMessage.className = "form-message success";
    adminMessage.textContent = "Administrateur retiré.";

    await loadAdmins();

  } catch (error) {
    console.error("Erreur retrait administrateur :", error);
    adminMessage.className = "form-message error";
    adminMessage.textContent = error.message;
  }
};

function statusLabel(status) {
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
