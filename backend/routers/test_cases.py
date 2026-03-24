from fastapi import APIRouter, HTTPException
from backend.models.schemas import TestCaseCreate, TestCaseSchema
from backend.services import test_case_store

router = APIRouter(prefix="/test-cases", tags=["test-cases"])


@router.get("", response_model=list[TestCaseSchema])
def list_test_cases():
    return test_case_store.list_all()


@router.post("", response_model=TestCaseSchema, status_code=201)
def create_test_case(data: TestCaseCreate):
    return test_case_store.create(data)


@router.put("/{case_id}", response_model=TestCaseSchema)
def update_test_case(case_id: str, data: TestCaseCreate):
    result = test_case_store.update(case_id, data)
    if not result:
        raise HTTPException(404, f"Test case {case_id!r} not found")
    return result


@router.delete("/{case_id}", status_code=204)
def delete_test_case(case_id: str):
    if not test_case_store.delete(case_id):
        raise HTTPException(404, f"Test case {case_id!r} not found")
