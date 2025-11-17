FROM python:3.9.19

RUN useradd --create-home appuser
WORKDIR /app/
RUN chown -R appuser:appuser /app/

USER appuser

RUN pip install --upgrade pip
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt --index-url https://pypi.org/simple

COPY FLAgent.py FLClient.py model_manager.py utils.py preprocessor.py ./
COPY config/ config/
COPY datasets/ datasets/

CMD ["python", "FLAgent.py"]
