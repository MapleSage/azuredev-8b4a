import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { useAuth } from "./msal-auth-context";
import { environmentConfig } from "./msal-config";
import { AuthErrorType } from "./types/auth";
import { retryWithBackoff, logAuthEvent } from "./utils/auth-utils";

/**
 * API Response wrapper interface
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  timestamp: string;
}

/**
 * API Error interface
 */
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

/**
 * Chat request interface
 */
export interface ChatRequest {
  text: string;
  conversationId?: string;
  specialist?: string;
  context?: Array<{ role: string; content: string }>;
}

/**
 * Chat response interface
 */
export interface ChatResponse {
  response: string;
  agent: string;
  specialist: string;
  confidence: number;
  status: string;
  conversationId: string;
  timestamp: string;
  user?: string;
}

/**
 * Authenticated API Client class
 */
class AuthenticatedApiClient {
  private client: AxiosInstance;
  private getAccessToken: () => Promise<string | null>;
  private onAuthError?: () => void;

  constructor(
    baseURL: string,
    getAccessToken: () => Promise<string | null>,
    onAuthError?: () => void
  ) {
    this.getAccessToken = getAccessToken;
    this.onAuthError = onAuthError;

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await this.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            logAuthEvent("API_REQUEST_WITH_TOKEN", { url: config.url });
          } else {
            logAuthEvent("API_REQUEST_NO_TOKEN", { url: config.url });
          }
        } catch (error) {
          logAuthEvent("TOKEN_ACQUISITION_ERROR", { error, url: config.url });
          // Continue without token - let the server handle it
        }

        // Add request timestamp
        config.metadata = { startTime: new Date() };

        return config;
      },
      (error) => {
        logAuthEvent("REQUEST_INTERCEPTOR_ERROR", { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle auth errors and logging
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful requests
        const duration = response.config.metadata
          ? new Date().getTime() - response.config.metadata.startTime.getTime()
          : 0;

        logAuthEvent("API_REQUEST_SUCCESS", {
          url: response.config.url,
          status: response.status,
          duration,
        });

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Log error
        logAuthEvent("API_REQUEST_ERROR", {
          url: originalRequest?.url,
          status: error.response?.status,
          message: error.message,
        });

        // Handle authentication errors
        if (error.response?.status === 401) {
          logAuthEvent("API_AUTH_ERROR", { url: originalRequest?.url });

          // Don't retry if we've already tried
          if (!originalRequest._retry) {
            originalRequest._retry = true;

            try {
              // Try to get a fresh token
              const newToken = await this.getAccessToken();
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.client(originalRequest);
              }
            } catch (tokenError) {
              logAuthEvent("TOKEN_REFRESH_FAILED", { error: tokenError });
            }
          }

          // If token refresh failed or this is a retry, trigger auth error handler
          if (this.onAuthError) {
            this.onAuthError();
          }
        }

        // Handle network errors with retry
        if (error.code === "NETWORK_ERROR" || error.code === "ECONNABORTED") {
          if (!originalRequest._retryCount) {
            originalRequest._retryCount = 0;
          }

          if (originalRequest._retryCount < 3) {
            originalRequest._retryCount++;

            const delay = Math.pow(2, originalRequest._retryCount) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));

            return this.client(originalRequest);
          }
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private formatError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      message: "An unexpected error occurred",
      status: error.response?.status || 0,
    };

    if (error.response?.data) {
      const responseData = error.response.data as any;
      apiError.message =
        responseData.message || responseData.detail || apiError.message;
      apiError.code = responseData.code;
      apiError.details = responseData.details;
    } else if (error.message) {
      apiError.message = error.message;
    }

    return apiError;
  }

  /**
   * Generic GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Generic POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Generic PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<any> {
    return this.get("/");
  }

  /**
   * Authentication status endpoint
   */
  async getAuthStatus(): Promise<any> {
    return this.get("/auth/status");
  }

  /**
   * Chat endpoint
   */
  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.post<ChatResponse>("/chat", request);
  }

  /**
   * Upload file endpoint (if needed)
   */
  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    return this.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });
  }
}

/**
 * React hook for using the authenticated API client
 */
export const useApiClient = () => {
  const { getAccessToken, signOut } = useAuth();

  const apiClient = new AuthenticatedApiClient(
    environmentConfig.apiBaseUrl,
    getAccessToken,
    () => {
      // Handle auth errors by redirecting to login
      console.warn("Authentication error detected, signing out...");
      signOut();
    }
  );

  return apiClient;
};

/**
 * Chat API hook with additional features
 */
export const useChatApi = () => {
  const apiClient = useApiClient();

  const sendMessage = async (
    text: string,
    options: {
      specialist?: string;
      conversationId?: string;
      context?: Array<{ role: string; content: string }>;
    } = {}
  ): Promise<ChatResponse> => {
    const request: ChatRequest = {
      text,
      conversationId: options.conversationId || `conv_${Date.now()}`,
      specialist: options.specialist || "GENERAL",
      context: options.context || [],
    };

    return retryWithBackoff(
      () => apiClient.sendChatMessage(request),
      3, // max retries
      1000 // base delay
    );
  };

  return {
    sendMessage,
    healthCheck: () => apiClient.healthCheck(),
    getAuthStatus: () => apiClient.getAuthStatus(),
  };
};

/**
 * API client instance for use outside of React components
 */
let globalApiClient: AuthenticatedApiClient | null = null;

export const initializeGlobalApiClient = (
  getAccessToken: () => Promise<string | null>,
  onAuthError?: () => void
) => {
  globalApiClient = new AuthenticatedApiClient(
    environmentConfig.apiBaseUrl,
    getAccessToken,
    onAuthError
  );
  return globalApiClient;
};

export const getGlobalApiClient = (): AuthenticatedApiClient => {
  if (!globalApiClient) {
    throw new Error(
      "Global API client not initialized. Call initializeGlobalApiClient first."
    );
  }
  return globalApiClient;
};

export default AuthenticatedApiClient;
