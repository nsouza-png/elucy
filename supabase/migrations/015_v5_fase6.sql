-- =============================================================
-- ELUCY V5 — FASE 6: Taxonomy Registry (11 tabelas)
-- Data: 2026-03-25
-- =============================================================

-- -----------------------------------------------
-- 1. taxonomy_revenue_lines
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxonomy_revenue_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_slug TEXT NOT NULL UNIQUE,
  line_label TEXT NOT NULL,
  base_metric TEXT DEFAULT 'qualified',
  risk_after_days INT DEFAULT 3,
  line_weight NUMERIC(4,2) DEFAULT 1.0,
  match_rules JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.taxonomy_revenue_lines (line_slug, line_label, base_metric, risk_after_days, line_weight, match_rules) VALUES
('imersao','Imersao','qualified',3,1.0,'[{"field":"linhaReceita","contains":"imersao"}]'::jsonb),
('club','Club','opportunity',5,0.85,'[{"field":"linhaReceita","contains":"club"},{"field":"grupoReceita","contains":"club"}]'::jsonb),
('field_sales','Field Sales','meetings',7,0.9,'[{"field":"linhaReceita","contains":"field"},{"field":"canal","equals":"ligacao"}]'::jsonb),
('eventos','Eventos','qualified',5,0.8,'[{"field":"linhaReceita","contains":"evento"},{"field":"grupoReceita","contains":"evento"}]'::jsonb),
('digital','Digital','leads',3,0.7,'[{"field":"linhaReceita","contains":"digital"},{"field":"grupoReceita","contains":"digital"}]'::jsonb),
('social_dm','Social DM','touchpoints',1,0.75,'[{"field":"linhaReceita","contains":"social"},{"field":"utm_medium","in":["tallis","nardon","alfredo"]}]'::jsonb),
('outbound','Outbound','leads',3,0.65,'[{"field":"linhaReceita","contains":"outbound"}]'::jsonb),
('parceria','Parceria','qualified',7,0.8,'[{"field":"linhaReceita","contains":"parceria"},{"field":"grupoReceita","contains":"parceria"}]'::jsonb),
('consulting','Consulting','meetings',5,1.1,'[{"field":"linhaReceita","contains":"consulting"},{"field":"grupoReceita","contains":"consulting"}]'::jsonb)
ON CONFLICT (line_slug) DO NOTHING;

-- -----------------------------------------------
-- 2. taxonomy_stages
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxonomy_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_slug TEXT NOT NULL UNIQUE,
  stage_label TEXT NOT NULL,
  stage_order INT NOT NULL,
  probability NUMERIC(4,2) DEFAULT 0,
  is_terminal BOOLEAN DEFAULT false,
  stage_group TEXT DEFAULT 'prospecting',
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.taxonomy_stages (stage_slug, stage_label, stage_order, probability, is_terminal, stage_group) VALUES
('novo_lead','Novo Lead',0,0.08,false,'prospecting'),
('dia_01','Dia 01',1,0.12,false,'prospecting'),
('dia_02','Dia 02',2,0.10,false,'prospecting'),
('dia_03','Dia 03',3,0.08,false,'prospecting'),
('dia_04','Dia 04',4,0.06,false,'prospecting'),
('dia_05','Dia 05',5,0.05,false,'prospecting'),
('dia_06','Dia 06',6,0.04,false,'prospecting'),
('conectados','Conectados',7,0.20,false,'qualifying'),
('agendamento','Agendamento',8,0.45,false,'scheduling'),
('reagendamento','Reagendamento',9,0.38,false,'scheduling'),
('entrevista_agendada','Entrevista Agendada',10,0.55,false,'qualifying'),
('negociacao','Negociacao',11,0.65,false,'closing'),
('oportunidade','Oportunidade',12,0.80,false,'closing'),
('ganho','Ganho',13,1.0,true,'closed'),
('perdido','Perdido',14,0.0,true,'closed')
ON CONFLICT (stage_slug) DO NOTHING;

-- -----------------------------------------------
-- 3. taxonomy_personas
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxonomy_personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_slug TEXT NOT NULL UNIQUE,
  persona_label TEXT NOT NULL,
  tier_match TEXT[] DEFAULT '{}',
  framework TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.taxonomy_personas (persona_slug, persona_label, tier_match, framework, description) VALUES
('titan','Titan','{diamond,gold}','Challenger','CEO/fundador de empresa grande — desafia com insight, nunca vende'),
('builder','Builder','{silver}','SPICED','Empresario em crescimento — mapear dor e critical event'),
('executor','Executor','{bronze}','SPIN+Champion','Gestor operacional — perguntas situacionais + champion interno')
ON CONFLICT (persona_slug) DO NOTHING;

-- -----------------------------------------------
-- 4. taxonomy_frameworks
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxonomy_frameworks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  framework_slug TEXT NOT NULL UNIQUE,
  framework_label TEXT NOT NULL,
  persona_match TEXT[] DEFAULT '{}',
  description TEXT,
  key_techniques TEXT[],
  prohibited_with TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.taxonomy_frameworks (framework_slug, framework_label, persona_match, description, key_techniques, prohibited_with) VALUES
('challenger','Challenger','{titan}','Ensinar, personalizar, assumir controle — nunca pedir permissao','{teaching,tailoring,taking_control}','{spiced}'),
('spiced','SPICED','{builder}','Situation, Pain, Impact, Critical Event, Decision — mapear profundidade','{situation,pain,impact,critical_event,decision}','{challenger}'),
('spin_champion','SPIN+Champion','{executor}','Situation, Problem, Implication, Need-Payoff + identificar champion','{situation,problem,implication,need_payoff,champion_mapping}','{}'),
('founder_voice','Founder Voice','{titan,builder}','Tom de voz do founder — autoridade pessoal, sem institucional','{authority,personal_touch,cost_of_inaction}','{}')
ON CONFLICT (framework_slug) DO NOTHING;

-- -----------------------------------------------
-- 5. taxonomy_channels
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxonomy_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_slug TEXT NOT NULL UNIQUE,
  channel_label TEXT NOT NULL,
  channel_icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.taxonomy_channels (channel_slug, channel_label, channel_icon) VALUES
('whatsapp','WhatsApp','wa'),
('phone','Telefone','phone'),
('email','Email','mail'),
('instagram','Instagram','ig'),
('linkedin','LinkedIn','li'),
('twitter','Twitter/X','tw'),
('meet','Google Meet','meet'),
('zoom','Zoom','zoom'),
('presencial','Presencial','pin')
ON CONFLICT (channel_slug) DO NOTHING;

-- -----------------------------------------------
-- 6. taxonomy_signals
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxonomy_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_slug TEXT NOT NULL UNIQUE,
  signal_label TEXT NOT NULL,
  signal_level TEXT NOT NULL,
  severity INT DEFAULT 50,
  trigger_rules JSONB DEFAULT '{}',
  auto_action TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.taxonomy_signals (signal_slug, signal_label, signal_level, severity, trigger_rules, auto_action) VALUES
('dome','Iron Dome','DOME',100,'{"risk_state":"critical","aging_band":"critical"}'::jsonb,'escalate'),
('hot','Hot Signal','HOT',80,'{"temperature_score_gt":70}'::jsonb,'prioritize'),
('warm','Warm Signal','WARM',50,'{"temperature_score_gt":40}'::jsonb,null),
('neutral','Neutral','NEUTRAL',20,'{}'::jsonb,null),
('no_show','No-Show','DOME',90,'{"meeting_status":"no_show"}'::jsonb,'no_show_recovery'),
('ghost','Ghosting','HOT',75,'{"days_no_response_gt":5}'::jsonb,'reativacao'),
('engaged','High Engagement','HOT',70,'{"response_rate_gt":0.6}'::jsonb,'accelerate'),
('objection','Objection Detected','WARM',60,'{"last_sentiment":"objection"}'::jsonb,'handle_objection')
ON CONFLICT (signal_slug) DO NOTHING;

-- -----------------------------------------------
-- 7. taxonomy_touchpoints
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxonomy_touchpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  touchpoint_slug TEXT NOT NULL UNIQUE,
  touchpoint_label TEXT NOT NULL,
  channels TEXT[] DEFAULT '{}',
  default_weight NUMERIC(4,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.taxonomy_touchpoints (touchpoint_slug, touchpoint_label, channels, default_weight) VALUES
('outbound_call','Ligacao Outbound','{phone}',1.0),
('inbound_call','Ligacao Inbound','{phone}',1.2),
('whatsapp_msg','WhatsApp Mensagem','{whatsapp}',0.8),
('email_sent','Email Enviado','{email}',0.6),
('dm_sent','DM Enviada','{instagram,linkedin,twitter}',0.7),
('dm_reply','DM Resposta','{instagram,linkedin,twitter}',1.5),
('story_reaction','Story Reaction','{instagram}',0.3),
('meeting_scheduled','Reuniao Agendada','{meet,zoom,presencial}',2.0),
('meeting_completed','Reuniao Realizada','{meet,zoom,presencial}',3.0),
('proposal_sent','Proposta Enviada','{email,whatsapp}',2.5),
('contract_signed','Contrato Assinado','{email}',5.0)
ON CONFLICT (touchpoint_slug) DO NOTHING;

-- -----------------------------------------------
-- 8. taxonomy_rules
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxonomy_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_slug TEXT NOT NULL UNIQUE,
  rule_label TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'validation',
  condition_json JSONB NOT NULL DEFAULT '{}',
  action_json JSONB NOT NULL DEFAULT '{}',
  priority INT DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.taxonomy_rules (rule_slug, rule_label, rule_type, condition_json, action_json, priority) VALUES
('tier2_block_imersao','Tier 2 bloqueado de Imersao Presencial','kill_switch','{"tier":"in:silver,bronze","revenue_line":"imersao","subtype":"presencial"}'::jsonb,'{"action":"block","message":"Tier 2 (<1MM) nao pode fazer Imersao Presencial"}'::jsonb,100),
('mei_ceo_downgrade','CEO de MEI downgrade Authority','scoring','{"cargo":"contains:ceo","porte":"contains:mei"}'::jsonb,'{"action":"downgrade_authority","delta":-30}'::jsonb,90),
('titan_challenger_only','Titan = Challenger Only','framework_lock','{"persona":"titan"}'::jsonb,'{"action":"enforce_framework","framework":"challenger","block":["spiced"]}'::jsonb,100),
('builder_spiced','Builder = SPICED','framework_lock','{"persona":"builder"}'::jsonb,'{"action":"enforce_framework","framework":"spiced","block":["challenger"]}'::jsonb,100),
('executor_spin','Executor = SPIN+Champion','framework_lock','{"persona":"executor"}'::jsonb,'{"action":"enforce_framework","framework":"spin_champion"}'::jsonb,100),
('dqi_over_revenue','DQI > Receita Imediata','scoring','{"always":true}'::jsonb,'{"action":"weight_dqi","weight":1.5}'::jsonb,80),
('black_box','Black Box Protocol','output_filter','{"always":true}'::jsonb,'{"action":"filter_output","block_terms":["metodologia","framework","SPICED","Challenger","SPIN"]}'::jsonb,100)
ON CONFLICT (rule_slug) DO NOTHING;

-- -----------------------------------------------
-- 9. focus_modes
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.focus_modes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mode_slug TEXT NOT NULL UNIQUE,
  mode_label TEXT NOT NULL,
  icon TEXT,
  priority_task_types TEXT[] DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.focus_modes (mode_slug, mode_label, icon, priority_task_types, description) VALUES
('velocidade','Velocidade','zap','{follow_up,social_dm,agendamento}','Prioriza velocidade de contato e volume de FUPs'),
('qualificacao','Qualificacao','target','{requalificacao,dvl_review,note_completion}','Foco em profundidade de qualificacao'),
('handoff','Handoff','handshake','{handoff_prep,dvl_review,note_completion}','Preparar deals para passagem ao closer'),
('reativacao','Reativacao','refresh','{reativacao,no_show_recovery,follow_up}','Reengajar leads frios e no-shows'),
('social_dm','Social DM','chat','{social_dm,follow_up,agendamento}','Prioriza abordagem via DM social'),
('imersao','Imersao Focus','trophy','{follow_up,handoff_prep,qualificacao}','Foco em deals de imersao high-ticket')
ON CONFLICT (mode_slug) DO NOTHING;

-- -----------------------------------------------
-- 10. queue_rules
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.queue_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_slug TEXT NOT NULL UNIQUE,
  queue_slug TEXT REFERENCES public.task_queues(queue_slug),
  condition_json JSONB NOT NULL DEFAULT '{}',
  priority_boost INT DEFAULT 0,
  auto_assign BOOLEAN DEFAULT false,
  max_age_hours INT DEFAULT 48,
  escalation_action TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.queue_rules (rule_slug, queue_slug, condition_json, priority_boost, max_age_hours, escalation_action) VALUES
('fup_critical','fup','{"risk_state":"critical"}'::jsonb,20,24,'notify_manager'),
('fup_high','fup','{"risk_state":"high"}'::jsonb,10,36,null),
('handoff_ready','handoff','{"stage_order_gte":8,"temperature_gt":60}'::jsonb,30,12,'auto_notify_closer'),
('dm_hot','dm','{"signal_state":"HOT"}'::jsonb,15,24,null),
('no_show_immediate','no_show','{"meeting_status":"no_show"}'::jsonb,25,6,'create_recovery_task'),
('high_value_diamond','high_value','{"tier":"diamond"}'::jsonb,20,24,'notify_manager'),
('reengage_cold','reengage','{"aging_days_gt":14,"signal_state":"NEUTRAL"}'::jsonb,5,72,null)
ON CONFLICT (rule_slug) DO NOTHING;

-- -----------------------------------------------
-- 11. kill_switches
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.kill_switches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  switch_slug TEXT NOT NULL UNIQUE,
  switch_label TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  severity TEXT DEFAULT 'hard',
  condition_json JSONB DEFAULT '{}',
  block_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.kill_switches (switch_slug, switch_label, description, is_enabled, severity, condition_json, block_message) VALUES
('titan_challenger_only','Titan = Challenger Only','Titan NUNCA pode usar SPICED',true,'hard','{"persona":"titan","blocked_framework":"spiced"}'::jsonb,'KILL SWITCH: Titan usa exclusivamente Challenger. SPICED bloqueado.'),
('builder_spiced','Builder = SPICED','Builder NUNCA pode usar Challenger',true,'hard','{"persona":"builder","blocked_framework":"challenger"}'::jsonb,'KILL SWITCH: Builder usa exclusivamente SPICED. Challenger bloqueado.'),
('executor_spin','Executor = SPIN+Champion','Executor usa SPIN + Champion Selling',true,'hard','{"persona":"executor"}'::jsonb,'KILL SWITCH: Executor usa SPIN+Champion.'),
('tier2_imersao_block','Tier 2 Block Imersao Presencial','Tier 2 (<1MM) bloqueado de Imersoes Presenciais',true,'hard','{"tier_in":"silver,bronze","line":"imersao"}'::jsonb,'KILL SWITCH: Tier 2 nao pode fazer Imersao Presencial.'),
('ceo_mei_downgrade','CEO MEI Authority Downgrade','CEO de MEI = downgrade automatico de Authority Score',true,'soft','{"cargo_contains":"ceo","porte_contains":"mei"}'::jsonb,'Authority Score reduzido: CEO de MEI.'),
('dqi_over_revenue','DQI > Receita Imediata','DQI sempre prevalece sobre receita imediata',true,'soft','{"always":true}'::jsonb,'DQI prevalece sobre receita imediata como metrica.'),
('black_box','Black Box Protocol','PROIBIDO expor metodologia interna ao lead',true,'hard','{"always":true}'::jsonb,'BLACK BOX: Metodologia interna NUNCA exposta ao lead.')
ON CONFLICT (switch_slug) DO NOTHING;

-- RLS para todas as taxonomy
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'taxonomy_revenue_lines','taxonomy_stages','taxonomy_personas','taxonomy_frameworks',
    'taxonomy_channels','taxonomy_signals','taxonomy_touchpoints','taxonomy_rules',
    'focus_modes','queue_rules','kill_switches'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_public_access" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_public_access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
