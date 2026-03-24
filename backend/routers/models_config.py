from fastapi import APIRouter, HTTPException
from backend.models.schemas import ModelConfigCreate, ModelConfigSchema
from backend.services import model_store

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=list[ModelConfigSchema])
def list_models():
    return model_store.list_all()


@router.post("", response_model=ModelConfigSchema, status_code=201)
def create_model(data: ModelConfigCreate):
    return model_store.create(data)


@router.put("/{model_id}", response_model=ModelConfigSchema)
def update_model(model_id: str, data: ModelConfigCreate):
    result = model_store.update(model_id, data)
    if not result:
        raise HTTPException(404, f"Model {model_id!r} not found")
    return result


@router.delete("/{model_id}", status_code=204)
def delete_model(model_id: str):
    if not model_store.delete(model_id):
        raise HTTPException(404, f"Model {model_id!r} not found")
