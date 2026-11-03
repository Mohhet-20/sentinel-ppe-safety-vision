# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base

# System deps needed by OpenCV / Ultralytics at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# The AI stack (ultralytics/torch) is heavy — build with:
#   docker build --build-arg INSTALL_AI=1 .
# to include it, or leave it out for a lightweight image that still serves
# every endpoint (inference just reports "model_not_loaded" until the AI
# stack + backend/models/best.pt are both present).
ARG INSTALL_AI=1
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt \
    $( [ "$INSTALL_AI" = "1" ] && echo "ultralytics==8.3.59" )

COPY . .

RUN mkdir -p uploads reports logs models data

EXPOSE 8000

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
