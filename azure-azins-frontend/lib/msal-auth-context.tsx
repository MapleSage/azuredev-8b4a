import React, { createContext, useContext, useEffect, useState } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { MsalProvider, useMsal } from '@azure/msal-react'

const isDevelopmentMode = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true'

const msalConfig = {
  auth: {
    clientId: isDevelopmentMode ? 'dev-client-id' : (process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || ''),
    authority: isDevelopmentMode ? 'https://login.microsoftonline.com/common' : `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : 'http://localhost:3000/auth/callback'
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false
  }
}

const msalInstance = isDevelopmentMode ? null : new PublicClientApplication(msalConfig)

interface AuthContextType {
  isAuthenticated: boolean
  user: AccountInfo | null
  signOut: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  signOut: () => {},
  isLoading: true
})

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AccountInfo | null>(null)

  useEffect(() => {
    if (isDevelopmentMode) {
      // Mock authentication for development
      setUser({
        homeAccountId: 'dev-home-id',
        environment: 'development',
        tenantId: 'dev-tenant',
        username: 'dev@azins.com',
        localAccountId: 'dev-account-id',
        name: 'Development User',
        idTokenClaims: {
          name: 'Development User',
          preferred_username: 'dev@azins.com',
        }
      } as AccountInfo)
      setIsAuthenticated(true)
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [])

  const signOut = async () => {
    if (isDevelopmentMode) {
      setUser(null)
      setIsAuthenticated(false)
    } else {
      try {
        await msalInstance?.logoutRedirect()
      } catch (error) {
        console.error('Sign out failed:', error)
      }
    }
  }

  const value = {
    isAuthenticated,
    user,
    signOut,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (isDevelopmentMode) {
    return <AuthProviderInner>{children}</AuthProviderInner>
  }

  return (
    <MsalProvider instance={msalInstance!}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </MsalProvider>
  )
}

export const useAuth = () => useContext(AuthContext)