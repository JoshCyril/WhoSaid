import os
import sys
import multiprocessing
import uvicorn

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.main import app

if __name__ == "__main__":
    multiprocessing.freeze_support()
    print("=" * 60)
    print("  Starting Who Said - Local Video Transcriber & Speaker Captions")
    print("  Running offline on CPU at http://127.0.0.1:8000")
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False, log_level="info")

