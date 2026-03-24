from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.services import model_store, intent_tree_store, test_case_store
from backend.routers import classify, test_cases, models_config, batch, export, cache_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize stores on startup
    intent_tree_store.initialize()
    model_store.initialize()
    test_case_store.initialize()
    yield


app = FastAPI(
    title="Intent Classification POC",
    description="Compare hierarchical (small LLMs) vs flat (large LLM) intent classification",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classify.router)
app.include_router(test_cases.router)
app.include_router(models_config.router)
app.include_router(batch.router)
app.include_router(export.router)
app.include_router(cache_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
