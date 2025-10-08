import json
import logging
import os
from datetime import datetime
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Initiate assessment function processed a request.')
    
    try:
        req_body = req.get_json()
        subscription_id = req_body.get('subscriptionId')
        region = req_body.get('region')
        company_name = req_body.get('companyName')
        external_id = req_body.get('externalId')
        
        if not all([subscription_id, region, company_name, external_id]):
            return func.HttpResponse(
                json.dumps({"success": False, "message": "Missing required fields"}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Simulate storing assessment request
        logging.info(f"Assessment initiated for subscription: {subscription_id}")
        
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "message": "Assessment initiated successfully",
                "externalId": external_id
            }),
            status_code=200,
            mimetype="application/json",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        )
        
    except Exception as e:
        logging.error(f"Error in initiate_assessment: {str(e)}")
        return func.HttpResponse(
            json.dumps({"success": False, "message": "Internal server error"}),
            status_code=500,
            mimetype="application/json",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        )