FROM python:3.9.19

RUN useradd --create-home appuser
WORKDIR /app/
RUN chown -R appuser:appuser /app/

USER appuser

RUN pip install --upgrade pip
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt --index-url https://pypi.org/simple

COPY ai_detection_engine.py model_manager.py utils.py preprocessor.py ./

COPY config/ config/
COPY datasets/ datasets/

EXPOSE 9998

CMD ["python", "ai_detection_engine.py"]
