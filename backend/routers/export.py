import csv
import io
import json
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from backend.routers.batch import get_batch_result

router = APIRouter(prefix="/export", tags=["export"])


@router.get("")
def export_results(
    run_id: str = Query(..., description="Batch run ID to export"),
    format: Literal["csv", "json"] = Query("csv", description="Export format"),
):
    result = get_batch_result(run_id)
    if not result:
        raise HTTPException(404, f"Batch run {run_id!r} not found")

    if format == "json":
        content = result.model_dump_json(indent=2)
        return StreamingResponse(
            io.StringIO(content),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=batch_{run_id[:8]}.json"},
        )

    # CSV export
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "test_case_id", "input_prompt", "expected_intent", "predicted_intent",
        "correct", "confidence", "latency_ms", "cost_usd", "fallback_triggered",
    ])
    for r in result.results:
        writer.writerow([
            r.test_case_id,
            r.input_prompt,
            r.expected_intent,
            r.predicted_intent,
            r.correct,
            r.confidence,
            r.latency_ms,
            r.cost_usd,
            r.fallback_triggered,
        ])
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=batch_{run_id[:8]}.csv"},
    )
