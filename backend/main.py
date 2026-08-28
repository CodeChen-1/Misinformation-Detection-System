import os
import sys

_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import router

# Wire up the FastAPI app — this is the entry point uvicorn loads.
app = FastAPI(title="Misinformation Detection API")

# Let the frontend talk to this API without browser blocking.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all /api/* routes from the api module.
app.include_router(router)


# Quick liveness check — returns "healthy" as long as the app is up.
@app.get("/api/health")
def health():
    return {"status": "healthy"}
