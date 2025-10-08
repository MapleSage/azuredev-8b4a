import json
import logging
from azure.functions import HttpRequest, HttpResponse
import openai
import os

def main(req: HttpRequest) -> HttpResponse:
    try:
        req_body = req.get_json()
        container_name = req_body.get('containerName')
        prefix = req_body.get('prefix')
        
        # Simulate classification results
        classification_results = [
            {
                'file': f'{prefix}document1.pdf',
                'is_claims_document': True,
                'document_type': 'Auto Insurance Claim',
                'confidence': 95.2
            },
            {
                'file': f'{prefix}document2.pdf', 
                'is_claims_document': False,
                'document_type': 'Medical Bill',
                'confidence': 87.8
            }
        ]
        
        return HttpResponse(
            json.dumps({
                'statusCode': 200,
                'classificationResults': classification_results
            }),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return HttpResponse(json.dumps({"error": str(e)}), status_code=500)