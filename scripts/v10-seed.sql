-- ============================================================
-- V10 SEED v2 — Popula deal_data_quality_runtime e deal_transition_runtime
-- Usa APENAS tabelas confirmadas: deals, deal_tasks, elucy_cache
-- deal_signals NÃO existe — sinais são 0 até migration 019 ser executada
-- Rodar no Supabase SQL Editor (tnbbsjvzwleeoqnxtafp)
-- ============================================================

-- 1. DEAL DATA QUALITY RUNTIME

INSERT INTO deal_data_quality_runtime (
  deal_id, operator_email,
  completeness_score, consistency_score, recency_score, evidence_score,
  data_trust_score, data_quality_band, explain_json, updated_at
)
SELECT
  d.deal_id,
  d.operator_email,

  -- COMPLETENESS (0-1): 10 campos-chave
  (
    CASE WHEN d.fase_atual_no_processo IS NOT NULL AND d.fase_atual_no_processo != '' THEN 1 ELSE 0 END +
    CASE WHEN d.etapa_atual_no_pipeline IS NOT NULL AND d.etapa_atual_no_pipeline != '' THEN 1 ELSE 0 END +
    CASE WHEN d.tier_da_oportunidade IS NOT NULL AND d.tier_da_oportunidade != '' THEN 1 ELSE 0 END +
    CASE WHEN d.linha_de_receita_vigente IS NOT NULL AND d.linha_de_receita_vigente != '' THEN 1 ELSE 0 END +
    CASE WHEN d.grupo_de_receita IS NOT NULL AND d.grupo_de_receita != '' THEN 1 ELSE 0 END +
    CASE WHEN d.email_lead IS NOT NULL AND d.email_lead != '' THEN 1 ELSE 0 END +
    CASE WHEN d.cargo IS NOT NULL AND d.cargo != '' THEN 1 ELSE 0 END +
    CASE WHEN d.canal_de_marketing IS NOT NULL AND d.canal_de_marketing != '' THEN 1 ELSE 0 END +
    CASE WHEN d.status_do_deal IS NOT NULL AND d.status_do_deal != '' THEN 1 ELSE 0 END +
    CASE WHEN d.created_at_crm IS NOT NULL THEN 1 ELSE 0 END
  )::NUMERIC / 10.0 AS completeness_score,

  -- CONSISTENCY (0-1)
  (
    CASE WHEN d.fase_atual_no_processo IS NOT NULL AND d.etapa_atual_no_pipeline IS NOT NULL THEN 0.4 ELSE 0 END +
    CASE WHEN d.tier_da_oportunidade IS NOT NULL THEN 0.2 ELSE 0 END +
    CASE WHEN d.linha_de_receita_vigente IS NOT NULL AND d.grupo_de_receita IS NOT NULL THEN 0.2 ELSE 0 END +
    CASE WHEN d.canal_de_marketing IS NOT NULL AND d.canal_de_marketing != d.linha_de_receita_vigente THEN 0.2 ELSE 0 END
  )::NUMERIC AS consistency_score,

  -- RECENCY (0-1): decai linearmente em 30d
  GREATEST(0, 1.0 - (EXTRACT(EPOCH FROM (NOW() - COALESCE(d.synced_at, d.created_at_crm, NOW() - INTERVAL '90 days'))) / 86400.0 / 30.0))::NUMERIC AS recency_score,

  -- EVIDENCE (0-1): tasks + cache (sem signals por enquanto)
  LEAST(1.0, (
    COALESCE(task_counts.task_count, 0) * 0.20 +
    CASE WHEN cache_exists.has_cache THEN 0.4 ELSE 0 END
  ))::NUMERIC AS evidence_score,

  -- DATA TRUST (weighted): comp 30% + cons 20% + rec 25% + evi 25%  → *100
  (
    (CASE WHEN d.fase_atual_no_processo IS NOT NULL AND d.fase_atual_no_processo != '' THEN 1 ELSE 0 END +
     CASE WHEN d.etapa_atual_no_pipeline IS NOT NULL AND d.etapa_atual_no_pipeline != '' THEN 1 ELSE 0 END +
     CASE WHEN d.tier_da_oportunidade IS NOT NULL AND d.tier_da_oportunidade != '' THEN 1 ELSE 0 END +
     CASE WHEN d.linha_de_receita_vigente IS NOT NULL AND d.linha_de_receita_vigente != '' THEN 1 ELSE 0 END +
     CASE WHEN d.grupo_de_receita IS NOT NULL AND d.grupo_de_receita != '' THEN 1 ELSE 0 END +
     CASE WHEN d.email_lead IS NOT NULL AND d.email_lead != '' THEN 1 ELSE 0 END +
     CASE WHEN d.cargo IS NOT NULL AND d.cargo != '' THEN 1 ELSE 0 END +
     CASE WHEN d.canal_de_marketing IS NOT NULL AND d.canal_de_marketing != '' THEN 1 ELSE 0 END +
     CASE WHEN d.status_do_deal IS NOT NULL AND d.status_do_deal != '' THEN 1 ELSE 0 END +
     CASE WHEN d.created_at_crm IS NOT NULL THEN 1 ELSE 0 END
    )::NUMERIC / 10.0 * 0.30
    +
    (CASE WHEN d.fase_atual_no_processo IS NOT NULL AND d.etapa_atual_no_pipeline IS NOT NULL THEN 0.4 ELSE 0 END +
     CASE WHEN d.tier_da_oportunidade IS NOT NULL THEN 0.2 ELSE 0 END +
     CASE WHEN d.linha_de_receita_vigente IS NOT NULL AND d.grupo_de_receita IS NOT NULL THEN 0.2 ELSE 0 END +
     CASE WHEN d.canal_de_marketing IS NOT NULL AND d.canal_de_marketing != d.linha_de_receita_vigente THEN 0.2 ELSE 0 END
    )::NUMERIC * 0.20
    +
    GREATEST(0, 1.0 - (EXTRACT(EPOCH FROM (NOW() - COALESCE(d.synced_at, d.created_at_crm, NOW() - INTERVAL '90 days'))) / 86400.0 / 30.0))::NUMERIC * 0.25
    +
    LEAST(1.0, (
      COALESCE(task_counts.task_count, 0) * 0.20 +
      CASE WHEN cache_exists.has_cache THEN 0.4 ELSE 0 END
    ))::NUMERIC * 0.25
  ) * 100 AS data_trust_score,

  -- BAND (based on completeness)
  CASE
    WHEN (CASE WHEN d.fase_atual_no_processo IS NOT NULL AND d.fase_atual_no_processo != '' THEN 1 ELSE 0 END +
          CASE WHEN d.etapa_atual_no_pipeline IS NOT NULL AND d.etapa_atual_no_pipeline != '' THEN 1 ELSE 0 END +
          CASE WHEN d.tier_da_oportunidade IS NOT NULL AND d.tier_da_oportunidade != '' THEN 1 ELSE 0 END +
          CASE WHEN d.linha_de_receita_vigente IS NOT NULL AND d.linha_de_receita_vigente != '' THEN 1 ELSE 0 END +
          CASE WHEN d.grupo_de_receita IS NOT NULL AND d.grupo_de_receita != '' THEN 1 ELSE 0 END +
          CASE WHEN d.email_lead IS NOT NULL AND d.email_lead != '' THEN 1 ELSE 0 END +
          CASE WHEN d.cargo IS NOT NULL AND d.cargo != '' THEN 1 ELSE 0 END +
          CASE WHEN d.canal_de_marketing IS NOT NULL AND d.canal_de_marketing != '' THEN 1 ELSE 0 END +
          CASE WHEN d.status_do_deal IS NOT NULL AND d.status_do_deal != '' THEN 1 ELSE 0 END +
          CASE WHEN d.created_at_crm IS NOT NULL THEN 1 ELSE 0 END
    )::NUMERIC / 10.0 < 0.4 THEN 'critical'
    WHEN (CASE WHEN d.fase_atual_no_processo IS NOT NULL AND d.fase_atual_no_processo != '' THEN 1 ELSE 0 END +
          CASE WHEN d.etapa_atual_no_pipeline IS NOT NULL AND d.etapa_atual_no_pipeline != '' THEN 1 ELSE 0 END +
          CASE WHEN d.tier_da_oportunidade IS NOT NULL AND d.tier_da_oportunidade != '' THEN 1 ELSE 0 END +
          CASE WHEN d.linha_de_receita_vigente IS NOT NULL AND d.linha_de_receita_vigente != '' THEN 1 ELSE 0 END +
          CASE WHEN d.grupo_de_receita IS NOT NULL AND d.grupo_de_receita != '' THEN 1 ELSE 0 END +
          CASE WHEN d.email_lead IS NOT NULL AND d.email_lead != '' THEN 1 ELSE 0 END +
          CASE WHEN d.cargo IS NOT NULL AND d.cargo != '' THEN 1 ELSE 0 END +
          CASE WHEN d.canal_de_marketing IS NOT NULL AND d.canal_de_marketing != '' THEN 1 ELSE 0 END +
          CASE WHEN d.status_do_deal IS NOT NULL AND d.status_do_deal != '' THEN 1 ELSE 0 END +
          CASE WHEN d.created_at_crm IS NOT NULL THEN 1 ELSE 0 END
    )::NUMERIC / 10.0 < 0.7 THEN 'risk'
    ELSE 'ok'
  END AS data_quality_band,

  jsonb_build_object(
    'seeded_at', NOW()::TEXT,
    'version', 'v10-seed-2.0',
    'fields_checked', 10,
    'task_count', COALESCE(task_counts.task_count, 0),
    'has_cache', COALESCE(cache_exists.has_cache, false)
  ) AS explain_json,

  NOW() AS updated_at

FROM deals d

LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS task_count
  FROM deal_tasks dt WHERE dt.deal_id = d.deal_id
) task_counts ON true

LEFT JOIN LATERAL (
  SELECT EXISTS(SELECT 1 FROM elucy_cache ec WHERE ec.deal_id = d.deal_id) AS has_cache
) cache_exists ON true

ON CONFLICT (deal_id) DO UPDATE SET
  operator_email = EXCLUDED.operator_email,
  completeness_score = EXCLUDED.completeness_score,
  consistency_score = EXCLUDED.consistency_score,
  recency_score = EXCLUDED.recency_score,
  evidence_score = EXCLUDED.evidence_score,
  data_trust_score = EXCLUDED.data_trust_score,
  data_quality_band = EXCLUDED.data_quality_band,
  explain_json = EXCLUDED.explain_json,
  updated_at = NOW();


-- 2. DEAL TRANSITION RUNTIME

INSERT INTO deal_transition_runtime (
  deal_id, operator_email,
  current_pipeline_stage, target_pipeline_stage,
  transition_readiness_score, transition_valid, transition_block_reason,
  transition_gap_count, gaps_json, updated_at
)
SELECT
  d.deal_id,
  d.operator_email,
  d.etapa_atual_no_pipeline AS current_pipeline_stage,

  CASE d.etapa_atual_no_pipeline
    WHEN 'novo lead' THEN 'dia 01'
    WHEN 'dia 01' THEN 'dia 02'
    WHEN 'dia 02' THEN 'dia 03'
    WHEN 'dia 03' THEN 'conectados'
    WHEN 'dia 04' THEN 'conectados'
    WHEN 'dia 05' THEN 'conectados'
    WHEN 'dia 06' THEN 'conectados'
    WHEN 'conectados' THEN 'agendamento'
    WHEN 'agendamento' THEN 'reagendamento'
    WHEN 'reagendamento' THEN 'entrevista agendada'
    ELSE NULL
  END AS target_pipeline_stage,

  -- Readiness (0-1): sem signals, redistribui peso
  LEAST(1.0, (
    (CASE WHEN d.email_lead IS NOT NULL THEN 0.15 ELSE 0 END) +
    (CASE WHEN d.cargo IS NOT NULL THEN 0.10 ELSE 0 END) +
    (CASE WHEN d.tier_da_oportunidade IS NOT NULL THEN 0.10 ELSE 0 END) +
    (CASE WHEN d.linha_de_receita_vigente IS NOT NULL THEN 0.10 ELSE 0 END) +
    (CASE WHEN COALESCE(completed_tasks.cnt, 0) > 0 THEN 0.25 ELSE 0 END) +
    (CASE WHEN d.delta_t IS NULL OR d.delta_t < 14 THEN 0.30 ELSE
      CASE WHEN d.delta_t < 30 THEN 0.15 ELSE 0 END
    END)
  ))::NUMERIC AS transition_readiness_score,

  (
    LEAST(1.0, (
      (CASE WHEN d.email_lead IS NOT NULL THEN 0.15 ELSE 0 END) +
      (CASE WHEN d.cargo IS NOT NULL THEN 0.10 ELSE 0 END) +
      (CASE WHEN d.tier_da_oportunidade IS NOT NULL THEN 0.10 ELSE 0 END) +
      (CASE WHEN d.linha_de_receita_vigente IS NOT NULL THEN 0.10 ELSE 0 END) +
      (CASE WHEN COALESCE(completed_tasks.cnt, 0) > 0 THEN 0.25 ELSE 0 END) +
      (CASE WHEN d.delta_t IS NULL OR d.delta_t < 14 THEN 0.30 ELSE
        CASE WHEN d.delta_t < 30 THEN 0.15 ELSE 0 END
      END)
    )) >= 0.6
    AND d.etapa_atual_no_pipeline IS NOT NULL
  ) AS transition_valid,

  NULLIF(TRIM(BOTH ', ' FROM (
    CASE WHEN d.email_lead IS NULL OR d.email_lead = '' THEN 'missing_email, ' ELSE '' END ||
    CASE WHEN d.cargo IS NULL OR d.cargo = '' THEN 'missing_cargo, ' ELSE '' END ||
    CASE WHEN d.tier_da_oportunidade IS NULL OR d.tier_da_oportunidade = '' THEN 'missing_tier, ' ELSE '' END ||
    CASE WHEN d.linha_de_receita_vigente IS NULL OR d.linha_de_receita_vigente = '' THEN 'missing_revenue_line, ' ELSE '' END ||
    CASE WHEN COALESCE(completed_tasks.cnt, 0) = 0 THEN 'no_completed_tasks, ' ELSE '' END ||
    CASE WHEN d.delta_t IS NOT NULL AND d.delta_t >= 30 THEN 'aging_critical, ' ELSE '' END ||
    CASE WHEN d.delta_t IS NOT NULL AND d.delta_t >= 14 AND d.delta_t < 30 THEN 'aging_warning, ' ELSE '' END
  )), '') AS transition_block_reason,

  (
    CASE WHEN d.email_lead IS NULL OR d.email_lead = '' THEN 1 ELSE 0 END +
    CASE WHEN d.cargo IS NULL OR d.cargo = '' THEN 1 ELSE 0 END +
    CASE WHEN d.tier_da_oportunidade IS NULL OR d.tier_da_oportunidade = '' THEN 1 ELSE 0 END +
    CASE WHEN d.linha_de_receita_vigente IS NULL OR d.linha_de_receita_vigente = '' THEN 1 ELSE 0 END +
    CASE WHEN COALESCE(completed_tasks.cnt, 0) = 0 THEN 1 ELSE 0 END +
    CASE WHEN d.delta_t IS NOT NULL AND d.delta_t >= 14 THEN 1 ELSE 0 END
  )::INT AS transition_gap_count,

  jsonb_build_object(
    'seeded_at', NOW()::TEXT,
    'version', 'v10-seed-2.0',
    'completed_tasks', COALESCE(completed_tasks.cnt, 0),
    'delta_t', d.delta_t
  ) AS gaps_json,

  NOW() AS updated_at

FROM deals d

LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS cnt
  FROM deal_tasks dt
  WHERE dt.deal_id = d.deal_id AND dt.task_status = 'completed'
) completed_tasks ON true

ON CONFLICT (deal_id) DO UPDATE SET
  operator_email = EXCLUDED.operator_email,
  current_pipeline_stage = EXCLUDED.current_pipeline_stage,
  target_pipeline_stage = EXCLUDED.target_pipeline_stage,
  transition_readiness_score = EXCLUDED.transition_readiness_score,
  transition_valid = EXCLUDED.transition_valid,
  transition_block_reason = EXCLUDED.transition_block_reason,
  transition_gap_count = EXCLUDED.transition_gap_count,
  gaps_json = EXCLUDED.gaps_json,
  updated_at = NOW();


-- 3. Verification
SELECT
  'deal_data_quality_runtime' AS table_name,
  COUNT(*) AS total_rows,
  ROUND(AVG(data_trust_score), 1) AS avg_trust,
  COUNT(*) FILTER (WHERE data_quality_band = 'critical') AS critical,
  COUNT(*) FILTER (WHERE data_quality_band = 'risk') AS risk,
  COUNT(*) FILTER (WHERE data_quality_band = 'ok') AS ok
FROM deal_data_quality_runtime

UNION ALL

SELECT
  'deal_transition_runtime',
  COUNT(*),
  ROUND(AVG(transition_readiness_score * 100), 1),
  COUNT(*) FILTER (WHERE NOT transition_valid),
  COUNT(*) FILTER (WHERE transition_valid AND transition_gap_count > 0),
  COUNT(*) FILTER (WHERE transition_valid AND transition_gap_count = 0)
FROM deal_transition_runtime;
