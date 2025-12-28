import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

base_model_path = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
adapter_path = "./output"  # The folder where your trainer saved the model
merged_path = "./tinyllama-merged-fp16"

print("Loading base model...")
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_path,
    torch_dtype=torch.float16,
    device_map="cpu", # Merging on CPU is safer for VRAM
)

print("Loading adapters and merging...")
model = PeftModel.from_pretrained(base_model, adapter_path)
merged_model = model.merge_and_unload()

print(f"Saving merged model to {merged_path}...")
merged_model.save_pretrained(merged_path)

tokenizer = AutoTokenizer.from_pretrained(base_model_path)
tokenizer.save_pretrained(merged_path)

print("✅ Merged model saved!")
