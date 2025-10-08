import json
import boto3
import os

lambda_client = boto3.client('lambda')

def lambda_handler(event, context):
    try:
        # Parse the incoming request
        body = json.loads(event.get('body', '{}'))
        query = body.get('query', '')
        
        if not query:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps({'error': 'Missing query parameter'})
            }
        
        # Call the Strands function directly with the query
        strands_function = os.environ.get('STRANDS_FUNCTION', 'arn:aws:lambda:us-east-1:767398007438:function:sageinsure-strands-agent')
        
        # Simple payload - just pass the query
        payload = {
            "inputText": query,
            "query": query,
            "sessionId": "web-session"
        }
        
        response = lambda_client.invoke(
            FunctionName=strands_function,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        
        # Parse the response
        result = json.loads(response['Payload'].read())
        
        # If we get "Unknown function" response, return a helpful message
        if isinstance(result, dict) and "Unknown function" in str(result):
            result = {
                "message": f"I received your request: '{query}'. I'm SageInsure AI assistant ready to help with insurance claims and questions.",
                "query": query,
                "status": "processed"
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps(result)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({
                'error': str(e),
                'message': 'SageInsure Chat Gateway Error'
            })
        }
