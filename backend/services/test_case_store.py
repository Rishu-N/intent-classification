"""In-memory test case store backed by a JSON file."""
from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Optional

from backend.models.schemas import TestCaseCreate, TestCaseSchema

_DATA_FILE = Path(__file__).parent.parent / "data" / "test_cases.json"
_cases: list[TestCaseSchema] = []


def _load() -> None:
    global _cases
    if _DATA_FILE.exists():
        raw = json.loads(_DATA_FILE.read_text())
        _cases = [TestCaseSchema(**c) for c in raw]


def _save() -> None:
    tmp = _DATA_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps([c.model_dump() for c in _cases], indent=2))
    os.replace(tmp, _DATA_FILE)


def initialize() -> None:
    _load()


def list_all() -> list[TestCaseSchema]:
    return list(_cases)


def get_by_id(case_id: str) -> Optional[TestCaseSchema]:
    return next((c for c in _cases if c.id == case_id), None)


def create(data: TestCaseCreate) -> TestCaseSchema:
    case = TestCaseSchema(id=str(uuid.uuid4()), **data.model_dump())
    _cases.append(case)
    _save()
    return case


def update(case_id: str, data: TestCaseCreate) -> Optional[TestCaseSchema]:
    for i, c in enumerate(_cases):
        if c.id == case_id:
            updated = TestCaseSchema(id=case_id, **data.model_dump())
            _cases[i] = updated
            _save()
            return updated
    return None


def delete(case_id: str) -> bool:
    global _cases
    before = len(_cases)
    _cases = [c for c in _cases if c.id != case_id]
    if len(_cases) < before:
        _save()
        return True
    return False
