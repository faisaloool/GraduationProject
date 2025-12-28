import os
import glob
import json
import random
from collections import defaultdict
import torch
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training
)

# =========================
# CONFIG
# =========================
MODEL_ID = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
DATA_DIR = "./data"       # Folder containing JSON / JSONL
OUTPUT_DIR = "./output"
MAX_LENGTH = 2048

# =========================
# TOKENIZER
# =========================
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, use_fast=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

# =========================
# MODEL (8-bit QLoRA + gradient checkpointing)
# =========================
bnb_config = BitsAndBytesConfig(load_in_8bit=True)

try:
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map="sequential",   # safer for 3070 Ti
    )
except RuntimeError:
    print("⚠️ GPU memory allocation failed, falling back to CPU offload...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        device_map={"": "cpu"},
        offload_folder="./offload",
        offload_state_dict=True
    )

model.config.use_cache = False
model = prepare_model_for_kbit_training(model)
model.gradient_checkpointing_enable()

# =========================
# LoRA CONFIG
# =========================
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=["q_proj", "v_proj"]
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# =========================
# LOAD JSON / JSONL FILES
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
            # try JSONL line by line
            f.seek(0)
            for line_num, line in enumerate(f, start=1):
                if line.strip():
                    try:
                        all_examples.append(json.loads(line.strip()))
                    except json.JSONDecodeError as e:
                        print(f"⚠️ Skipping invalid line {line_num} in {json_file}: {e}")

if not all_examples:
    raise ValueError("No valid examples found in your JSON/JSONL files.")

# =========================
# BALANCE BY QUESTION TYPE
# =========================
type_groups = defaultdict(list)
for ex in all_examples:
    qtype = ex.get("question_type", "UNKNOWN")
    type_groups[qtype].append(ex)

min_count = min(len(v) for v in type_groups.values())
balanced_examples = []
for qtype, examples in type_groups.items():
    if len(examples) > min_count:
        examples = random.sample(examples, min_count)
    balanced_examples.extend(examples)

random.shuffle(balanced_examples)
dataset = Dataset.from_list(balanced_examples)

# Train/validation split
dataset = dataset.train_test_split(test_size=0.05)
train_dataset = dataset["train"]
eval_dataset = dataset["test"]

print(f"✅ Dataset balanced by question_type. Each type has {min_count} examples.")

# =========================
# PROMPT FORMATTER
# =========================
def format_prompt(example):
    prompt = f"""You are an AI that generates exam questions from documents.

DOCUMENT:
{example['document']}

QUESTION TYPE:
{example['question_type']}

INSTRUCTIONS:
- Generate up to 25 questions
- Output ONLY valid JSON
- Follow this schema strictly

SCHEMA:
{{
  "questions": [
    {{
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "answer": "string"
    }}
  ]
}}

OUTPUT:
"""
    response = json.dumps(example["output"], ensure_ascii=False)
    return {"text": prompt + response}

train_dataset = train_dataset.map(format_prompt, remove_columns=train_dataset.column_names)
eval_dataset = eval_dataset.map(format_prompt, remove_columns=eval_dataset.column_names)

# =========================
# TOKENIZATION
# =========================
def tokenize(batch):
    tokens = tokenizer(
        batch["text"],
        truncation=True,
        padding="max_length",
        max_length=MAX_LENGTH
    )
    tokens["labels"] = tokens["input_ids"].copy()
    return tokens

train_dataset = train_dataset.map(tokenize, batched=True)
eval_dataset = eval_dataset.map(tokenize, batched=True)

# =========================
# DATA COLLATOR
# =========================
data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

# =========================
# TRAINING ARGUMENTS
# =========================
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    num_train_epochs=3,
    save_strategy="steps",
    save_steps=500,
    save_total_limit=3,
    logging_steps=10,
    fp16=True,
    optim="paged_adamw_8bit",
    report_to="none",
    remove_unused_columns=False
)

# =========================
# TRAINER
# =========================
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=data_collator
)

# =========================
# RESUME CHECKPOINT
# =========================
checkpoint = None
if os.path.isdir(OUTPUT_DIR):
    checkpoints = [
        os.path.join(OUTPUT_DIR, d)
        for d in os.listdir(OUTPUT_DIR)
        if d.startswith("checkpoint-")
    ]
    if checkpoints:
        checkpoint = sorted(checkpoints, key=lambda x: int(x.split("-")[-1]))[-1]
        print(f"🔁 Resuming from {checkpoint}")

# =========================
# TRAIN
# =========================
trainer.train(resume_from_checkpoint=checkpoint)

# =========================
# SAVE FINAL LoRA ADAPTER
# =========================
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print("✅ Training complete. LoRA adapter saved.")
