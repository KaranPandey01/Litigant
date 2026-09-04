FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/
COPY data/ data/

WORKDIR /app/backend

# Build the synthetic dataset and train the anomaly-detection model as part
# of the image build, so every deploy ships a freshly trained model rather
# than a committed binary artifact. The generator is seeded (seed=42), so
# this is fully reproducible -- rerunning it locally gives the same dataset.
RUN python ../data/synthetic_dispute_generator.py --n 200 --out dataset.json
RUN python -c "\
import json, sys; \
sys.path.insert(0, '.'); \
from app.ml import anomaly_scorer; \
data = json.load(open('../data/dataset.json')); \
anomaly_scorer.train_and_save(data['train'])"
RUN python scripts/evaluate.py

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]