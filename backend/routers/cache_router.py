from fastapi import APIRouter
from backend.services.cache import cache

router = APIRouter(prefix="/cache", tags=["cache"])


@router.get("")
def get_cache_stats():
    return cache.stats()


@router.delete("")
def clear_cache():
    cache.clear()
    return {"message": "Cache cleared"}
