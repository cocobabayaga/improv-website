# Multi-stage Dockerfile for Improv Voice App

# Stage 1: Build Frontend
FROM node:20-alpine as frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend
FROM python:3.11-slim as backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

WORKDIR /app

# Copy backend dependency files
COPY backend/pyproject.toml backend/poetry.lock* ./
RUN poetry config virtualenvs.create false \
    && poetry install --no-root --only=main --no-interaction --no-ansi
#RUN poetry config virtualenvs.create false \
#    && poetry install --only=main --no-interaction --no-ansi

# Copy backend source
COPY backend/ ./

# Copy built frontend
COPY --from=frontend-builder /frontend/dist ./static

# Expose port
EXPOSE 8000

# Healthcheck for container health status
HEALTHCHECK CMD curl --fail http://localhost:8000/health || exit 1

# Run the application
# CMD ["python", "main.py"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
