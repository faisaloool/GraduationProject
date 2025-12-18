import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

MODEL_ID = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

print("🔍 Checking CUDA...")
print("CUDA available:", torch.cuda.is_available())
print("GPU:", torch.cuda.get_device_name(0))
print("Torch CUDA version:", torch.version.cuda)

print("\n📥 Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

print("📦 Loading model in 4-bit (QLoRA-style)...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    load_in_4bit=True,
    device_map="auto"
)

print("✅ Model loaded successfully!")

print("\n🧪 Running a quick inference test...")
prompt = "Explain what QLoRA is in one sentence."

inputs = tokenizer(prompt, return_tensors="pt").to("cuda")

with torch.no_grad():
    outputs = model.generate(
        **inputs,
        max_new_tokens=40,
        do_sample=True
    )

print("\n📝 Model output:")
print(tokenizer.decode(outputs[0], skip_special_tokens=True))

print("\n🎉 Everything works! QLoRA environment is ready.")
