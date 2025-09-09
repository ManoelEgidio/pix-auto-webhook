package controllers

import (
	"fmt"
	"log"

	"pix_cli/models"
	"pix_cli/services"
)

type WebhookController struct {
	efiService *services.EFIService
}

func NewWebhookController(efiService *services.EFIService) *WebhookController {
	return &WebhookController{
		efiService: efiService,
	}
}

func (c *WebhookController) GetEFIService() *services.EFIService {
	return c.efiService
}

func (c *WebhookController) ConfigWebhook(webhookType models.WebhookType, webhookURL string) error {
	if webhookURL == "" {
		return fmt.Errorf("URL do webhook é obrigatória")
	}

	if c.efiService == nil {
		return fmt.Errorf("serviço EFI não está disponível - configure as credenciais")
	}

	log.Printf("Configurando webhook %s com URL: %s", webhookType, webhookURL)

	response, err := c.efiService.ConfigWebhook(webhookType, webhookURL)
	if err != nil {
		return fmt.Errorf("erro ao configurar webhook: %v", err)
	}

	fmt.Printf("✅ Webhook %s configurado com sucesso!\n", webhookType)
	fmt.Printf("📋 Resposta: %+v\n", response.Data)
	return nil
}

func (c *WebhookController) DeleteWebhook(webhookType models.WebhookType) error {
	if c.efiService == nil {
		return fmt.Errorf("serviço EFI não está disponível - configure as credenciais")
	}

	log.Printf("Removendo webhook %s", webhookType)

	response, err := c.efiService.DeleteWebhook(webhookType)
	if err != nil {
		return fmt.Errorf("erro ao remover webhook: %v", err)
	}

	fmt.Printf("✅ Webhook %s removido com sucesso!\n", webhookType)
	fmt.Printf("📋 Resposta: %+v\n", response.Data)
	return nil
}

func (c *WebhookController) ListWebhook(webhookType models.WebhookType) error {
	if c.efiService == nil {
		return fmt.Errorf("serviço EFI não está disponível - configure as credenciais")
	}

	log.Printf("Listando webhooks %s", webhookType)

	response, err := c.efiService.ListWebhook(webhookType)
	if err != nil {
		if response != nil && response.Code == 404 {
			fmt.Printf("📋 Nenhum webhook %s configurado\n", webhookType)
			return nil
		}
		return fmt.Errorf("erro ao listar webhooks: %v", err)
	}

	if response.Code == 200 {
		fmt.Printf("📋 Webhook %s configurado:\n", webhookType)
		fmt.Printf("📊 URL: %v\n", response.Data["webhookUrl"])
		fmt.Printf("📊 Criação: %v\n", response.Data["criacao"])
	} else {
		fmt.Printf("📋 Webhooks %s configurados:\n", webhookType)
		fmt.Printf("📊 Resposta: %+v\n", response.Data)
	}

	return nil
}

func (c *WebhookController) ValidateWebhookType(webhookType string) (models.WebhookType, error) {
	switch webhookType {
	case "charge":
		return models.WebhookTypeCharge, nil
	case "recurrence":
		return models.WebhookTypeRecurrence, nil
	default:
		return "", fmt.Errorf("tipo de webhook inválido: %s. Tipos válidos: charge, recurrence", webhookType)
	}
}
