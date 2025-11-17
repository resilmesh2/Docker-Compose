
FROM --platform=linux/amd64 python:3.11-slim AS production

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-git \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip, setuptools, wheel
RUN pip install --upgrade pip setuptools wheel

# Install PyTorch (CUDA 11.8 versions)
RUN pip install --no-cache-dir torch==2.6.0+cu118 torchvision==0.21.0+cu118 torchaudio==2.6.0+cu118 \
    --extra-index-url https://download.pytorch.org/whl/cu118

# Install remaining dependencies
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt

WORKDIR /app
COPY . .
CMD ["python", "-u", "main.py"]
# CMD ["python", "test.py"]
