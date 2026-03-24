from backend.models.schemas import ModelConfigSchema, TokenUsage


def compute_cost(model: ModelConfigSchema, tokens: TokenUsage) -> float:
    """Return estimated cost in USD for a given token usage."""
    input_cost = (tokens.input / 1_000_000) * model.cost_per_1m_input_tokens
    output_cost = (tokens.output / 1_000_000) * model.cost_per_1m_output_tokens
    return round(input_cost + output_cost, 8)


def sum_costs(costs: list[float]) -> float:
    return round(sum(costs), 8)
