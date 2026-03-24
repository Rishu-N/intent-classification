from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from backend.models.schemas import ModelConfigSchema, VoteSchema
from backend.utils.confidence import normalize


@dataclass
class EnsembleResult:
    winner: str
    confidence: float
    method_used: str
    vote_distribution: dict
    agreement_ratio: float
    votes: list[VoteSchema]


def run_ensemble(
    votes: list[VoteSchema],
    models: list[ModelConfigSchema],
    method: Literal["majority", "weighted"] = "weighted",
) -> EnsembleResult:
    """Compute ensemble winner from votes using the specified method."""
    if not votes:
        raise ValueError("No votes to ensemble")

    if method == "majority":
        return _majority_vote(votes)
    else:
        return _weighted_vote(votes, models)


def _majority_vote(votes: list[VoteSchema]) -> EnsembleResult:
    counts: dict[str, list[float]] = {}
    for v in votes:
        counts.setdefault(v.choice, []).append(v.confidence)

    # Winner = most votes; tiebreak by highest mean confidence
    winner = max(
        counts,
        key=lambda c: (len(counts[c]), sum(counts[c]) / len(counts[c])),
    )
    winner_count = len(counts[winner])
    total = len(votes)
    confidence = winner_count / total

    dist = {
        choice: {"count": len(confs), "mean_confidence": sum(confs) / len(confs)}
        for choice, confs in counts.items()
    }

    return EnsembleResult(
        winner=winner,
        confidence=confidence,
        method_used="majority",
        vote_distribution=dist,
        agreement_ratio=winner_count / total,
        votes=votes,
    )


def _weighted_vote(
    votes: list[VoteSchema], models: list[ModelConfigSchema]
) -> EnsembleResult:
    model_cost_map = {m.id: m.cost_per_1m_output_tokens for m in models}
    max_cost = max(model_cost_map.values()) if model_cost_map else 1.0
    if max_cost == 0:
        max_cost = 1.0

    weights: dict[str, float] = {}
    vote_counts: dict[str, int] = {}

    for v in votes:
        cost = model_cost_map.get(v.model_id, 0.0)
        cost_norm = cost / max_cost if max_cost > 0 else 1.0
        # Ensure every vote contributes at least some weight
        if cost_norm == 0:
            cost_norm = 0.5
        weight = cost_norm * normalize(v.confidence)
        weights[v.choice] = weights.get(v.choice, 0.0) + weight
        vote_counts[v.choice] = vote_counts.get(v.choice, 0) + 1

    total_weight = sum(weights.values())
    winner = max(weights, key=lambda c: weights[c])
    confidence = weights[winner] / total_weight if total_weight > 0 else 0.0

    dist = {
        choice: {"count": vote_counts[choice], "total_weight": round(w, 6)}
        for choice, w in weights.items()
    }

    return EnsembleResult(
        winner=winner,
        confidence=round(confidence, 4),
        method_used="weighted",
        vote_distribution=dist,
        agreement_ratio=vote_counts[winner] / len(votes),
        votes=votes,
    )
