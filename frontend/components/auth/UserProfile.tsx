import React, { useState } from "react";
import { useAuth, useUserProfile } from "../../lib/msal-auth-context";
import { getUserInitials } from "../../lib/utils/auth-utils";
import LogoutButton from "./LogoutButton";

interface UserProfileProps {
  className?: string;
  showDropdown?: boolean;
  showFullProfile?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  className = "",
  showDropdown = true,
  showFullProfile = false,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const userProfile = useUserProfile();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated || !userProfile) {
    return null;
  }

  const initials = getUserInitials(userProfile.displayName);

  if (showFullProfile) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-semibold">
              {initials}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {userProfile.displayName}
            </h2>
            <p className="text-sm text-gray-500 truncate">
              {userProfile.email}
            </p>
            {userProfile.jobTitle && (
              <p className="text-sm text-gray-600 truncate">
                {userProfile.jobTitle}
              </p>
            )}
            {userProfile.department && (
              <p className="text-xs text-gray-500 truncate">
                {userProfile.department}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <LogoutButton />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => showDropdown && setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
          {initials}
        </div>
        {showDropdown && (
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {showDropdown && isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile.displayName}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {userProfile.email}
              </p>
              {userProfile.jobTitle && (
                <p className="text-xs text-gray-400 truncate mt-1">
                  {userProfile.jobTitle}
                </p>
              )}
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  // Add profile navigation logic here
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-3 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  View Profile
                </div>
              </button>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  // Add settings navigation logic here
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-3 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Settings
                </div>
              </button>
            </div>

            <div className="border-t border-gray-200 py-1">
              <div className="px-4 py-2">
                <LogoutButton className="w-full justify-center text-sm" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserProfile;
