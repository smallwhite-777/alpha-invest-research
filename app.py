from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent / "python-backend"
BACKEND_APP_PATH = BACKEND_DIR / "app.py"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

spec = importlib.util.spec_from_file_location("python_backend_app", BACKEND_APP_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Unable to load backend app from {BACKEND_APP_PATH}")

module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

app = module.app
