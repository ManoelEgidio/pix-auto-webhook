// API client para comunicação com o backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'

export interface WebhookConfig {
  id: string
  type: 'charge' | 'recurrence'
  url: string
  status: 'active' | 'inactive' | 'error'
  lastPing?: string
  totalPings: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('API Error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  // Configurar webhook
  async configWebhook(type: 'charge' | 'recurrence', url: string): Promise<ApiResponse<any>> {
    return this.request('/api/webhook/config', {
      method: 'POST',
      body: JSON.stringify({ type, url }),
    })
  }

  // Listar webhooks
  async listWebhooks(type: 'charge' | 'recurrence'): Promise<ApiResponse<any>> {
    return this.request(`/api/webhook/list?type=${type}`)
  }

  // Deletar webhook
  async deleteWebhook(type: 'charge' | 'recurrence'): Promise<ApiResponse<any>> {
    return this.request('/api/webhook/delete', {
      method: 'DELETE',
      body: JSON.stringify({ type }),
    })
  }

  // Testar conexão com EFI
  async testConnection(): Promise<ApiResponse<any>> {
    return this.request('/api/test-connection')
  }

  // Obter status do sistema
  async getSystemStatus(): Promise<ApiResponse<any>> {
    return this.request('/api/status')
  }
}

export const apiClient = new ApiClient(API_BASE_URL)