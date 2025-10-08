import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/msal-auth-context';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  lastLogin: string;
  mfaEnabled: boolean;
  sessionCount: number;
}

interface EnterpriseUserProfileProps {
  onSignOut: () => void;
}

export const EnterpriseUserProfile: React.FC<EnterpriseUserProfileProps> = ({ onSignOut }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (user) {
      const role = sessionStorage.getItem('userRole') || 'customer';
      const sessionId = sessionStorage.getItem('sessionId') || '';
      
      // Simulate enterprise user profile
      const profile: UserProfile = {
        id: user.localAccountId || user.homeAccountId || 'demo-user',
        name: user.name || 'Demo User',
        email: user.username || 'demo@sageinsure.com',
        role: role,
        department: getDepartmentByRole(role),
        lastLogin: new Date().toISOString(),
        mfaEnabled: true,
        sessionCount: 1,
      };
      
      setUserProfile(profile);
    }
  }, [user]);

  const getDepartmentByRole = (role: string): string => {
    const departments = {
      admin: 'IT Administration',
      underwriter: 'Risk Assessment',
      agent: 'Customer Relations',
      customer: 'External'
    };
    return departments[role as keyof typeof departments] || 'General';
  };

  const getRoleColor = (role: string): string => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      underwriter: 'bg-purple-100 text-purple-800',
      agent: 'bg-blue-100 text-blue-800',
      customer: 'bg-green-100 text-green-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (!userProfile) return null;

  return (
    <div className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setShowProfile(!showProfile)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
          {getInitials(userProfile.name)}
        </div>
        <div className="text-left">
          <div className="font-medium text-gray-900">{userProfile.name}</div>
          <div className="text-sm text-gray-500">{userProfile.role}</div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${showProfile ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Profile Dropdown */}
      {showProfile && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {getInitials(userProfile.name)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{userProfile.name}</h3>
                <p className="text-gray-600">{userProfile.email}</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getRoleColor(userProfile.role)}`}>
                  {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="font-medium text-gray-700">Department</label>
                <p className="text-gray-600">{userProfile.department}</p>
              </div>
              <div>
                <label className="font-medium text-gray-700">User ID</label>
                <p className="text-gray-600 font-mono text-xs">{userProfile.id.slice(-8)}</p>
              </div>
              <div>
                <label className="font-medium text-gray-700">Last Login</label>
                <p className="text-gray-600">{new Date(userProfile.lastLogin).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="font-medium text-gray-700">Sessions</label>
                <p className="text-gray-600">{userProfile.sessionCount} active</p>
              </div>
            </div>

            {/* Security Status */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Security Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Multi-Factor Authentication</span>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    <span className="text-sm text-green-600">Enabled</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Session Encryption</span>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Audit Logging</span>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    <span className="text-sm text-green-600">Monitored</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Permissions</h4>
              <div className="flex flex-wrap gap-2">
                {getPermissionsByRole(userProfile.role).map((permission, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-200 space-y-2">
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              🔧 Account Settings
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              🔐 Security Settings
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              📊 Activity Log
            </button>
            <hr className="my-2" />
            <button
              onClick={onSignOut}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const getPermissionsByRole = (role: string): string[] => {
  const permissions = {
    admin: ['Full Access', 'User Management', 'System Config', 'Audit Access'],
    underwriter: ['Risk Assessment', 'Policy Approval', 'Claims Review', 'Reports'],
    agent: ['Customer Service', 'Claims Processing', 'Policy Management', 'Documents'],
    customer: ['View Policies', 'Submit Claims', 'Update Profile', 'Download Documents']
  };
  return permissions[role as keyof typeof permissions] || ['Basic Access'];
};

export default EnterpriseUserProfile;