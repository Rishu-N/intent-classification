export type Provider = 'openai' | 'anthropic';
export type ModelSize = 'small' | 'large';
export type ClassifyMode = 'hierarchical' | 'flat';
export type Level = 'domain' | 'category' | 'intent';
export type EnsembleMethod = 'majority' | 'weighted';

export interface TokenUsage {
  input: number;
  output: number;
}

export interface ModelConfig {
  id: string;
  display_name: string;
  provider: Provider;
  model_name: string;
  api_key: string;
  size: ModelSize;
  cost_per_1m_input_tokens: number;
  cost_per_1m_output_tokens: number;
  max_tokens: number;
  temperature: number;
  enabled: boolean;
}

export interface ModelConfigCreate {
  display_name: string;
  provider: Provider;
  model_name: string;
  api_key: string;
  size: ModelSize;
  cost_per_1m_input_tokens: number;
  cost_per_1m_output_tokens: number;
  max_tokens: number;
  temperature: number;
  enabled: boolean;
}

export interface Vote {
  model_id: string;
  choice: string;
  confidence: number;
  reasoning: string;
}

export interface ClassifyStep {
  level: Level;
  chosen: string;
  confidence: number;
  reasoning: string;
  candidates: string[];
  votes: Vote[];
  ensemble_method: string;
  latency_ms: number;
  tokens: TokenUsage;
}

export interface FlatResult {
  mode: 'flat';
  query: string;
  final_intent: string;
  domain: string;
  category: string;
  confidence: number;
  reasoning: string;
  model_used: string;
  tokens: TokenUsage;
  cost_usd: number;
  latency_ms: number;
  cache_hit: boolean;
  fallback_triggered: boolean;
  fallback_reason: string | null;
}

export interface HierarchicalResult {
  mode: 'hierarchical';
  query: string;
  final_intent: string;
  domain: string;
  category: string;
  confidence: number;
  min_step_confidence: number;
  steps: ClassifyStep[];
  total_latency_ms: number;
  total_cost_usd: number;
  tokens_total: TokenUsage;
  cache_hit: boolean;
  fallback_triggered: boolean;
  fallback_reason: string | null;
  fallback_step_used: number | null;
}

export type ClassifyResult = FlatResult | HierarchicalResult;

export interface ClassifyRequest {
  query: string;
  mode: ClassifyMode;
  small_llm_ids: string[];
  large_llm_id: string | null;
  use_cache: boolean;
  ensemble_method: EnsembleMethod;
  confidence_threshold: number;
}

export interface TestCase {
  id: string;
  input_prompt: string;
  expected_domain: string;
  expected_category: string;
  expected_final_intent: string;
  adversarial: boolean;
  notes: string | null;
}

export interface TestCaseCreate {
  input_prompt: string;
  expected_domain: string;
  expected_category: string;
  expected_final_intent: string;
  adversarial: boolean;
  notes: string | null;
}

export interface BatchTestResult {
  test_case_id: string;
  input_prompt: string;
  expected_intent: string;
  predicted_intent: string;
  correct: boolean;
  confidence: number;
  latency_ms: number;
  cost_usd: number;
  fallback_triggered: boolean;
}

export interface ConfusionMatrix {
  labels: string[];
  matrix: number[][];
}

export interface BatchRunResult {
  run_id: string;
  mode: string;
  model_label: string;
  total: number;
  correct: number;
  accuracy: number;
  avg_latency_ms: number;
  total_cost_usd: number;
  results: BatchTestResult[];
  confusion_matrix: ConfusionMatrix;
}

export interface BatchRunRequest {
  mode: ClassifyMode;
  small_llm_ids: string[];
  large_llm_id: string | null;
  test_case_ids: string[] | 'all';
  ensemble_method: EnsembleMethod;
  confidence_threshold: number;
  use_cache: boolean;
}

export interface IntentTree {
  tree: Record<string, Record<string, string[]>>;
  all_leaves: string[];
}
