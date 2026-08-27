from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.db import Base, engine
from app.api import disputes, decisions, audit, metrics

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(disputes.router)
app.include_router(decisions.router)
app.include_router(audit.router)
app.include_router(metrics.router)


@app.get("/health")
def health():
    return {"status": "ok", "project": settings.PROJECT_NAME}
