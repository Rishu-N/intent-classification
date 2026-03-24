def normalize(raw: float | int | str) -> float:
    """Normalize a raw confidence value from an LLM to [0.0, 1.0]."""
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return 0.5  # default when parsing fails

    # If model returned a percentage (e.g., 85 instead of 0.85)
    if value > 1.0:
        value = value / 100.0

    # Clip to [0, 1]
    return max(0.0, min(1.0, value))


def joint_confidence(confidences: list[float]) -> float:
    """Product of per-step confidences — joint probability of the full path."""
    result = 1.0
    for c in confidences:
        result *= c
    return result
