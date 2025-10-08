import json
import logging
from azure.functions import HttpRequest, HttpResponse
from azure.cosmos import CosmosClient
import os

def main(req: HttpRequest) -> HttpResponse:
    try:
        req_body = req.get_json()
        classification_result = req_body.get('classificationResult', {})
        
        # Extract key information
        file_path = classification_result.get('file')
        is_claims_doc = classification_result.get('is_claims_document', False)
        
        if is_claims_doc:
            # Simulate key-value extraction and storage
            extracted_data = {
                'claimNumber': 'CLM-12345',
                'fileName': file_path.split('/')[-1] if file_path else 'unknown',
                'policyHolder': 'John Doe',
                'policyID': 'POL-67890',
                'date': '2024-01-15',
                'deductible': '$500'
            }
            
            # Store in Cosmos DB (simulated)
            claim_id = f"1a23b-{extracted_data['claimNumber'][-4:]}"
            
            return HttpResponse(
                json.dumps({
                    'statusCode': 200,
                    'status': 'Processing complete',
                    'claimId': claim_id,
                    'extractedData': extracted_data
                }),
                status_code=200,
                mimetype="application/json"
            )
        else:
            return HttpResponse(
                json.dumps({
                    'statusCode': 200,
                    'status': 'Non-claims document processed'
                }),
                status_code=200,
                mimetype="application/json"
            )
    except Exception as e:
        return HttpResponse(json.dumps({"error": str(e)}), status_code=500)