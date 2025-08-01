'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, BarChart3, Link2, Zap } from 'lucide-react'

interface StatsCardsProps {
  webhooks: any[]
  systemStatus: { backend: string; efi: string }
}

export function StatsCards({ webhooks, systemStatus }: StatsCardsProps) {
  const totalWebhooks = webhooks.length
  const activeWebhooks = webhooks.filter(w => w.status === 'active').length
  const totalPings = webhooks.reduce((sum, w) => sum + (w.totalPings || 0), 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
          <Link2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalWebhooks}</div>
          <p className="text-xs text-muted-foreground">
            {activeWebhooks} ativos
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pings Recebidos</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPings}</div>
          <p className="text-xs text-muted-foreground">
            Total de notificações
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status Backend</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {systemStatus.backend === 'online' ? 'Online' : 'Offline'}
          </div>
          <p className="text-xs text-muted-foreground">
            Servidor local
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status EFI</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {systemStatus.efi === 'online' ? 'Online' : 'Offline'}
          </div>
          <p className="text-xs text-muted-foreground">
            API EFI Pay
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 