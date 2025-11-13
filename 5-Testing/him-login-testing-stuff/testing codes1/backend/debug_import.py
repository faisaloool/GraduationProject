#!/usr/bin/env python
import sys
import traceback

try:
    print("Attempting to import main...")
    import main
    print("Successfully imported main!")
    print("FastAPI app:", main.app)
except Exception as e:
    print(f"ERROR: {e}")
    traceback.print_exc()
    sys.exit(1)
