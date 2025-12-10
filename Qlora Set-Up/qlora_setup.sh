#!/bin/bash

echo "==============================="
echo "  QLoRA SETUP FOR UBUNTU 24.04"
echo "  GPU: RTX 3070 Ti (Ampere)"
echo "==============================="

# --- System Update ---
echo "[1/10] Updating system..."
sudo apt update && sudo apt upgrade -y

# --- Essentials ---
echo "[2/10] Installing build essentials..."
sudo apt install -y build-essential python3 python3-venv python3-dev gcc g++ make cmake ninja-build libopenmpi-dev libaio-dev git

# --- NVIDIA Drivers ---
echo "[3/10] Installing NVIDIA driver 550..."
sudo apt install -y nvidia-driver-550
echo "Reboot is required after installation."

# --- CUDA Toolkit ---
echo "[4/10] Installing CUDA Toolkit 12.x..."
sudo apt install -y nvidia-cuda-toolkit
echo "CUDA installation finished."

# --- Python Virtual Environment ---
echo "[5/10] Creating Python virtual env 'qlora-env'..."
python3 -m venv qlora-env
source qlora-env/bin/activate

# --- Upgrade pip ---
echo "[6/10] Upgrading pip..."
pip install --upgrade pip setuptools wheel

# --- PyTorch CUDA ---
echo "[7/10] Installing PyTorch (CUDA 12.1)..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# --- Core ML Libraries ---
echo "[8/10] Installing core ML packages..."
pip install transformers==4.45.0 accelerate==0.34.0 datasets peft bitsandbytes sentencepiece trl

# --- Optional Optimizations ---
echo "[9/10] Installing performance optimizers..."
pip install xformers
pip install flash-attn --no-build-isolation

# --- Tools & Utilities ---
echo "[10/10] Installing helpers..."
pip install tiktoken pandas numpy matplotlib jupyterlab

# --- Verification ---
echo "====================================="
echo "Running post-install checks..."
echo "====================================="

python3 - << 'EOF'
import torch
print("Torch CUDA Available:", torch.cuda.is_available())
print("Torch CUDA Device:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "None")
print("CUDA Version (Torch):", torch.version.cuda)
import bitsandbytes as bnb
print("BitsAndBytes Loaded OK")
EOF

echo "====================================="
echo "QLoRA ENVIRONMENT READY!"
echo "Activate environment with:"
echo "  source qlora-env/bin/activate"
echo "====================================="

