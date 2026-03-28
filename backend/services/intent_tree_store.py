"""Loads and serves the intent tree from JSON."""
import json
from pathlib import Path

_DATA_FILE = Path(__file__).parent.parent / "data" / "intent_tree.json"
_tree: dict = {}


def initialize() -> None:
    global _tree
    _tree = json.loads(_DATA_FILE.read_text())


def get_tree() -> dict:
    """Returns the flat tree: {domain: {category: [intent_names]}} for backwards compatibility."""
    return {
        domain: {
            category: list(cat_data["intents"].keys())
            for category, cat_data in domain_data["categories"].items()
        }
        for domain, domain_data in _tree.items()
    }


def get_domains_with_desc() -> dict[str, str]:
    """Returns {domain_name: description}."""
    return {domain: data["description"] for domain, data in _tree.items()}


def get_categories_with_desc(domain: str) -> dict[str, str]:
    """Returns {category_name: description} for the given domain."""
    return {
        cat: cat_data["description"]
        for cat, cat_data in _tree.get(domain, {}).get("categories", {}).items()
    }


def get_intents_with_desc(domain: str, category: str) -> dict[str, str]:
    """Returns {intent_name: description} for the given domain and category."""
    intents = (
        _tree.get(domain, {})
        .get("categories", {})
        .get(category, {})
        .get("intents", {})
    )
    return {
        name: (data["description"] if isinstance(data, dict) else data)
        for name, data in intents.items()
    }


def get_intents_full(domain: str, category: str) -> dict[str, dict]:
    """Returns {intent_name: {description, examples}} for the given domain and category."""
    intents = (
        _tree.get(domain, {})
        .get("categories", {})
        .get(category, {})
        .get("intents", {})
    )
    result = {}
    for name, data in intents.items():
        if isinstance(data, dict):
            result[name] = data
        else:
            result[name] = {"description": data, "examples": []}
    return result


def get_domain_examples(domain: str) -> list[str]:
    return _tree.get(domain, {}).get("examples", [])


def get_category_examples(domain: str, category: str) -> list[str]:
    return _tree.get(domain, {}).get("categories", {}).get(category, {}).get("examples", [])


def get_full_tree() -> dict:
    """Returns the raw structured tree with all descriptions and examples."""
    return _tree
