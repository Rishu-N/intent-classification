from __future__ import annotations

import hashlib
import json
import math
import re
import time
from dataclasses import dataclass

EMBEDDING_MODEL = "text-embedding-3-small"

STOP_WORDS = frozenset({
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "must", "can", "could", "i", "me", "my",
    "mine", "we", "our", "ours", "you", "your", "yours", "he", "him",
    "his", "she", "her", "hers", "it", "its", "they", "them", "their",
    "theirs", "what", "which", "who", "whom", "this", "that", "these",
    "those", "am", "in", "on", "at", "to", "for", "of", "with", "by",
    "from", "as", "into", "through", "during", "before", "after", "and",
    "but", "or", "nor", "not", "so", "very", "just", "about", "up",
    "out", "if", "then", "than", "too", "also", "how", "when", "where",
    "why", "all", "each", "every", "both", "few", "more", "most", "some",
    "any", "no", "only", "own", "same", "such", "here", "there",
})

TOP_K_PER_WORD = 3


@dataclass
class IntentEntry:
    domain: str
    category: str
    intent: str
    path: str  # "Domain > Category > Intent"
    embedding: list[float] | None = None


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _tree_hash(tree: dict) -> str:
    return hashlib.sha256(json.dumps(tree, sort_keys=True).encode()).hexdigest()


def tokenize_query(query: str) -> list[str]:
    """Split query into meaningful words, filtering stop words."""
    words = re.findall(r"[a-zA-Z]+", query.lower())
    filtered = [w for w in words if w not in STOP_WORDS]
    # If all words are stop words, use original words to avoid empty list
    return filtered if filtered else words


class EmbeddingStore:
    def __init__(self) -> None:
        self._entries: list[IntentEntry] = []
        self._tree_hash: str | None = None
        self._word_cache: dict[str, list[float]] = {}

    def _build_entries(self, tree: dict) -> list[IntentEntry]:
        entries = []
        for domain, categories in tree.items():
            for category, intents in categories.items():
                for intent in intents:
                    path = f"{domain} > {category} > {intent}"
                    entries.append(IntentEntry(
                        domain=domain,
                        category=category,
                        intent=intent,
                        path=path,
                    ))
        return entries

    async def _get_embeddings(self, texts: list[str], api_key: str) -> list[list[float]]:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        response = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texts,
        )
        return [item.embedding for item in response.data]

    async def ensure_initialized(self, tree: dict, api_key: str) -> None:
        """Compute and cache intent embeddings if the tree has changed."""
        h = _tree_hash(tree)
        if self._tree_hash == h and all(e.embedding is not None for e in self._entries):
            return

        self._entries = self._build_entries(tree)
        paths = [e.path for e in self._entries]
        embeddings = await self._get_embeddings(paths, api_key)
        for entry, emb in zip(self._entries, embeddings):
            entry.embedding = emb
        self._tree_hash = h
        self._word_cache.clear()

    async def query_by_words(
        self, query: str, api_key: str
    ) -> tuple[list[dict], list[str], int]:
        """
        Split query into words, embed each, find top-3 intents per word.
        Returns (candidates, words_used, embedding_latency_ms).
        Each candidate is {intent, domain, category, similarity_score}.
        """
        start = time.monotonic()
        words = tokenize_query(query)

        # Determine which words need embedding (not in cache)
        words_to_embed = [w for w in words if w not in self._word_cache]
        if words_to_embed:
            new_embeddings = await self._get_embeddings(words_to_embed, api_key)
            for word, emb in zip(words_to_embed, new_embeddings):
                self._word_cache[word] = emb

        # For each word, find top-3 most similar intents
        best_by_intent: dict[str, dict] = {}  # intent_path -> best candidate dict

        for word in words:
            word_emb = self._word_cache[word]
            scored = []
            for entry in self._entries:
                if entry.embedding is None:
                    continue
                sim = _cosine_similarity(word_emb, entry.embedding)
                scored.append((sim, entry))

            scored.sort(key=lambda x: x[0], reverse=True)
            for sim, entry in scored[:TOP_K_PER_WORD]:
                existing = best_by_intent.get(entry.path)
                if existing is None or sim > existing["similarity_score"]:
                    best_by_intent[entry.path] = {
                        "intent": entry.intent,
                        "domain": entry.domain,
                        "category": entry.category,
                        "similarity_score": round(sim, 4),
                    }

        candidates = sorted(
            best_by_intent.values(),
            key=lambda c: c["similarity_score"],
            reverse=True,
        )

        latency_ms = int((time.monotonic() - start) * 1000)
        return candidates, words, latency_ms


embedding_store = EmbeddingStore()
