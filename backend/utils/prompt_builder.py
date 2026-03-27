from typing import Optional


CONFIDENCE_SCALE = (
    "Confidence scale: 1.0=unambiguous match, 0.75=strong match, "
    "0.5=uncertain, below 0.5=low confidence."
)

FEW_SHOT_DOMAIN = """Examples:
- "where is my order" → Customer Support
- "find flights to Paris" → Travel
- "debug my Python code" → Coding
- "I have a headache" → Healthcare
- "check my bank balance" → Finance
- "help me study for exams" → Education
- "hello there" → General"""

FEW_SHOT_CATEGORY = {
    "Customer Support": """Examples:
- "cancel my order" → Orders
- "I want a refund" → Refunds & Returns
- "can't log in" → Account Issues
- "payment failed" → Payments
- "what are the specs" → Product Queries""",

    "Travel": """Examples:
- "cheapest flight to Rome" → Booking > Flights
- "5-star hotel in Paris" → Booking > Hotels
- "plan my Europe trip" → Planning
- "do I need a visa" → Documentation""",

    "Coding": """Examples:
- "Python error KeyError" → Debugging
- "write a function" → Code Generation
- "design a microservices architecture" → System Design""",

    "Healthcare": """Examples:
- "I have a fever" → Symptoms
- "dosage of ibuprofen" → Medication
- "diet plan for weight loss" → Lifestyle""",

    "Finance": """Examples:
- "check account balance" → Banking
- "Tesla stock price" → Investments
- "file my taxes" → Taxes""",

    "Education": """Examples:
- "explain recursion" → Learning
- "prepare for GRE" → Exams
- "help with homework" → Assignments""",
}


def flat_system_prompt() -> str:
    return (
        "You are an intent classification engine. Given a user query, identify the single "
        "best-matching intent from the provided list.\n"
        "Return ONLY valid JSON in this exact shape:\n"
        '{"intent": "<intent name>", "domain": "<domain>", "category": "<category>", '
        '"confidence": <0.0-1.0>, "reasoning": "<one concise sentence>"}\n'
        f"{CONFIDENCE_SCALE}\n"
        "Do not include any text outside the JSON."
    )


def flat_user_prompt(query: str, tree: dict) -> str:
    lines = ["Available intents (domain > category > intent):"]
    for domain, categories in tree.items():
        for category, intents in categories.items():
            for intent in intents:
                lines.append(f"  {domain} > {category} > {intent}")
    intents_text = "\n".join(lines)
    return f'Query: "{query}"\n\n{intents_text}\n\nRespond with JSON only.'


def hybrid_system_prompt() -> str:
    return (
        "You are an intent classification engine. Given a user query and a short list of "
        "candidate intents (pre-filtered by semantic similarity), identify the single "
        "best-matching intent.\n"
        "Return ONLY valid JSON in this exact shape:\n"
        '{"intent": "<intent name>", "domain": "<domain>", "category": "<category>", '
        '"confidence": <0.0-1.0>, "reasoning": "<one concise sentence>"}\n'
        f"{CONFIDENCE_SCALE}\n"
        "Do not include any text outside the JSON."
    )


def hybrid_user_prompt(query: str, candidates: list[dict]) -> str:
    lines = ["Candidate intents (domain > category > intent):"]
    for c in candidates:
        lines.append(f"  {c['domain']} > {c['category']} > {c['intent']}")
    candidates_text = "\n".join(lines)
    return f'Query: "{query}"\n\n{candidates_text}\n\nRespond with JSON only.'


def hierarchical_system_prompt(level: str) -> str:
    return (
        f"You are classifying a user query step by step. At this step you are choosing the best {level}.\n"
        "Return ONLY valid JSON in this exact shape:\n"
        '{"choice": "<one of the candidates>", "confidence": <0.0-1.0>, "reasoning": "<one concise sentence>"}\n'
        f"{CONFIDENCE_SCALE}\n"
        "Do not include any text outside the JSON."
    )


def hierarchical_user_prompt(
    query: str,
    level: str,
    candidates: list[str],
    chosen_domain: Optional[str] = None,
    chosen_category: Optional[str] = None,
) -> str:
    candidates_str = ", ".join(f'"{c}"' for c in candidates)

    if level == "domain":
        return (
            f'Query: "{query}"\n\n'
            f"Choose the single best domain from: [{candidates_str}]\n\n"
            "Respond with JSON only."
        )
    elif level == "category":
        return (
            f'Query: "{query}"\n'
            f"Domain already chosen: {chosen_domain}\n\n"
            f"Choose the single best category from: [{candidates_str}]\n\n"
            "Respond with JSON only."
        )
    else:  # intent
        return (
            f'Query: "{query}"\n'
            f"Path so far: {chosen_domain} > {chosen_category}\n\n"
            f"Choose the single best intent from: [{candidates_str}]\n\n"
            "Respond with JSON only."
        )


def retry_user_prompt(
    query: str,
    level: str,
    candidates: list[str],
    chosen_domain: Optional[str] = None,
    chosen_category: Optional[str] = None,
) -> str:
    base = hierarchical_user_prompt(query, level, candidates, chosen_domain, chosen_category)
    few_shot = ""
    if level == "domain":
        few_shot = FEW_SHOT_DOMAIN
    elif level == "category" and chosen_domain and chosen_domain in FEW_SHOT_CATEGORY:
        few_shot = FEW_SHOT_CATEGORY[chosen_domain]

    retry_note = (
        "\n\nNote: A previous classification attempt was uncertain. "
        "Please carefully reconsider the query and choose the most appropriate option."
    )
    if few_shot:
        retry_note += f"\n\n{few_shot}"

    return base + retry_note
