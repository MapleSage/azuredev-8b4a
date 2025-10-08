import json
import logging
from azure.functions import HttpRequest, HttpResponse
import openai
import os

def main(req: HttpRequest) -> HttpResponse:
    try:
        req_body = req.get_json()
        action = req_body.get('action', 'chat')
        
        if action == 'chat':
            return handle_chat(req_body)
        elif action == 'get_policy':
            return get_user_policy(req_body)
        else:
            return simulate_policy_response()
    except Exception as e:
        return HttpResponse(json.dumps({"error": str(e)}), status_code=500)

def handle_chat(req_body):
    username = req_body.get('username', 'john_doe')
    question = req_body.get('question', '')
    
    policy_content = get_policy_content(username)
    response = generate_policy_response(question, policy_content, username)
    
    return HttpResponse(
        json.dumps({
            "response": response,
            "sessionId": f"session-{hash(username) % 10000}",
            "citations": ["Car Insurance Policy Booklet", "Keycare Product Information"]
        }),
        status_code=200,
        mimetype="application/json"
    )

def get_policy_content(username):
    policies = {
        "john_doe": {
            "policyNumber": "POL-123456",
            "policyHolder": "John Doe", 
            "vehicleDetails": "2020 Honda Civic",
            "coverage": "Comprehensive Coverage",
            "deductible": "$500",
            "premiumAmount": "$1,200/year"
        },
        "john_smith": {
            "policyNumber": "POL-789012",
            "policyHolder": "John Smith",
            "vehicleDetails": "2019 Toyota Camry", 
            "coverage": "Full Coverage",
            "deductible": "$750",
            "premiumAmount": "$1,400/year"
        }
    }
    return policies.get(username, policies["john_doe"])

def generate_policy_response(question, policy_content, username):
    if "deductible" in question.lower():
        return f"Based on your policy, {username}, your deductible is {policy_content['deductible']}. This is the amount you'll pay before insurance coverage applies."
    elif "coverage" in question.lower():
        return f"Your policy includes {policy_content['coverage']} for your {policy_content['vehicleDetails']}. This provides comprehensive protection."
    elif "premium" in question.lower():
        return f"Your annual premium is {policy_content['premiumAmount']} for {policy_content['coverage']}."
    else:
        return f"Hello {username}! I'm Felix, your Insurance Policy AI Assistant. Your policy number is {policy_content['policyNumber']}. How can I help you today?"

def simulate_policy_response():
    return HttpResponse(
        json.dumps({
            "response": "Hello! I'm Felix, your Insurance Policy AI Assistant. How can I help you with your motor insurance policy today?",
            "sessionId": "demo-session",
            "citations": []
        }),
        status_code=200,
        mimetype="application/json"
    )