from __future__ import annotations

import asyncio
import logging
import time
from typing import Literal, Optional

logger = logging.getLogger(__name__)

from backend.models.schemas import (
    ClassifyStepSchema,
    HierarchicalResultSchema,
    ModelConfigSchema,
    TokenUsage,
    VoteSchema,
)
from backend.services.cache import cache
from backend.services.cost_tracker import compute_cost, sum_costs
from backend.services.ensemble import run_ensemble
from backend.services import intent_tree_store
from backend.services.llm_provider import LLMCallError, call_llm_parsed
from backend.utils.confidence import normalize, joint_confidence
from backend.utils.prompt_builder import (
    hierarchical_system_prompt,
    hierarchical_user_prompt,
    retry_user_prompt,
)


FALLBACK_DOMAIN = "General"
FALLBACK_CATEGORY = "Miscellaneous"
FALLBACK_INTENT = "Ambiguous Query"


async def _call_single_model(
    model: ModelConfigSchema,
    level: str,
    query: str,
    candidates: list[str],
    chosen_domain: Optional[str],
    chosen_category: Optional[str],
    is_retry: bool = False,
    descriptions: dict[str, str] = {},
    examples_map: dict[str, list[str]] = {},
) -> Optional[VoteSchema]:
    system = hierarchical_system_prompt(level)
    if is_retry:
        user = retry_user_prompt(query, level, candidates, chosen_domain, chosen_category, descriptions, examples_map)
    else:
        user = hierarchical_user_prompt(query, level, candidates, chosen_domain, chosen_category, descriptions, examples_map)
    try:
        parsed, resp = await call_llm_parsed(model, system, user)
        choice = parsed.get("choice", "")
        # Validate choice is in candidates
        if choice not in candidates:
            # Try case-insensitive match
            lower_map = {c.lower(): c for c in candidates}
            choice = lower_map.get(choice.lower(), candidates[0])
        tokens = resp.tokens
        return VoteSchema(
            model_id=model.id,
            choice=choice,
            confidence=normalize(parsed.get("confidence", 0.5)),
            reasoning=parsed.get("reasoning", ""),
            raw_output=resp.content,
            tokens=tokens,
            cost_usd=compute_cost(model, tokens),
        )
    except LLMCallError as exc:
        logger.error("Model %s failed at level %s: %s", model.id, level, exc)
        return None


async def _classify_level(
    query: str,
    candidates: list[str],
    level: Literal["domain", "category", "intent"],
    models: list[ModelConfigSchema],
    ensemble_method: str,
    confidence_threshold: float,
    chosen_domain: Optional[str] = None,
    chosen_category: Optional[str] = None,
    backup_model: Optional[ModelConfigSchema] = None,
    descriptions: dict[str, str] = {},
    examples_map: dict[str, list[str]] = {},
) -> tuple[ClassifyStepSchema, bool, Optional[str], float]:
    """
    Returns (step, fallback_triggered, fallback_reason).
    """
    level_start = time.monotonic()
    total_tokens = TokenUsage()

    # Fan-out: call all models concurrently
    raw_votes = await asyncio.gather(
        *[_call_single_model(m, level, query, candidates, chosen_domain, chosen_category, descriptions=descriptions, examples_map=examples_map)
          for m in models],
        return_exceptions=False,
    )
    votes = [v for v in raw_votes if v is not None]

    fallback_triggered = False
    fallback_reason = None

    if not votes:
        fallback_triggered = True
        fallback_reason = "All models failed at this level"

    if votes:
        ensemble = run_ensemble(votes, models, ensemble_method)
        chosen = ensemble.winner
        confidence = ensemble.confidence
    else:
        chosen = None
        confidence = 0.0

    # Retry if confidence is low
    if confidence < confidence_threshold and not fallback_triggered:
        retry_votes_raw = await asyncio.gather(
            *[_call_single_model(m, level, query, candidates, chosen_domain, chosen_category, is_retry=True, descriptions=descriptions, examples_map=examples_map)
              for m in models],
            return_exceptions=False,
        )
        retry_votes = [v for v in retry_votes_raw if v is not None]
        if retry_votes:
            retry_ensemble = run_ensemble(retry_votes, models, ensemble_method)
            if retry_ensemble.confidence >= confidence:
                votes = retry_votes
                ensemble = retry_ensemble
                chosen = ensemble.winner
                confidence = ensemble.confidence
                if confidence < confidence_threshold:
                    fallback_triggered = True
                    fallback_reason = f"Confidence {confidence:.2f} below threshold after retry"
        else:
            fallback_triggered = True
            fallback_reason = "All models failed on retry"

    # Backup model fallback (use large LLM on subtree)
    if fallback_triggered and backup_model and confidence < confidence_threshold:
        backup_vote = await _call_single_model(
            backup_model, level, query, candidates, chosen_domain, chosen_category, descriptions=descriptions, examples_map=examples_map
        )
        if backup_vote:
            votes = [backup_vote]
            chosen = backup_vote.choice
            confidence = backup_vote.confidence
            if confidence >= confidence_threshold:
                fallback_triggered = False
                fallback_reason = None

    # Final fallback: abstain
    if not chosen or (fallback_triggered and confidence < confidence_threshold):
        if level == "domain":
            chosen = FALLBACK_DOMAIN
        elif level == "category":
            chosen = FALLBACK_CATEGORY
        else:
            chosen = FALLBACK_INTENT
        confidence = 0.0
        votes = votes or []
        fallback_triggered = True
        if not fallback_reason:
            fallback_reason = "Abstained due to low confidence"

    latency_ms = int((time.monotonic() - level_start) * 1000)

    # Aggregate tokens and cost from all votes at this level
    total_tokens = TokenUsage(
        input=sum(v.tokens.input for v in votes),
        output=sum(v.tokens.output for v in votes),
    )
    total_cost = sum(v.cost_usd for v in votes)

    step = ClassifyStepSchema(
        level=level,
        chosen=chosen,
        confidence=round(confidence, 4),
        reasoning=votes[0].reasoning if votes else "Fallback triggered",
        candidates=candidates,
        votes=votes,
        ensemble_method=ensemble_method,
        latency_ms=latency_ms,
        tokens=total_tokens,
    )
    return step, fallback_triggered, fallback_reason, total_cost


async def classify_hierarchical(
    query: str,
    models: list[ModelConfigSchema],
    tree: dict,
    ensemble_method: str = "weighted",
    confidence_threshold: float = 0.5,
    use_cache: bool = True,
    backup_model: Optional[ModelConfigSchema] = None,
) -> HierarchicalResultSchema:
    model_ids = [m.id for m in models]

    if use_cache:
        cached = cache.get(query, "hierarchical", model_ids)
        if cached is not None:
            result = HierarchicalResultSchema(**cached)
            result.cache_hit = True
            return result

    total_start = time.monotonic()
    domains = list(tree.keys())

    # Level 1: Domain
    domain_descs = intent_tree_store.get_domains_with_desc()
    domain_examples = {d: intent_tree_store.get_domain_examples(d) for d in domains}
    step1, fb1, fr1, cost1 = await _classify_level(
        query, domains, "domain", models, ensemble_method, confidence_threshold,
        backup_model=backup_model, descriptions=domain_descs, examples_map=domain_examples,
    )
    chosen_domain = step1.chosen

    # Level 2: Category
    categories = list(tree.get(chosen_domain, {FALLBACK_CATEGORY: []}).keys())
    category_descs = intent_tree_store.get_categories_with_desc(chosen_domain)
    category_examples = {c: intent_tree_store.get_category_examples(chosen_domain, c) for c in categories}
    step2, fb2, fr2, cost2 = await _classify_level(
        query, categories, "category", models, ensemble_method, confidence_threshold,
        chosen_domain=chosen_domain, backup_model=backup_model,
        descriptions=category_descs, examples_map=category_examples,
    )
    chosen_category = step2.chosen

    # Level 3: Intent
    intents = tree.get(chosen_domain, {}).get(chosen_category, [FALLBACK_INTENT])
    intents_full = intent_tree_store.get_intents_full(chosen_domain, chosen_category)
    intent_descs = {name: data.get("description", "") for name, data in intents_full.items()}
    intent_examples = {name: data.get("examples", []) for name, data in intents_full.items()}
    step3, fb3, fr3, cost3 = await _classify_level(
        query, intents, "intent", models, ensemble_method, confidence_threshold,
        chosen_domain=chosen_domain, chosen_category=chosen_category,
        backup_model=backup_model, descriptions=intent_descs, examples_map=intent_examples,
    )

    steps = [step1, step2, step3]
    confs = [s.confidence for s in steps]
    final_confidence = joint_confidence(confs)
    min_conf = min(confs)

    total_latency_ms = int((time.monotonic() - total_start) * 1000)
    fallback_triggered = fb1 or fb2 or fb3
    fallback_reason = next((r for r in [fr1, fr2, fr3] if r), None)
    fallback_step = (
        1 if fb1 else (2 if fb2 else (3 if fb3 else None))
    )

    total_cost_usd = sum_costs([cost1, cost2, cost3])
    tokens_total = TokenUsage(
        input=sum(s.tokens.input for s in steps),
        output=sum(s.tokens.output for s in steps),
    )

    result = HierarchicalResultSchema(
        query=query,
        final_intent=step3.chosen,
        domain=step1.chosen,
        category=step2.chosen,
        confidence=round(final_confidence, 4),
        min_step_confidence=round(min_conf, 4),
        steps=steps,
        total_latency_ms=total_latency_ms,
        total_cost_usd=total_cost_usd,
        tokens_total=tokens_total,
        fallback_triggered=fallback_triggered,
        fallback_reason=fallback_reason,
        fallback_step_used=fallback_step,
    )

    if use_cache:
        cache.set(query, "hierarchical", model_ids, result.model_dump())

    return result
