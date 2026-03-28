from __future__ import annotations

import time

from backend.models.schemas import (
    FlatResultSchema,
    ModelConfigSchema,
    TokenUsage,
)
from backend.services.cache import cache
from backend.services.cost_tracker import compute_cost
from backend.services import intent_tree_store
from backend.services.llm_provider import LLMCallError, call_llm_parsed
from backend.utils.confidence import normalize
from backend.utils.prompt_builder import flat_system_prompt, flat_user_prompt


async def classify_flat(
    query: str,
    model: ModelConfigSchema,
    tree: dict,
    use_cache: bool = True,
) -> FlatResultSchema:
    model_ids = [model.id]

    # Cache lookup
    if use_cache:
        cached = cache.get(query, "flat", model_ids)
        if cached is not None:
            result = FlatResultSchema(**cached)
            result.cache_hit = True
            return result

    start = time.monotonic()
    system = flat_system_prompt()
    user = flat_user_prompt(query, intent_tree_store.get_full_tree())

    fallback_triggered = False
    fallback_reason = None

    try:
        parsed, resp = await call_llm_parsed(model, system, user)
    except LLMCallError as exc:
        fallback_triggered = True
        fallback_reason = f"LLM call failed: {exc.reason}"
        # Return general fallback result
        latency_ms = int((time.monotonic() - start) * 1000)
        result = FlatResultSchema(
            query=query,
            final_intent="Ambiguous Query",
            domain="General",
            category="Miscellaneous",
            confidence=0.0,
            reasoning=f"Classification failed: {exc.reason}",
            model_used=model.id,
            tokens=TokenUsage(),
            cost_usd=0.0,
            latency_ms=latency_ms,
            fallback_triggered=True,
            fallback_reason=fallback_reason,
        )
        return result

    latency_ms = int((time.monotonic() - start) * 1000)
    confidence = normalize(parsed.get("confidence", 0.5))
    tokens = resp.tokens
    cost = compute_cost(model, tokens)

    result = FlatResultSchema(
        query=query,
        final_intent=parsed.get("intent", "Unknown Query"),
        domain=parsed.get("domain", "General"),
        category=parsed.get("category", "Miscellaneous"),
        confidence=confidence,
        reasoning=parsed.get("reasoning", ""),
        model_used=model.id,
        tokens=tokens,
        cost_usd=cost,
        latency_ms=latency_ms,
        fallback_triggered=fallback_triggered,
        fallback_reason=fallback_reason,
        raw_output=resp.content,
    )

    if use_cache:
        cache.set(query, "flat", model_ids, result.model_dump())

    return result
