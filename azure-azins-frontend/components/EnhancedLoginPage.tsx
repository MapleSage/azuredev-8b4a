import React from "react";

const EnhancedLoginPage: React.FC = () => {
  // This component is no longer used - we're using direct Cognito hosted UI redirect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          This component is deprecated
        </h1>
        <p className="text-gray-600">
          We're now redirecting directly to Cognito hosted UI
        </p>
      </div>
    </div>
  );
};

export default EnhancedLoginPage;
