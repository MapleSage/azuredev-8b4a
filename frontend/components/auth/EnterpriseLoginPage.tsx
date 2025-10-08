import React, { useState } from 'react';
import { useAuth } from '../../lib/msal-auth-context';
import LoginButton from './LoginButton';

interface EnterpriseLoginPageProps {
  onSuccess?: () => void;
}

export const EnterpriseLoginPage: React.FC<EnterpriseLoginPageProps> = ({ onSuccess }) => {
  const { isLoading, error } = useAuth();
  const [selectedRole, setSelectedRole] = useState('agent');

  const roles = [
    { id: 'admin', name: 'Administrator', description: 'Full system access' },
    { id: 'agent', name: 'Insurance Agent', description: 'Claims and policy management' },
    { id: 'underwriter', name: 'Underwriter', description: 'Risk assessment and pricing' },
    { id: 'customer', name: 'Customer', description: 'Policy and claims access' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Enterprise Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
            <span className="text-white font-bold text-2xl">SI</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SageInsure</h1>
          <p className="text-blue-200">Enterprise Insurance Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Secure Access Portal
            </h2>
            <p className="text-gray-600">
              Sign in with your enterprise credentials
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Your Role
            </label>
            <div className="space-y-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRole === role.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.id}
                    checked={selectedRole === role.id}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{role.name}</div>
                    <div className="text-sm text-gray-500">{role.description}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedRole === role.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedRole === role.id && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-400 mr-2">⚠️</div>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          {/* Login Button */}
          <LoginButton 
            className="w-full py-3 text-lg font-medium"
            onLoginSuccess={() => {
              // Store selected role in session
              sessionStorage.setItem('userRole', selectedRole);
              onSuccess?.();
            }}
          >
            {isLoading ? 'Authenticating...' : 'Sign in with Microsoft'}
          </LoginButton>

          {/* Security Features */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500 mb-4">
              Enterprise Security Features
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center text-green-600">
                <span className="mr-1">🔒</span>
                <span>MFA Protected</span>
              </div>
              <div className="flex items-center text-green-600">
                <span className="mr-1">🛡️</span>
                <span>SOC2 Compliant</span>
              </div>
              <div className="flex items-center text-green-600">
                <span className="mr-1">📊</span>
                <span>Audit Logged</span>
              </div>
              <div className="flex items-center text-green-600">
                <span className="mr-1">🌐</span>
                <span>SSO Enabled</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>Powered by Azure Active Directory B2C</p>
            <p className="mt-1">© 2024 SageInsure. All rights reserved.</p>
          </div>
        </div>

        {/* Additional Security Info */}
        <div className="mt-6 text-center text-sm text-blue-200">
          <p>🔐 Your session is encrypted and monitored for security</p>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseLoginPage;