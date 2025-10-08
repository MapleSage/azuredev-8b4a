FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent_app.py .
COPY azure_agent_tools/ ./azure_agent_tools/

# Create KB directories
RUN mkdir -p kb1-customer-policy kb2-underwriting-docs kb3-fsi-docs kb4-claims-docs kb5-research-docs

EXPOSE 8000

CMD ["uvicorn", "agent_app:app", "--host", "0.0.0.0", "--port", "8000"]