-- FASE 3 — BLOCO 3: Executar seeds

-- 1. Seed stage history
SELECT seed_stage_history();

-- 2. Seed tasks
SELECT seed_tasks_from_runtime();

-- 3. Popular filas
SELECT populate_queue_items();
