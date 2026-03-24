"""Loads and serves the intent tree from JSON."""
import json
from pathlib import Path

_DATA_FILE = Path(__file__).parent.parent / "data" / "intent_tree.json"
_tree: dict = {}


def initialize() -> None:
    global _tree
    _tree = json.loads(_DATA_FILE.read_text())


def get_tree() -> dict:
    return _tree
