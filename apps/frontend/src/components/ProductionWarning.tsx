'use client'

interface ProductionWarningProps {
  isProduction: boolean
}

export function ProductionWarning({ isProduction }: ProductionWarningProps) {
  if (!isProduction) return null

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900 mb-1">
            ⚠️ Ambiente de Produção Ativo
          </h3>
          <p className="text-sm text-red-700">
            Você está no ambiente de produção. Todas as ações afetarão dados reais e transações. 
            Certifique-se de que suas configurações estão corretas antes de prosseguir.
          </p>
        </div>
      </div>
    </div>
  )
} 