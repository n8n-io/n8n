FROM python:3.12-slim

RUN pip install --no-cache-dir kent flask-cors

EXPOSE 8000

COPY kent_cors.py /app/kent_cors.py

CMD ["python", "/app/kent_cors.py"]
