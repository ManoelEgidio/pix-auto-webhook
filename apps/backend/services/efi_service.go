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
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/crypto/pkcs12"

	"pix_cli/models"
)

// Credentials representa as credenciais da API EFI
type Credentials struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	Sandbox      bool   `json:"sandbox"`
	Env          string `json:"env"`
	Certificate  string `json:"certificate,omitempty"`
}

type EFIService struct {
	credentials *Credentials
	client      *http.Client
	baseURL     string
	accessToken string
}

func NewEFIService(credentials *Credentials) (*EFIService, error) {
	log.Printf("🔧 [NewEFIService] Iniciando serviço EFI com credenciais: %+v", credentials)

	// Verificar se o certificado existe
	if _, err := os.Stat(credentials.Certificate); os.IsNotExist(err) {
		log.Printf("❌ [NewEFIService] Certificado não encontrado: %s", credentials.Certificate)
		return nil, fmt.Errorf("certificado não encontrado: %s", credentials.Certificate)
	}

	certData, err := os.ReadFile(credentials.Certificate)
	if err != nil {
		log.Printf("❌ [NewEFIService] Erro ao ler certificado %s: %v", credentials.Certificate, err)
		return nil, fmt.Errorf("erro ao ler certificado: %v", err)
	}
	log.Printf("✅ [NewEFIService] Certificado lido com sucesso: %s", credentials.Certificate)

	privateKey, cert, err := pkcs12.Decode(certData, "")
	if err != nil {
		log.Printf("❌ [NewEFIService] Erro ao decodificar certificado P12: %v", err)
		return nil, fmt.Errorf("erro ao decodificar certificado P12: %v", err)
	}
	log.Printf("✅ [NewEFIService] Certificado P12 decodificado com sucesso")
	log.Printf("🔐 [NewEFIService] Certificado Subject: %s", cert.Subject)
	log.Printf("🔐 [NewEFIService] Certificado Issuer: %s", cert.Issuer)

	tlsCert := tls.Certificate{
		Certificate: [][]byte{cert.Raw},
		PrivateKey:  privateKey,
		Leaf:        cert,
	}

	tlsConfig := &tls.Config{
		Certificates:       []tls.Certificate{tlsCert},
		MinVersion:         tls.VersionTLS12,
		InsecureSkipVerify: false, // Mantém verificação SSL
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: tlsConfig,
		},
	}

	baseURL := "https://pix.api.efipay.com.br"
	if credentials.Sandbox {
		baseURL = "https://pix-h.api.efipay.com.br"
	}

	log.Printf("🌐 [NewEFIService] Usando baseURL: %s (Sandbox: %v)", baseURL, credentials.Sandbox)

	efiService := &EFIService{
		credentials: credentials,
		client:      client,
		baseURL:     baseURL,
	}

	// Obter access token
	log.Printf("🔐 [NewEFIService] Iniciando processo de OAuth2...")
	if err := efiService.getAccessToken(); err != nil {
		log.Printf("❌ [NewEFIService] Erro ao obter access token: %v", err)
		return nil, fmt.Errorf("erro ao obter access token: %v", err)
	}

	log.Printf("✅ [NewEFIService] Serviço EFI inicializado com sucesso para ambiente: %s", credentials.Env)

	return efiService, nil
}

// getAccessToken obtém o access token via OAuth2
func (s *EFIService) getAccessToken() error {
	authURL := s.baseURL + "/oauth/token"
	log.Printf("🔐 [getAccessToken] Fazendo requisição OAuth2 para: %s", authURL)
	log.Printf("🔐 [getAccessToken] Usando credenciais - ClientID: %s, Sandbox: %v", s.credentials.ClientID, s.credentials.Sandbox)

	// Dados para OAuth2
	data := url.Values{}
	data.Set("grant_type", "client_credentials")

	req, err := http.NewRequest("POST", authURL, strings.NewReader(data.Encode()))
	if err != nil {
		log.Printf("❌ [getAccessToken] Erro ao criar requisição OAuth: %v", err)
		return fmt.Errorf("erro ao criar requisição OAuth: %v", err)
	}

	// Basic Auth para obter o token
	auth := s.credentials.ClientID + ":" + s.credentials.ClientSecret
	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(auth)))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	log.Printf("🔐 [getAccessToken] Enviando requisição OAuth2...")
	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("❌ [getAccessToken] Erro ao executar requisição OAuth: %v", err)
		return fmt.Errorf("erro ao executar requisição OAuth: %v", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ [getAccessToken] Erro ao ler resposta OAuth: %v", err)
		return fmt.Errorf("erro ao ler resposta OAuth: %v", err)
	}

	log.Printf("🔐 [EFI OAuth] Status: %d | Response: %s", resp.StatusCode, string(respBody))

	if resp.StatusCode != 200 {
		log.Printf("❌ [getAccessToken] Erro HTTP %d: %s", resp.StatusCode, string(respBody))
		return fmt.Errorf("erro ao obter access token: %s", string(respBody))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
	}

	if err := json.Unmarshal(respBody, &tokenResp); err != nil {
		log.Printf("❌ [getAccessToken] Erro ao decodificar resposta OAuth: %v", err)
		return fmt.Errorf("erro ao decodificar resposta OAuth: %v", err)
	}

	s.accessToken = tokenResp.AccessToken
	log.Printf("✅ [EFI OAuth] Access token obtido com sucesso")

	return nil
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
	var jsonBody []byte
	var err error

	if cmd.Action == "config" && cmd.URL != "" {
		bodyData = map[string]interface{}{
			"webhookUrl": cmd.URL,
		}
		jsonBody, err = json.Marshal(bodyData)
		if err != nil {
			return nil, fmt.Errorf("erro ao serializar body: %v", err)
		}
	}

	url := s.baseURL + "/v2/" + endpoint

	// LOG ESSENCIAL
	log.Printf("🔍 [EFI API] %s %s", method, url)

	var req *http.Request
	if len(jsonBody) > 0 {
		req, err = http.NewRequest(method, url, bytes.NewBuffer(jsonBody))
	} else {
		req, err = http.NewRequest(method, url, nil)
	}

	if err != nil {
		return nil, fmt.Errorf("erro ao criar requisição: %v", err)
	}

	// Adiciona headers como no SDK Java
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.accessToken)
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

	// LOG ESSENCIAL
	log.Printf("📡 [EFI API] Status: %d | Response: %s", resp.StatusCode, string(respBody))

	// Parse da resposta JSON
	var responseData map[string]interface{}
	if err := json.Unmarshal(respBody, &responseData); err != nil {
		log.Printf("⚠️ [EFI API] Aviso: não foi possível fazer parse da resposta JSON: %v", err)
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

// LoadCredentials carrega as credenciais do arquivo JSON
func LoadCredentials() (*Credentials, error) {
	// Default to sandbox environment
	env := "sandbox"

	configDir := "./config"
	configPath := filepath.Join(configDir, fmt.Sprintf("credentials_%s.json", env))

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("arquivo de credenciais %s não encontrado", env)
	}

	configBytes, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("erro ao ler arquivo de credenciais: %v", err)
	}

	var creds Credentials
	if err := json.Unmarshal(configBytes, &creds); err != nil {
		return nil, fmt.Errorf("erro ao decodificar credenciais do arquivo: %v", err)
	}

	// Set certificate path
	certsDir := "./certs"
	creds.Certificate = filepath.Join(certsDir, fmt.Sprintf("certificado_%s.p12", env))

	return &creds, nil
}

// LoadCredentialsWithEnv carrega as credenciais do arquivo JSON para um ambiente específico
func LoadCredentialsWithEnv(env string) (*Credentials, error) {
	fmt.Printf("🔍 [LoadCredentialsWithEnv] Carregando credenciais para ambiente: %s\n", env)

	configDir := "./config"
	configPath := filepath.Join(configDir, fmt.Sprintf("credentials_%s.json", env))

	fmt.Printf("🔍 [LoadCredentialsWithEnv] Caminho do arquivo: %s\n", configPath)

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("arquivo de credenciais %s não encontrado", env)
	}

	configBytes, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("erro ao ler arquivo de credenciais: %v", err)
	}

	var creds Credentials
	if err := json.Unmarshal(configBytes, &creds); err != nil {
		return nil, fmt.Errorf("erro ao decodificar credenciais do arquivo: %v", err)
	}

	// Set certificate path
	certsDir := "./certs"
	creds.Certificate = filepath.Join(certsDir, fmt.Sprintf("certificado_%s.p12", env))

	fmt.Printf("🔍 [LoadCredentialsWithEnv] Credenciais carregadas - Sandbox: %v, Env: %s\n", creds.Sandbox, creds.Env)

	return &creds, nil
}
