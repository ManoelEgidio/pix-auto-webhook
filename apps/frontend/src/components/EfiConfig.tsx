'use client'

import { AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield } from 'lucide-react'

interface EfiConfigProps {
  credentials: { sandbox: boolean }
  sandboxCredentials: { clientId: string; clientSecret: string }
  productionCredentials: { clientId: string; clientSecret: string }
  certificateStatus: {
    sandbox: { exists: boolean; path: string }
    production: { exists: boolean; path: string }
  }
  onSaveCredentials: () => void
  onTestConnection: () => void
  onUploadCertificate: (file: File) => void
  onCredentialsChange: (env: 'sandbox' | 'production', field: 'clientId' | 'clientSecret', value: string) => void
  loading: boolean
}

export function EfiConfig({
  credentials,
  sandboxCredentials,
  productionCredentials,
  certificateStatus,
  onSaveCredentials,
  onTestConnection,
  onUploadCertificate,
  onCredentialsChange,
  loading
}: EfiConfigProps) {
  const currentCreds = credentials.sandbox ? sandboxCredentials : productionCredentials
  const currentCert = certificateStatus[credentials.sandbox ? 'sandbox' : 'production']
  const isIncomplete = !currentCreds.clientId || !currentCreds.clientSecret || !currentCert.exists

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.p12')) {
        onUploadCertificate(file)
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações EFI</CardTitle>
          {(() => {
            return isIncomplete && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-800 font-medium">
                    Configuração incompleta
                  </p>
                </div>
                <ul className="mt-2 text-xs text-red-700 space-y-1">
                  {!currentCreds.clientId && <li>• Client ID não configurado</li>}
                  {!currentCreds.clientSecret && <li>• Client Secret não configurado</li>}
                  {!currentCert.exists && <li>• Certificado P12 não enviado</li>}
                </ul>
              </div>
            )
          })()}
        </CardHeader>
        <CardContent className="px-6 space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="clientId" className="text-sm font-medium">
                Client ID
              </Label>
              <Input
                id="clientId"
                type="text"
                placeholder="Seu Client ID da EFI"
                value={currentCreds.clientId}
                onChange={(e) => {
                  const env = credentials.sandbox ? 'sandbox' : 'production'
                  onCredentialsChange(env, 'clientId', e.target.value)
                }}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="clientSecret" className="text-sm font-medium">
                Client Secret
              </Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="Seu Client Secret da EFI"
                value={currentCreds.clientSecret}
                onChange={(e) => {
                  const env = credentials.sandbox ? 'sandbox' : 'production'
                  onCredentialsChange(env, 'clientSecret', e.target.value)
                }}
                className="mt-1"
              />
            </div>
          </div>
          
          <Button 
            onClick={onSaveCredentials}
            disabled={loading || !currentCreds.clientId || !currentCreds.clientSecret}
            className="w-full"
          >
            {loading ? 'Salvando...' : 'Salvar Credenciais'}
          </Button>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Certificado P12
              </Label>
              {currentCert.exists && (
                <Badge variant="secondary" className="text-xs">
                  ✅ Configurado
                </Badge>
              )}
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".p12"
                onChange={handleFileChange}
                className="hidden"
                id="certificate-upload"
              />
              <label htmlFor="certificate-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {currentCert.exists ? 'Certificado configurado' : 'Clique para selecionar'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentCert.exists ? 'Clique para trocar' : 'ou arraste o arquivo .p12 aqui'}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onTestConnection}
            disabled={loading || !currentCreds.clientId || !currentCreds.clientSecret || !currentCert.exists}
          >
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            {loading ? 'Testando...' : 'Testar Conexão'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 