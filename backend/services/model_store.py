"""In-memory model configuration store backed by a JSON file."""
from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Optional

from backend.models.schemas import ModelConfigCreate, ModelConfigSchema

_DATA_FILE = Path(__file__).parent.parent / "data" / "model_configs.json"
_models: list[ModelConfigSchema] = []


def _load() -> None:
    global _models
    if _DATA_FILE.exists():
        raw = json.loads(_DATA_FILE.read_text())
        _models = [ModelConfigSchema(**m) for m in raw]


def _save() -> None:
    tmp = _DATA_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps([m.model_dump() for m in _models], indent=2))
    os.replace(tmp, _DATA_FILE)


def initialize() -> None:
    _load()


def list_all() -> list[ModelConfigSchema]:
    return list(_models)


def get_by_id(model_id: str) -> Optional[ModelConfigSchema]:
    return next((m for m in _models if m.id == model_id), None)


def create(data: ModelConfigCreate) -> ModelConfigSchema:
    model = ModelConfigSchema(id=str(uuid.uuid4()), **data.model_dump())
    _models.append(model)
    _save()
    return model


def update(model_id: str, data: ModelConfigCreate) -> Optional[ModelConfigSchema]:
    for i, m in enumerate(_models):
        if m.id == model_id:
            updated = ModelConfigSchema(id=model_id, **data.model_dump())
            _models[i] = updated
            _save()
            return updated
    return None


def delete(model_id: str) -> bool:
    global _models
    before = len(_models)
    _models = [m for m in _models if m.id != model_id]
    if len(_models) < before:
        _save()
        return True
    return False
