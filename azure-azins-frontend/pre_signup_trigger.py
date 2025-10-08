import json
import re

def lambda_handler(event, context):
    print(f"Pre-signup event: {json.dumps(event)}")
    
    if event['triggerSource'] in ['PreSignUp_ExternalProvider', 'PreSignUp_AdminCreateUser']:
        event['response']['autoConfirmUser'] = True
        event['response']['autoVerifyEmail'] = True
        event['response']['autoVerifyPhone'] = True
        
        user_attributes = event['request']['userAttributes']
        print(f"Original attributes: {user_attributes}")
        
        phone = user_attributes.get('phone_number', '')
        if not phone or not re.match(r'^\+\d{10,15}$', phone):
            user_attributes['phone_number'] = '+10000000000'
            user_attributes['phone_number_verified'] = 'true'
            
        if 'email' not in user_attributes or not user_attributes.get('email'):
            username = user_attributes.get('cognito:username', user_attributes.get('sub', 'unknown'))
            user_attributes['email'] = f"{username}@sageinsure.com"
            user_attributes['email_verified'] = 'true'
            
        if 'name' not in user_attributes or not user_attributes.get('name'):
            user_attributes['name'] = user_attributes.get('email', 'SageInsure User')
        
        print(f"Updated attributes: {user_attributes}")
    
    return event
