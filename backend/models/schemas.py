from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class TokenUsage(BaseModel):
    input: int = 0
    output: int = 0


class VoteSchema(BaseModel):
    model_id: str
    choice: str
    confidence: float
    reasoning: str


class ClassifyStepSchema(BaseModel):
    level: Literal["domain", "category", "intent"]
    chosen: str
    confidence: float
    reasoning: str
    candidates: list[str]
    votes: list[VoteSchema]
    ensemble_method: str
    latency_ms: int
    tokens: TokenUsage


class FlatResultSchema(BaseModel):
    mode: Literal["flat"] = "flat"
    query: str
    final_intent: str
    domain: str
    category: str
    confidence: float
    min_step_confidence: Optional[float] = None
    reasoning: str
    model_used: str
    tokens: TokenUsage
    cost_usd: float
    latency_ms: int
    cache_hit: bool = False
    fallback_triggered: bool = False
    fallback_reason: Optional[str] = None


class HierarchicalResultSchema(BaseModel):
    mode: Literal["hierarchical"] = "hierarchical"
    query: str
    final_intent: str
    domain: str
    category: str
    confidence: float
    min_step_confidence: float
    steps: list[ClassifyStepSchema]
    total_latency_ms: int
    total_cost_usd: float
    tokens_total: TokenUsage
    cache_hit: bool = False
    fallback_triggered: bool = False
    fallback_reason: Optional[str] = None
    fallback_step_used: Optional[int] = None


class CandidateIntent(BaseModel):
    intent: str
    domain: str
    category: str
    similarity_score: float


class HybridResultSchema(BaseModel):
    mode: Literal["hybrid"] = "hybrid"
    query: str
    final_intent: str
    domain: str
    category: str
    confidence: float
    reasoning: str
    model_used: str
    tokens: TokenUsage
    cost_usd: float
    latency_ms: int
    embedding_latency_ms: int = 0
    query_words: list[str] = []
    candidate_intents: list[CandidateIntent] = []
    cache_hit: bool = False
    fallback_triggered: bool = False
    fallback_reason: Optional[str] = None


class ClassifyRequest(BaseModel):
    query: str
    mode: Literal["hierarchical", "flat", "hybrid"]
    small_llm_ids: list[str] = []
    large_llm_id: Optional[str] = None
    use_cache: bool = True
    ensemble_method: Literal["majority", "weighted"] = "weighted"
    confidence_threshold: float = 0.5


class ModelConfigSchema(BaseModel):
    id: str
    display_name: str
    provider: Literal["openai", "anthropic"]
    model_name: str
    api_key: str
    size: Literal["small", "large"]
    cost_per_1m_input_tokens: float = 0.0
    cost_per_1m_output_tokens: float = 0.0
    max_tokens: int = 20000
    temperature: float = 0.0
    enabled: bool = True
    # Set to False for models that don't support JSON mode (e.g. GPT-5, o-series)
    use_json_mode: bool = True


class ModelConfigCreate(BaseModel):
    display_name: str
    provider: Literal["openai", "anthropic"]
    model_name: str
    api_key: str
    size: Literal["small", "large"]
    cost_per_1m_input_tokens: float = 0.0
    cost_per_1m_output_tokens: float = 0.0
    max_tokens: int = 20000
    temperature: float = 0.0
    enabled: bool = True
    use_json_mode: bool = True


class TestCaseSchema(BaseModel):
    id: str
    input_prompt: str
    expected_domain: str
    expected_category: str
    expected_final_intent: str
    adversarial: bool = False
    notes: Optional[str] = None


class TestCaseCreate(BaseModel):
    input_prompt: str
    expected_domain: str
    expected_category: str
    expected_final_intent: str
    adversarial: bool = False
    notes: Optional[str] = None


class BatchTestResult(BaseModel):
    test_case_id: str
    input_prompt: str
    expected_intent: str
    predicted_intent: str
    correct: bool
    confidence: float
    latency_ms: int
    cost_usd: float
    fallback_triggered: bool = False


class ConfusionMatrix(BaseModel):
    labels: list[str]
    matrix: list[list[int]]


class BatchRunResult(BaseModel):
    run_id: str
    mode: str
    model_label: str
    total: int
    correct: int
    accuracy: float
    avg_latency_ms: float
    total_cost_usd: float
    results: list[BatchTestResult]
    confusion_matrix: ConfusionMatrix


class BatchRunRequest(BaseModel):
    mode: Literal["hierarchical", "flat", "hybrid"]
    small_llm_ids: list[str] = []
    large_llm_id: Optional[str] = None
    test_case_ids: list[str] | Literal["all"] = "all"
    ensemble_method: Literal["majority", "weighted"] = "weighted"
    confidence_threshold: float = 0.5
    use_cache: bool = True
