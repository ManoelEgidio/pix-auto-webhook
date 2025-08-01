package services

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"golang.org/x/crypto/pkcs12"

	"pix_cli/configs"
	"pix_cli/models"
)

type EFIService struct {
	credentials *configs.Credentials
	client      *http.Client
	baseURL     string
}

func NewEFIService(credentials *configs.Credentials) (*EFIService, error) {
	certData, err := os.ReadFile(credentials.Certificate)
	if err != nil {
		return nil, fmt.Errorf("erro ao ler certificado: %v", err)
	}

	privateKey, cert, err := pkcs12.Decode(certData, "")
	if err != nil {
		return nil, fmt.Errorf("erro ao decodificar certificado P12: %v", err)
	}

	tlsCert := tls.Certificate{
		Certificate: [][]byte{cert.Raw},
		PrivateKey:  privateKey,
		Leaf:        cert,
	}

	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{tlsCert},
		MinVersion:   tls.VersionTLS12,
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
	}

	baseURL := "https://api-pix.gerencianet.com.br"
	if credentials.Sandbox {
		baseURL = "https://api-pix-h.gerencianet.com.br"
	}

	return &EFIService{
		credentials: credentials,
		client:      client,
		baseURL:     baseURL,
	}, nil
}

// ExecuteWebhookCommand executa um comando de webhook (endpoints v2 da EFI)
func (s *EFIService) ExecuteWebhookCommand(cmd *models.WebhookCommand) (*models.WebhookResponse, error) {
	var endpoint string
	var method string

	switch cmd.Type {
	case models.WebhookTypeCharge:
		switch cmd.Action {
		case "config":
			endpoint = "webhookcobr"
			method = "PUT"
		case "delete":
			endpoint = "webhookcobr"
			method = "DELETE"
		case "list":
			endpoint = "webhookcobr"
			method = "GET"
		default:
			return nil, fmt.Errorf("ação não suportada para webhook de cobrança: %s", cmd.Action)
		}
	case models.WebhookTypeRecurrence:
		switch cmd.Action {
		case "config":
			endpoint = "webhookrec"
			method = "PUT"
		case "delete":
			endpoint = "webhookrec"
			method = "DELETE"
		case "list":
			endpoint = "webhookrec"
			method = "GET"
		default:
			return nil, fmt.Errorf("ação não suportada para webhook de recorrência: %s", cmd.Action)
		}
	default:
		return nil, fmt.Errorf("tipo de webhook não suportado: %s", cmd.Type)
	}

	// Prepara o body da requisição (endpoints v2)
	var bodyData map[string]interface{}
	if cmd.Action == "config" && cmd.URL != "" {
		bodyData = map[string]interface{}{
			"webhookUrl": cmd.URL,
		}
	} else {
		bodyData = map[string]interface{}{}
	}

	// Serializa o body para JSON
	jsonBody, err := json.Marshal(bodyData)
	if err != nil {
		return nil, fmt.Errorf("erro ao serializar body: %v", err)
	}

	url := s.baseURL + "/v2/" + endpoint
	req, err := http.NewRequest(method, url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("erro ao criar requisição: %v", err)
	}

	// Adiciona headers como no SDK Java
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Basic "+s.getBasicAuth())
	req.Header.Set("x-skip-mtls-checking", "true") // Como no Java

	// Executa a requisição
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("erro ao executar requisição: %v", err)
	}
	defer resp.Body.Close()

	// Lê a resposta
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("erro ao ler resposta: %v", err)
	}

	log.Printf("Resposta da API %s %s: %s", method, endpoint, string(respBody))

	// Parse da resposta JSON
	var responseData map[string]interface{}
	if err := json.Unmarshal(respBody, &responseData); err != nil {
		log.Printf("Aviso: não foi possível fazer parse da resposta JSON: %v", err)
		responseData = map[string]interface{}{
			"raw_response": string(respBody),
			"status_code":  resp.StatusCode,
		}
	}

	return &models.WebhookResponse{
		Code:    resp.StatusCode,
		Message: "Comando executado com sucesso",
		Data:    responseData,
	}, nil
}

// getBasicAuth retorna a autenticação básica em base64
func (s *EFIService) getBasicAuth() string {
	auth := s.credentials.ClientID + ":" + s.credentials.ClientSecret
	return base64.StdEncoding.EncodeToString([]byte(auth))
}

// ConfigWebhook configura um webhook
func (s *EFIService) ConfigWebhook(webhookType models.WebhookType, webhookURL string) (*models.WebhookResponse, error) {
	cmd := &models.WebhookCommand{
		Type:   webhookType,
		Action: "config",
		URL:    webhookURL,
		Params: map[string]string{},
		Body: map[string]interface{}{
			"webhookUrl": webhookURL,
		},
	}

	return s.ExecuteWebhookCommand(cmd)
}

// DeleteWebhook remove um webhook
func (s *EFIService) DeleteWebhook(webhookType models.WebhookType) (*models.WebhookResponse, error) {
	cmd := &models.WebhookCommand{
		Type:   webhookType,
		Action: "delete",
		Params: map[string]string{},
		Body:   map[string]interface{}{},
	}

	return s.ExecuteWebhookCommand(cmd)
}

// ListWebhook lista os webhooks configurados
func (s *EFIService) ListWebhook(webhookType models.WebhookType) (*models.WebhookResponse, error) {
	cmd := &models.WebhookCommand{
		Type:   webhookType,
		Action: "list",
		Params: map[string]string{},
		Body:   map[string]interface{}{},
	}

	return s.ExecuteWebhookCommand(cmd)
}
