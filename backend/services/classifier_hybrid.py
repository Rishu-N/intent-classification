from __future__ import annotations

import time

from backend.models.schemas import (
    CandidateIntent,
    HybridResultSchema,
    ModelConfigSchema,
    TokenUsage,
)
from backend.services.cache import cache
from backend.services.cost_tracker import compute_cost
from backend.services.embedding_store import embedding_store
from backend.services.llm_provider import LLMCallError, call_llm_parsed
from backend.utils.confidence import normalize
from backend.utils.prompt_builder import hybrid_system_prompt, hybrid_user_prompt


async def classify_hybrid(
    query: str,
    model: ModelConfigSchema,
    tree: dict,
    use_cache: bool = True,
) -> HybridResultSchema:
    model_ids = [model.id]

    # Cache lookup
    if use_cache:
        cached = cache.get(query, "hybrid", model_ids)
        if cached is not None:
            result = HybridResultSchema(**cached)
            result.cache_hit = True
            return result

    start = time.monotonic()

    # Stage 1: Embedding-based narrowing
    await embedding_store.ensure_initialized(tree, model.api_key)
    candidates, query_words, embedding_latency_ms = await embedding_store.query_by_words(
        query, model.api_key
    )

    if not candidates:
        latency_ms = int((time.monotonic() - start) * 1000)
        return HybridResultSchema(
            query=query,
            final_intent="Ambiguous Query",
            domain="General",
            category="Miscellaneous",
            confidence=0.0,
            reasoning="No candidate intents found via embedding similarity",
            model_used=model.id,
            tokens=TokenUsage(),
            cost_usd=0.0,
            latency_ms=latency_ms,
            embedding_latency_ms=embedding_latency_ms,
            query_words=query_words,
            fallback_triggered=True,
            fallback_reason="Embedding stage returned no candidates",
        )

    # Stage 2: LLM classification on narrowed candidates
    system = hybrid_system_prompt()
    user = hybrid_user_prompt(query, candidates)

    try:
        parsed, resp = await call_llm_parsed(model, system, user)
    except LLMCallError as exc:
        latency_ms = int((time.monotonic() - start) * 1000)
        return HybridResultSchema(
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
            embedding_latency_ms=embedding_latency_ms,
            query_words=query_words,
            candidate_intents=[CandidateIntent(**c) for c in candidates],
            fallback_triggered=True,
            fallback_reason=f"LLM call failed: {exc.reason}",
        )

    latency_ms = int((time.monotonic() - start) * 1000)
    confidence = normalize(parsed.get("confidence", 0.5))
    tokens = resp.tokens
    cost = compute_cost(model, tokens)

    result = HybridResultSchema(
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
        embedding_latency_ms=embedding_latency_ms,
        query_words=query_words,
        candidate_intents=[CandidateIntent(**c) for c in candidates],
    )

    if use_cache:
        cache.set(query, "hybrid", model_ids, result.model_dump())

    return result
