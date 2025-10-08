export const getAuthHeaders = async () => {
  // Mock auth headers for Azure development
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer dev-token'
  }
}

export const apiCall = async (url: string, options: RequestInit = {}) => {
  const headers = await getAuthHeaders()
  
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  })
}