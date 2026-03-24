from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass

from backend.models.schemas import ModelConfigSchema, TokenUsage


class LLMCallError(Exception):
    def __init__(self, model_id: str, reason: str) -> None:
        self.model_id = model_id
        self.reason = reason
        super().__init__(f"LLM call failed for {model_id}: {reason}")


@dataclass
class LLMResponse:
    content: str
    input_tokens: int
    output_tokens: int
    latency_ms: int

    @property
    def tokens(self) -> TokenUsage:
        return TokenUsage(input=self.input_tokens, output=self.output_tokens)


def _extract_json(text: str) -> dict:
    """Extract first JSON object from text, even if wrapped in markdown."""
    # Strip markdown code fences
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    # Find the first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in response: {text!r}")
    return json.loads(match.group())


async def call_llm(
    model: ModelConfigSchema,
    system_prompt: str,
    user_prompt: str,
) -> LLMResponse:
    start = time.monotonic()
    try:
        if model.provider == "openai":
            return await _call_openai(model, system_prompt, user_prompt, start)
        elif model.provider == "anthropic":
            return await _call_anthropic(model, system_prompt, user_prompt, start)
        else:
            raise LLMCallError(model.id, f"Unknown provider: {model.provider}")
    except LLMCallError:
        raise
    except Exception as exc:
        raise LLMCallError(model.id, str(exc)) from exc


async def _call_openai(
    model: ModelConfigSchema,
    system_prompt: str,
    user_prompt: str,
    start: float,
) -> LLMResponse:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=model.api_key)
    response = await client.chat.completions.create(
        model=model.model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=model.max_tokens,
        temperature=model.temperature,
        response_format={"type": "json_object"},
    )
    latency_ms = int((time.monotonic() - start) * 1000)
    content = response.choices[0].message.content or ""
    usage = response.usage
    return LLMResponse(
        content=content,
        input_tokens=usage.prompt_tokens if usage else 0,
        output_tokens=usage.completion_tokens if usage else 0,
        latency_ms=latency_ms,
    )


async def _call_anthropic(
    model: ModelConfigSchema,
    system_prompt: str,
    user_prompt: str,
    start: float,
) -> LLMResponse:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=model.api_key)
    response = await client.messages.create(
        model=model.model_name,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        max_tokens=model.max_tokens,
    )
    latency_ms = int((time.monotonic() - start) * 1000)
    content = response.content[0].text if response.content else ""
    usage = response.usage
    return LLMResponse(
        content=content,
        input_tokens=usage.input_tokens if usage else 0,
        output_tokens=usage.output_tokens if usage else 0,
        latency_ms=latency_ms,
    )


async def call_llm_parsed(
    model: ModelConfigSchema,
    system_prompt: str,
    user_prompt: str,
) -> tuple[dict, LLMResponse]:
    """Call LLM and parse JSON from the response. Returns (parsed_dict, raw_response)."""
    resp = await call_llm(model, system_prompt, user_prompt)
    try:
        parsed = _extract_json(resp.content)
    except (ValueError, json.JSONDecodeError) as exc:
        raise LLMCallError(model.id, f"Failed to parse JSON: {exc}") from exc
    return parsed, resp
