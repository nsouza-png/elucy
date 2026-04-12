#!/usr/bin/env python3
"""
G4 Revenue Intelligence — News Collector
Busca noticias de APIs publicas e RSS feeds, categoriza por sessao
(Aquisicao/Expansao/Retencao) e salva em news-data.json.

Rodar 3x por dia (08h, 13h, 19h BRT):
  0 11,16,22 * * * python3 /path/to/collector.py

APIs usadas (free tier):
  - Currents API (1000 req/dia)
  - GNews (100 req/dia)
  - The News API (free)
"""

import json
import os
import sys
import hashlib
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote_plus
from urllib.error import URLError, HTTPError

# ── CONFIG ──────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
DATA_FILE = SCRIPT_DIR / "news-data.json"
MAX_ARTICLES = 200
MAX_AGE_HOURS = 72

# API Keys (set via environment variables)
CURRENTS_API_KEY = os.environ.get("CURRENTS_API_KEY", "")
GNEWS_API_KEY = os.environ.get("GNEWS_API_KEY", "")
THENEWSAPI_TOKEN = os.environ.get("THENEWSAPI_TOKEN", "")

# ── SESSAO KEYWORDS ─────────────────────────────────────────────
SESSIONS = {
    "aquisicao": {
        "label": "Aquisicao",
        "keywords": [
            "GTM engineering", "demand generation", "outbound sales",
            "cold email", "sales development", "marketing ops",
            "lead generation", "intent signals", "buyer signals",
            "ABM", "account based marketing", "SDR", "BDR",
            "growth hacking", "inbound marketing", "SEO SaaS",
            "content marketing B2B", "paid acquisition",
            "prospecting AI", "sales intelligence", "signal-based selling",
        ],
        "subcategories": [
            "GTM Engineering & Estrategia",
            "Demand Generation & Growth",
            "AI-Powered Prospecting & Sinais",
            "Outbound & Cold Outreach",
            "Marketing Ops & Attribution",
        ],
    },
    "expansao": {
        "label": "Expansao",
        "keywords": [
            "product-led growth", "PLG", "sales engineering",
            "revenue architecture", "deal desk", "pricing strategy",
            "upsell", "cross-sell", "expansion revenue",
            "demo automation", "sales enablement", "CPQ",
            "revenue operations", "RevOps", "pipeline management",
            "forecasting", "deal velocity", "sales methodology",
            "MEDDIC", "BANT", "value selling",
        ],
        "subcategories": [
            "Sales Engineering & Demo Tech",
            "Revenue Architecture & Deal Desk",
            "Product-Led Growth & Upsell",
            "Pricing & Packaging Intelligence",
            "Cross-sell & Account Expansion",
        ],
    },
    "retencao": {
        "label": "Retencao",
        "keywords": [
            "customer success", "churn prediction", "churn prevention",
            "net revenue retention", "NRR", "customer health score",
            "renewal management", "win-back", "customer lifecycle",
            "onboarding SaaS", "adoption", "customer experience",
            "voice of customer", "NPS", "CSAT", "support AI",
            "expansion revenue retention", "GRR",
        ],
        "subcategories": [
            "Customer Success & Health Scoring",
            "Churn Prevention & Win-back",
            "NRR & Expansion Revenue",
            "Voice of Customer & Feedback Loops",
            "Renewal Ops & Lifecycle",
        ],
    },
}

# ── HELPERS ──────────────────────────────────────────────────────

def article_id(title, url):
    raw = f"{title}|{url}".encode("utf-8")
    return hashlib.md5(raw).hexdigest()[:12]


def classify_session(title, description=""):
    text = f"{title} {description}".lower()
    scores = {}
    for session_key, cfg in SESSIONS.items():
        score = sum(1 for kw in cfg["keywords"] if kw.lower() in text)
        if score > 0:
            scores[session_key] = score
    if not scores:
        return "aquisicao"  # default
    return max(scores, key=scores.get)


def classify_subcategory(title, description, session_key):
    text = f"{title} {description}".lower()
    subs = SESSIONS[session_key]["subcategories"]
    # Simple heuristic: match first subcategory keyword found
    keyword_map = {
        "GTM Engineering": 0, "Demand Generation": 1, "Growth": 1,
        "Prospecting": 2, "AI": 2, "Signal": 2, "Intent": 2,
        "Outbound": 3, "Cold": 3, "Email": 3,
        "Marketing Ops": 4, "Attribution": 4,
        "Sales Engineering": 0, "Demo": 0,
        "Revenue Architecture": 1, "Deal Desk": 1, "RevOps": 1,
        "Product-Led": 2, "PLG": 2, "Upsell": 2,
        "Pricing": 3, "Packaging": 3,
        "Cross-sell": 4, "Expansion": 4,
        "Customer Success": 0, "Health": 0,
        "Churn": 1, "Win-back": 1,
        "NRR": 2, "Retention": 2,
        "Voice of Customer": 3, "NPS": 3, "Feedback": 3,
        "Renewal": 4, "Lifecycle": 4,
    }
    for kw, idx in keyword_map.items():
        if kw.lower() in text and idx < len(subs):
            return subs[idx]
    return subs[0]


def fetch_json(url, headers=None):
    try:
        req = Request(url, headers=headers or {})
        req.add_header("User-Agent", "G4-Revenue-Intel-Collector/1.0")
        with urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (URLError, HTTPError, json.JSONDecodeError) as e:
        print(f"  [WARN] fetch failed: {url[:80]}... — {e}", file=sys.stderr)
        return None


def parse_iso_date(date_str):
    if not date_str:
        return datetime.now(timezone.utc).isoformat()
    # Handle common formats
    for fmt in ["%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]:
        try:
            dt = datetime.strptime(date_str.strip()[:25], fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            continue
    return datetime.now(timezone.utc).isoformat()


# ── API FETCHERS ─────────────────────────────────────────────────

def fetch_currents(query, session_key):
    """Currents API — 1000 req/day free"""
    if not CURRENTS_API_KEY:
        return []
    url = (
        f"https://api.currentsapi.services/v1/search"
        f"?apiKey={CURRENTS_API_KEY}"
        f"&keywords={quote_plus(query)}"
        f"&language=en"
        f"&type=1"
    )
    data = fetch_json(url)
    if not data or "news" not in data:
        return []
    articles = []
    for item in data["news"][:15]:
        articles.append({
            "id": article_id(item.get("title", ""), item.get("url", "")),
            "title": item.get("title", ""),
            "description": item.get("description", "")[:300],
            "url": item.get("url", ""),
            "source": item.get("author", "Unknown"),
            "image": item.get("image", ""),
            "published_at": parse_iso_date(item.get("published")),
            "session": session_key,
            "subcategory": classify_subcategory(
                item.get("title", ""), item.get("description", ""), session_key
            ),
            "api": "currents",
        })
    return articles


def fetch_gnews(query, session_key):
    """GNews API — 100 req/day free"""
    if not GNEWS_API_KEY:
        return []
    url = (
        f"https://gnews.io/api/v4/search"
        f"?q={quote_plus(query)}"
        f"&lang=en"
        f"&max=10"
        f"&apikey={GNEWS_API_KEY}"
    )
    data = fetch_json(url)
    if not data or "articles" not in data:
        return []
    articles = []
    for item in data["articles"][:10]:
        articles.append({
            "id": article_id(item.get("title", ""), item.get("url", "")),
            "title": item.get("title", ""),
            "description": item.get("description", "")[:300],
            "url": item.get("url", ""),
            "source": item.get("source", {}).get("name", "Unknown"),
            "image": item.get("image", ""),
            "published_at": parse_iso_date(item.get("publishedAt")),
            "session": session_key,
            "subcategory": classify_subcategory(
                item.get("title", ""), item.get("description", ""), session_key
            ),
            "api": "gnews",
        })
    return articles


def fetch_thenewsapi(query, session_key):
    """The News API — free tier"""
    if not THENEWSAPI_TOKEN:
        return []
    url = (
        f"https://api.thenewsapi.com/v1/news/all"
        f"?api_token={THENEWSAPI_TOKEN}"
        f"&search={quote_plus(query)}"
        f"&language=en"
        f"&limit=10"
    )
    data = fetch_json(url)
    if not data or "data" not in data:
        return []
    articles = []
    for item in data["data"][:10]:
        articles.append({
            "id": article_id(item.get("title", ""), item.get("url", "")),
            "title": item.get("title", ""),
            "description": item.get("description", "")[:300],
            "url": item.get("url", ""),
            "source": item.get("source", "Unknown"),
            "image": item.get("image_url", ""),
            "published_at": parse_iso_date(item.get("published_at")),
            "session": session_key,
            "subcategory": classify_subcategory(
                item.get("title", ""), item.get("description", ""), session_key
            ),
            "api": "thenewsapi",
        })
    return articles


# ── MAIN COLLECTOR ───────────────────────────────────────────────

def collect():
    print(f"[{datetime.now().isoformat()}] Revenue Intel Collector starting...")

    # Load existing data
    existing = []
    existing_ids = set()
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                old = json.load(f)
                existing = old.get("articles", [])
                existing_ids = {a["id"] for a in existing}
        except (json.JSONDecodeError, KeyError):
            pass

    new_articles = []

    # Build queries per session (use top 3 keywords per API call to save quota)
    queries = {
        "aquisicao": [
            "GTM engineering AI",
            "demand generation SaaS",
            "outbound sales AI signals",
        ],
        "expansao": [
            "revenue operations RevOps",
            "product-led growth PLG",
            "sales engineering pricing SaaS",
        ],
        "retencao": [
            "customer success AI churn",
            "net revenue retention NRR",
            "customer health score SaaS",
        ],
    }

    for session_key, query_list in queries.items():
        label = SESSIONS[session_key]["label"]
        for q in query_list:
            print(f"  [{label}] Fetching: {q}")

            # Rotate APIs to conserve quota
            articles = fetch_currents(q, session_key)
            if not articles:
                articles = fetch_gnews(q, session_key)
            if not articles:
                articles = fetch_thenewsapi(q, session_key)

            for a in articles:
                if a["id"] not in existing_ids:
                    new_articles.append(a)
                    existing_ids.add(a["id"])

    # Merge and deduplicate
    all_articles = new_articles + existing

    # Remove old articles
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=MAX_AGE_HOURS)).isoformat()
    all_articles = [a for a in all_articles if a.get("published_at", "") >= cutoff]

    # Sort by date (newest first)
    all_articles.sort(key=lambda a: a.get("published_at", ""), reverse=True)

    # Trim to max
    all_articles = all_articles[:MAX_ARTICLES]

    # Count by session
    counts = {}
    for a in all_articles:
        s = a.get("session", "aquisicao")
        counts[s] = counts.get(s, 0) + 1

    # Extract trending tags
    from collections import Counter
    all_text = " ".join(f"{a['title']} {a.get('description','')}" for a in all_articles).lower()
    tag_candidates = [
        "AI", "RevOps", "PLG", "GTM", "SaaS", "B2B", "NRR",
        "Churn", "Pipeline", "Outbound", "Inbound", "ABM",
        "Pricing", "Upsell", "Retention", "Growth", "Signals",
        "Automation", "Intent", "Customer Success",
    ]
    trending = []
    for tag in tag_candidates:
        count = all_text.count(tag.lower())
        if count > 0:
            trending.append({"tag": tag, "count": count})
    trending.sort(key=lambda t: t["count"], reverse=True)
    trending = trending[:10]

    # Build output
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_articles": len(all_articles),
        "session_counts": counts,
        "trending": trending,
        "sources_active": list({a.get("api", "unknown") for a in all_articles}),
        "refresh_schedule": "3x/dia (08h, 13h, 19h BRT)",
        "articles": all_articles,
    }

    # Write
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"  Total: {len(all_articles)} articles ({len(new_articles)} new)")
    print(f"  Sessions: {counts}")
    print(f"  Trending: {[t['tag'] for t in trending[:5]]}")
    print(f"  Saved to {DATA_FILE}")


if __name__ == "__main__":
    collect()
