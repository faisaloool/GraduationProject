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
DATA_DIR = "./data"       
OUTPUT_DIR = "./output"
MAX_LENGTH = 2048

# =========================
# TOKENIZER
# =========================
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, use_fast=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

# =========================
# MODEL
# =========================
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True, # Changed to 4bit for better memory efficiency on 3070 Ti
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4"
)

try:
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map="auto", 
    )
except RuntimeError:
    print("⚠️ GPU memory allocation failed, falling back to CPU offload...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        device_map={"": "cpu"},
        offload_folder="./offload"
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
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
)
model = get_peft_model(model, lora_config)

# =========================
# DATA LOADING & NORMALIZATION
# =========================
json_files = glob.glob(f"{DATA_DIR}/*.json")
all_examples = []

def normalize_example(ex):
    """Ensures every example has 'document', 'question_type', and 'output' keys."""
    # 1. Handle Document (The Input)
    # If 'document' is missing but 'question' exists, use the question as context
    if "document" not in ex:
        ex["document"] = ex.get("question", "No document provided.")
    
    # 2. Handle Output (The Target)
    # If the example is flat (has question/answer at top level), wrap it in the expected output format
    if "output" not in ex:
        ex["output"] = {
            "questions": [
                {
                    "question": ex.get("question", ""),
                    "options": ex.get("options", []),
                    "answer": ex.get("answer", "")
                }
            ]
        }
    
    # 3. Handle Type
    if "question_type" not in ex:
        ex["question_type"] = "General"
        
    return ex

for json_file in json_files:
    with open(json_file, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            if isinstance(data, dict):
                data = [data]
            for item in data:
                all_examples.append(normalize_example(item))
        except json.JSONDecodeError:
            f.seek(0)
            for line in f:
                if line.strip():
                    try:
                        all_examples.append(normalize_example(json.loads(line.strip())))
                    except: continue

if not all_examples:
    raise ValueError("No valid examples found.")

# =========================
# BALANCE & DATASET CREATION
# =========================
type_groups = defaultdict(list)
for ex in all_examples:
    type_groups[ex["question_type"]].append(ex)

min_count = min(len(v) for v in type_groups.values())
balanced_examples = []
for qtype, examples in type_groups.items():
    balanced_examples.extend(random.sample(examples, min_count))

random.shuffle(balanced_examples)
full_dataset = Dataset.from_list(balanced_examples)
split = full_dataset.train_test_split(test_size=0.05)
train_dataset = split["train"]
eval_dataset = split["test"]

# =========================
# PROMPT FORMATTER
# =========================
def format_prompt(example):
    prompt = f"""You are an AI that generates exam questions from documents.

DOCUMENT:
{example['document']}

QUESTION TYPE:
{example['question_type']}

OUTPUT:
"""
    # response = target output
    response = json.dumps(example["output"], ensure_ascii=False)
    # TinyLlama Chat template: <|system|>\n...<|user|>\n...<|assistant|>\n...
    full_text = f"<|user|>\n{prompt}</s>\n<|assistant|>\n{response}</s>"
    return {"text": full_text}

# Apply formatting and tokenize immediately to ensure schema consistency
def process_data(batch):
    formatted = [format_prompt(dict(zip(batch.keys(), values))) for values in zip(*batch.values())]
    texts = [f['text'] for f in formatted]
    tokenized = tokenizer(texts, truncation=True, padding="max_length", max_length=MAX_LENGTH)
    tokenized["labels"] = tokenized["input_ids"].copy()
    return tokenized

train_dataset = train_dataset.map(process_data, batched=True, remove_columns=train_dataset.column_names)
eval_dataset = eval_dataset.map(process_data, batched=True, remove_columns=eval_dataset.column_names)

# =========================
# TRAINER
# =========================
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    num_train_epochs=3,
    save_strategy="steps",
    save_steps=100,
    logging_steps=10,
    fp16=True,
    optim="paged_adamw_8bit",
    report_to="none"
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)
)

trainer.train()

# SAVE
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print("✅ Done!")