import json
import logging
from azure.functions import HttpRequest, HttpResponse

def main(req: HttpRequest) -> HttpResponse:
    try:
        req_body = req.get_json()
        action = req_body.get('action', 'process_documents')
        
        if action == 'process_documents':
            execution_arn = f"arn:azure:logicapps:eastus:workflows/docstream-{hash(str(req_body)) % 10000}"
            return HttpResponse(
                json.dumps({
                    "statusCode": 200,
                    "executionArn": execution_arn,
                    "status": "RUNNING",
                    "claimId": "1a23b-4c56",
                    "classification": "Auto Insurance Claim"
                }),
                status_code=200,
                mimetype="application/json"
            )
        elif action == 'status':
            return HttpResponse(
                json.dumps({
                    "status": "SUCCEEDED",
                    "output": {"claimId": "1a23b-4c56", "status": "Completed"},
                    "currentState": "Completed"
                }),
                status_code=200,
                mimetype="application/json"
            )
    except Exception as e:
        return HttpResponse(json.dumps({"error": str(e)}), status_code=500)