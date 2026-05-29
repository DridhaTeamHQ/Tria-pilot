FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake the face-swap model into the image so the service works out of the box.
# buffalo_l (detection + recognition) auto-downloads lazily at startup, but
# inswapper_128.onnx does NOT — swap.py errors without it. Fetch it here into
# the exact path swap.py expects: $INSIGHTFACE_MODEL_DIR/models/inswapper_128.onnx.
# If the mirror ever moves, override it: Railway service → Variables →
# INSWAPPER_URL, or `--build-arg INSWAPPER_URL=...`.
ENV INSIGHTFACE_MODEL_DIR=/app/.insightface
ARG INSWAPPER_URL="https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx"
RUN mkdir -p /app/.insightface/models && \
    curl -fSL "$INSWAPPER_URL" -o /app/.insightface/models/inswapper_128.onnx && \
    test -s /app/.insightface/models/inswapper_128.onnx

COPY . .

ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
