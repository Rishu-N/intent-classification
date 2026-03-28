# Intent Classification POC

A full-stack web application that compares two LLM-based intent classification approaches side-by-side:

1. **Hierarchical (Small LLMs)** — Traverse Domain → Category → Intent level-by-level, using an ensemble of small models with voting, fallback logic, and per-step confidence scoring.
2. **Flat (Large LLM)** — Single LLM call with all ~50 leaf intents presented at once.

---

## What This Does

Given a user query like `"Where is my package?"`, the system:
- Runs it through both approaches
- Shows the final intent (`Customer Support › Orders › Track Order`)
- Displays timing, confidence, cost, and reasoning at every step
- Lets you run 70+ test cases in batch and see accuracy + confusion matrix

---

## Project Structure

```
clasififcation/
├── backend/
│   ├── main.py                          # FastAPI entry point
│   ├── requirements.txt
│   ├── data/
│   │   ├── intent_tree.json             # 7 domains, ~50 leaf intents
│   │   ├── test_cases.json              # 70 preloaded test cases
│   │   └── model_configs.json           # Persisted model configs (auto-managed)
│   ├── models/schemas.py                # All Pydantic models
│   ├── services/
│   │   ├── llm_provider.py              # OpenAI + Anthropic unified async client
│   │   ├── classifier_flat.py           # Large LLM flat classification
│   │   ├── classifier_hierarchical.py   # Hierarchical traversal + ensemble + fallback
│   │   ├── ensemble.py                  # Majority + weighted voting algorithms
│   │   ├── cache.py                     # In-memory TTL cache (SHA-256 keyed)
│   │   ├── cost_tracker.py              # Token cost estimation
│   │   ├── model_store.py               # Model config persistence
│   │   ├── test_case_store.py           # Test case persistence
│   │   └── intent_tree_store.py         # Tree loader
│   ├── routers/
│   │   ├── classify.py                  # POST /classify, GET /classify/intent-tree
│   │   ├── models_config.py             # CRUD /models
│   │   ├── test_cases.py                # CRUD /test-cases
│   │   ├── batch.py                     # POST /batch/run
│   │   ├── export.py                    # GET /export (CSV/JSON)
│   │   └── cache_router.py              # GET/DELETE /cache
│   └── utils/
│       ├── prompt_builder.py            # All LLM prompt templates
│       └── confidence.py                # Confidence normalization helpers
│
└── frontend/
    ├── src/
    │   ├── App.tsx                      # Tab router (3 tabs)
    │   ├── types/index.ts               # All TypeScript interfaces
    │   ├── api/                         # Axios API client modules
    │   ├── store/                       # Zustand state stores
    │   └── components/
    │       ├── playground/              # Playground tab
    │       ├── testcases/               # Test Cases tab
    │       ├── models/                  # Model Config tab
    │       ├── layout/                  # TabBar
    │       └── shared/                  # ConfidenceBadge, LoadingSpinner
    └── package.json
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| OpenAI or Anthropic API key | — |

---

## Setup & Running

### Step 1 — Backend

```bash
# From the project root (clasififcation/)
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

# Install Python dependencies
pip install -r requirements.txt

# Go back to project root and start the server
cd ..
python -m uvicorn backend.main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**
Interactive API docs at **http://localhost:8000/docs**

---

### Step 2 — Frontend

Open a **second terminal** window:

```bash
cd clasififcation/frontend
npm install        # only needed the first time
npm run dev
```

Frontend runs at **http://localhost:5173**

---

### Step 3 — Add Your First Model

1. Open **http://localhost:5173**
2. Click the **Model Config** tab
3. Click **+ Add Model**
4. Select a **Quick Preset** (e.g. `gpt-4o-mini`)
5. Paste your **API key**
6. Set **Size** = `small`
7. Click **Add Model**
8. Repeat with a `large` model (e.g. `gpt-4o`) for flat classification

> **Tip:** The system works with both OpenAI and Anthropic keys. You can mix providers freely.

---

## Recommended Model Setup

### OpenAI

| Role | Display Name | Model ID | Size |
|---|---|---|---|
| Ensemble (hierarchical) | GPT-4o Mini | `gpt-4o-mini` | small |
| Ensemble (hierarchical) | GPT-4.1 Mini | `gpt-4.1-mini` | small |
| Flat classification | GPT-4o | `gpt-4o` | large |
| Fallback / flat | GPT-4.1 | `gpt-4.1` | large |

### Anthropic

| Role | Display Name | Model ID | Size |
|---|---|---|---|
| Ensemble (hierarchical) | Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | small |
| Flat / fallback | Claude Sonnet 4.6 | `claude-sonnet-4-6` | large |

> You can select multiple small models for the ensemble — they all vote simultaneously and the winner is determined by ensemble logic.

---

## Using the App

### Tab 1: Playground

Test any query and see full classification output.

**Hierarchical mode:**
1. Select one or more **Small LLMs** (these form the voting ensemble)
2. Choose **Ensemble Method** — `Weighted` (votes weighted by model cost) or `Majority`
3. Set **Confidence Threshold** — below this value triggers retry and fallback
4. Optionally pick a **Backup Model** (large LLM called when confidence is too low)
5. Type your query and click **Classify**

**Flat mode:**
1. Select a **Large LLM**
2. Type your query and click **Classify**

**Output includes:**
- Final intent path: `Domain › Category › Intent`
- Confidence badge (green ≥ 75%, yellow ≥ 50%, red < 50%)
- Latency, estimated cost, cache hit indicator
- Field of Thought (model reasoning at each step)
- For hierarchical: step-by-step breakdown with individual model votes
- Interactive tree visualization of the traversal path

**Try these queries:**
```
Where is my package?
My Python script is throwing a KeyError
Find me the cheapest flights to Paris
I'm having chest pain and difficulty breathing
What tax deductions can I claim as a freelancer?
Explain recursion to me
I need help                        ← ambiguous → General fallback
Book a flight and fix my code      ← multi-intent → fallback
```

---

### Tab 2: Test Cases

Run the 70 preloaded test cases (or your own) to measure accuracy.

1. Browse the test case table — adversarial cases are marked in orange
2. Click **+ Add Test Case** to add your own
3. **Edit** or **Delete** cases inline
4. In the **Run Batch** panel, select mode + models then click **Run All**
5. View results:
   - Accuracy, average latency, total estimated cost
   - Per-test: expected vs predicted, correct/incorrect badge, confidence
   - **Confusion Matrix** heatmap showing misclassification patterns
   - **Cost vs Accuracy** scatter chart comparing multiple runs
6. Click **Export CSV** or **Export JSON** to download the results

---

### Tab 3: Model Config

Manage all model configurations.

| Field | Description |
|---|---|
| Display Name | Label shown in dropdowns throughout the app |
| Provider | `openai` or `anthropic` |
| Model Name | Exact model ID (e.g. `gpt-4o-mini`) |
| API Key | Your key — stored locally in `data/model_configs.json` |
| Size | `small` for hierarchical ensemble, `large` for flat classification |
| Cost / 1M tokens | Input + output cost used for weighted voting and cost tracking |
| Temperature | Recommend `0` for deterministic classification |

---

## How It Works

### Hierarchical Classification

```
User Query
    │
    ├─ Level 1: All 7 domains → concurrent LLM calls → ensemble vote → "Customer Support"
    │
    ├─ Level 2: Categories of "Customer Support" → concurrent calls → vote → "Orders"
    │
    └─ Level 3: Intents of "Orders" → concurrent calls → vote → "Track Order"

Final confidence = Level1.conf × Level2.conf × Level3.conf  (joint probability)
```

**Ensemble voting (Weighted):**
- Each model's vote weight = `(model_cost / max_cost) × vote_confidence`
- More capable (expensive) models count more; higher-confidence votes count more
- Winner = highest total weight; tiebreak by mean confidence, then lower cost

**Ensemble voting (Majority):**
- Winner = choice with the most votes
- Tiebreak by mean confidence of tied choices

**Fallback logic** (triggers when ensemble confidence < threshold):
1. **Retry** — same models, escalated prompt with domain-specific few-shot examples and stronger disambiguation guidance
2. **Backup model** — large LLM called on the remaining subtree only
3. **Abstain** — returns `General → Miscellaneous → Ambiguous Query` with `fallback_triggered: true`

### Flat Classification

```
User Query → Single prompt listing all ~50 intents with descriptions + examples → LLM picks one → Done
```

One API call, lower latency, no step-by-step visibility.

### Prompt Engineering

Both classification modes use structured, richly-described prompts based on research-backed prompting techniques:

- **Role + task definition** — system prompt clearly defines the classifier's role and the specific sub-task at each hierarchical level
- **Chain-of-thought guidance** — at each hierarchical step the model is instructed to reason domain → category → intent before choosing
- **Per-candidate descriptions** — every domain, category, and intent has a detailed description including key signals, disambiguation rules vs. similar intents, and edge cases
- **Per-candidate examples** — each candidate includes 4–6 example queries to serve as few-shot anchors grounding the model's choice
- **Explicit disambiguation rules** — the prompt includes level-specific rules for the most commonly confused pairs (e.g. Track vs Cancel Order, Debug Python vs Runtime Error)
- **Calibrated confidence scale** — 6-point confidence scale with concrete language (e.g. "Unambiguous. Only one candidate could match") rather than vague ranges
- **Escalating retry prompts** — on low-confidence retry, the prompt escalates with domain-specific few-shot examples and additional decision guidance

### Caching

- Cache key = SHA-256 of `query + mode + sorted(model_ids)`
- TTL = 1 hour; evicted on read if expired
- Repeated identical queries return instantly with `cache_hit: true`

---

## Intent Tree

```
Customer Support
  ├── Orders              → Track Order, Cancel Order, Modify Order
  ├── Refunds & Returns   → Initiate Return, Return Status, Return Item
  ├── Account Issues      → Login Help, Reset Password, Update Account
  ├── Payments            → Payment Failed, Billing Inquiry, Invoice Request
  └── Product Queries     → Product Details, Check Availability, Pricing Info

Travel
  ├── Booking > Flights   → Cheapest Flight, Fastest Flight, Flight Status
  ├── Booking > Hotels    → Budget Hotel, Luxury Hotel, Hotel Availability
  ├── Planning            → Itinerary Planning, Travel Recommendations, Budget Planning
  └── Documentation       → Visa Information, Passport Inquiry

Coding
  ├── Debugging           → Debug Python, Debug JavaScript, Runtime Error
  ├── Code Generation     → Generate Function, Write Script, API Integration
  └── System Design       → Low Level Design, High Level Design

Healthcare
  ├── Symptoms            → Mild Symptoms, Severe Symptoms, Chronic Condition
  ├── Medication          → Drug Information, Dosage Query
  └── Lifestyle           → Diet Advice, Fitness Advice

Finance
  ├── Banking             → Check Balance, Block Card, Transaction History
  ├── Investments         → Stock Query, Portfolio Review
  └── Taxes               → Tax Filing, Tax Deductions

Education
  ├── Learning            → Concept Explanation, Tutorial Request
  ├── Exams               → Exam Preparation, Practice Questions
  └── Assignments         → Homework Help, Project Help

General
  └── Miscellaneous       → Unknown Query, Ambiguous Query, Multi-intent Query
```

---

## API Reference

Full interactive docs at **http://localhost:8000/docs**

### POST /classify

```json
// Hierarchical
{
  "query": "Where is my package?",
  "mode": "hierarchical",
  "small_llm_ids": ["<model-uuid>"],
  "large_llm_id": "<backup-uuid>",
  "use_cache": true,
  "ensemble_method": "weighted",
  "confidence_threshold": 0.5
}

// Flat
{
  "query": "Where is my package?",
  "mode": "flat",
  "large_llm_id": "<model-uuid>",
  "use_cache": true
}
```

### Other Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/classify/intent-tree` | Full tree + all leaf intents |
| `GET/POST/PUT/DELETE` | `/models` | Manage model configs |
| `GET/POST/PUT/DELETE` | `/test-cases` | Manage test cases |
| `POST` | `/batch/run` | Run full test suite |
| `GET` | `/batch/{run_id}` | Retrieve a batch result |
| `GET` | `/export?run_id=...&format=csv` | Download results as CSV or JSON |
| `GET` | `/cache` | Cache stats (entries, hit rate) |
| `DELETE` | `/cache` | Clear all cached results |

---

## Troubleshooting

**`ModuleNotFoundError: No module named 'backend'`**
Run uvicorn from the project root, not from inside `backend/`:
```bash
# Correct — from clasififcation/ root:
python -m uvicorn backend.main:app --reload --port 8000
```

**`"large_llm_id is required for flat mode"`**
Add a model with size `large` in the Model Config tab first.

**`"small_llm_ids is required for hierarchical mode"`**
Add a model with size `small` and select it in the Playground before classifying.

**OpenAI error about `response_format`**
Only models that support JSON mode work: `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-4.1-mini`.
Older models like `gpt-3.5-turbo` may not support it reliably.

**High latency in hierarchical mode**
Expected — 3 levels × N models = 3N API calls (but all N calls within each level run concurrently).
Use fewer small models or a faster model like `gpt-4o-mini` to reduce latency.

**Batch results lost after restart**
Batch results are in-memory only. Export them as CSV/JSON before restarting the backend.

**`ENOSPC: no space left on device`**
```bash
npm cache clean --force
rm -rf ~/Library/Caches/com.apple.dt.Xcode
```

---

## Security Note

API keys are stored in plain text in `data/model_configs.json`. This is intentional for a local POC. Do not expose this application publicly without adding proper key encryption and authentication.
