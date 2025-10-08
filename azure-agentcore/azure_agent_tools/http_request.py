"""HTTP request tool - equivalent to strands_tools/http_request.py"""
import requests
import json
from typing import Dict, Any, Optional

def make_http_request(
    method: str,
    url: str,
    headers: Optional[Dict[str, str]] = None,
    data: Optional[str] = None,
    auth_token: Optional[str] = None,
    auth_type: str = "Bearer"
) -> dict:
    """Make HTTP requests with authentication support"""
    try:
        headers = headers or {}
        
        # Add authentication if provided
        if auth_token:
            if auth_type.lower() == "bearer":
                headers["Authorization"] = f"Bearer {auth_token}"
            elif auth_type.lower() == "token":
                headers["Authorization"] = f"token {auth_token}"
            elif auth_type.lower() == "api_key":
                headers["X-API-Key"] = auth_token
        
        # Make request
        response = requests.request(
            method=method.upper(),
            url=url,
            headers=headers,
            data=data,
            timeout=30
        )
        
        # Parse response
        try:
            json_data = response.json()
        except:
            json_data = None
        
        return {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "text": response.text[:1000] + "..." if len(response.text) > 1000 else response.text,
            "json": json_data,
            "success": 200 <= response.status_code < 300
        }
    except Exception as e:
        return {"error": f"HTTP request failed: {e}"}