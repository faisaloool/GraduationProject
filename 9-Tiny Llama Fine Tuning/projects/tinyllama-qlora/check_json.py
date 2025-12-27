import glob
import json

DATA_DIR = "./data"  # same as in train.py

json_files = glob.glob(f"{DATA_DIR}/*.json")
errors_found = False

for json_file in json_files:
    try:
        with open(json_file, "r", encoding="utf-8") as f:
            json.load(f)
    except json.JSONDecodeError as e:
        errors_found = True
        print(f"❌ Invalid JSON: {json_file} -> {e}")

if not errors_found:
    print("✅ All JSON files are valid!")
else:
    print("⚠️ Some JSON files have errors. Fix them before training.")

