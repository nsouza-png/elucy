// ══════════════════════════════════════════════════════════════════
// ELUCY COCKPIT ENGINE — Supabase Realtime, Activity Log,
// Persistencia, Notificacoes, Chat de Correcao
// Incluir APOS cockpit.html carregar (antes do </body>)
// ══════════════════════════════════════════════════════════════════

(function(){
'use strict';

// ── HELPERS ───────────────────────────────────────────────────────
function _sb(){ return window.getSB ? window.getSB() : null; }

function getOperatorId(){
  if(window._operatorId) return window._operatorId;
  if(window._currentUser) return window._currentUser.email;
  return localStorage.getItem('elucy_operator_email')||'';
}

function _escHtml(s){
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Expose globally
window.getOperatorId = getOperatorId;

// ── SUPABASE REALTIME — recebe resultados e notificacoes ──────────
let _rtChan=null, _ntChan=null, _unread=0;

function initRealtimeListeners(){
  const sb=_sb(); if(!sb) return;
  const opId=getOperatorId(); if(!opId) return;

  // Subscreve cockpit_responses
  if(_rtChan) sb.removeChannel(_rtChan);
  _rtChan = sb.channel('resp-'+opId)
    .on('postgres_changes',{
      event:'INSERT', schema:'public', table:'cockpit_responses',
      filter:'operator_id=eq.'+opId
    }, payload => {
      const r=payload.new; if(!r) return;
      _handleResponse(r);
    }).subscribe();

  // Subscreve operator_notifications
  if(_ntChan) sb.removeChannel(_ntChan);
  _ntChan = sb.channel('notif-'+opId)
    .on('postgres_changes',{
      event:'INSERT', schema:'public', table:'operator_notifications',
      filter:'operator_id=eq.'+opId
    }, payload => {
      const n=payload.new; if(!n) return;
      _unread++; _updateBadge();
      _toast(n.title, n.body, n.deal_id);
    }).subscribe();
}
window.initRealtimeListeners = initRealtimeListeners;

function _handleResponse(response){
  const dealId=response.deal_id;
  const type=response.request_type;
  const output=response.output||'';
  const map=window._COCKPIT_DEAL_MAP||{};
  let targetId=null;
  for(const [id,d] of Object.entries(map)){
    if(d.deal_id===dealId){ targetId=id; break; }
  }
  if(!targetId) targetId=dealId;

  if(type==='analyze'){
    if(window.ELUCY_CACHE) window.ELUCY_CACHE[dealId]=output;
    if(window.injectElucyReport) window.injectElucyReport(targetId, output);
    saveInteraction(dealId,'analysis',output);
    _toast('Analise pronta','ELUCI REPORT disponivel',dealId);
  } else if(type==='copy'){
    if(window.injectElucyCopy) window.injectElucyCopy(targetId, output, '');
    saveInteraction(dealId,'copy',output);
    _toast('Copy pronta','Copy gerada pelo motor Elucy',dealId);
  } else if(type==='brief'){
    if(window.injectElucyReport) window.injectElucyReport(targetId, output);
    saveInteraction(dealId,'brief',output);
  }
}

// ── NOTIFICATION BADGE & TOAST ────────────────────────────────────
function _updateBadge(){
  let b=document.getElementById('notif-badge');
  if(!b){
    const chip=document.querySelector('.tbr'); if(!chip) return;
    b=document.createElement('span');
    b.id='notif-badge';
    b.style.cssText='background:var(--red);color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:10px;cursor:pointer;';
    b.onclick=()=>{_unread=0;_updateBadge();};
    chip.prepend(b);
  }
  b.textContent=_unread>0?_unread:'';
  b.style.display=_unread>0?'inline-block':'none';
}

function _toast(title,body,dealId){
  const t=document.createElement('div');
  t.style.cssText='position:fixed;top:60px;right:16px;z-index:200;background:var(--bg3);border:1px solid var(--accent);border-radius:8px;padding:12px 16px;max-width:320px;animation:fadeIn .2s ease;cursor:pointer;';
  t.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--accent2);margin-bottom:3px">'+_escHtml(title)+'</div><div style="font-size:12px;color:var(--text);line-height:1.4">'+_escHtml(body||'')+'</div>';
  if(dealId){
    t.onclick=()=>{
      const map=window._COCKPIT_DEAL_MAP||{};
      for(const [id,d] of Object.entries(map)){
        if(d.deal_id===dealId){ if(window.selectLiveDeal) window.selectLiveDeal(id,d); break; }
      }
      t.remove();
    };
  }
  document.body.appendChild(t);
  setTimeout(()=>{ if(t.parentNode) t.remove(); },8000);
}
window.showNotifToast = _toast;

// ── ACTIVITY LOG ──────────────────────────────────────────────────
function logActivity(type,dealId,meta){
  const sb=_sb(); if(!sb) return;
  const opId=getOperatorId(); if(!opId) return;
  sb.from('activity_log').insert({
    operator_id:opId, activity_type:type, deal_id:dealId||null, metadata:meta||{}
  }).then(()=>{});
}
window.logActivity = logActivity;

// ── DEAL INTERACTIONS (persistencia) ──────────────────────────────
async function saveInteraction(dealId,type,content,meta,parentId){
  const sb=_sb(); if(!sb) return null;
  const opId=getOperatorId(); if(!opId) return null;
  const {data}=await sb.from('deal_interactions').insert({
    deal_id:dealId, operator_id:opId, interaction_type:type,
    content:content||'', metadata:meta||{}, parent_id:parentId||null
  }).select('id').single();
  // Atualiza last_interaction_at no deals
  sb.from('deals').update({last_interaction_at:new Date().toISOString()})
    .eq('deal_id',dealId).eq('operator_email',getOperatorId()).then(()=>{});
  return data?data.id:null;
}
window.saveInteraction = saveInteraction;

async function loadInteractions(dealId,targetId){
  const sb=_sb(); if(!sb) return;
  const opId=getOperatorId(); if(!opId) return;
  const {data}=await sb.from('deal_interactions')
    .select('*').eq('deal_id',dealId).eq('operator_id',opId)
    .order('created_at',{ascending:false}).limit(20);
  if(!data||!data.length) return;
  _renderTimeline(targetId,data);
  // Restaura cache de analises
  const cache=window.ELUCY_CACHE||{};
  for(const i of data){
    if(i.interaction_type==='analysis'&&!cache[dealId]){
      cache[dealId]=i.content;
    }
  }
}
window.loadInteractions = loadInteractions;

function _renderTimeline(targetId,interactions){
  let tl=document.getElementById('timeline-'+targetId);
  if(!tl){
    const parent=document.getElementById('deal-'+targetId); if(!parent) return;
    tl=document.createElement('div');
    tl.id='timeline-'+targetId;
    tl.className='card';
    tl.style.cssText='max-height:300px;overflow-y:auto;';
    parent.appendChild(tl);
  }
  const ic={analysis:'📊',copy:'📝',brief:'📋',dm:'💬',correction:'🔄',dvl_confirmed:'✅',note_crm:'📌',whatsapp_sent:'📱',enrichment:'🔍'};
  const lb={analysis:'Analise',copy:'Copy',brief:'Briefing',dm:'DM',correction:'Correcao',dvl_confirmed:'DVL',note_crm:'Nota CRM',whatsapp_sent:'WhatsApp',enrichment:'Enrichment'};
  tl.innerHTML='<div class="sec-t" style="margin-bottom:10px">Historico de Interacoes</div>'+
    interactions.map(i=>{
      const dt=new Date(i.created_at);
      const tm=dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      const dd=dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
      const icon=ic[i.interaction_type]||'📎';
      const label=lb[i.interaction_type]||i.interaction_type;
      const pv=(i.content||'').slice(0,120).replace(/\n/g,' ');
      return '<div style="padding:8px 10px;border-left:2px solid var(--border2);margin-left:8px;margin-bottom:6px">'
        +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">'
        +'<span>'+icon+'</span>'
        +'<span style="font-size:11px;font-weight:700;color:var(--accent2)">'+label+'</span>'
        +'<span style="font-size:10px;color:var(--text2);margin-left:auto">'+dd+' '+tm+'</span>'
        +'</div>'
        +'<div style="font-size:11px;color:var(--text2);line-height:1.4">'+_escHtml(pv)+(pv.length>=120?'…':'')+'</div>'
        +'</div>';
    }).join('');
}

// ── PATCHING requestElucyAnalysis & requestElucyCopy ──────────────
// Wraps existing functions to add Supabase INSERT

const _origAnalysis = window.requestElucyAnalysis;
const _origCopy = window.requestElucyCopy;

window.requestElucyAnalysis = function(deal_id, dealData, targetId){
  // INSERT no Supabase cockpit_requests
  const sb=_sb();
  if(sb){
    const opId=getOperatorId();
    sb.from('cockpit_requests').insert({
      operator_id:opId, deal_id:deal_id, request_type:'analyze',
      deal_data:dealData||{}, status:'pending'
    }).then(({error})=>{
      if(error) console.warn('cockpit_requests insert:',error);
      else if(window.showSyncToast) window.showSyncToast('ok','Analise enviada. Voce sera notificado.');
    });
    logActivity('analysis_generated',deal_id);
  }
  // Chama original (postMessage)
  if(_origAnalysis) _origAnalysis(deal_id, dealData, targetId);
};

window.requestElucyCopy = function(deal_id, dealData, targetId, canal){
  const sb=_sb();
  if(sb){
    const opId=getOperatorId();
    sb.from('cockpit_requests').insert({
      operator_id:opId, deal_id:deal_id, request_type:'copy',
      copy_mode:canal||'whatsapp', deal_data:dealData||{}, status:'pending'
    }).then(({error})=>{
      if(error) console.warn('cockpit_requests insert:',error);
      else if(window.showSyncToast) window.showSyncToast('ok','Copy enviada para geracao. Voce sera notificado.');
    });
    logActivity('copy_generated',deal_id,{canal:canal||'whatsapp'});
  }
  if(_origCopy) _origCopy(deal_id, dealData, targetId, canal);
};

// ── CHAT DE CORRECAO (max 3 tentativas) ───────────────────────────
async function requestCorrection(deal_id,targetId,correctionText,parentRequestId,correctionNumber){
  if(correctionNumber>=3){
    if(window.showSyncToast) window.showSyncToast('err','Limite de 3 correcoes atingido.');
    return;
  }
  const sb=_sb(); if(!sb) return;
  const opId=getOperatorId();
  const {data,error}=await sb.from('cockpit_requests').insert({
    operator_id:opId, deal_id:deal_id, request_type:'copy', deal_data:{}, status:'pending',
    parent_request_id:parentRequestId||null,
    correction_text:correctionText,
    correction_number:(correctionNumber||0)+1
  }).select('id').single();
  if(error){
    if(window.showSyncToast) window.showSyncToast('err','Erro ao enviar correcao.');
    return;
  }
  if(window.showSyncToast) window.showSyncToast('ok','Correcao #'+((correctionNumber||0)+1)+' enviada.');
  logActivity('correction_requested',deal_id,{n:(correctionNumber||0)+1});
  saveInteraction(deal_id,'correction',correctionText);
  // Atualiza UI
  const wa=document.getElementById('ct-'+targetId+'-wa');
  if(wa) wa.textContent='Elucy processando correcao #'+((correctionNumber||0)+1)+'…';
  // Salva request_id para encadear proxima correcao
  if(data&&data.id){
    const ci=document.getElementById('correction-input-'+targetId);
    if(ci){
      ci.dataset.parentRequestId=data.id;
      ci.dataset.correctionNumber=String((correctionNumber||0)+1);
    }
  }
}
window.requestCorrection = requestCorrection;

// ── PATCHING selectLiveDeal — injeta chat de correcao + carrega historico ──

const _origSelectLiveDeal = window.selectLiveDeal;
window.selectLiveDeal = function(id, d){
  if(_origSelectLiveDeal) _origSelectLiveDeal(id, d);
  // Log atividade de abertura
  logActivity('deal_opened', d.deal_id||id);
  // Injeta campo de correcao na area de copy
  setTimeout(()=>{
    const co=document.getElementById('co-'+id);
    if(co && !document.getElementById('correction-input-'+id)){
      const chatDiv=document.createElement('div');
      chatDiv.style.cssText='padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:6px;align-items:center;';
      chatDiv.innerHTML='<input id="correction-input-'+id+'" type="text" class="srch" placeholder="Instrucao de correcao (max 3)…" data-parent-request-id="" data-correction-number="0" style="flex:1">'
        +'<button class="btn bp btn-sm" onclick="window._submitCorrection(\''+id+'\')">Corrigir</button>';
      co.appendChild(chatDiv);
    }
    // Carrega historico de interacoes
    if(d.deal_id) loadInteractions(d.deal_id, id);
  },300);
};

window._submitCorrection = function(targetId){
  const input=document.getElementById('correction-input-'+targetId);
  if(!input||!input.value.trim()) return;
  const deal=window._COCKPIT_DEAL_MAP&&window._COCKPIT_DEAL_MAP[targetId];
  const dealId=deal?deal.deal_id:targetId;
  const parentId=input.dataset.parentRequestId||null;
  const corrNum=parseInt(input.dataset.correctionNumber)||0;
  requestCorrection(dealId, targetId, input.value.trim(), parentId, corrNum);
  input.value='';
};

// ── PATCHING clip() — registra atividade de copia ─────────────────
const _origClip = window.clip;
window.clip = function(elId){
  if(_origClip) _origClip(elId);
  // Detecta tipo de copia
  if(elId&&elId.includes('-wa')) logActivity('copy_copied',null,{canal:'whatsapp'});
  else if(elId&&elId.includes('-crm')) logActivity('note_crm_copied',null,{canal:'crm'});
  else if(elId&&elId.includes('dmc-')) logActivity('dm_copied',null,{canal:'dm'});
};

// ── PATCHING confirmDVL — registra atividade ──────────────────────
const _origDVL = window.confirmDVL;
window.confirmDVL = function(id){
  logActivity('dvl_confirmed',id);
  const deal=window._COCKPIT_DEAL_MAP&&window._COCKPIT_DEAL_MAP[id];
  if(deal&&deal.deal_id) saveInteraction(deal.deal_id,'dvl_confirmed','');
  if(_origDVL) _origDVL(id);
};

// ── PATCHING showCockpit — inicia Realtime apos login ─────────────
const _origShowCockpit = window.showCockpit;
window.showCockpit = function(user){
  if(_origShowCockpit) _origShowCockpit(user);
  // Resolve operator_id do Supabase
  const sb=_sb();
  if(sb&&user&&user.email){
    sb.from('operators').select('id').eq('email',user.email).maybeSingle().then(({data})=>{
      if(data&&data.id) window._operatorId=data.id;
      initRealtimeListeners();
    });
  }
};

// ── SOCIAL DM WAR ROOM — Pipeline no Supabase ────────────────────
async function createSocialDMLead(handle,leadName,platform,founderPersona){
  const sb=_sb(); if(!sb) return null;
  const opId=getOperatorId(); if(!opId) return null;
  const {data,error}=await sb.from('social_dm_leads').insert({
    operator_id:opId, lead_handle:handle, lead_name:leadName||'',
    platform:platform||'instagram', founder_persona:founderPersona||null,
    status:'identified'
  }).select('id').single();
  if(error){console.warn('social_dm_leads insert:',error);return null;}
  logActivity('dm_generated',null,{handle:handle,platform:platform});
  return data?data.id:null;
}
window.createSocialDMLead = createSocialDMLead;

async function updateSocialDMStatus(leadId,newStatus,dealId){
  const sb=_sb(); if(!sb) return;
  const update={status:newStatus,last_interaction_at:new Date().toISOString()};
  if(dealId) update.deal_id=dealId;
  await sb.from('social_dm_leads').update(update).eq('id',leadId);
}
window.updateSocialDMStatus = updateSocialDMStatus;

async function loadSocialDMPipeline(){
  const sb=_sb(); if(!sb) return [];
  const opId=getOperatorId(); if(!opId) return [];
  const {data}=await sb.from('social_dm_leads')
    .select('*').eq('operator_id',opId)
    .order('created_at',{ascending:false}).limit(100);
  return data||[];
}
window.loadSocialDMPipeline = loadSocialDMPipeline;

// ── PATCHING startCap (DM Assist) — registra no Supabase ─────────
const _origStartCap = window.startCap;
window.startCap = function(id){
  // Busca founder selecionado
  const fbb=document.querySelector('.fbb.on');
  const founder=fbb?fbb.textContent.trim().toLowerCase():'tallis';
  const deal=window._COCKPIT_DEAL_MAP&&window._COCKPIT_DEAL_MAP[id];
  const handle=deal?(deal.emailLead||deal.nome||id):'unknown';
  createSocialDMLead(handle,deal?deal.nome:'',deal?deal.canal:'instagram',founder);
  if(_origStartCap) _origStartCap(id);
};

// ── REPORTS — Metricas reais do activity_log ──────────────────────
async function loadRealMetrics(periodDays){
  const sb=_sb(); if(!sb) return null;
  const opId=getOperatorId(); if(!opId) return null;
  const since=new Date();
  since.setDate(since.getDate()-(periodDays||30));
  const {data}=await sb.from('activity_log')
    .select('activity_type,deal_id,created_at')
    .eq('operator_id',opId)
    .gte('created_at',since.toISOString())
    .order('created_at',{ascending:false})
    .limit(1000);
  if(!data) return null;

  const metrics={
    fups: data.filter(a=>['copy_generated','copy_sent_wa','copy_sent_ig'].includes(a.activity_type)).length,
    analyses: data.filter(a=>a.activity_type==='analysis_generated').length,
    copies: data.filter(a=>a.activity_type==='copy_generated').length,
    copies_copied: data.filter(a=>a.activity_type==='copy_copied').length,
    dvl_confirmed: data.filter(a=>a.activity_type==='dvl_confirmed').length,
    dms: data.filter(a=>['dm_generated','dm_copied'].includes(a.activity_type)).length,
    corrections: data.filter(a=>a.activity_type==='correction_requested').length,
    deals_opened: data.filter(a=>a.activity_type==='deal_opened').length,
    notes: data.filter(a=>a.activity_type==='note_crm_copied').length,
    enrichments: data.filter(a=>a.activity_type==='enrichment_added').length,
    total: data.length,
    unique_deals: new Set(data.filter(a=>a.deal_id).map(a=>a.deal_id)).size,
    by_day: {}
  };

  // Agrupa por dia
  for(const a of data){
    const day=a.created_at.slice(0,10);
    if(!metrics.by_day[day]) metrics.by_day[day]={total:0,types:{}};
    metrics.by_day[day].total++;
    metrics.by_day[day].types[a.activity_type]=(metrics.by_day[day].types[a.activity_type]||0)+1;
  }

  return metrics;
}
window.loadRealMetrics = loadRealMetrics;

// ── INIT ──────────────────────────────────────────────────────────
// Se ja tem user autenticado, inicia listeners
if(window._currentUser){
  setTimeout(initRealtimeListeners,500);
}

// ── SIDEBAR "HOJE" — Atualiza com dados reais do activity_log ─────
async function updateTodayStats(){
  const sb=_sb(); if(!sb) return;
  const opId=getOperatorId(); if(!opId) return;
  const today=new Date();
  today.setHours(0,0,0,0);
  const {data}=await sb.from('activity_log')
    .select('activity_type')
    .eq('operator_id',opId)
    .gte('created_at',today.toISOString());
  if(!data) return;
  const fups=data.filter(a=>['copy_generated','copy_sent_wa','copy_sent_ig'].includes(a.activity_type)).length;
  const deals=data.filter(a=>a.activity_type==='deal_opened').length;
  const qual=data.filter(a=>['analysis_generated','dvl_confirmed'].includes(a.activity_type)).length;
  const hand=data.filter(a=>a.activity_type==='copy_sent_wa').length;
  const el1=document.getElementById('hoje-fups'); if(el1) el1.textContent=fups;
  const el2=document.getElementById('hoje-deals'); if(el2) el2.textContent=deals;
  const el3=document.getElementById('hoje-qual'); if(el3) el3.textContent=qual;
  const el4=document.getElementById('hoje-hand'); if(el4) el4.textContent=hand;
  // Meta diaria
  const mf=document.getElementById('meta-fups-v'); if(mf) mf.textContent=fups+' / 15';
  const mfb=document.getElementById('meta-fups-bar'); if(mfb) mfb.style.width=Math.min(100,Math.round(fups/15*100))+'%';
  const mq=document.getElementById('meta-qual-v'); if(mq) mq.textContent=qual+' / 5';
  const mqb=document.getElementById('meta-qual-bar'); if(mqb) mqb.style.width=Math.min(100,Math.round(qual/5*100))+'%';
  const mh=document.getElementById('meta-hand-v'); if(mh) mh.textContent=hand+' / 2';
  const mhb=document.getElementById('meta-hand-bar'); if(mhb) mhb.style.width=Math.min(100,Math.round(hand/2*100))+'%';
}
window.updateTodayStats = updateTodayStats;

// Atualiza a cada 60s
setInterval(()=>{ if(getOperatorId()) updateTodayStats(); },60000);
// Primeira carga
setTimeout(()=>{ if(getOperatorId()) updateTodayStats(); },2000);

console.log('[cockpit-engine] Elucy Cockpit Engine loaded — Supabase Realtime, Activity Log, Persistencia, Correcao, Social DM');

})();
