// API client para comunicação com o backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'

export interface WebhookConfig {
  id: string
  type: 'charge' | 'recurrence'
  url: string
  status: 'active' | 'inactive' | 'error'
  createdAt?: string
  lastPing?: string
  totalPings: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  status?: number
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
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    let payload: any = undefined
    try {
      payload = await response.json()
    } catch {}

    if (response.ok) {
      return { success: true, data: payload }
    }

    // Não lançar erro para evitar overlay do Next; repassar estrutura
    return {
      success: false,
      data: payload,
      error: payload?.error || `HTTP ${response.status}`,
      status: response.status,
    }
  }

  // Configurar webhook
  async configWebhook(type: 'charge' | 'recurrence', url: string, env?: 'sandbox' | 'production'): Promise<ApiResponse<any>> {
    const body = env ? { type, url, env } : { type, url }
    return this.request('/api/webhook/config', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // Listar webhooks
  async listWebhooks(type: 'charge' | 'recurrence', env?: 'sandbox' | 'production'): Promise<ApiResponse<any>> {
    const url = env ? `/api/webhook/list?type=${type}&env=${env}` : `/api/webhook/list?type=${type}`
    return this.request(url)
  }

  // Deletar webhook
  async deleteWebhook(type: 'charge' | 'recurrence', env?: 'sandbox' | 'production'): Promise<ApiResponse<any>> {
    const body = env ? { type, env } : { type }
    return this.request('/api/webhook/delete', {
      method: 'DELETE',
      body: JSON.stringify(body),
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

  // Recarregar serviço EFI
  async reloadService(env?: 'sandbox' | 'production'): Promise<ApiResponse<any>> {
    const url = env ? `/api/reload-service?env=${env}` : '/api/reload-service'
    return this.request(url, {
      method: 'POST',
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
