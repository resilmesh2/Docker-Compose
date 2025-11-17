FROM python:3.9.19

RUN useradd --create-home appuser
WORKDIR /app/

USER appuser

COPY requirements.txt /app/

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt --index-url https://pypi.org/simple && \
    pip install absl-py

COPY FLAggregator.py CustomDPFedAvg.py utils.py ./
COPY config/ config/

EXPOSE 9999

CMD ["python", "FLAggregator.py"]
