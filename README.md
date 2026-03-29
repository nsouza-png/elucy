# Elucy — Sales Engagement System

Revenue Intelligence platform for B2B high-ticket sales teams.

## Architecture

```
Browser (GitHub Pages)          Supabase (Backend)            Databricks (Data Lake)
─────────────────────          ──────────────────            ─────────────────────
cockpit.html                   Auth (@g4educacao.com)        funil_comercial
cockpit-engine.js (27 layers)  PostgreSQL (48 tables)        persons_overview
analytics-engine.js            Realtime (cockpit_responses)  customer_360
reports-v4-engine.js           Edge Functions (9)            order_items
mcps.json (46 docs)            RLS policies
```

### Data Flow

```
Databricks ──sync-deals──> Supabase DB ──Realtime──> Browser
                                │
Browser ──elucy-inference──> Edge Function ──Claude API──> Response
                                │
                          API key segura
                          (Supabase Secret)
```

## Repository Structure

```
elucy-gh/
├── cockpit.html              # Main app (Cockpit V11)
├── cockpit-engine.js         # 27-layer DAG engine
├── analytics-engine.js       # Analytics calculations
├── reports-v4-engine.js      # Performance reports
├── cockpit-app.html          # Standalone app variant
├── index.html                # Landing page (CRO)
├── confirm.html              # Signup confirmation
├── elucy-home.html           # Home page
├── telemetry.html            # Telemetry dashboard
├── g4os-bridge.js            # G4 OS integration bridge
├── mcps.json                 # 46 MCP documents bundle
├── README.md
│
├── supabase/
│   ├── functions/            # Edge Functions (Deno)
│   │   ├── sync-deals/       # Databricks → Supabase sync
│   │   ├── elucy-inference/  # Claude API proxy (secure)
│   │   ├── analyze-deal/     # Deal analysis
│   │   ├── elucy-request/    # Request handler
│   │   ├── intel-sync/       # Intelligence sync
│   │   ├── db-proxy/         # Database proxy
│   │   └── telemetry-stats/  # Telemetry aggregation
│   │
│   └── migrations/           # SQL schema (30 files)
│       ├── 001-007           # Enterprise base schema
│       ├── 008-016           # V5 (8 phases)
│       ├── 017-019           # V6 Forecast + V7 Qualitative + V8 Signals
│       ├── 020-023           # Performance + Operator goals
│       ├── 024-025           # Strategic expansion + Telemetry
│       └── 026-028           # V10 Layers + V11 Enterprise + Strategic
```

## Infrastructure

| Component | Service | SLA |
|-----------|---------|-----|
| Frontend CDN | GitHub Pages | 99.9% |
| Database | Supabase PostgreSQL | 99.95% |
| Auth | Supabase Auth (JWT) | 99.95% |
| Realtime | Supabase Realtime | 99.9% |
| Edge Functions | Supabase Deno Runtime | 99.9% |
| Data Lake | Databricks SQL Warehouse | 99.9% |
| LLM | Claude API (Anthropic) | 99.5% |

## Deploy

### Frontend (auto-deploy on push)
```bash
git push origin main
# GitHub Pages serves from main branch automatically
# URL: https://nsouza-png.github.io/elucy/
```

### Edge Functions
```bash
npx supabase functions deploy <function-name> --project-ref tnbbsjvzwleeoqnxtafp --no-verify-jwt
```

### Database Migrations
Run SQL files in Supabase SQL Editor in order (001 → 028).

## Security

- **API keys**: All stored in Supabase Secrets (never in frontend code)
- **Auth**: Email/password with @g4educacao.com domain restriction
- **RLS**: Row-Level Security on all tables
- **Edge Functions**: JWT validation + rate limiting (8 req/min/operator)
- **Databricks token**: Server-side only (Edge Function env)

## Key URLs

- **Cockpit**: https://nsouza-png.github.io/elucy/cockpit.html
- **Landing**: https://nsouza-png.github.io/elucy/
- **Supabase Dashboard**: https://supabase.com/dashboard/project/tnbbsjvzwleeoqnxtafp
