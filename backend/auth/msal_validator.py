import jwt
import requests
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
import os
from typing import Dict, Optional
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

security = HTTPBearer()

class MSALTokenValidator:
    def __init__(self):
        self.tenant_id = os.getenv('AZURE_TENANT_ID')
        self.client_id = os.getenv('AZURE_CLIENT_ID')
        self.jwks_uri = f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys"
        self.issuer = f"https://login.microsoftonline.com/{self.tenant_id}/v2.0"
        
        if not self.tenant_id or not self.client_id:
            logger.error("AZURE_TENANT_ID and AZURE_CLIENT_ID must be set")
            raise ValueError("Missing Azure AD configuration")
        
        logger.info(f"MSAL Validator initialized for tenant: {self.tenant_id}")
        
    @lru_cache(maxsize=10)
    def get_signing_keys(self) -> Dict:
        """Cache JWKS keys for token validation"""
        try:
            logger.debug(f"Fetching JWKS from: {self.jwks_uri}")
            response = requests.get(self.jwks_uri, timeout=10)
            response.raise_for_status()
            jwks = response.json()
            logger.debug(f"Retrieved {len(jwks.get('keys', []))} signing keys")
            return jwks
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service unavailable"
            )
    
    def get_signing_key(self, kid: str) -> Optional[str]:
        """Get signing key by key ID"""
        try:
            jwks = self.get_signing_keys()
            for key in jwks['keys']:
                if key['kid'] == kid:
                    return jwt.algorithms.RSAAlgorithm.from_jwk(key)
            return None
        except Exception as e:
            logger.error(f"Failed to get signing key for kid {kid}: {e}")
            return None
    
    def validate_token(self, token: str) -> Dict:
        """Validate MSAL token and return user claims"""
        try:
            # Decode header to get key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get('kid')
            
            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing key ID"
                )
            
            # Get signing key
            signing_key = self.get_signing_key(kid)
            if not signing_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token signature"
                )
            
            # Validate token
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=['RS256'],
                audience=self.client_id,
                issuer=self.issuer,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_nbf": True,
                    "verify_iat": True,
                    "verify_aud": True,
                    "verify_iss": True,
                }
            )
            
            # Additional validation
            now = datetime.now(timezone.utc).timestamp()
            
            # Check expiration
            if payload.get('exp', 0) < now:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired"
                )
            
            # Check not before
            if payload.get('nbf', 0) > now:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token not yet valid"
                )
            
            # Log successful validation
            user_id = payload.get('oid', 'unknown')
            username = payload.get('preferred_username', 'unknown')
            logger.info(f"Token validated successfully for user: {username} ({user_id})")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token validation failed: Token has expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Token validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Unexpected error during token validation: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication error"
            )

# Global validator instance
validator = MSALTokenValidator()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Dependency to get current authenticated user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return validator.validate_token(credentials.credentials)

async def optional_auth(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict]:
    """Optional authentication for endpoints that work with or without auth"""
    if not credentials:
        return None
    
    try:
        return validator.validate_token(credentials.credentials)
    except HTTPException:
        # Return None for optional auth instead of raising exception
        return None

def get_user_info(user_claims: Dict) -> Dict:
    """Extract user information from token claims"""
    return {
        'user_id': user_claims.get('oid'),
        'username': user_claims.get('preferred_username'),
        'name': user_claims.get('name'),
        'email': user_claims.get('preferred_username'),
        'tenant_id': user_claims.get('tid'),
        'app_id': user_claims.get('appid'),
        'roles': user_claims.get('roles', []),
        'scopes': user_claims.get('scp', '').split(' ') if user_claims.get('scp') else [],
    }

def require_scope(required_scope: str):
    """Decorator to require specific scope"""
    def decorator(user_claims: Dict = Depends(get_current_user)):
        user_scopes = user_claims.get('scp', '').split(' ')
        if required_scope not in user_scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required scope '{required_scope}' not found"
            )
        return user_claims
    return decorator

def require_role(required_role: str):
    """Decorator to require specific role"""
    def decorator(user_claims: Dict = Depends(get_current_user)):
        user_roles = user_claims.get('roles', [])
        if required_role not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role '{required_role}' not found"
            )
        return user_claims
    return decorator