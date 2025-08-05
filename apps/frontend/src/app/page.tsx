'use client'

import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { apiClient, WebhookConfig } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { ProductionWarning } from '@/components/ProductionWarning';
import { StatsCards } from '@/components/StatsCards';
import { WebhookList } from '@/components/WebhookList';
import { EfiConfig } from '@/components/EfiConfig';

export default function Home() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [systemStatus, setSystemStatus] = useState({ backend: 'offline', efi: 'offline' })
  const [credentials, setCredentials] = useState({ sandbox: true })
  
  const [sandboxCredentials, setSandboxCredentials] = useState({
    clientId: '',
    clientSecret: '',
  })
  const [productionCredentials, setProductionCredentials] = useState({
    clientId: '',
    clientSecret: '',
  })
  const [certificateStatus, setCertificateStatus] = useState({
    sandbox: { exists: false, path: '' },
    production: { exists: false, path: '' }
  })
  const { toast } = useToast()

  useEffect(() => {
    const initializeApp = async () => {
      setInitialLoading(true)
      try {
        await Promise.all([
          loadSystemStatus(),
          loadWebhooks(),
          loadCredentials(),
          checkCertificateStatus()
        ])
      } catch (error) {
        console.error('Erro ao inicializar:', error)
      } finally {
        setInitialLoading(false)
      }
    }
    
    initializeApp()
  }, [])

  const loadSystemStatus = async () => {
    try {
      const response = await apiClient.getSystemStatus()
      if (response.success) {
        setSystemStatus({
          backend: 'online',
          efi: response.data?.services?.efi === 'connected' ? 'online' : 'offline'
        })
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error)
    }
  }

  const loadWebhooks = async () => {
    // Limpa a lista antes de carregar
    setWebhooks([])
    
    const webhookList: WebhookConfig[] = []
    const currentEnv = credentials.sandbox ? 'sandbox' : 'production'
    
    try {
      const chargeResponse = await apiClient.listWebhooks('charge', currentEnv)
      
      if (chargeResponse.success && chargeResponse.data?.data) {
        if (chargeResponse.data.data.exists && chargeResponse.data.data.webhookUrl) {
          webhookList.push({
            id: 'charge',
            type: 'charge',
            url: chargeResponse.data.data.webhookUrl,
            createdAt: chargeResponse.data.data.criacao,
            status: 'active',
            totalPings: 0
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar webhook de cobrança:', error)
    }
    
    try {
      const recurrenceResponse = await apiClient.listWebhooks('recurrence', currentEnv)
      
      if (recurrenceResponse.success && recurrenceResponse.data?.data) {
        if (recurrenceResponse.data.data.exists && recurrenceResponse.data.data.webhookUrl) {
          webhookList.push({
            id: 'recurrence',
            type: 'recurrence',
            url: recurrenceResponse.data.data.webhookUrl,
            createdAt: recurrenceResponse.data.data.criacao,
            status: 'active',
            totalPings: 0
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar webhook de recorrência:', error)
    }
    
    setWebhooks(webhookList)
  }

  const loadCredentials = async () => {
    try {
      const currentEnv = credentials.sandbox ? 'sandbox' : 'production'
      
      const response = await fetch(`http://localhost:8081/api/load-credentials?env=${currentEnv}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          if (credentials.sandbox) {
            setSandboxCredentials({
              clientId: data.data.client_id || '',
              clientSecret: data.data.client_secret || '',
            })
          } else {
            setProductionCredentials({
              clientId: data.data.client_id || '',
              clientSecret: data.data.client_secret || '',
            })
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error)
    }
  }

  const checkCertificateStatus = async () => {
    try {
      const currentEnv = credentials.sandbox ? 'sandbox' : 'production'
      
      const response = await fetch(`http://localhost:8081/api/certificate-status?env=${currentEnv}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          if (credentials.sandbox) {
            setCertificateStatus(prev => ({
              ...prev,
              sandbox: {
                exists: data.data.exists,
                path: data.data.path || ''
              }
            }))
          } else {
            setCertificateStatus(prev => ({
              ...prev,
              production: {
                exists: data.data.exists,
                path: data.data.path || ''
              }
            }))
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar certificado:', error)
    }
  }

  const handleConfigureWebhook = async (type: 'charge' | 'recurrence', url: string) => {
    setLoading(true)
    try {
      const currentEnv = credentials.sandbox ? 'sandbox' : 'production'
      const response = await apiClient.configWebhook(type, url, currentEnv)
      
      if (response.success) {
        toast({
          title: "✅ Sucesso!",
          description: `Webhook ${type} configurado com sucesso`,
        })
        
        // Recarrega a lista de webhooks
        await loadWebhooks()
      } else {
        toast({
          title: "❌ Erro",
          description: response.error || "Erro ao configurar webhook",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Erro ao configurar webhook:', error)
      toast({
        title: "❌ Erro",
        description: "Erro ao configurar webhook",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    setLoading(true)
    try {
      const currentEnv = credentials.sandbox ? 'sandbox' : 'production'
      const response = await apiClient.deleteWebhook(id as 'charge' | 'recurrence', currentEnv)
      
      if (response.success) {
        toast({
          title: "✅ Sucesso!",
          description: `Webhook ${id} removido com sucesso`,
        })
        
        // Recarrega a lista de webhooks
        await loadWebhooks()
      } else {
        toast({
          title: "❌ Erro",
          description: response.error || "Erro ao remover webhook",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Erro ao remover webhook:', error)
      toast({
        title: "❌ Erro",
        description: "Erro ao remover webhook",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setLoading(true)
    try {
      const response = await apiClient.testConnection()
      if (response.success) {
        toast({
          title: '✅ Conexão com EFI Pay estabelecida!',
          description: 'Conexão com EFI Pay estabelecida com sucesso.',
        })
        loadSystemStatus()
      } else {
        toast({
          title: '❌ Erro na conexão',
          description: response.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error)
      toast({
        title: '❌ Erro ao testar conexão',
        description: 'Erro ao testar conexão',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCredentials = async () => {
    const currentEnv = credentials.sandbox ? 'sandbox' : 'production'
    const currentCreds = credentials.sandbox ? sandboxCredentials : productionCredentials
    
    if (!currentCreds.clientId || !currentCreds.clientSecret) {
      toast({
        title: '❌ Preencha Client ID e Client Secret',
        description: 'Por favor, preencha o Client ID e o Client Secret.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:8081/api/save-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: currentCreds.clientId,
          clientSecret: currentCreds.clientSecret,
          sandbox: credentials.sandbox,
          env: currentEnv
        }),
      })

      if (response.ok) {
        toast({
          title: `✅ Credenciais ${currentEnv} salvas com sucesso!`,
          description: `Credenciais ${currentEnv} salvas com sucesso.`,
        })
        loadSystemStatus()
      } else {
        const error = await response.text()
        toast({
          title: '❌ Erro ao salvar credenciais',
          description: `Erro ao salvar credenciais: ${error}`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error)
      toast({
        title: '❌ Erro ao salvar credenciais',
        description: 'Erro ao salvar credenciais',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUploadCertificate = async (file: File) => {
    const currentEnv = credentials.sandbox ? 'sandbox' : 'production'
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('certificate', file)
      
      const response = await fetch(`http://localhost:8081/api/upload-certificate?env=${currentEnv}`, {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        toast({
          title: `✅ Certificado ${currentEnv} enviado com sucesso!`,
          description: `Certificado ${currentEnv} enviado com sucesso.`,
        })
        checkCertificateStatus()
        loadSystemStatus()
      } else {
        const error = await response.text()
        toast({
          title: '❌ Erro ao enviar certificado',
          description: `Erro ao enviar certificado: ${error}`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erro ao enviar certificado:', error)
      toast({
        title: '❌ Erro ao enviar certificado',
        description: 'Erro ao enviar certificado',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCredentialsChange = (env: 'sandbox' | 'production', field: 'clientId' | 'clientSecret', value: string) => {
    if (env === 'sandbox') {
      setSandboxCredentials(prev => ({ ...prev, [field]: value }))
    } else {
      setProductionCredentials(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleEnvironmentChange = async (sandbox: boolean) => {
    console.log('🔄 MUDANDO AMBIENTE:', sandbox ? 'sandbox' : 'production')
    
    // Atualiza o estado ANTES de fazer qualquer requisição
    setCredentials({ sandbox })
    
    // Limpa a lista de webhooks imediatamente
    setWebhooks([])
    
    // Recarrega o serviço EFI primeiro com o ambiente correto
    const currentEnv = sandbox ? 'sandbox' : 'production'
    try {
      await apiClient.reloadService(currentEnv)
    } catch (error) {
      console.error('Erro ao recarregar serviço:', error)
    }
    
    // Recarrega tudo quando mudar o ambiente usando o ambiente correto
    
    // Recarrega webhooks com o ambiente correto
    await loadWebhooksWithEnv(currentEnv)
    
    // Recarrega credenciais com o ambiente correto
    await loadCredentialsWithEnv(currentEnv)
    
    // Recarrega certificado com o ambiente correto
    await checkCertificateStatusWithEnv(currentEnv)
    
    // Recarrega status do sistema
    await loadSystemStatus()
  }

  const loadWebhooksWithEnv = async (env: 'sandbox' | 'production') => {
    // Limpa a lista antes de carregar
    setWebhooks([])
    
    const webhookList: WebhookConfig[] = []
    
    try {
      const chargeResponse = await apiClient.listWebhooks('charge', env)
      
      if (chargeResponse.success && chargeResponse.data?.data) {
        if (chargeResponse.data.data.exists && chargeResponse.data.data.webhookUrl) {
          webhookList.push({
            id: 'charge',
            type: 'charge',
            url: chargeResponse.data.data.webhookUrl,
            createdAt: chargeResponse.data.data.criacao,
            status: 'active',
            totalPings: 0
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar webhook de cobrança:', error)
    }
    
    try {
      const recurrenceResponse = await apiClient.listWebhooks('recurrence', env)
      
      if (recurrenceResponse.success && recurrenceResponse.data?.data) {
        if (recurrenceResponse.data.data.exists && recurrenceResponse.data.data.webhookUrl) {
          webhookList.push({
            id: 'recurrence',
            type: 'recurrence',
            url: recurrenceResponse.data.data.webhookUrl,
            createdAt: recurrenceResponse.data.data.criacao,
            status: 'active',
            totalPings: 0
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar webhook de recorrência:', error)
    }
    
    setWebhooks(webhookList)
  }

  const loadCredentialsWithEnv = async (env: 'sandbox' | 'production') => {
    try {
      const response = await fetch(`http://localhost:8081/api/load-credentials?env=${env}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          if (env === 'sandbox') {
            setSandboxCredentials({
              clientId: data.data.client_id || '',
              clientSecret: data.data.client_secret || '',
            })
          } else {
            setProductionCredentials({
              clientId: data.data.client_id || '',
              clientSecret: data.data.client_secret || '',
            })
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error)
    }
  }

  const checkCertificateStatusWithEnv = async (env: 'sandbox' | 'production') => {
    try {
      const response = await fetch(`http://localhost:8081/api/certificate-status?env=${env}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          if (env === 'sandbox') {
            setCertificateStatus(prev => ({
              ...prev,
              sandbox: {
                exists: data.data.exists,
                path: data.data.path || ''
              }
            }))
          } else {
            setCertificateStatus(prev => ({
              ...prev,
              production: {
                exists: data.data.exists,
                path: data.data.path || ''
              }
            }))
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar certificado:', error)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando PIX Auto Webhook...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Header 
          systemStatus={systemStatus}
          credentials={credentials}
          onEnvironmentChange={handleEnvironmentChange}
          onRefresh={() => loadWebhooks()}
        />

        <ProductionWarning isProduction={!credentials.sandbox} />

        <StatsCards webhooks={webhooks} systemStatus={systemStatus} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <WebhookList 
            webhooks={webhooks}
            onConfigureWebhook={handleConfigureWebhook}
            onDeleteWebhook={handleDeleteWebhook}
            loading={loading}
          />

          <EfiConfig 
            credentials={credentials}
            sandboxCredentials={sandboxCredentials}
            productionCredentials={productionCredentials}
            certificateStatus={certificateStatus}
            onSaveCredentials={handleSaveCredentials}
            onTestConnection={handleTestConnection}
            onUploadCertificate={handleUploadCertificate}
            onCredentialsChange={handleCredentialsChange}
            loading={loading}
          />
        </div>
      </div>
      <Toaster />
    </div>
  )
}