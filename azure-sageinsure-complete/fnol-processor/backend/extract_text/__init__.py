import json
import logging
from azure.functions import HttpRequest, HttpResponse
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from azure.storage.blob import BlobServiceClient
import os
from collections import defaultdict

def main(req: HttpRequest) -> HttpResponse:
    try:
        req_body = req.get_json()
        container_name = req_body.get('containerName', 'scanning-staging')
        blob_prefix = req_body.get('blobPrefix', '')
        
        # Simulate for demo
        return HttpResponse(
            json.dumps({
                "statusCode": 200,
                "body": blob_prefix,
                "message": "Text extraction completed",
                "extractedText": "Sample insurance document text...",
                "keyValuePairs": {
                    "CLAIM #": "CLM-12345",
                    "POLICY #": "POL-67890", 
                    "INSURED": "John Doe",
                    "DATE OF ACCIDENT": "2024-01-15"
                }
            }),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return HttpResponse(json.dumps({"error": str(e)}), status_code=500)