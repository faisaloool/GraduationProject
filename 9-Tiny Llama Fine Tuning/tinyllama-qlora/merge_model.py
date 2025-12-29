import torch
import os
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

# Your specific paths
base_model_id = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
adapter_path = "/home/kat-iv/Documents/GitHub/GraduationProject/9-Tiny Llama Fine Tuning/projects/tinyllama-qlora/output"
merged_path = "/home/kat-iv/Documents/GitHub/GraduationProject/9-Tiny Llama Fine Tuning/projects/tinyllama-qlora/tinyllama-merged-fp16"

print(f"Loading base model: {base_model_id}")
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_id,
    torch_dtype=torch.float16,
    device_map="cpu",  # Merging on CPU saves GPU VRAM for other tasks
)

print(f"Loading adapters from: {adapter_path}")
# This loads the trained LoRA weights and attaches them to the base model
model = PeftModel.from_pretrained(base_model, adapter_path)

print("Merging weights... (This may take a minute)")
# This 'fuses' the LoRA layers into the base weights permanently
merged_model = model.merge_and_unload()

print(f"Saving merged model to: {merged_path}")
os.makedirs(merged_path, exist_ok=True)
merged_model.save_pretrained(merged_path)

# Save the tokenizer as well so llama.cpp knows how to handle text
tokenizer = AutoTokenizer.from_pretrained(base_model_id)
tokenizer.save_pretrained(merged_path)

print("✅ Merging complete! You can now use this folder for GGUF conversion.")