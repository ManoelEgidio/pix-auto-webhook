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
    try {
      const chargeResponse = await apiClient.listWebhooks('charge')
      const recurrenceResponse = await apiClient.listWebhooks('recurrence')
      
      const webhookList: WebhookConfig[] = []
      
      console.log('Resposta da API - Charge:', chargeResponse)
      console.log('Resposta da API - Recurrence:', recurrenceResponse)
      
      if (chargeResponse.success && chargeResponse.data && !chargeResponse.data.nome) {
        console.log('Webhooks de cobrança encontrados:', chargeResponse.data)
      }
      
      if (recurrenceResponse.success && recurrenceResponse.data && !recurrenceResponse.data.nome) {
        console.log('Webhooks de recorrência encontrados:', recurrenceResponse.data)
      }
      
      setWebhooks(webhookList)
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error)
    }
  }

  const loadCredentials = async () => {
    try {
      const sandboxResponse = await fetch('http://localhost:8081/api/load-credentials?env=sandbox')
      if (sandboxResponse.ok) {
        const sandboxData = await sandboxResponse.json()
        if (sandboxData.success && sandboxData.data) {
          setSandboxCredentials({
            clientId: sandboxData.data.client_id || '',
            clientSecret: sandboxData.data.client_secret || '',
          })
        }
      }
      
      const productionResponse = await fetch('http://localhost:8081/api/load-credentials?env=production')
      if (productionResponse.ok) {
        const productionData = await productionResponse.json()
        if (productionData.success && productionData.data) {
          setProductionCredentials({
            clientId: productionData.data.client_id || '',
            clientSecret: productionData.data.client_secret || '',
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error)
    }
  }

  const checkCertificateStatus = async () => {
    try {
      const sandboxResponse = await fetch('http://localhost:8081/api/certificate-status?env=sandbox')
      if (sandboxResponse.ok) {
        const sandboxData = await sandboxResponse.json()
        if (sandboxData.success) {
          setCertificateStatus(prev => ({
            ...prev,
            sandbox: {
              exists: sandboxData.data.exists,
              path: sandboxData.data.path || ''
            }
          }))
        }
      }
      
      const productionResponse = await fetch('http://localhost:8081/api/certificate-status?env=production')
      if (productionResponse.ok) {
        const productionData = await productionResponse.json()
        if (productionData.success) {
          setCertificateStatus(prev => ({
            ...prev,
            production: {
              exists: productionData.data.exists,
              path: productionData.data.path || ''
            }
          }))
        }
      }
    } catch (error) {
      console.error('Erro ao verificar certificado:', error)
    }
  }

  const handleConfigureWebhook = async (type: 'charge' | 'recurrence', url: string) => {
    setLoading(true)
    try {
      const response = await apiClient.configWebhook(type, url)
      
      if (response.success) {
        const newHook: WebhookConfig = {
          id: Date.now().toString(),
          type,
          url,
          status: 'active',
          totalPings: 0
        }
        setWebhooks(prev => [...prev, newHook])
        toast({
          title: '✅ Webhook configurado com sucesso!',
          description: 'Webhook configurado com sucesso.',
        })
      } else {
        toast({
          title: '❌ Erro ao configurar webhook',
          description: response.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erro ao configurar webhook:', error)
      toast({
        title: '❌ Erro ao configurar webhook',
        description: 'Erro ao configurar webhook',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    const webhook = webhooks.find(w => w.id === id)
    if (!webhook) return
    setLoading(true)
    try {
      const response = await apiClient.deleteWebhook(webhook.type)
      
      if (response.success) {
        setWebhooks(prev => prev.filter(w => w.id !== id))
        toast({
          title: '✅ Webhook excluído com sucesso!',
          description: 'Webhook excluído com sucesso.',
        })
      } else {
        toast({
          title: '❌ Erro ao deletar webhook',
          description: response.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erro ao deletar webhook:', error)
      toast({
        title: '❌ Erro ao deletar webhook',
        description: 'Erro ao deletar webhook',
        variant: 'destructive',
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
          onEnvironmentChange={(sandbox) => setCredentials(prev => ({ ...prev, sandbox }))}
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