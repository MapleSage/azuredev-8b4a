import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/msal-auth-context';
import EnterpriseLoginPage from './EnterpriseLoginPage';

interface EnterpriseAuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string[];
  requireMFA?: boolean;
}

interface UserSession {
  role: string;
  mfaVerified: boolean;
  lastActivity: number;
  sessionId: string;
}

export const EnterpriseAuthGuard: React.FC<EnterpriseAuthGuardProps> = ({
  children,
  requiredRole = [],
  requireMFA = false,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [showMFAPrompt, setShowMFAPrompt] = useState(false);

  // Initialize user session
  useEffect(() => {
    if (isAuthenticated && user) {
      const storedRole = sessionStorage.getItem('userRole') || 'customer';
      const sessionId = sessionStorage.getItem('sessionId') || generateSessionId();
      
      const session: UserSession = {
        role: storedRole,
        mfaVerified: !requireMFA, // Skip MFA for demo
        lastActivity: Date.now(),
        sessionId,
      };

      setUserSession(session);
      sessionStorage.setItem('sessionId', sessionId);
      
      // Log audit event
      logAuditEvent('USER_LOGIN', {
        userId: user.localAccountId || user.homeAccountId,
        role: storedRole,
        sessionId,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isAuthenticated, user, requireMFA]);

  // Session timeout check
  useEffect(() => {
    if (!userSession) return;

    const checkSession = () => {
      const now = Date.now();
      const sessionTimeout = 30 * 60 * 1000; // 30 minutes

      if (now - userSession.lastActivity > sessionTimeout) {
        handleSessionTimeout();
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [userSession]);

  const generateSessionId = (): string => {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const logAuditEvent = (event: string, data: any) => {
    const auditLog = {
      event,
      timestamp: new Date().toISOString(),
      sessionId: userSession?.sessionId,
      ...data,
    };
    
    // Store in localStorage for demo (in production, send to audit service)
    const existingLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
    existingLogs.push(auditLog);
    localStorage.setItem('auditLogs', JSON.stringify(existingLogs.slice(-100))); // Keep last 100 logs
    
    console.log('🔍 Audit Log:', auditLog);
  };

  const handleSessionTimeout = () => {
    logAuditEvent('SESSION_TIMEOUT', {
      userId: user?.localAccountId || user?.homeAccountId,
      role: userSession?.role,
    });
    
    sessionStorage.clear();
    setUserSession(null);
    router.push('/');
  };

  const updateActivity = () => {
    if (userSession) {
      setUserSession(prev => prev ? { ...prev, lastActivity: Date.now() } : null);
    }
  };

  // Role-based access control
  const hasRequiredRole = (userRole: string): boolean => {
    if (requiredRole.length === 0) return true;
    
    const roleHierarchy = {
      admin: ['admin', 'underwriter', 'agent', 'customer'],
      underwriter: ['underwriter', 'agent', 'customer'],
      agent: ['agent', 'customer'],
      customer: ['customer'],
    };

    return requiredRole.some(role => 
      roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes(role)
    );
  };

  // Update activity on user interaction
  useEffect(() => {
    const handleActivity = () => updateActivity();
    
    document.addEventListener('mousedown', handleActivity);
    document.addEventListener('keydown', handleActivity);
    
    return () => {
      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('keydown', handleActivity);
    };
  }, [userSession]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">SI</span>
          </div>
          <div className="text-white text-lg mb-2">SageInsure</div>
          <div className="text-blue-200">Verifying credentials...</div>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <EnterpriseLoginPage onSuccess={() => router.reload()} />;
  }

  // MFA required but not verified
  if (requireMFA && userSession && !userSession.mfaVerified) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Multi-Factor Authentication
            </h2>
            <p className="text-gray-600 mb-6">
              Additional verification required for enhanced security
            </p>
            <button
              onClick={() => {
                // Simulate MFA verification
                setUserSession(prev => prev ? { ...prev, mfaVerified: true } : null);
                logAuditEvent('MFA_VERIFIED', {
                  userId: user?.localAccountId || user?.homeAccountId,
                });
              }}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Verify with Authenticator App
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Demo: Click to simulate MFA verification
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Role-based access check
  if (userSession && !hasRequiredRole(userSession.role)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-4">
              Your role ({userSession.role}) doesn't have permission to access this resource.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Required roles: {requiredRole.join(', ')}
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render children with enterprise context
  return (
    <div onClick={updateActivity} onKeyDown={updateActivity}>
      {/* Session Info Bar */}
      <div className="bg-slate-800 text-white px-4 py-2 text-xs flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span>🔐 Secure Session</span>
          <span>Role: {userSession?.role}</span>
          <span>Session: {userSession?.sessionId?.slice(-8)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          <span>Connected</span>
        </div>
      </div>
      {children}
    </div>
  );
};

export default EnterpriseAuthGuard;