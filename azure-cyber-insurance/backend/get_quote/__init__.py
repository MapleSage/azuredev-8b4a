import json
import logging
import random
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Get quote function processed a request.')
    
    try:
        req_body = req.get_json()
        subscription_id = req_body.get('subscriptionId')
        
        if not subscription_id:
            return func.HttpResponse(
                json.dumps({"success": False, "message": "Missing subscription ID"}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Simulate security findings analysis
        findings = simulate_security_findings()
        quote = calculate_quote(findings)
        
        return func.HttpResponse(
            json.dumps({
                "success": True,
                "quote": f"${quote:,.2f}",
                "findings": findings
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
        logging.error(f"Error in get_quote: {str(e)}")
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

def simulate_security_findings():
    """Simulate Azure Security Center findings"""
    return {
        "critical": random.randint(0, 3),
        "high": random.randint(2, 8),
        "medium": random.randint(5, 15),
        "low": random.randint(10, 25),
        "informational": random.randint(15, 40)
    }

def calculate_quote(findings):
    """Calculate insurance quote based on findings"""
    base_premium = 5000
    
    risk_premium = (
        findings["critical"] * 2000 +
        findings["high"] * 1000 +
        findings["medium"] * 200 +
        findings["low"] * 50 +
        findings["informational"] * 5
    )
    
    return base_premium + risk_premium