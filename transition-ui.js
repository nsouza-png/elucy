/* ════════════════════════════════════════════════════════════
   ELUCY TRANSITION UI v1.0
   Pipeline D1 -> D2 — Transition Management Module
   ════════════════════════════════════════════════════════════ */

// ── Transition Map: valid next stages from each stage ──
const TRANSITION_MAP = {
  'Novo Lead': ['Dia 01'],
  'Dia 01': ['Dia 02', 'Conectados'],
  'Dia 02': ['Dia 03', 'Conectados'],
  'Dia 03': ['Dia 04', 'Conectados'],
  'Dia 04': ['Dia 05', 'Conectados'],
  'Dia 05': ['Dia 06', 'Conectados'],
  'Dia 06': ['Conectados'],
  'Conectados': ['Agendamento'],
  'Agendamento': ['Entrevista Agendada', 'Reagendamento'],
  'Reagendamento': ['Entrevista Agendada'],
  'Entrevista Agendada': ['Fechamento']
};

// ── Gate Labels (Black Box Protocol — human-friendly) ──
const GATE_LABELS = {
  contact_initiated: {
    label: 'Primeiro contato realizado',
    action: 'Realize uma ligacao ou envie mensagem no WhatsApp'
  },
  bidirectional_response: {
    label: 'Resposta do lead confirmada',
    action: 'Aguarde o lead responder antes de avancar'
  },
  meeting_proposed: {
    label: 'Reuniao proposta',
    action: 'Proponha uma data e horario para conversa'
  },
  invite_accepted: {
    label: 'Convite aceito',
    action: 'Confirme que o lead aceitou o convite'
  },
  no_show_or_reschedule: {
    label: 'No-show ou reagendamento',
    action: 'Registre que o lead nao compareceu'
  },
  dqi_gte_4: {
    label: 'Qualidade dos dados suficiente',
    action: 'Complete os campos obrigatorios do deal'
  },
  spiced_complete: {
    label: 'Diagnostico completo',
    action: 'Preencha todos os campos do SPICED'
  },
  handoff_approved: {
    label: 'Handoff aprovado',
    action: 'Solicite aprovacao do gerente para handoff'
  },
  reactivation_post_silence: {
    label: 'Periodo de silencio confirmado',
    action: 'Lead precisa ter 7+ dias sem contato'
  },
  double_no_show: {
    label: 'Dois no-shows confirmados',
    action: 'Registre os no-shows no sistema'
  },
  cold_reentry_30d: {
    label: 'Reentrada apos 30 dias',
    action: 'Lead precisa ter 30+ dias inativo'
  }
};

// ── Kill Switch Labels (Black Box Protocol) ──
const KILL_SWITCH_LABELS = {
  premature_close: 'Complete todas as etapas anteriores antes de avancar para fechamento',
  authority_missing: 'Identifique o decisor antes de avancar',
  spiced_lock_titan: 'Use a abordagem Challenger para este perfil de empresa',
  tier_mismatch: 'Este produto nao esta disponivel para o porte desta empresa',
  no_motivo_lost: 'Selecione o motivo da perda antes de confirmar',
  undefined_revenue_line: 'Defina o produto vendido antes de concluir esta venda',
  framework_violation: 'Ajuste a abordagem ao perfil do lead',
  pseudo_champion: 'Confirme que o contato tem poder de decisao real'
};

// ── Post-Handoff stages (closer manages, SDR cannot advance) ──
const POST_HANDOFF_ETAPAS = ['fechamento', 'negociacao', 'nova oportunidade', 'self checkout'];

// ── Lost reasons ──
const LOST_REASONS = [
  { value: 'sem_retorno', label: 'Sem retorno' },
  { value: 'concorrente', label: 'Concorrente' },
  { value: 'sem_orcamento', label: 'Sem orcamento' },
  { value: 'timing_inadequado', label: 'Timing inadequado' },
  { value: 'nao_qualificado', label: 'Nao qualificado' },
  { value: 'outro', label: 'Outro' }
];


/* ════════════════════════════════════════════════════════════
   RENDER: Transition Button
   ════════════════════════════════════════════════════════════ */

/**
 * Renders "Avancar Etapa" button on deal detail card.
 * @param {Object} deal - Deal object with etapa_atual_no_pipeline, signal, deal_id
 * @returns {HTMLElement|null} - Container with transition buttons, or null
 */
function renderTransitionButton(deal) {
  if (!deal || !deal.etapa_atual_no_pipeline) return null;

  const currentStage = deal.etapa_atual_no_pipeline;

  // Post-handoff: closer manages — do not render
  if (POST_HANDOFF_ETAPAS.includes(currentStage.toLowerCase())) return null;

  const nextStages = TRANSITION_MAP[currentStage];
  if (!nextStages || nextStages.length === 0) return null;

  const container = document.createElement('div');
  container.className = 'transition-btn-group';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', 'Acoes de transicao do deal');

  // Primary target is first valid next stage
  const primaryTarget = nextStages[0];
  const isDome = (deal._signal || deal.signal) === 'DOME';

  // Advance button
  const advBtn = document.createElement('button');
  advBtn.className = 'transition-btn';
  advBtn.type = 'button';
  advBtn.disabled = isDome;
  advBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
    <span>Avancar para ${_escHtml(primaryTarget)}</span>
  `;

  if (isDome) {
    advBtn.setAttribute('aria-disabled', 'true');
    advBtn.setAttribute('title', 'Deal em Iron Dome \u2014 revisao manual necessaria');
    // Tooltip wrapper
    const tooltip = document.createElement('span');
    tooltip.className = 'transition-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = 'Deal em Iron Dome \u2014 revisao manual necessaria';
    advBtn.style.position = 'relative';
    advBtn.appendChild(tooltip);
  } else {
    advBtn.addEventListener('click', function () {
      openTransitionModal(deal.deal_id, currentStage, primaryTarget);
    });
  }

  container.appendChild(advBtn);

  // If multiple next stages, add secondary advance options
  if (nextStages.length > 1) {
    for (let i = 1; i < nextStages.length; i++) {
      const altBtn = document.createElement('button');
      altBtn.className = 'transition-btn transition-btn-alt';
      altBtn.type = 'button';
      altBtn.disabled = isDome;
      altBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        <span>${_escHtml(nextStages[i])}</span>
      `;
      if (!isDome) {
        const target = nextStages[i];
        altBtn.addEventListener('click', function () {
          openTransitionModal(deal.deal_id, currentStage, target);
        });
      }
      container.appendChild(altBtn);
    }
  }

  // Lost button
  const lostBtn = document.createElement('button');
  lostBtn.className = 'transition-btn-lost';
  lostBtn.type = 'button';
  lostBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
    <span>Marcar como Perdido</span>
  `;
  lostBtn.addEventListener('click', function () {
    openLostModal(deal.deal_id);
  });

  container.appendChild(lostBtn);

  return container;
}


/* ════════════════════════════════════════════════════════════
   MODAL: Transition (Advance Stage)
   ════════════════════════════════════════════════════════════ */

/**
 * Opens transition modal with gate validation.
 * @param {string} dealId
 * @param {string} fromStage
 * @param {string} toStage
 */
function openTransitionModal(dealId, fromStage, toStage) {
  // Remove existing modal if any
  _removeModal('transition-modal-overlay');

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'transition-modal-overlay';
  overlay.className = 'transition-overlay';
  overlay.setAttribute('role', 'presentation');
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) _closeTransitionModal();
  });

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'transition-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'transition-modal-title');

  // Header
  modal.innerHTML = `
    <div class="transition-modal-header">
      <div class="transition-modal-direction">
        <svg width="20" height="20" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
      <h2 id="transition-modal-title" class="transition-modal-title">
        Avancar: ${_escHtml(fromStage)} &rarr; ${_escHtml(toStage)}
      </h2>
      <button class="transition-modal-close" type="button" aria-label="Fechar modal">
        <svg width="18" height="18" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div class="transition-modal-body" id="transition-gates-container">
      ${_renderGateSkeletons(3)}
    </div>
    <div class="transition-modal-footer" id="transition-modal-footer">
      <div class="transition-footer-msg" id="transition-footer-msg"></div>
      <div class="gate-actions">
        <button class="transition-btn-cancel" type="button">Cancelar</button>
        <button class="transition-btn-confirm" type="button" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Confirmar Avanco
        </button>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Focus trap setup
  const closeBtn = modal.querySelector('.transition-modal-close');
  const cancelBtn = modal.querySelector('.transition-btn-cancel');
  const confirmBtn = modal.querySelector('.transition-btn-confirm');

  closeBtn.addEventListener('click', _closeTransitionModal);
  cancelBtn.addEventListener('click', _closeTransitionModal);

  // Keyboard: Escape closes
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      _closeTransitionModal();
      return;
    }
    // Focus trap
    if (e.key === 'Tab') {
      const focusable = modal.querySelectorAll('button:not([disabled]), [tabindex="0"]');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Animate in
  requestAnimationFrame(function () {
    overlay.classList.add('visible');
  });

  // Focus first interactive element
  closeBtn.focus();

  // Fetch gate validation from edge function
  _fetchGateValidation(dealId, fromStage, toStage).then(function (result) {
    const gatesContainer = document.getElementById('transition-gates-container');
    const footerMsg = document.getElementById('transition-footer-msg');

    if (!result || result.error) {
      gatesContainer.innerHTML = _renderGateError(result ? result.error : 'Erro de conexao');
      return;
    }

    // Render gates
    let gatesHtml = '';
    const gates = result.gates || [];
    const killSwitches = result.kill_switches || [];

    gates.forEach(function (gate) {
      gatesHtml += renderGateItem(gate);
    });

    // Render kill switches as failed gates
    killSwitches.forEach(function (ks) {
      gatesHtml += renderGateItem({
        name: ks,
        passed: false,
        detail: KILL_SWITCH_LABELS[ks] || 'Requisito nao atendido',
        action: KILL_SWITCH_LABELS[ks] || 'Resolva este requisito antes de avancar'
      });
    });

    if (gatesHtml === '') {
      gatesHtml = '<div class="gate-item passed"><span class="gate-icon" aria-hidden="true">&#10003;</span><span class="gate-text">Nenhum requisito adicional necessario</span></div>';
    }

    gatesContainer.innerHTML = gatesHtml;

    // Check if all gates passed
    const allPassed = result.valid === true;

    if (allPassed) {
      confirmBtn.disabled = false;
      confirmBtn.addEventListener('click', function () {
        handleTransitionConfirm(dealId, fromStage, toStage);
      });
      footerMsg.textContent = '';
    } else {
      confirmBtn.disabled = true;
      footerMsg.textContent = 'Resolva os itens em vermelho antes de avancar';
      footerMsg.className = 'transition-footer-msg warn';
    }
  });
}


/* ════════════════════════════════════════════════════════════
   MODAL: Mark as Lost
   ════════════════════════════════════════════════════════════ */

/**
 * Opens the Lost modal with reason selection.
 * @param {string} dealId
 */
function openLostModal(dealId) {
  _removeModal('lost-modal-overlay');

  const overlay = document.createElement('div');
  overlay.id = 'lost-modal-overlay';
  overlay.className = 'transition-overlay';
  overlay.setAttribute('role', 'presentation');
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) _closeLostModal();
  });

  const modal = document.createElement('div');
  modal.className = 'transition-modal transition-modal-lost';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'lost-modal-title');

  // Build reason options
  let optionsHtml = '<option value="" disabled selected>Selecione o motivo...</option>';
  LOST_REASONS.forEach(function (r) {
    optionsHtml += `<option value="${r.value}">${_escHtml(r.label)}</option>`;
  });

  modal.innerHTML = `
    <div class="transition-modal-header lost-header">
      <div class="transition-modal-direction lost-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </div>
      <h2 id="lost-modal-title" class="transition-modal-title">Marcar como Perdido</h2>
      <button class="transition-modal-close" type="button" aria-label="Fechar modal">
        <svg width="18" height="18" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div class="transition-modal-body">
      <div class="lost-field">
        <label for="lost-reason-select" class="lost-label">Motivo da perda <span class="lost-required">*</span></label>
        <select id="lost-reason-select" class="lost-select" required>
          ${optionsHtml}
        </select>
      </div>
      <div class="lost-field lost-field-other" id="lost-other-field" style="display:none">
        <label for="lost-other-input" class="lost-label">Especifique o motivo</label>
        <input type="text" id="lost-other-input" class="lost-input" placeholder="Descreva o motivo..." maxlength="200" />
      </div>
      <div class="lost-field">
        <label for="lost-notes" class="lost-label">Notas adicionais <span class="lost-optional">(opcional)</span></label>
        <textarea id="lost-notes" class="lost-textarea" rows="3" placeholder="Alguma observacao sobre esta perda..." maxlength="500"></textarea>
      </div>
    </div>
    <div class="transition-modal-footer">
      <div class="gate-actions">
        <button class="transition-btn-cancel" type="button">Cancelar</button>
        <button class="transition-btn-lost-confirm" type="button" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Confirmar Perda
        </button>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Bindings
  const closeBtn = modal.querySelector('.transition-modal-close');
  const cancelBtn = modal.querySelector('.transition-btn-cancel');
  const confirmBtn = modal.querySelector('.transition-btn-lost-confirm');
  const reasonSelect = modal.querySelector('#lost-reason-select');
  const otherField = modal.querySelector('#lost-other-field');
  const otherInput = modal.querySelector('#lost-other-input');

  closeBtn.addEventListener('click', _closeLostModal);
  cancelBtn.addEventListener('click', _closeLostModal);

  reasonSelect.addEventListener('change', function () {
    const val = reasonSelect.value;
    if (val === 'outro') {
      otherField.style.display = 'block';
      otherInput.focus();
    } else {
      otherField.style.display = 'none';
    }
    confirmBtn.disabled = !val;
  });

  confirmBtn.addEventListener('click', function () {
    let motivo = reasonSelect.value;
    if (motivo === 'outro') {
      motivo = otherInput.value.trim() || 'Outro (sem detalhe)';
    } else {
      const opt = LOST_REASONS.find(function (r) { return r.value === motivo; });
      motivo = opt ? opt.label : motivo;
    }
    const notas = modal.querySelector('#lost-notes').value.trim();
    handleLostConfirm(dealId, motivo, notas);
  });

  // Keyboard
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      _closeLostModal();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = modal.querySelectorAll('button:not([disabled]), select, input, textarea, [tabindex="0"]');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Animate in
  requestAnimationFrame(function () {
    overlay.classList.add('visible');
  });

  reasonSelect.focus();
}


/* ════════════════════════════════════════════════════════════
   RENDER: Gate Item
   ════════════════════════════════════════════════════════════ */

/**
 * Renders a single gate item row for the transition modal.
 * @param {Object} gate - { name, passed, detail, action }
 * @returns {string} HTML string
 */
function renderGateItem(gate) {
  const info = GATE_LABELS[gate.name] || { label: gate.name, action: '' };
  const label = info.label;
  const actionText = gate.action || info.action || '';

  if (gate.passed === true) {
    return `
      <div class="gate-item passed" role="listitem">
        <span class="gate-icon" aria-label="Aprovado">&#10003;</span>
        <div class="gate-content">
          <span class="gate-label">${_escHtml(label)}</span>
          ${gate.detail ? `<span class="gate-detail">${_escHtml(gate.detail)}</span>` : ''}
        </div>
      </div>`;
  }

  if (gate.passed === false) {
    return `
      <div class="gate-item failed" role="listitem">
        <span class="gate-icon" aria-label="Reprovado">&#10007;</span>
        <div class="gate-content">
          <span class="gate-label">${_escHtml(label)}</span>
          <span class="gate-action">${_escHtml(actionText)}</span>
        </div>
      </div>`;
  }

  // Pending state
  return `
    <div class="gate-item pending" role="listitem">
      <span class="gate-icon gate-spinner" aria-label="Verificando"></span>
      <div class="gate-content">
        <span class="gate-label">${_escHtml(label)}</span>
        <span class="gate-detail">Verificando...</span>
      </div>
    </div>`;
}


/* ════════════════════════════════════════════════════════════
   HANDLERS: Confirm Transition / Confirm Lost
   ════════════════════════════════════════════════════════════ */

/**
 * Handles transition confirmation after gates pass.
 * @param {string} dealId
 * @param {string} fromStage
 * @param {string} toStage
 */
async function handleTransitionConfirm(dealId, fromStage, toStage) {
  const confirmBtn = document.querySelector('.transition-btn-confirm');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="gate-spinner" aria-hidden="true"></span> Processando...';
  }

  try {
    const res = await _callTransitionValidator(dealId, fromStage, toStage, true);

    if (res && res.valid) {
      // Update deal in Supabase
      await _updateDealStage(dealId, toStage);

      _closeTransitionModal();
      _showToast('success', `Deal avancado para ${toStage}`);

      // Trigger re-render: reload deals from Supabase to reflect new state
      var opEmail = localStorage.getItem('elucy_operator_email');
      if (opEmail && typeof window.loadDealsFromSupabase === 'function') {
        window.loadDealsFromSupabase(opEmail);
      } else if (typeof window._refreshSidebar === 'function') {
        window._refreshSidebar();
      }
      // Dispatch custom event for other modules
      document.dispatchEvent(new CustomEvent('deal-transition', {
        detail: { dealId: dealId, from: fromStage, to: toStage, type: 'advance' }
      }));
    } else {
      const msg = (res && res.recommendation) ? res.recommendation : 'Nao foi possivel avancar o deal. Tente novamente.';
      _showToast('error', msg);
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Confirmar Avanco`;
      }
    }
  } catch (err) {
    console.error('[TransitionUI] Confirm error:', err);
    _showToast('error', 'Erro ao processar transicao. Verifique sua conexao.');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        Confirmar Avanco`;
    }
  }
}

/**
 * Handles marking a deal as Lost.
 * @param {string} dealId
 * @param {string} motivoLost
 * @param {string} notas
 */
async function handleLostConfirm(dealId, motivoLost, notas) {
  const confirmBtn = document.querySelector('.transition-btn-lost-confirm');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="gate-spinner" aria-hidden="true"></span> Processando...';
  }

  try {
    // Update deal status via Supabase
    await _updateDealLost(dealId, motivoLost, notas);

    // Log transition event via edge function
    await _callTransitionValidator(dealId, null, 'Perdido', true, {
      transition_type: 'lost',
      motivo_lost: motivoLost,
      notas: notas
    });

    _closeLostModal();
    _showToast('success', 'Deal marcado como Perdido');

    // Trigger re-render: reload deals from Supabase
    var opEmail2 = localStorage.getItem('elucy_operator_email');
    if (opEmail2 && typeof window.loadDealsFromSupabase === 'function') {
      window.loadDealsFromSupabase(opEmail2);
    } else if (typeof window._refreshSidebar === 'function') {
      window._refreshSidebar();
    }
    document.dispatchEvent(new CustomEvent('deal-transition', {
      detail: { dealId: dealId, from: null, to: 'Perdido', type: 'lost' }
    }));
  } catch (err) {
    console.error('[TransitionUI] Lost confirm error:', err);
    _showToast('error', 'Erro ao marcar deal como perdido. Tente novamente.');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
        Confirmar Perda`;
    }
  }
}


/* ════════════════════════════════════════════════════════════
   PRIVATE HELPERS
   ════════════════════════════════════════════════════════════ */

/** HTML escape */
function _escHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/** Remove modal by overlay id */
function _removeModal(id) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
}

/** Close transition modal with animation */
function _closeTransitionModal() {
  const overlay = document.getElementById('transition-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  overlay.addEventListener('transitionend', function () {
    overlay.remove();
  }, { once: true });
  // Fallback removal if transition doesn't fire
  setTimeout(function () {
    if (document.getElementById('transition-modal-overlay')) {
      overlay.remove();
    }
  }, 400);
}

/** Close lost modal with animation */
function _closeLostModal() {
  const overlay = document.getElementById('lost-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  overlay.addEventListener('transitionend', function () {
    overlay.remove();
  }, { once: true });
  setTimeout(function () {
    if (document.getElementById('lost-modal-overlay')) {
      overlay.remove();
    }
  }, 400);
}

/** Render skeleton loaders for gates */
function _renderGateSkeletons(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="gate-item pending" role="listitem">
        <span class="gate-icon gate-spinner" aria-hidden="true"></span>
        <div class="gate-content">
          <span class="gate-skeleton"></span>
          <span class="gate-skeleton short"></span>
        </div>
      </div>`;
  }
  return html;
}

/** Render error state in gates container */
function _renderGateError(msg) {
  return `
    <div class="gate-item failed" role="alert">
      <span class="gate-icon" aria-hidden="true">&#9888;</span>
      <div class="gate-content">
        <span class="gate-label">Erro ao verificar requisitos</span>
        <span class="gate-action">${_escHtml(msg || 'Tente novamente em alguns instantes')}</span>
      </div>
    </div>`;
}

/**
 * Fetch gate validation from transition-validator edge function.
 * @param {string} dealId
 * @param {string} fromStage
 * @param {string} toStage
 * @returns {Promise<Object>}
 */
async function _fetchGateValidation(dealId, fromStage, toStage) {
  try {
    return await _callTransitionValidator(dealId, fromStage, toStage, false);
  } catch (err) {
    console.error('[TransitionUI] Gate validation fetch error:', err);
    return { error: 'Falha na conexao com o servidor' };
  }
}

/**
 * Call the transition-validator edge function.
 * @param {string} dealId
 * @param {string} fromStage
 * @param {string} toStage
 * @param {boolean} confirmed - true to actually execute the transition
 * @param {Object} [extra] - extra fields (transition_type, motivo_lost, etc.)
 * @returns {Promise<Object>}
 */
async function _callTransitionValidator(dealId, fromStage, toStage, confirmed, extra) {
  // Supabase project URL and JWT from global config
  const supabaseUrl = window.ELUCY_SUPABASE_URL || '';
  const token = window.ELUCY_JWT || '';

  if (!supabaseUrl || !token) {
    throw new Error('Configuracao Supabase ausente');
  }

  const body = Object.assign({
    deal_id: dealId,
    from_stage: fromStage,
    to_stage: toStage,
    confirmed: !!confirmed
  }, extra || {});

  const resp = await fetch(supabaseUrl + '/functions/v1/transition-validator', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(function () { return 'Unknown error'; });
    throw new Error('HTTP ' + resp.status + ': ' + errText);
  }

  return await resp.json();
}

/**
 * Update deal stage in Supabase deals table.
 * @param {string} dealId
 * @param {string} newStage
 */
async function _updateDealStage(dealId, newStage) {
  const supabaseUrl = window.ELUCY_SUPABASE_URL || '';
  const token = window.ELUCY_JWT || '';

  if (!supabaseUrl || !token) throw new Error('Configuracao Supabase ausente');

  const resp = await fetch(supabaseUrl + '/rest/v1/deals?deal_id=eq.' + encodeURIComponent(dealId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'apikey': token,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ etapa_atual_no_pipeline: newStage })
  });

  if (!resp.ok) {
    throw new Error('Falha ao atualizar etapa do deal');
  }
}

/**
 * Update deal as Lost in Supabase.
 * @param {string} dealId
 * @param {string} motivoLost
 * @param {string} notas
 */
async function _updateDealLost(dealId, motivoLost, notas) {
  const supabaseUrl = window.ELUCY_SUPABASE_URL || '';
  const token = window.ELUCY_JWT || '';

  if (!supabaseUrl || !token) throw new Error('Configuracao Supabase ausente');

  const body = {
    status_do_deal: 'Perdido',
    motivo_lost: motivoLost
  };
  if (notas) body.notas_perda = notas;

  const resp = await fetch(supabaseUrl + '/rest/v1/deals?deal_id=eq.' + encodeURIComponent(dealId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'apikey': token,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    throw new Error('Falha ao marcar deal como perdido');
  }
}

/**
 * Show toast notification.
 * @param {'success'|'error'} type
 * @param {string} message
 */
function _showToast(type, message) {
  // Remove existing toast
  const existing = document.querySelector('.transition-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'transition-toast toast-' + type;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  const icon = type === 'success'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true"><path d="M12 9v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/></svg>';

  toast.innerHTML = icon + '<span>' + _escHtml(message) + '</span>';
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(function () {
    toast.classList.add('visible');
  });

  // Auto-dismiss after 3s
  setTimeout(function () {
    toast.classList.remove('visible');
    setTimeout(function () {
      if (toast.parentNode) toast.remove();
    }, 300);
  }, 3000);
}


/* ════════════════════════════════════════════════════════════
   PUBLIC API — expose to window for cockpit-engine.js
   ════════════════════════════════════════════════════════════ */

window.TransitionUI = {
  renderTransitionButton: renderTransitionButton,
  openTransitionModal: openTransitionModal,
  openLostModal: openLostModal,
  renderGateItem: renderGateItem,
  handleTransitionConfirm: handleTransitionConfirm,
  handleLostConfirm: handleLostConfirm,
  TRANSITION_MAP: TRANSITION_MAP,
  GATE_LABELS: GATE_LABELS,
  KILL_SWITCH_LABELS: KILL_SWITCH_LABELS
};
