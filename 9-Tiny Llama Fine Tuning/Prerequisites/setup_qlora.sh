#!/bin/bash

# =========================
# Auto Installer for QLoRA
# Compatible with RTX 3070 Ti + 8GB VRAM
# =========================

set -e

ENV_DIR="$HOME/qlora-env310"
DATA_DIR="$HOME/projects/tinyllama-qlora/data"
OUTPUT_DIR="$HOME/projects/tinyllama-qlora/output"

echo "⚡ Removing old environment if exists..."
rm -rf "$ENV_DIR"

echo "⚡ Installing Python 3.10..."
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.10 python3.10-venv python3.10-dev

echo "⚡ Creating new virtual environment..."
python3.10 -m venv "$ENV_DIR"
source "$ENV_DIR/bin/activate"

echo "⚡ Upgrading pip..."
pip install --upgrade pip

echo "⚡ Installing PyTorch 2.2 + CUDA 11.8..."
pip install torch==2.2.0+cu118 torchvision==0.15.2+cu118 torchaudio==2.2.0+cu118 --extra-index-url https://download.pytorch.org/whl/cu118

echo "⚡ Installing QLoRA dependencies..."
pip install bitsandbytes==0.41.0
pip install transformers==4.40.2
pip install datasets>=2.21.0
pip install accelerate==0.34.0
pip install peft trl

echo "⚡ Creating data and output folders..."
mkdir -p "$DATA_DIR"
mkdir -p "$OUTPUT_DIR"

echo "✅ QLoRA environment is ready!"
echo "Activate it with: source $ENV_DIR/bin/activate"
echo "Put your JSON/JSONL dataset in $DATA_DIR"

