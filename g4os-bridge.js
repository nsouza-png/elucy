// ── ELUCY G4 OS BRIDGE ─────────────────────────────────────────────────
// Este script é injetado pelo G4 OS no browser integrado via preload.
// Escuta postMessage do Cockpit Elucy e processa com o LLM local.
//
// Protocolo:
//   Cockpit → G4 OS:  {type:'elucy:ping'}
//   G4 OS → Cockpit:  {type:'g4os:pong'}
//
//   Cockpit → G4 OS:  {type:'elucy:llm_request', id, prompt, system}
//   G4 OS → Cockpit:  {type:'elucy:llm_response', id, output}
//   G4 OS → Cockpit:  {type:'elucy:llm_response', id, error}
//
// Instalação no G4 OS:
//   O SDR cola o playbook no chat do G4 OS. O G4 OS:
//   1. Salva este script em ~/.g4os-public/bridge/elucy-bridge.js
//   2. Registra como preload script para o domínio nsouza-png.github.io
//   3. Responde heartbeat + processa LLM requests automaticamente
// ─────────────────────────────────────────────────────────────────────────

(function(){
  'use strict';

  // Responde ping do Cockpit
  var ALLOWED_ORIGINS = ['https://nsouza-png.github.io', 'null']; // null = local file://

  window.addEventListener('message', function(e){
    if(!e.data || !e.data.type) return;
    // Validate origin — only accept messages from known Elucy domains or local
    if(e.origin && e.origin !== 'null' && ALLOWED_ORIGINS.indexOf(e.origin) === -1) return;

    // PING → PONG (heartbeat)
    if(e.data.type === 'elucy:ping'){
      e.source.postMessage({type: 'g4os:pong'}, e.origin);
      return;
    }

    // LLM REQUEST → processa e responde
    if(e.data.type === 'elucy:llm_request'){
      var id = e.data.id;
      var prompt = e.data.prompt;
      var system = e.data.system || '';
      var source = e.source;
      var origin = e.origin;

      // Chama o LLM do G4 OS via call_llm (exposto pelo SDK)
      _elucyCallLLM(prompt, system)
        .then(function(output){
          source.postMessage({type:'elucy:llm_response', id:id, output:output}, origin);
        })
        .catch(function(err){
          source.postMessage({type:'elucy:llm_response', id:id, error:err.message||String(err)}, origin);
        });
      return;
    }
  });

  // Envia heartbeat a cada 30s para manter status "conectado" no Cockpit
  setInterval(function(){
    try{
      var frames = document.querySelectorAll('iframe, webview');
      frames.forEach(function(f){
        try{ f.contentWindow.postMessage({type:'g4os:heartbeat'}, '*'); }catch(ex){}
      });
      // Também para o próprio window (caso seja a mesma janela)
      window.postMessage({type:'g4os:heartbeat'}, '*');
    }catch(ex){}
  }, 30000);

  // ── LLM CALL ──────────────────────────────────────────────────────────
  // Detecta qual API de LLM está disponível no G4 OS e usa a melhor opção.
  //
  // Ordem de prioridade:
  // 1. window.__g4os_call_llm (SDK nativo do G4 OS — injeta via contextBridge)
  // 2. window.browserToolbar.callLLM (API do browser integrado)
  // 3. fetch para /api/llm (servidor local do G4 OS em localhost)
  // 4. Fallback: Supabase Edge Function (último recurso)

  function _elucyCallLLM(prompt, system){
    // 1. SDK nativo
    if(typeof window.__g4os_call_llm === 'function'){
      return window.__g4os_call_llm({prompt:prompt, system:system});
    }

    // 2. browserToolbar API
    if(window.browserToolbar && typeof window.browserToolbar.callLLM === 'function'){
      return window.browserToolbar.callLLM({prompt:prompt, system:system});
    }

    // 3. Servidor local G4 OS
    return fetch('http://localhost:3456/api/llm', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        prompt: prompt,
        system: system,
        model: 'default',
        max_tokens: 4096
      })
    })
    .then(function(r){
      if(!r.ok) throw new Error('LLM local HTTP '+r.status);
      return r.json();
    })
    .then(function(data){
      return data.output || data.text || data.content || JSON.stringify(data);
    });
  }

  // Anuncia presença ao carregar
  console.log('[Elucy Bridge] G4 OS bridge ativo — escutando requests do Cockpit');
  window.postMessage({type:'g4os:pong'}, '*');

})();
