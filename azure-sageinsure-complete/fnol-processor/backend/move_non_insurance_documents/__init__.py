import json
import logging
from azure.functions import HttpRequest, HttpResponse
from azure.storage.blob import BlobServiceClient
import os

def main(req: HttpRequest) -> HttpResponse:
    try:
        req_body = req.get_json()
        source_container = req_body.get('scanning_in_process_container')
        destination_container = req_body.get('destination_container')
        classification_result = req_body.get('classificationResult', {})
        
        file_path = classification_result.get('file')
        
        if not file_path:
            return HttpResponse(
                json.dumps({
                    'statusCode': 400,
                    'body': "Missing 'file' key in classificationResult"
                }),
                status_code=400,
                mimetype="application/json"
            )
        
        # Simulate moving non-insurance documents
        logging.info(f"Moving non-insurance document {file_path} to review container")
        
        return HttpResponse(
            json.dumps({
                'statusCode': 200,
                'status': 'Processing complete'
            }),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return HttpResponse(json.dumps({"error": str(e)}), status_code=500)