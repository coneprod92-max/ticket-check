const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

const form=document.getElementById("resultForm");
const msg=document.getElementById("resultMessage");
const box=document.getElementById("resultBox");

form.addEventListener("submit",async e=>{
  e.preventDefault();
  msg.className="form-message";
  msg.textContent="Recherche...";
  box.style.display="none";

  const reference=document.getElementById("reference").value.trim();
  const contact=document.getElementById("contact").value.trim();

  const {data,error}=await client.rpc("get_ticket_result",{
    p_reference:reference,
    p_contact:contact
  });

  if(error){
    msg.className="form-message error";
    msg.textContent="Impossible de consulter le résultat pour le moment.";
    return;
  }

  if(!data||!data.length){
    msg.className="form-message error";
    msg.textContent="Aucune demande trouvée avec ces informations.";
    return;
  }

  const r=data[0];
  msg.textContent="";
  box.style.display="block";

  box.innerHTML=`
    <div class="result-status status-${escapeHtml(r.status)}">${labelStatus(r.status)}</div>
    <h3>${escapeHtml(r.provider)}</h3>
    <p><b>Référence :</b> ${escapeHtml(r.reference)}</p>
    <div class="result-message">${escapeHtml(r.result_message||"Votre demande est encore en cours de traitement.")}</div>
  `;
});

function labelStatus(s){
  return {
    pending:"En attente",
    processing:"En traitement",
    verified:"Vérifié",
    rejected:"Rejeté"
  }[s]||s;
}

function escapeHtml(v){
  return String(v??"").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
