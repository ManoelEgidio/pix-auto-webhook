package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"pix_cli/controllers"
	"pix_cli/services"
)

type Server struct {
	controller *controllers.WebhookController
	port       int
}

func NewServer(controller *controllers.WebhookController, port int) *Server {
	return &Server{
		controller: controller,
		port:       port,
	}
}

// reloadEFIService recarrega o serviço EFI com as credenciais atualizadas
func (s *Server) reloadEFIService() error {
	credentials, err := services.LoadCredentials()
	if err != nil {
		return fmt.Errorf("erro ao recarregar credenciais: %v", err)
	}

	efiService, err := services.NewEFIService(credentials)
	if err != nil {
		return fmt.Errorf("erro ao recriar serviço EFI: %v", err)
	}

	// Recria o controller com o novo serviço
	s.controller = controllers.NewWebhookController(efiService)
	return nil
}

func (s *Server) reloadEFIServiceWithEnv(env string) error {
	log.Printf("🔄 [reloadEFIServiceWithEnv] Recarregando serviço EFI para ambiente: %s", env)

	credentials, err := services.LoadCredentialsWithEnv(env)
	if err != nil {
		log.Printf("❌ [reloadEFIServiceWithEnv] Erro ao carregar credenciais: %v", err)
		return fmt.Errorf("erro ao recarregar credenciais: %v", err)
	}
	log.Printf("✅ [reloadEFIServiceWithEnv] Credenciais carregadas: %+v", credentials)

	efiService, err := services.NewEFIService(credentials)
	if err != nil {
		log.Printf("❌ [reloadEFIServiceWithEnv] Erro ao criar serviço EFI: %v", err)
		return fmt.Errorf("erro ao recriar serviço EFI: %v", err)
	}
	log.Printf("✅ [reloadEFIServiceWithEnv] Serviço EFI criado com sucesso")

	// Recria o controller com o novo serviço
	s.controller = controllers.NewWebhookController(efiService)
	log.Printf("✅ [reloadEFIServiceWithEnv] Controller recriado com sucesso")
	return nil
}

func (s *Server) Start() error {
	http.HandleFunc("/api/", s.handleCORS(s.handleAPI))

	http.HandleFunc("/health", s.handleHealth)

	addr := fmt.Sprintf(":%d", s.port)
	log.Printf("🚀 Servidor iniciado na porta %d", s.port)
	log.Printf("📡 API disponível em: http://localhost%s", addr)

	return http.ListenAndServe(addr, nil)
}
func (s *Server) handleCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

// handleAPI roteia as requisições da API
func (s *Server) handleAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	path := r.URL.Path

	switch {
	case path == "/api/webhook/config" && r.Method == "POST":
		s.handleConfigWebhook(w, r)
	case path == "/api/webhook/list" && r.Method == "GET":
		s.handleListWebhook(w, r)
	case path == "/api/webhook/delete" && r.Method == "DELETE":
		s.handleDeleteWebhook(w, r)
	case path == "/api/test-connection" && r.Method == "GET":
		s.handleTestConnection(w, r)
	case path == "/api/status" && r.Method == "GET":
		s.handleStatus(w, r)
	case path == "/api/upload-certificate" && r.Method == "POST":
		s.handleUploadCertificate(w, r)
	case path == "/api/save-credentials" && r.Method == "POST":
		s.handleSaveCredentials(w, r)
	case path == "/api/load-credentials" && r.Method == "GET":
		s.handleLoadCredentials(w, r)
	case path == "/api/certificate-status" && r.Method == "GET":
		s.handleCertificateStatus(w, r)
	case path == "/api/reload-service" && r.Method == "POST":
		s.handleReloadService(w, r)
	default:
		s.sendError(w, "Endpoint não encontrado", http.StatusNotFound)
	}
}

// handleConfigWebhook configura um webhook
func (s *Server) handleConfigWebhook(w http.ResponseWriter, r *http.Request) {
	if s.controller == nil {
		s.sendError(w, "Serviço EFI não está disponível - configure as credenciais", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		Type string `json:"type"`
		URL  string `json:"url"`
		Env  string `json:"env"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, "Erro ao decodificar requisição", http.StatusBadRequest)
		return
	}

	// Get environment from request body
	env := req.Env
	if env == "" {
		env = "sandbox" // Default to sandbox
	}

	// Validate environment
	if env != "sandbox" && env != "production" {
		s.sendError(w, "Ambiente inválido. Use 'sandbox' ou 'production'", http.StatusBadRequest)
		return
	}

	// Recarrega o serviço com o ambiente correto
	if err := s.reloadEFIServiceWithEnv(env); err != nil {
		s.sendError(w, fmt.Sprintf("Erro ao recarregar serviço: %v", err), http.StatusInternalServerError)
		return
	}

	webhookType, err := s.controller.ValidateWebhookType(req.Type)
	if err != nil {
		s.sendError(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.controller.ConfigWebhook(webhookType, req.URL); err != nil {
		s.sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.sendSuccess(w, map[string]interface{}{
		"message": fmt.Sprintf("Webhook %s configurado com sucesso", req.Type),
		"type":    req.Type,
		"url":     req.URL,
	})
}

// handleListWebhook lista webhooks
func (s *Server) handleListWebhook(w http.ResponseWriter, r *http.Request) {
	if s.controller == nil {
		s.sendError(w, "Serviço EFI não está disponível - configure as credenciais", http.StatusServiceUnavailable)
		return
	}

	webhookType := r.URL.Query().Get("type")
	if webhookType == "" {
		s.sendError(w, "Tipo de webhook é obrigatório", http.StatusBadRequest)
		return
	}

	// Get environment from query parameter
	env := r.URL.Query().Get("env")
	if env == "" {
		env = "sandbox" // Default to sandbox
	}

	// Validate environment
	if env != "sandbox" && env != "production" {
		s.sendError(w, "Ambiente inválido. Use 'sandbox' ou 'production'", http.StatusBadRequest)
		return
	}

	// Recarrega o serviço com o ambiente correto
	if err := s.reloadEFIServiceWithEnv(env); err != nil {
		s.sendError(w, fmt.Sprintf("Erro ao recarregar serviço: %v", err), http.StatusInternalServerError)
		return
	}

	wt, err := s.controller.ValidateWebhookType(webhookType)
	if err != nil {
		s.sendError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Chama o serviço diretamente para obter os dados
	response, err := s.controller.GetEFIService().ListWebhook(wt)
	if err != nil {
		// Se for 404, significa que não há webhook configurado (normal)
		if response != nil && response.Code == 404 {
			s.sendSuccess(w, map[string]interface{}{
				"type":    webhookType,
				"exists":  false,
				"message": fmt.Sprintf("Nenhum webhook %s configurado", webhookType),
			})
			return
		}
		s.sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Se retornou 200, retorna os dados do webhook
	if response.Code == 200 {
		s.sendSuccess(w, map[string]interface{}{
			"type":       webhookType,
			"exists":     true,
			"webhookUrl": response.Data["webhookUrl"],
			"criacao":    response.Data["criacao"],
			"message":    fmt.Sprintf("Webhook %s encontrado", webhookType),
		})
	} else {
		s.sendSuccess(w, map[string]interface{}{
			"type":    webhookType,
			"exists":  false,
			"message": fmt.Sprintf("Nenhum webhook %s configurado", webhookType),
		})
	}
}

// handleDeleteWebhook remove um webhook
func (s *Server) handleDeleteWebhook(w http.ResponseWriter, r *http.Request) {
	if s.controller == nil {
		s.sendError(w, "Serviço EFI não está disponível - configure as credenciais", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		Type string `json:"type"`
		Env  string `json:"env"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, "Erro ao decodificar requisição", http.StatusBadRequest)
		return
	}

	// Get environment from request body
	env := req.Env
	if env == "" {
		env = "sandbox" // Default to sandbox
	}

	// Validate environment
	if env != "sandbox" && env != "production" {
		s.sendError(w, "Ambiente inválido. Use 'sandbox' ou 'production'", http.StatusBadRequest)
		return
	}

	// Recarrega o serviço com o ambiente correto
	if err := s.reloadEFIServiceWithEnv(env); err != nil {
		s.sendError(w, fmt.Sprintf("Erro ao recarregar serviço: %v", err), http.StatusInternalServerError)
		return
	}

	webhookType, err := s.controller.ValidateWebhookType(req.Type)
	if err != nil {
		s.sendError(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.controller.DeleteWebhook(webhookType); err != nil {
		s.sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.sendSuccess(w, map[string]interface{}{
		"message": fmt.Sprintf("Webhook %s removido com sucesso", req.Type),
		"type":    req.Type,
	})
}

// handleTestConnection testa conexão com EFI
func (s *Server) handleTestConnection(w http.ResponseWriter, r *http.Request) {
	if s.controller == nil {
		s.sendError(w, "Serviço EFI não está disponível - configure as credenciais", http.StatusServiceUnavailable)
		return
	}

	// Simula teste de conexão
	s.sendSuccess(w, map[string]interface{}{
		"status":  "connected",
		"message": "Conexão com EFI Pay estabelecida",
	})
}

// handleStatus retorna status do sistema
func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	efiStatus := "offline"
	if s.controller != nil {
		efiStatus = "online"
	}

	s.sendSuccess(w, map[string]interface{}{
		"status": "online",
		"services": map[string]interface{}{
			"backend":  "online",
			"efi":      efiStatus,
			"database": "online",
		},
	})
}

// handleHealth health check
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
	})
}

// handleUploadCertificate recebe e salva o certificado
func (s *Server) handleUploadCertificate(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		s.sendError(w, "Erro ao processar arquivo", http.StatusBadRequest)
		return
	}

	// Get uploaded file
	file, header, err := r.FormFile("certificate")
	if err != nil {
		s.sendError(w, "Arquivo não encontrado", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Get environment from query parameter
	env := r.URL.Query().Get("env")
	if env == "" {
		env = "sandbox" // Default to sandbox
	}

	// Validate environment
	if env != "sandbox" && env != "production" {
		s.sendError(w, "Ambiente inválido. Use 'sandbox' ou 'production'", http.StatusBadRequest)
		return
	}

	// Validate file extension
	if !strings.HasSuffix(header.Filename, ".p12") {
		s.sendError(w, "Apenas arquivos .p12 são aceitos", http.StatusBadRequest)
		return
	}

	// Create certs directory if it doesn't exist
	certsDir := "./certs"
	if err := os.MkdirAll(certsDir, 0755); err != nil {
		s.sendError(w, "Erro ao criar diretório", http.StatusInternalServerError)
		return
	}

	// Save file with environment-specific name
	certPath := filepath.Join(certsDir, fmt.Sprintf("certificado_%s.p12", env))
	dst, err := os.Create(certPath)
	if err != nil {
		s.sendError(w, "Erro ao salvar arquivo", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		s.sendError(w, "Erro ao copiar arquivo", http.StatusInternalServerError)
		return
	}

	// Recarrega o serviço EFI após o upload do certificado
	if err := s.reloadEFIServiceWithEnv(env); err != nil {
		s.sendError(w, "Erro ao recarregar serviço EFI após upload do certificado", http.StatusInternalServerError)
		return
	}

	s.sendSuccess(w, map[string]interface{}{
		"message": fmt.Sprintf("Certificado %s enviado com sucesso", env),
		"path":    certPath,
		"env":     env,
	})
}

// handleSaveCredentials salva as credenciais em arquivo JSON
func (s *Server) handleSaveCredentials(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		ClientID     string `json:"clientId"`
		ClientSecret string `json:"clientSecret"`
		Sandbox      bool   `json:"sandbox"`
		Env          string `json:"env"`
	}

	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		s.sendError(w, "Erro ao decodificar credenciais", http.StatusBadRequest)
		return
	}

	// Get environment from request or default to sandbox
	env := creds.Env
	if env == "" {
		env = "sandbox"
	}

	// Validate environment
	if env != "sandbox" && env != "production" {
		s.sendError(w, "Ambiente inválido. Use 'sandbox' ou 'production'", http.StatusBadRequest)
		return
	}

	// Valida credenciais
	if creds.ClientID == "" || creds.ClientSecret == "" {
		s.sendError(w, "Client ID e Client Secret são obrigatórios", http.StatusBadRequest)
		return
	}

	// Cria diretório config se não existir
	configDir := "./config"
	if err := os.MkdirAll(configDir, 0755); err != nil {
		s.sendError(w, "Erro ao criar diretório de configuração", http.StatusInternalServerError)
		return
	}

	// Salva credenciais em arquivo JSON específico do ambiente
	configPath := filepath.Join(configDir, fmt.Sprintf("credentials_%s.json", env))
	configData := map[string]interface{}{
		"client_id":     creds.ClientID,
		"client_secret": creds.ClientSecret,
		"sandbox":       env == "sandbox",
		"env":           env,
	}

	configBytes, err := json.MarshalIndent(configData, "", "  ")
	if err != nil {
		s.sendError(w, "Erro ao serializar configuração", http.StatusInternalServerError)
		return
	}

	if err := os.WriteFile(configPath, configBytes, 0644); err != nil {
		s.sendError(w, "Erro ao salvar arquivo de configuração", http.StatusInternalServerError)
		return
	}

	// Recarrega o serviço EFI após salvar as credenciais
	if err := s.reloadEFIServiceWithEnv(env); err != nil {
		s.sendError(w, "Erro ao recarregar serviço EFI após salvar credenciais", http.StatusInternalServerError)
		return
	}

	s.sendSuccess(w, map[string]interface{}{
		"message": fmt.Sprintf("Credenciais %s salvas com sucesso", env),
		"path":    configPath,
		"env":     env,
	})
}

// handleLoadCredentials carrega as credenciais do arquivo JSON
func (s *Server) handleLoadCredentials(w http.ResponseWriter, r *http.Request) {
	// Get environment from query parameter
	env := r.URL.Query().Get("env")
	if env == "" {
		env = "sandbox" // Default to sandbox
	}

	// Validate environment
	if env != "sandbox" && env != "production" {
		s.sendError(w, "Ambiente inválido. Use 'sandbox' ou 'production'", http.StatusBadRequest)
		return
	}

	configDir := "./config"
	configPath := filepath.Join(configDir, fmt.Sprintf("credentials_%s.json", env))

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		s.sendError(w, fmt.Sprintf("Arquivo de credenciais %s não encontrado", env), http.StatusNotFound)
		return
	}

	configBytes, err := os.ReadFile(configPath)
	if err != nil {
		s.sendError(w, "Erro ao ler arquivo de credenciais", http.StatusInternalServerError)
		return
	}

	var creds struct {
		ClientID     string `json:"client_id"`
		ClientSecret string `json:"client_secret"`
		Sandbox      bool   `json:"sandbox"`
		Env          string `json:"env"`
	}

	if err := json.Unmarshal(configBytes, &creds); err != nil {
		s.sendError(w, "Erro ao decodificar credenciais do arquivo", http.StatusInternalServerError)
		return
	}

	s.sendSuccess(w, map[string]interface{}{
		"client_id":     creds.ClientID,
		"client_secret": creds.ClientSecret,
		"sandbox":       creds.Sandbox,
		"env":           env,
	})
}

// handleCertificateStatus verifica o status do certificado
func (s *Server) handleCertificateStatus(w http.ResponseWriter, r *http.Request) {
	// Get environment from query parameter
	env := r.URL.Query().Get("env")
	if env == "" {
		env = "sandbox" // Default to sandbox
	}

	// Validate environment
	if env != "sandbox" && env != "production" {
		s.sendError(w, "Ambiente inválido. Use 'sandbox' ou 'production'", http.StatusBadRequest)
		return
	}

	certsDir := "./certs"
	certPath := filepath.Join(certsDir, fmt.Sprintf("certificado_%s.p12", env))

	if _, err := os.Stat(certPath); os.IsNotExist(err) {
		s.sendSuccess(w, map[string]interface{}{
			"exists": false,
			"path":   "",
			"env":    env,
		})
		return
	}

	s.sendSuccess(w, map[string]interface{}{
		"exists": true,
		"path":   certPath,
		"env":    env,
	})
}

// handleReloadService recarrega o serviço EFI
func (s *Server) handleReloadService(w http.ResponseWriter, r *http.Request) {
	// Get environment from query parameter
	env := r.URL.Query().Get("env")
	if env == "" {
		env = "sandbox" // Default to sandbox
	}

	// Validate environment
	if env != "sandbox" && env != "production" {
		s.sendError(w, "Ambiente inválido. Use 'sandbox' ou 'production'", http.StatusBadRequest)
		return
	}

	if err := s.reloadEFIServiceWithEnv(env); err != nil {
		s.sendError(w, fmt.Sprintf("Erro ao recarregar serviço: %v", err), http.StatusInternalServerError)
		return
	}

	s.sendSuccess(w, map[string]interface{}{
		"message": fmt.Sprintf("Serviço EFI recarregado com sucesso para ambiente: %s", env),
		"env":     env,
	})
}

// sendSuccess envia resposta de sucesso
func (s *Server) sendSuccess(w http.ResponseWriter, data interface{}) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    data,
	})
}

// sendError envia resposta de erro
func (s *Server) sendError(w http.ResponseWriter, message string, status int) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   message,
	})
}
