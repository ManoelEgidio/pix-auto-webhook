package utils

import (
	"fmt"
	"os"
)

func PrintUsage() {
	fmt.Println("🚀 PIX CLI - Gerenciador de Webhooks EFI Pay")
	fmt.Println()
	fmt.Println("Uso: pix-cli <comando> [flags]")
	fmt.Println()
	fmt.Println("Comandos:")
	fmt.Println("  config <tipo> --url <webhook_url>  Configura um webhook")
	fmt.Println("  delete <tipo>                       Remove um webhook")
	fmt.Println("  list <tipo>                         Lista webhooks configurados")
	fmt.Println()
	fmt.Println("Tipos de webhook:")
	fmt.Println("  charge                              Webhook de cobrança automática")
	fmt.Println("  recurrence                          Webhook de recorrência automática")
	fmt.Println()
	fmt.Println("Flags:")
	fmt.Println("  --url <url>                         URL do webhook (obrigatório para config)")
	fmt.Println()
	fmt.Println("Exemplos:")
	fmt.Println("  pix-cli config charge --url https://meusite.com/webhook")
	fmt.Println("  pix-cli config recurrence --url https://meusite.com/webhook-rec")
	fmt.Println("  pix-cli delete charge")
	fmt.Println("  pix-cli list recurrence")
	fmt.Println()
	fmt.Println("Variáveis de ambiente necessárias:")
	fmt.Println("  EFI_CLIENT_ID                       ID do cliente EFI")
	fmt.Println("  EFI_CLIENT_SECRET                   Secret do cliente EFI")
	fmt.Println("  EFI_CERTIFICATE_PATH                Caminho do certificado .p12")
	fmt.Println("  EFI_SANDBOX                         true/false (padrão: false)")
}

func PrintError(message string) {
	fmt.Printf("❌ Erro: %s\n", message)
	os.Exit(1)
}

func PrintSuccess(message string) {
	fmt.Printf("✅ %s\n", message)
}

func PrintInfo(message string) {
	fmt.Printf("ℹ️  %s\n", message)
}
func ValidateRequiredEnv() error {
	required := []string{
		"EFI_CLIENT_ID",
		"EFI_CLIENT_SECRET",
		"EFI_CERTIFICATE_PATH",
	}

	for _, env := range required {
		if os.Getenv(env) == "" {
			return fmt.Errorf("variável de ambiente %s é obrigatória", env)
		}
	}

	return nil
}
