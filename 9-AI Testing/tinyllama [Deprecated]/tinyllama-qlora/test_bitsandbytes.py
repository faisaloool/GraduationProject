import torch
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

MODEL_ID = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

bnb_config = BitsAndBytesConfig(load_in_8bit=True)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    device_map="sequential"  # safer on 3070 Ti
)

print("✅ Loaded 8-bit model successfully")
