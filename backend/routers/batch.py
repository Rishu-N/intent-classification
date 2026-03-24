from __future__ import annotations

import asyncio
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException

from backend.models.schemas import (
    BatchRunRequest,
    BatchRunResult,
    BatchTestResult,
    ConfusionMatrix,
)
from backend.services import model_store, test_case_store, intent_tree_store
from backend.services.classifier_flat import classify_flat
from backend.services.classifier_hierarchical import classify_hierarchical

router = APIRouter(prefix="/batch", tags=["batch"])

# In-memory store for batch results (keyed by run_id)
_batch_results: dict[str, BatchRunResult] = {}


def get_batch_result(run_id: str) -> BatchRunResult | None:
    return _batch_results.get(run_id)


@router.post("/run", response_model=BatchRunResult)
async def run_batch(req: BatchRunRequest):
    tree = intent_tree_store.get_tree()
    all_cases = test_case_store.list_all()

    if req.test_case_ids == "all":
        cases = all_cases
    else:
        cases = [c for c in all_cases if c.id in req.test_case_ids]

    if not cases:
        raise HTTPException(400, "No test cases found")

    if req.mode == "flat":
        if not req.large_llm_id:
            raise HTTPException(400, "large_llm_id required for flat mode")
        large_model = model_store.get_by_id(req.large_llm_id)
        if not large_model:
            raise HTTPException(404, f"Model {req.large_llm_id!r} not found")
        model_label = large_model.display_name

    else:
        if not req.small_llm_ids:
            raise HTTPException(400, "small_llm_ids required for hierarchical mode")
        small_models = [model_store.get_by_id(mid) for mid in req.small_llm_ids]
        missing = [mid for mid, m in zip(req.small_llm_ids, small_models) if m is None]
        if missing:
            raise HTTPException(404, f"Models not found: {missing}")
        small_models = [m for m in small_models if m]
        backup = model_store.get_by_id(req.large_llm_id) if req.large_llm_id else None
        model_label = " + ".join(m.display_name for m in small_models)

    results: list[BatchTestResult] = []

    async def run_one(case):
        try:
            if req.mode == "flat":
                res = await classify_flat(
                    case.input_prompt, large_model, tree, use_cache=req.use_cache
                )
                predicted = res.final_intent
                confidence = res.confidence
                latency_ms = res.latency_ms
                cost_usd = res.cost_usd
                fallback = res.fallback_triggered
            else:
                res = await classify_hierarchical(
                    case.input_prompt,
                    small_models,
                    tree,
                    ensemble_method=req.ensemble_method,
                    confidence_threshold=req.confidence_threshold,
                    use_cache=req.use_cache,
                    backup_model=backup,
                )
                predicted = res.final_intent
                confidence = res.confidence
                latency_ms = res.total_latency_ms
                cost_usd = res.total_cost_usd
                fallback = res.fallback_triggered

            correct = predicted == case.expected_final_intent
            return BatchTestResult(
                test_case_id=case.id,
                input_prompt=case.input_prompt,
                expected_intent=case.expected_final_intent,
                predicted_intent=predicted,
                correct=correct,
                confidence=confidence,
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                fallback_triggered=fallback,
            )
        except Exception as exc:
            return BatchTestResult(
                test_case_id=case.id,
                input_prompt=case.input_prompt,
                expected_intent=case.expected_final_intent,
                predicted_intent="Error",
                correct=False,
                confidence=0.0,
                latency_ms=0,
                cost_usd=0.0,
                fallback_triggered=True,
            )

    # Run all cases concurrently
    results = await asyncio.gather(*[run_one(c) for c in cases])

    # Compute stats
    correct_count = sum(1 for r in results if r.correct)
    total = len(results)
    accuracy = correct_count / total if total else 0.0
    avg_latency = sum(r.latency_ms for r in results) / total if total else 0.0
    total_cost = sum(r.cost_usd for r in results)

    # Build confusion matrix
    predicted_labels = [r.predicted_intent for r in results]
    expected_labels = [r.expected_intent for r in results]
    all_labels = sorted(set(predicted_labels + expected_labels))
    label_idx = {lbl: i for i, lbl in enumerate(all_labels)}
    matrix = [[0] * len(all_labels) for _ in range(len(all_labels))]
    for r in results:
        exp_idx = label_idx.get(r.expected_intent, 0)
        pred_idx = label_idx.get(r.predicted_intent, 0)
        matrix[exp_idx][pred_idx] += 1

    run_id = str(uuid.uuid4())
    batch_result = BatchRunResult(
        run_id=run_id,
        mode=req.mode,
        model_label=model_label,
        total=total,
        correct=correct_count,
        accuracy=round(accuracy, 4),
        avg_latency_ms=round(avg_latency, 1),
        total_cost_usd=round(total_cost, 6),
        results=list(results),
        confusion_matrix=ConfusionMatrix(labels=all_labels, matrix=matrix),
    )
    _batch_results[run_id] = batch_result
    return batch_result


@router.get("/{run_id}", response_model=BatchRunResult)
def get_run(run_id: str):
    result = _batch_results.get(run_id)
    if not result:
        raise HTTPException(404, f"Batch run {run_id!r} not found")
    return result
