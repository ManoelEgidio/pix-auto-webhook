'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Link2, Plus, Settings, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface WebhookConfig {
  id: string
  type: 'charge' | 'recurrence'
  url: string
  status: string
  totalPings: number
  lastPing?: string
}

interface WebhookListProps {
  webhooks: WebhookConfig[]
  onConfigureWebhook: (type: 'charge' | 'recurrence', url: string) => void
  onDeleteWebhook: (id: string) => void
  loading: boolean
}

export function WebhookList({ webhooks, onConfigureWebhook, onDeleteWebhook, loading }: WebhookListProps) {
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [newWebhook, setNewWebhook] = useState({ type: 'charge' as 'charge' | 'recurrence', url: '' })

  const handleConfigure = () => {
    if (!newWebhook.url) return
    onConfigureWebhook(newWebhook.type, newWebhook.url)
    setNewWebhook({ type: 'charge', url: '' })
    setIsConfiguring(false)
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢'
      case 'inactive': return '⚪'
      case 'error': return '🔴'
      default: return '⚪'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  return (
    <div className="lg:col-span-2">
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Configurados</CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurar Novo Webhook</DialogTitle>
                  <DialogDescription>
                    Configure um novo webhook para receber notificações automáticas de pagamentos PIX.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhookType">Tipo de Webhook</Label>
                    <Select
                      value={newWebhook.type}
                      onValueChange={(value: 'charge' | 'recurrence') => 
                        setNewWebhook(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="charge">Cobrança</SelectItem>
                        <SelectItem value="recurrence">Recorrência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="webhookUrl">URL do Webhook</Label>
                    <Input
                      id="webhookUrl"
                      placeholder="https://seu-site.com/webhook"
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsConfiguring(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleConfigure} disabled={loading || !newWebhook.url}>
                    {loading ? 'Configurando...' : 'Configurar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="px-6 space-y-4">
          {webhooks.length === 0 ? (
            <div className="text-center py-8">
              <Link2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum webhook configurado</p>
              <p className="text-sm text-gray-500">Configure seu primeiro webhook para começar</p>
            </div>
          ) : (
            webhooks.map((webhook) => (
              <div key={webhook.id} className="group hover:shadow-md transition-shadow duration-200 p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={webhook.type === 'charge' ? 'default' : 'secondary'}>
                        {webhook.type === 'charge' ? 'Cobrança' : 'Recorrência'}
                      </Badge>
                      <Badge className={getStatusColor(webhook.status)}>
                        {getStatusIcon(webhook.status)}
                        <span className="ml-1">{webhook.status}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm text-gray-600 font-mono">{webhook.url}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyUrl(webhook.url)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Total de pings: {webhook.totalPings}</p>
                      {webhook.lastPing && (
                        <p>Último ping: {formatDate(webhook.lastPing)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este webhook? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeleteWebhook(webhook.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={loading}
                          >
                            {loading ? 'Excluindo...' : 'Excluir'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
} 