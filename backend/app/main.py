import json
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from .db import SessionLocal
from .routes.api import router
from .services.seed import seed

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("fiscalflow")


@asynccontextmanager
async def lifespan(app):
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(
    title="FiscalFlow API",
    version="1.0.0",
    description="Workflow fiscal demonstrativo. Dados fictícios; seleção de perfis não é autenticação real.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(
        ","
    ),
    allow_methods=["GET", "POST", "PATCH", "PUT"],
    allow_headers=["Content-Type", "X-Demo-User"],
)
app.include_router(router)


@app.exception_handler(HTTPException)
async def http_error(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Dados inválidos. Verifique os campos e formatos.",
            "errors": json.loads(json.dumps(exc.errors(), default=str)),
        },
    )


@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    return JSONResponse(
        status_code=409,
        content={"detail": "Conflito de integridade: registro duplicado ou referência inválida."},
    )


@app.middleware("http")
async def log_requests(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    logger.info(
        json.dumps(
            {
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round((time.perf_counter() - started) * 1000, 1),
            }
        )
    )
    return response
