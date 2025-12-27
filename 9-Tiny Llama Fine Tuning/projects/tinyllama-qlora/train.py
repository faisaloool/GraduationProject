import os
import glob
import json
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
DATA_DIR = "./data"       # Folder containing all JSON files
OUTPUT_DIR = "./output"
MAX_LENGTH = 2048

# =========================
# TOKENIZER
# =========================
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, use_fast=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

# =========================
# MODEL (4-bit QLoRA)
# =========================
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    device_map="auto"
)

model.config.use_cache = False
model = prepare_model_for_kbit_training(model)

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
# LOAD MULTIPLE JSON FILES AS RAW TEXT
# =========================
json_files = glob.glob(f"{DATA_DIR}/*.json")
all_examples = []

for json_file in json_files:
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        all_examples.extend(data)

dataset = Dataset.from_list(all_examples)

# Optional: shuffle and split train/validation
dataset = dataset.shuffle(seed=42)
dataset = dataset.train_test_split(test_size=0.05)
train_dataset = dataset["train"]
eval_dataset = dataset["test"]

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
    # Convert the nested questions array to JSON string
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
