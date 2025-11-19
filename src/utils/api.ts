const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/api";

interface BaseApiResponse {
  success: boolean;
  error?: string;
}

interface ApiResponse<T = unknown> extends BaseApiResponse {
  data?: T;
  token?: string;
  [key: string]: unknown;
}

class ApiClient {
  getHeaders(): HeadersInit {
    const token = localStorage.getItem("hr_token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE}${endpoint}`;
      console.log(`GET request to: ${url}`);

      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API GET Error: ${response.status} - ${errorText}`);
        return { success: false, error: `HTTP ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      console.error("API GET request failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return { success: false, error: errorMessage };
    }
  }

  async post<TResponse = unknown, TData = unknown>(
    endpoint: string,
    data: TData,
  ): Promise<ApiResponse<TResponse>> {
    try {
      const url = `${API_BASE}${endpoint}`;
      console.log(`POST request to: ${url}`, data);

      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API POST Error: ${response.status} - ${errorText}`);
        return { success: false, error: `HTTP ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      console.error("API POST request failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return { success: false, error: errorMessage };
    }
  }
}

export const api = new ApiClient();
export type { ApiResponse };
