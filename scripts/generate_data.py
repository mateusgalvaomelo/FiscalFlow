"""Export current fictitious dataset, or seed an empty migrated database."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.db import SessionLocal  # noqa: E402
from app.services.seed import export_dataset, seed  # noqa: E402

with SessionLocal() as db:
    seed(db)
    path = export_dataset(db)
    print(f"Dataset fictício exportado: {path}")
