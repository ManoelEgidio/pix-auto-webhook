// Tipos compartilhados para webhook PIX
export interface WebhookPayload {
  pix_key: string;
  amount: number;
  description?: string;
  merchant_name?: string;
  transaction_id: string;
  created_at: string;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Utilitários compartilhados
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount / 100);
};

export const validatePixKey = (key: string): boolean => {
  // Validação básica de chave PIX
  return key.length >= 3 && key.length <= 140;
};