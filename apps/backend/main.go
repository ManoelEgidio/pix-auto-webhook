package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"

	"pix_cli/controllers"
	"pix_cli/services"
	"pix_cli/utils"
)

func main() {
	// Configura log
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	os.Setenv("GODEBUG", "x509negativeserial=1")

	if len(os.Args) > 1 && os.Args[1] == "--server" {
		log.Println("🚀 Iniciando servidor HTTP...")

		credentials, err := services.LoadCredentials()
		if err != nil {
			log.Printf("⚠️  Aviso: Não foi possível carregar credenciais: %v", err)
			log.Println("📝 Configure as variáveis de ambiente para usar a API EFI")
		} else {
			log.Printf("✅ Credenciais carregadas com sucesso: %+v", credentials)
		}

		var efiService *services.EFIService
		if credentials != nil {
			efiService, err = services.NewEFIService(credentials)
			if err != nil {
				log.Printf("⚠️  Aviso: Não foi possível inicializar serviço EFI: %v", err)
			} else {
				log.Printf("✅ Serviço EFI inicializado com sucesso")
			}
		}

		controller := controllers.NewWebhookController(efiService)

		server := NewServer(controller, 8081)
		if err := server.Start(); err != nil {
			log.Fatal("Erro ao iniciar servidor:", err)
		}
	} else {
		if err := utils.ValidateRequiredEnv(); err != nil {
			utils.PrintError(err.Error())
		}

		credentials, err := services.LoadCredentials()
		if err != nil {
			utils.PrintError(err.Error())
		}

		efiService, err := services.NewEFIService(credentials)
		if err != nil {
			utils.PrintError("Erro ao inicializar serviço EFI: " + err.Error())
		}

		controller := controllers.NewWebhookController(efiService)

		showMenu(controller)
	}
}

func showMenu(controller *controllers.WebhookController) {
	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Println("\n🚀 PIX CLI - Gerenciador de Webhooks EFI Pay")
		fmt.Println("==================================================")
		fmt.Println("1. Configurar webhook de cobrança")
		fmt.Println("2. Configurar webhook de recorrência")
		fmt.Println("3. Listar webhooks de cobrança")
		fmt.Println("4. Listar webhooks de recorrência")
		fmt.Println("5. Remover webhook de cobrança")
		fmt.Println("6. Remover webhook de recorrência")
		fmt.Println("7. Sair")
		fmt.Println("==================================================")
		fmt.Print("Escolha uma opção (1-7): ")

		choice, _ := reader.ReadString('\n')
		choice = strings.TrimSpace(choice)

		switch choice {
		case "1":
			configWebhook(controller, "charge", reader)
		case "2":
			configWebhook(controller, "recurrence", reader)
		case "3":
			listWebhook(controller, "charge")
		case "4":
			listWebhook(controller, "recurrence")
		case "5":
			deleteWebhook(controller, "charge", reader)
		case "6":
			deleteWebhook(controller, "recurrence", reader)
		case "7":
			fmt.Println("👋 Até logo!")
			os.Exit(0)
		default:
			fmt.Println("❌ Opção inválida! Escolha de 1 a 7.")
		}
	}
}

func configWebhook(controller *controllers.WebhookController, webhookType string, reader *bufio.Reader) {
	fmt.Printf("\n🔧 Configurando webhook de %s\n", webhookType)
	fmt.Print("Digite a URL do webhook: ")

	url, _ := reader.ReadString('\n')
	url = strings.TrimSpace(url)

	if url == "" {
		fmt.Println("❌ URL não pode estar vazia!")
		return
	}

	webhookTypeEnum, err := controller.ValidateWebhookType(webhookType)
	if err != nil {
		fmt.Printf("❌ Erro: %s\n", err.Error())
		return
	}

	fmt.Printf("⏳ Configurando webhook %s com URL: %s\n", webhookType, url)

	if err := controller.ConfigWebhook(webhookTypeEnum, url); err != nil {
		fmt.Printf("❌ Erro ao configurar webhook: %s\n", err.Error())
	} else {
		fmt.Printf("✅ Webhook %s configurado com sucesso!\n", webhookType)
	}
}

func listWebhook(controller *controllers.WebhookController, webhookType string) {
	fmt.Printf("\n📋 Listando webhooks de %s\n", webhookType)

	webhookTypeEnum, err := controller.ValidateWebhookType(webhookType)
	if err != nil {
		fmt.Printf("❌ Erro: %s\n", err.Error())
		return
	}

	if err := controller.ListWebhook(webhookTypeEnum); err != nil {
		fmt.Printf("❌ Erro ao listar webhooks: %s\n", err.Error())
	}
}

func deleteWebhook(controller *controllers.WebhookController, webhookType string, reader *bufio.Reader) {
	fmt.Printf("\n🗑️ Removendo webhook de %s\n", webhookType)
	fmt.Printf("Tem certeza que deseja remover o webhook de %s? (s/N): ", webhookType)

	confirm, _ := reader.ReadString('\n')
	confirm = strings.TrimSpace(strings.ToLower(confirm))

	if confirm != "s" && confirm != "sim" && confirm != "y" && confirm != "yes" {
		fmt.Println("❌ Operação cancelada!")
		return
	}

	webhookTypeEnum, err := controller.ValidateWebhookType(webhookType)
	if err != nil {
		fmt.Printf("❌ Erro: %s\n", err.Error())
		return
	}

	if err := controller.DeleteWebhook(webhookTypeEnum); err != nil {
		fmt.Printf("❌ Erro ao remover webhook: %s\n", err.Error())
	} else {
		fmt.Printf("✅ Webhook %s removido com sucesso!\n", webhookType)
	}
}
