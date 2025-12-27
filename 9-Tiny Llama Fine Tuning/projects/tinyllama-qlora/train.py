# =========================
# LOAD AND BALANCE DATA
# =========================
json_files = glob.glob(f"{DATA_DIR}/*.json")
all_examples = []

for json_file in json_files:
    with open(json_file, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            if isinstance(data, dict):
                data = [data]
            all_examples.extend(data)
        except json.JSONDecodeError:
            # JSONL fallback
            f.seek(0)
            for line_num, line in enumerate(f, start=1):
                if line.strip():
                    try:
                        all_examples.append(json.loads(line.strip()))
                    except json.JSONDecodeError as e:
                        print(f"⚠️ Skipping invalid line {line_num} in {json_file}: {e}")

if not all_examples:
    raise ValueError("No valid examples found in your JSON/JSONL files.")

# -------------------------
# BALANCE BY QUESTION TYPE
# -------------------------
from collections import defaultdict
import random

# Group examples by type
type_groups = defaultdict(list)
for ex in all_examples:
    qtype = ex.get("question_type", "UNKNOWN")
    type_groups[qtype].append(ex)

# Find minimum count
min_count = min(len(v) for v in type_groups.values())

# Downsample each type to min_count
balanced_examples = []
for qtype, examples in type_groups.items():
    if len(examples) > min_count:
        examples = random.sample(examples, min_count)
    balanced_examples.extend(examples)

# Shuffle final balanced dataset
random.shuffle(balanced_examples)

# Convert to HF Dataset
dataset = Dataset.from_list(balanced_examples)

# Split train / validation
dataset = dataset.train_test_split(test_size=0.05)
train_dataset = dataset["train"]
eval_dataset = dataset["test"]

print(f"✅ Dataset balanced by question_type. Each type has {min_count} examples.")
