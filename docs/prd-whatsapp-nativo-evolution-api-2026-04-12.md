# PRD — WhatsApp Nativo via Evolution API no Elucy Cockpit

**Data:** 12/04/2026
**Autor:** PM Elucy + Debug + UX Elucy
**Status:** IMPLEMENTADO
**Decisao:** D-034

---

## Problema

O Chat tab do Elucy dependia da WhatsApp Cloud API (Meta) que exige WABA aprovado, WHATSAPP_TOKEN e WHATSAPP_PHONE_ID. Nenhum operador conseguia usar o Chat — feature morta desde 04/04.

Alem disso, a IA do Elucy (analyze-deal, elucy-inference) nao tinha contexto de conversas reais com leads, operando apenas com dados do CRM.

## Solucao

WhatsApp nativo via Evolution API (Baileys/WA Web). Operador escaneia QR Code com qualquer numero WhatsApp, envia/recebe mensagens pelo cockpit, e toda conversa e salva no Supabase para a IA usar como contexto.

## Arquitetura

```
Operador (Cockpit Chat Tab)
  |
  v
chat-proxy Edge Function (provider routing: evolution | meta)
  |
  v (send)
Evolution API Server (Docker) --- Baileys ---> WhatsApp
  |
  v (webhook)
wa-webhook Edge Function (NOVA)
  |
  v
Supabase chat_messages (INSERT inbound)
  |
  +---> Realtime WS ---> Cockpit (nova msg aparece)
  +---> elucy-inference (contexto IA)
  +---> analyze-deal (contexto IA)
```

## Componentes Criados/Modificados

### Migrations
- `038_evolution_instances.sql` — tabela de instancias Evolution (instance_name, status, qr_code, operator_email)
- `039_chat_messages.sql` — tabela chat_messages unificada + view chat_conversations

### Edge Functions
- `chat-proxy/index.ts` — REFATORADO: provider routing (evolution/meta), actions (send/qr/status/create_instance)
- `wa-webhook/index.ts` — NOVA: recebe webhooks da Evolution API, normaliza e insere em chat_messages
- `elucy-inference/index.ts` — MODIFICADO: busca ultimas 20 msgs por deal_id e injeta como [HISTORICO_WHATSAPP_RECENTE]
- `analyze-deal/index.ts` — MODIFICADO: busca ultimas 15 msgs por deal_id e injeta no prompt

### Frontend
- `cockpit.html` — Chat tab com layout two-panel, QR Code modal, Link Deal modal, status indicator
- `cockpit-engine.js` — Chat Engine: loadConversations, loadThread, sendMessage, realtime subscription, status polling, deal linking

### Infra
- `evolution-api/docker-compose.yml` — Evolution API + Redis (Docker)
- `evolution-api/.env` — Config com webhook apontando para wa-webhook do Supabase

## Supabase Secrets Necessarios
- `EVOLUTION_BASE_URL` — URL publica do servidor Evolution API
- `EVOLUTION_API_KEY` — API key global (mesma do AUTHENTICATION_API_KEY da Evolution)
- `EVOLUTION_WEBHOOK_SECRET` — secret para validar webhooks recebidos

## Riscos e Mitigacoes
- **Ban do numero:** Uso manual (1 msg/vez por operador) reduz risco. Numero backup disponivel.
- **Evolution offline:** Status indicator no cockpit alerta o operador. Fallback Meta mantido.
- **HTTPS obrigatorio:** Evolution em VPS com HTTPS. Localhost nao funciona para webhooks.

## Metricas de Sucesso (30 dias)
- Mensagens enviadas pelo cockpit/dia: 0 → >50
- Deals com historico WA vinculado: 0% → >60%
- analyze-deal com contexto WA: 0% → >40%

## Decisoes Relacionadas
- D-004: API keys nunca no frontend (Supabase Secrets)
- D-010: Chat two-panel com filtros WA/IG
- D-014: JWT obrigatorio em edge functions (exceto wa-webhook que usa X-Webhook-Secret)
- D-015: Rate limit 30/min no chat-proxy
