from fastapi import APIRouter, HTTPException
from backend.models.schemas import ClassifyRequest, FlatResultSchema, HierarchicalResultSchema
from backend.services.classifier_flat import classify_flat
from backend.services.classifier_hierarchical import classify_hierarchical
from backend.services import model_store, intent_tree_store

router = APIRouter(prefix="/classify", tags=["classify"])


@router.post("", response_model=FlatResultSchema | HierarchicalResultSchema)
async def classify(req: ClassifyRequest):
    tree = intent_tree_store.get_tree()

    if req.mode == "flat":
        if not req.large_llm_id:
            raise HTTPException(400, "large_llm_id is required for flat mode")
        model = model_store.get_by_id(req.large_llm_id)
        if not model:
            raise HTTPException(404, f"Model {req.large_llm_id!r} not found")
        return await classify_flat(req.query, model, tree, use_cache=req.use_cache)

    else:  # hierarchical
        if not req.small_llm_ids:
            raise HTTPException(400, "small_llm_ids is required for hierarchical mode")
        models = [model_store.get_by_id(mid) for mid in req.small_llm_ids]
        missing = [mid for mid, m in zip(req.small_llm_ids, models) if m is None]
        if missing:
            raise HTTPException(404, f"Models not found: {missing}")
        models = [m for m in models if m]

        # Optional backup model (large LLM for fallback)
        backup = None
        if req.large_llm_id:
            backup = model_store.get_by_id(req.large_llm_id)

        return await classify_hierarchical(
            req.query,
            models,
            tree,
            ensemble_method=req.ensemble_method,
            confidence_threshold=req.confidence_threshold,
            use_cache=req.use_cache,
            backup_model=backup,
        )


@router.get("/intent-tree")
async def get_intent_tree():
    tree = intent_tree_store.get_tree()
    all_leaves = [
        intent
        for domain_cats in tree.values()
        for intents in domain_cats.values()
        for intent in intents
    ]
    return {"tree": tree, "all_leaves": all_leaves}
