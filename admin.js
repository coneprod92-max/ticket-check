const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

const loginForm=document.getElementById("loginForm");
const loginMessage=document.getElementById("loginMessage");
const loginBox=document.getElementById("loginBox");
const dashboard=document.getElementById("dashboard");
const requestsBox=document.getElementById("requests");
const logoutBtn=document.getElementById("logoutBtn");
const adminManagement=document.getElementById("adminManagement");
const adminsBox=document.getElementById("admins");
const addAdminForm=document.getElementById("addAdminForm");
const adminMessage=document.getElementById("adminMessage");

async function showSession(){
  const {data}=await client.auth.getSession();

  if(!data.session){
    loginBox.style.display="block";
    dashboard.style.display="none";
    logoutBtn.style.display="none";
    adminManagement.style.display="none";
    return;
  }

  const {data:isAdmin,error}=await client.rpc("is_ticketcheck_admin");

  if(error||!isAdmin){
    await client.auth.signOut();
    loginMessage.className="form-message error";
    loginMessage.textContent="Ce compte n'est pas autorisé à accéder à l'administration.";
    return;
  }

  loginBox.style.display="none";
  dashboard.style.display="block";
  logoutBtn.style.display="inline-block";

  const email=(data.session.user.email||"").toLowerCase();
  const {data:admin}=await client.from("admin_users")
    .select("role").eq("email",email).maybeSingle();

  if(admin?.role==="super_admin"){
    adminManagement.style.display="block";
    loadAdmins();
  }else{
    adminManagement.style.display="none";
  }

  loadRequests();
}

loginForm.addEventListener("submit",async e=>{
  e.preventDefault();
  loginMessage.className="form-message";
  loginMessage.textContent="Connexion...";

  const {error}=await client.auth.signInWithPassword({
    email:document.getElementById("email").value.trim(),
    password:document.getElementById("password").value
  });

  if(error){
    loginMessage.className="form-message error";
    loginMessage.textContent=error.message;
    return;
  }

  loginMessage.textContent="";
  await showSession();
});

logoutBtn.addEventListener("click",async()=>{
  await client.auth.signOut();
  await showSession();
});

async function loadRequests(){
  requestsBox.innerHTML="<p class='form-message'>Chargement...</p>";

  const {data,error}=await client.from("ticket_requests")
    .select("*").order("created_at",{ascending:false});

  if(error){
    requestsBox.innerHTML=`<p class="form-message error">${escapeHtml(error.message)}</p>`;
    return;
  }

  if(!data?.length){
    requestsBox.innerHTML="<p class='form-message'>Aucune demande pour le moment.</p>";
    return;
  }

  requestsBox.innerHTML=data.map(item=>`
    <article class="admin-item">
      <div class="admin-item-head">
        <div>
          <div class="ref">${escapeHtml(item.reference)}</div>
          <small>${new Date(item.created_at).toLocaleString("fr-FR")}</small>
        </div>
        <span class="status-badge status-${escapeHtml(item.status)}">${statusLabel(item.status)}</span>
      </div>

      <p><b>${escapeHtml(item.provider)}</b> — ${escapeHtml(item.amount)} €</p>
      <p>Client : ${escapeHtml(item.customer_name)}<br>Contact : ${escapeHtml(item.customer_contact)}</p>
      <p>Pays : ${escapeHtml(item.country)}<br>Référence ticket : ${escapeHtml(item.ticket_reference)}</p>
      <p>Informations :<br>${escapeHtml(item.notes||"Aucune")}</p>

      <div class="admin-actions">
        <label>Statut
          <select id="status-${item.id}">
            <option value="pending" ${item.status==="pending"?"selected":""}>En attente</option>
            <option value="processing" ${item.status==="processing"?"selected":""}>En traitement</option>
            <option value="verified" ${item.status==="verified"?"selected":""}>Vérifié</option>
            <option value="rejected" ${item.status==="rejected"?"selected":""}>Rejeté</option>
          </select>
        </label>

        <label>Résultat
          <textarea id="result-${item.id}" rows="4" placeholder="Écrivez le résultat de votre vérification...">${escapeHtml(item.result_message||"")}</textarea>
        </label>

        <button class="submit-btn" type="button" onclick="saveRequest('${item.id}')">
          Enregistrer le traitement
        </button>
      </div>
    </article>
  `).join("");
}

window.saveRequest=async function(id){
  const status=document.getElementById("status-"+id).value;
  const result_message=document.getElementById("result-"+id).value.trim()||null;

  const {error}=await client.from("ticket_requests")
    .update({status,result_message}).eq("id",id);

  if(error){
    alert("Erreur : "+error.message);
    return;
  }

  await loadRequests();
};

async function loadAdmins(){
  adminsBox.innerHTML="<p class='form-message'>Chargement...</p>";

  const {data,error}=await client.from("admin_users")
    .select("email,role,created_at").order("created_at");

  if(error){
    adminsBox.innerHTML=`<p class="form-message error">${escapeHtml(error.message)}</p>`;
    return;
  }

  const current=((await client.auth.getUser()).data.user?.email||"").toLowerCase();

  adminsBox.innerHTML=data.map(a=>`
    <div class="admin-user-row">
      <div>
        <b>${escapeHtml(a.email)}</b>
        <small>${a.role==="super_admin"?"Administrateur principal":"Administrateur"}</small>
      </div>
      ${
        a.email.toLowerCase()!==current && a.role!=="super_admin"
        ? `<button class="danger-btn" onclick="removeAdmin('${escapeHtml(a.email)}')">Retirer</button>`
        : `<span class="admin-owner">Principal</span>`
      }
    </div>
  `).join("");
}

addAdminForm.addEventListener("submit",async e=>{
  e.preventDefault();

  const email=document.getElementById("newAdminEmail").value.trim().toLowerCase();
  adminMessage.className="form-message";
  adminMessage.textContent="Ajout...";

  const {error}=await client.from("admin_users")
    .insert({email,role:"admin"});

  if(error){
    adminMessage.className="form-message error";
    adminMessage.textContent=error.code==="23505"
      ?"Cet administrateur est déjà autorisé."
      :error.message;
    return;
  }

  adminMessage.className="form-message success";
  adminMessage.textContent="Administrateur autorisé. Il doit maintenant avoir un compte Auth Supabase avec cet email.";
  addAdminForm.reset();
  loadAdmins();
});

window.removeAdmin=async function(email){
  if(!confirm("Retirer "+email+" de la liste des administrateurs ?")) return;

  const {error}=await client.from("admin_users").delete().eq("email",email);

  if(error){
    adminMessage.className="form-message error";
    adminMessage.textContent=error.message;
    return;
  }

  loadAdmins();
};

function statusLabel(s){
  return {pending:"En attente",processing:"En traitement",verified:"Vérifié",rejected:"Rejeté"}[s]||s;
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

client.auth.onAuthStateChange(()=>showSession());
showSession();
