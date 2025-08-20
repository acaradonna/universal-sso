FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
EXPOSE 5000
CMD ["sh", "-c", ". .venv/bin/activate && python app.py"]
