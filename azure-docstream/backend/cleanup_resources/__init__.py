import json
import logging
from azure.functions import HttpRequest, HttpResponse
from azure.storage.blob import BlobServiceClient
import os

def main(req: HttpRequest) -> HttpResponse:
    try:
        req_body = req.get_json()
        text_container = req_body.get('scanning_text_container')
        in_process_container = req_body.get('scanning_in_process_container')
        
        # Simulate cleanup operations
        logging.info(f"Cleaning up resources in containers: {text_container}, {in_process_container}")
        
        return HttpResponse(
            json.dumps({
                'statusCode': 200,
                'status': 'Cleanup completed'
            }),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return HttpResponse(json.dumps({"error": str(e)}), status_code=500)