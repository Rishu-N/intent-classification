"""
Prompt builder for intent classification.

Techniques applied:
- Role + task definition in system prompts (improves output fidelity)
- Chain-of-thought guidance (reason before choosing)
- Structured, hierarchical candidate formatting with descriptions + examples
- Per-candidate few-shot examples as context anchors
- Explicit disambiguation rules at each level
- Calibrated confidence scale with concrete language
- Constrained output format with zero ambiguity
- Retry prompts with escalating guidance and domain-specific few-shot
"""

from typing import Optional


# ---------------------------------------------------------------------------
# Confidence scale — shared across all prompts
# ---------------------------------------------------------------------------
CONFIDENCE_SCALE = """CONFIDENCE CALIBRATION:
  1.00 — Unambiguous. Only one candidate could match. No doubt.
  0.85 — Strong match. Query clearly fits; minor alternative exists but is unlikely.
  0.70 — Good match. Query fits well; one other candidate is plausible but weaker.
  0.50 — Uncertain. Two candidates are almost equally plausible. Best-effort guess.
  0.30 — Low confidence. Query is vague; you are inferring from minimal signals.
  0.10 — Very low. Almost no signal; effectively guessing."""


# ---------------------------------------------------------------------------
# Few-shot examples for retry prompts (domain level)
# ---------------------------------------------------------------------------
FEW_SHOT_DOMAIN = """REFERENCE EXAMPLES (domain → correct classification):
  "where is my package?" → Customer Support
  "I want to cancel my order" → Customer Support
  "find me the cheapest flight to Paris" → Travel
  "I need a visa for Japan" → Travel
  "my Python script throws a KeyError" → Coding
  "design a microservices architecture" → Coding
  "I have chest pain and difficulty breathing" → Healthcare
  "how much ibuprofen should I take?" → Healthcare
  "what's the Tesla stock price?" → Finance
  "how do I file my taxes?" → Finance
  "explain recursion to me" → Education
  "help me with my homework" → Education
  "hello" → General
  "book a flight AND debug my code" → General"""


# ---------------------------------------------------------------------------
# Few-shot examples for retry prompts (category level)
# ---------------------------------------------------------------------------
FEW_SHOT_CATEGORY = {
    "Customer Support": """REFERENCE EXAMPLES (query → correct category):
  "where is my package?" → Orders
  "cancel my order" → Orders
  "I want to return this item" → Refunds & Returns
  "where is my refund?" → Refunds & Returns
  "I can't log in to my account" → Account Issues
  "I forgot my password" → Account Issues
  "my payment was declined" → Payments
  "I need an invoice for my order" → Payments
  "is this laptop compatible with my monitor?" → Product Queries
  "is the red version in stock?" → Product Queries""",

    "Travel": """REFERENCE EXAMPLES (query → correct category):
  "cheapest flight to New York" → Booking > Flights
  "is my flight delayed?" → Booking > Flights
  "5-star hotel in Paris" → Booking > Hotels
  "is the Marriott available next weekend?" → Booking > Hotels
  "plan a 7-day Japan itinerary" → Planning
  "best places to visit in Bali" → Planning
  "do I need a visa for France?" → Documentation
  "how do I renew my passport?" → Documentation""",

    "Coding": """REFERENCE EXAMPLES (query → correct category):
  "getting a KeyError in Python" → Debugging
  "TypeError in my React component" → Debugging
  "write a function to validate emails" → Code Generation
  "integrate the Stripe API" → Code Generation
  "design the architecture for a chat app" → System Design
  "OOP class design for a parking lot" → System Design""",

    "Healthcare": """REFERENCE EXAMPLES (query → correct category):
  "I have a mild headache" → Symptoms
  "severe chest pain and shortness of breath" → Symptoms
  "I've had diabetes for 10 years" → Symptoms
  "what are the side effects of ibuprofen?" → Medication
  "how often should I take amoxicillin?" → Medication
  "best diet for weight loss" → Lifestyle
  "home workout routine for beginners" → Lifestyle""",

    "Finance": """REFERENCE EXAMPLES (query → correct category):
  "what's my account balance?" → Banking
  "block my stolen credit card" → Banking
  "what's the Apple stock price?" → Investments
  "review my investment portfolio" → Investments
  "how do I file my taxes?" → Taxes
  "what can I deduct as a freelancer?" → Taxes""",

    "Education": """REFERENCE EXAMPLES (query → correct category):
  "explain recursion to me" → Learning
  "how to set up a React project?" → Learning
  "how to prepare for the GRE?" → Exams
  "give me practice questions for calculus" → Exams
  "help me with my math homework" → Assignments
  "help me write a research paper on climate change" → Assignments""",
}


# ---------------------------------------------------------------------------
# Helper: format a single candidate block with description + examples
# ---------------------------------------------------------------------------
def _format_candidate_block(
    index: int,
    name: str,
    description: str,
    examples: list[str],
) -> str:
    lines = [f"  {index}. {name}"]
    if description:
        # Wrap description at a readable width for the LLM
        lines.append(f"     Description: {description}")
    if examples:
        examples_str = " | ".join(f'"{e}"' for e in examples[:4])
        lines.append(f"     Example queries: {examples_str}")
    return "\n".join(lines)


def _format_candidates_with_examples(
    candidates: list[str],
    descriptions: dict[str, str],
    examples_map: dict[str, list[str]],
) -> str:
    blocks = []
    for i, name in enumerate(candidates, start=1):
        desc = descriptions.get(name, "")
        exs = examples_map.get(name, [])
        blocks.append(_format_candidate_block(i, name, desc, exs))
    return "\n\n".join(blocks)


# ---------------------------------------------------------------------------
# FLAT classification prompts
# ---------------------------------------------------------------------------

def flat_system_prompt() -> str:
    return """\
You are an expert intent classification engine. Your sole task is to read a user query and \
identify the single most specific leaf intent it belongs to from a structured intent hierarchy.

CLASSIFICATION APPROACH — follow these steps in order:
  Step 1 — DOMAIN: Identify which broad domain the query belongs to \
(e.g., Customer Support, Travel, Coding, Healthcare, Finance, Education, General).
  Step 2 — CATEGORY: Within that domain, identify the specific sub-category.
  Step 3 — INTENT: Within that category, select the single most specific leaf intent \
that matches what the user actually wants to DO or KNOW.

RULES:
  • Match the PRIMARY intent of the query. Ignore incidental or secondary mentions.
  • Use the intent descriptions and example queries to guide your choice.
  • If two intents seem equally valid, prefer the MORE SPECIFIC one.
  • Only use the "General" domain as a last resort when no other domain fits.
  • Your "intent", "domain", and "category" values MUST be copied EXACTLY \
from the hierarchy (exact spelling, capitalization, punctuation).

""" + CONFIDENCE_SCALE + """

OUTPUT FORMAT — return ONLY this JSON, nothing else:
{"intent": "<exact intent name>", "domain": "<exact domain name>", \
"category": "<exact category name>", "confidence": <0.0-1.0>, \
"reasoning": "<one sentence explaining the primary signal that determined your choice>"}"""


def flat_user_prompt(query: str, full_tree: dict) -> str:
    """Build a flat classification prompt from the fully structured tree."""
    lines = [
        f'USER QUERY: "{query}"',
        "",
        "INTENT HIERARCHY (domain → category → intent: description | example queries):",
        "=" * 70,
    ]

    for domain, domain_data in full_tree.items():
        domain_desc = domain_data.get("description", "")
        # Show first sentence of domain description only to keep flat prompt scannable
        short_domain_desc = domain_desc.split(".")[0] if domain_desc else ""
        lines.append(f"\n▶ DOMAIN: {domain}")
        if short_domain_desc:
            lines.append(f"  {short_domain_desc}.")

        for category, cat_data in domain_data.get("categories", {}).items():
            cat_desc = cat_data.get("description", "")
            short_cat_desc = cat_desc.split(".")[0] if cat_desc else ""
            lines.append(f"\n  ▷ CATEGORY: {category}")
            if short_cat_desc:
                lines.append(f"    {short_cat_desc}.")

            for intent_name, intent_data in cat_data.get("intents", {}).items():
                if isinstance(intent_data, dict):
                    intent_desc = intent_data.get("description", "")
                    intent_examples = intent_data.get("examples", [])
                else:
                    intent_desc = intent_data
                    intent_examples = []

                # First sentence of description only
                short_intent_desc = intent_desc.split(".")[0] if intent_desc else ""
                example_str = ""
                if intent_examples:
                    example_str = "  e.g. " + " | ".join(f'"{e}"' for e in intent_examples[:3])
                intent_line = f"    • {domain} > {category} > {intent_name}"
                if short_intent_desc:
                    intent_line += f": {short_intent_desc}."
                if example_str:
                    intent_line += f"\n      {example_str}"
                lines.append(intent_line)

    lines += [
        "",
        "=" * 70,
        "Classify the query above. Respond with JSON only.",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# HIERARCHICAL classification prompts
# ---------------------------------------------------------------------------

_LEVEL_GUIDANCE = {
    "domain": """\
At this step you are identifying the DOMAIN — the broadest subject area the query belongs to.
Think of the domain as the "department" that would handle this query.
Ask yourself: What is the overarching topic of this query? What field of life does it touch?""",

    "category": """\
The domain has already been identified. At this step you are identifying the CATEGORY — \
the specific sub-area within the domain.
Think of the category as the "team" within the department.
Ask yourself: Given the domain, what specific type of request is this?""",

    "intent": """\
The domain and category have already been identified. At this step you are identifying \
the INTENT — the exact, most specific action or information the user wants.
Think of the intent as the precise "task" the user needs done.
Ask yourself: What is the user's single primary goal with this query?""",
}

_LEVEL_DISAMBIGUATION = {
    "domain": """\
DISAMBIGUATION RULES FOR DOMAIN SELECTION:
  • If the query involves an existing order, account, payment, or specific product purchase → Customer Support
  • If the query involves flights, hotels, trip planning, or travel documents → Travel
  • If the query involves writing, fixing, or designing software/code → Coding
  • If the query involves health symptoms, medications, or fitness/diet → Healthcare
  • If the query involves bank accounts, stocks/investments, or taxes → Finance
  • If the query involves learning a concept, studying for exams, or academic work → Education
  • Only use General if NO domain fits even at low confidence""",

    "category": """\
DISAMBIGUATION RULES FOR CATEGORY SELECTION:
  • Read the full description of each category candidate carefully.
  • Choose based on what the user specifically needs — not just the topic.
  • When in doubt between two categories, ask: "Which description most specifically describes what the user wants?"
  • Prefer the more specific category over the more general one.""",

    "intent": """\
DISAMBIGUATION RULES FOR INTENT SELECTION:
  • At this level, differences between intents are subtle — read every description carefully.
  • Look for ACTION words in the query: 'track' vs 'cancel' vs 'modify' etc.
  • The example queries are your strongest signal — find the examples closest to the user's query.
  • If unsure between two intents, lower your confidence score (< 0.6) rather than guessing blindly.""",
}


def hierarchical_system_prompt(level: str) -> str:
    level_guidance = _LEVEL_GUIDANCE.get(level, f"Choose the best {level}.")
    disambiguation = _LEVEL_DISAMBIGUATION.get(level, "")

    return f"""\
You are an expert intent classification engine operating in a multi-step hierarchical pipeline.

YOUR ROLE AT THIS STEP:
{level_guidance}

CLASSIFICATION RULES:
  1. Read the user query carefully and identify its PRIMARY topic and PRIMARY goal.
  2. Read ALL candidate descriptions before choosing — do not stop at the first plausible match.
  3. Use the example queries under each candidate as concrete anchors — find which examples \
are closest to the user's query.
  4. Choose the candidate whose description and examples BEST match the user's query.
  5. If the context from previous levels is provided, use it to narrow your focus.
  6. Your "choice" value MUST be copied EXACTLY from the candidate list \
(exact spelling, capitalization, symbols — including '>' or '&').

{disambiguation}

{CONFIDENCE_SCALE}

OUTPUT FORMAT — return ONLY this JSON, nothing else:
{{"choice": "<exact candidate name>", "confidence": <0.0-1.0>, \
"reasoning": "<one sentence identifying the primary signal that led to your choice>"}}"""


def hierarchical_user_prompt(
    query: str,
    level: str,
    candidates: list[str],
    chosen_domain: Optional[str] = None,
    chosen_category: Optional[str] = None,
    descriptions: dict[str, str] = {},
    examples_map: dict[str, list[str]] = {},
) -> str:
    level_label = level.upper()
    candidates_section = _format_candidates_with_examples(candidates, descriptions, examples_map)

    # Build context section
    context_lines = []
    if chosen_domain:
        context_lines.append(f"  Domain selected: {chosen_domain}")
    if chosen_category:
        context_lines.append(f"  Category selected: {chosen_category}")
    context_section = ""
    if context_lines:
        context_section = "CLASSIFICATION CONTEXT (decisions made at prior levels):\n"
        context_section += "\n".join(context_lines) + "\n\n"

    return f"""\
{'=' * 60}
{level_label} CLASSIFICATION
{'=' * 60}

USER QUERY: "{query}"

{context_section}\
YOUR TASK: Choose the single best {level} from the {len(candidates)} candidates below.

CANDIDATES:
{'-' * 60}
{candidates_section}
{'-' * 60}

INSTRUCTIONS:
  • Review each candidate's description and example queries above.
  • Select the candidate that BEST matches the user's query.
  • You MUST choose exactly one candidate — copy its name exactly.
  • Do not generate a name that is not in the list above.

Respond with JSON only."""


def retry_user_prompt(
    query: str,
    level: str,
    candidates: list[str],
    chosen_domain: Optional[str] = None,
    chosen_category: Optional[str] = None,
    descriptions: dict[str, str] = {},
    examples_map: dict[str, list[str]] = {},
) -> str:
    """Retry prompt with escalated guidance and domain-specific few-shot examples."""
    base = hierarchical_user_prompt(
        query, level, candidates, chosen_domain, chosen_category, descriptions, examples_map
    )

    few_shot = ""
    if level == "domain":
        few_shot = FEW_SHOT_DOMAIN
    elif level == "category" and chosen_domain and chosen_domain in FEW_SHOT_CATEGORY:
        few_shot = FEW_SHOT_CATEGORY[chosen_domain]

    retry_header = """\

╔══════════════════════════════════════════════════════════╗
║  RETRY ATTEMPT — Previous classification was uncertain  ║
╚══════════════════════════════════════════════════════════╝

A previous model attempt returned low confidence. Please re-examine the query \
and the candidates carefully before responding.

ADDITIONAL GUIDANCE FOR RETRY:
  • Re-read the query word by word. What is the user's PRIMARY need?
  • For each candidate, ask: "Could this query realistically appear under this intent's examples?"
  • If still uncertain, lower your confidence to reflect that uncertainty — \
a low-confidence correct answer is better than a high-confidence wrong one.
  • Do NOT change your choice solely because this is a retry — only change if \
you identify a stronger match upon reflection.\
"""

    if few_shot:
        retry_header += f"\n\n{few_shot}"

    return base + retry_header
