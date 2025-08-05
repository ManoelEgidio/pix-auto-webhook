'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Zap, RefreshCw } from 'lucide-react'

interface HeaderProps {
  systemStatus: { backend: string; efi: string }
  credentials: { sandbox: boolean }
  onEnvironmentChange: (sandbox: boolean) => void
  onRefresh?: () => void
}

export function Header({ systemStatus, credentials, onEnvironmentChange, onRefresh }: HeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PIX Auto Webhook</h1>
            <p className="text-sm text-gray-600">Gerenciador de Webhooks EFI Pay</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={credentials.sandbox ? "default" : "ghost"}
              size="sm"
              onClick={() => onEnvironmentChange(true)}
              className="text-xs"
            >
              Sandbox
            </Button>
            <Button
              variant={!credentials.sandbox ? "default" : "ghost"}
              size="sm"
              onClick={() => onEnvironmentChange(false)}
              className="text-xs"
            >
              Produção
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${systemStatus.backend === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              Backend: {systemStatus.backend === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${systemStatus.efi === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              EFI Pay: {systemStatus.efi === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        )}
      </div>
    </div>
  )
} 