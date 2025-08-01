# 🚀 PIX Auto Webhook - Gerenciador de Webhooks EFI Pay

> **⚠️ Overengineering? Talvez... mas é incrivelmente útil!**  
> 
> Se você, como eu, **ODEIA** ficar dependendo de terminal o tempo inteiro para gerenciar webhooks e vai utilizar o **Pix Automático**, este projeto é para você! 🎯
> 
> Uma interface web bonita e intuitiva para configurar, listar e gerenciar webhooks da EFI Bank que recebem **notificações automáticas de pagamentos PIX** sem precisar decorar comandos ou ficar digitando no terminal. **Porque sim, às vezes a gente só quer clicar em botões!** 😅

## 📋 Índice

- [🎯 Sobre o Projeto](#-sobre-o-projeto)
- [🏗️ Arquitetura](#️-arquitetura)
- [🛠️ Tecnologias](#️-tecnologias)
- [🚀 Como Usar](#-como-usar)
- [📁 Estrutura do Projeto](#-estrutura-do-projeto)
- [🔧 Configuração](#-configuração)
- [🎨 Interface](#-interface)
- [🔐 Segurança](#-segurança)
- [📊 Funcionalidades](#-funcionalidades)
- [🤝 Contribuindo](#-contribuindo)

---

## 🎯 Sobre o Projeto

### **O Problema**
Gerenciar webhooks da EFI Pay via terminal é **chato demais**:
- ❌ Decorar comandos da API
- ❌ Ficar digitando no terminal
- ❌ Sem interface visual
- ❌ Difícil de gerenciar múltiplos ambientes
- ❌ Sem feedback visual do que está acontecendo

### **A Solução**
Uma **interface web moderna** para **PIX AUTOMÁTICO** que permite:
- ✅ **Configurar webhooks** que recebem notificações automáticas de pagamentos PIX
- ✅ **Visualizar status** dos webhooks em tempo real
- ✅ **Gerenciar Sandbox e Produção** separadamente
- ✅ **Upload de certificados** via interface
- ✅ **Notificações elegantes** (sem `alert()`!)
- ✅ **Interface responsiva** e bonita
- ✅ **Automatização completa** - quando alguém paga PIX, você recebe notificação automaticamente

---

## 🏗️ Arquitetura

### **Monorepo com Turbo Repo**
```
pix-auto-webhook/
├── apps/
│   ├── frontend/     # Next.js + React + TypeScript
│   └── backend/      # Go + HTTP Server
├── packages/
│   └── shared/       # Tipos TypeScript compartilhados
└── node_modules/     # Dependências centralizadas
```

### **Fluxo de Dados**
```
Frontend (React) ↔ Backend (Go) ↔ EFI Pay API
     ↕
Shared Types (TypeScript)
```

---

## 🛠️ Tecnologias

### **Frontend**
- **Next.js 15.4.4** - Framework React com App Router
- **React 19.1.0** - Biblioteca de interface
- **TypeScript 5.8.3** - Tipagem estática
- **Tailwind CSS 3.4.17** - Framework CSS utilitário
- **shadcn/ui** - Componentes React elegantes
- **Radix UI** - Primitivos acessíveis
- **Lucide React** - Ícones modernos

### **Backend**
- **Go 1.23.0** - Linguagem de programação
- **HTTP Server** - API REST simples
- **pkcs12** - Manipulação de certificados .p12
- **mTLS** - Autenticação mútua com certificados

### **Infraestrutura**
- **Turbo Repo 2.5.5** - Build system para monorepos
- **pnpm 10.11.0** - Gerenciador de pacotes rápido
- **TypeScript** - Compartilhamento de tipos

### **Integração**
- **EFI Pay API v2** - Endpoints de webhook
- **Basic Auth** - Autenticação com credenciais
- **x-skip-mtls-checking** - Header para bypass de mTLS
- **PKCS#12** - Certificados .p12 para autenticação

---

## 🚀 Como Usar

### **1. Instalação**
```bash
# Clone o repositório
git clone <url-do-repo>
cd pix-auto-webhook

# Instala dependências
pnpm install

# Inicia desenvolvimento
pnpm dev:all
```

### **2. Acesse a Interface**
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8081

### **3. Configure Credenciais**
1. Acesse a interface web
2. Configure credenciais da EFI Pay (Sandbox/Produção)
3. Faça upload dos certificados .p12
4. Teste a conexão

### **4. Gerencie Webhooks PIX Automático**
- Configure webhooks que recebem notificações automáticas de pagamentos PIX
- Configure webhooks de recorrência para cobranças automáticas
- Visualize status em tempo real dos webhooks ativos
- Delete webhooks quando necessário
- **Receba notificações automáticas** quando alguém paga PIX

---

## 📁 Estrutura do Projeto

```
pix-auto-webhook/
├── 📦 package.json              # Configuração do monorepo
├── ⚡ turbo.json                # Configuração Turbo Repo
├── 📋 pnpm-workspace.yaml       # Workspaces pnpm
├── 📖 README.md                 # Este arquivo
│
├── 🎨 apps/frontend/            # Interface web
│   ├── 📦 package.json          # Dependências frontend
│   ├── ⚙️ next.config.ts        # Configuração Next.js
│   ├── 🎨 tailwind.config.ts    # Configuração Tailwind
│   ├── 📁 src/
│   │   ├── 🎯 app/              # App Router (Next.js 13+)
│   │   │   ├── 📄 page.tsx      # Página principal
│   │   │   ├── 📄 layout.tsx    # Layout raiz
│   │   │   └── 🎨 globals.css   # Estilos globais
│   │   ├── 🧩 components/       # Componentes React
│   │   │   └── 🎨 ui/           # Componentes shadcn/ui
│   │   ├── 🔧 lib/              # Utilitários
│   │   │   ├── 📡 api.ts        # Cliente API
│   │   │   └── 🛠️ utils.ts      # Funções utilitárias
│   │   └── 🎣 hooks/            # React Hooks
│   └── 📁 node_modules/         # Dependências frontend
│
├── ⚙️ apps/backend/             # API Go
│   ├── 📦 package.json          # Scripts do backend
│   ├── 🔧 go.mod                # Dependências Go
│   ├── 🚀 main.go               # Entry point
│   ├── 🌐 server.go             # Servidor HTTP
│   ├── ⚡ dev.bat               # Script de desenvolvimento
│   ├── 📁 configs/              # Configurações
│   │   └── 🔐 credentials.go    # Gerenciamento de credenciais
│   ├── 🎮 controllers/          # Controladores
│   │   └── 🔗 webhook_controller.go
│   ├── 🔧 services/             # Serviços
│   │   └── 💳 efi_service.go    # Integração EFI Pay
│   ├── 📊 models/               # Modelos de dados
│   ├── 🛠️ utils/                # Utilitários
│   ├── 📁 config/               # Arquivos de configuração
│   │   ├── 🔐 credentials_sandbox.json
│   │   └── 🔐 credentials_production.json
│   └── 📁 certs/                # Certificados
│       ├── 🔐 certificado_sandbox.p12
│       └── 🔐 certificado_production.p12
│
└── 📦 packages/shared/          # Tipos compartilhados
    ├── 📦 package.json          # Configuração do pacote
    ├── ⚙️ tsconfig.json         # Configuração TypeScript
    ├── 📁 src/
    │   └── 📄 index.ts          # Tipos e utilitários
    └── 📁 dist/                 # Build compilado
```

---

## 🔧 Configuração

### **Configuração via Interface Web**
- **Credenciais** - Configure via interface web (Sandbox/Produção)
- **Certificados** - Upload via interface web (.p12)
- **Sem arquivos .env** - Tudo configurado via interface

### **Certificados**
- **Formato:** PKCS#12 (.p12)
- **Localização:** `apps/backend/certs/`
- **Nomenclatura:** `certificado_sandbox.p12` / `certificado_production.p12`

### **Credenciais**
- **Formato:** JSON
- **Localização:** `apps/backend/config/`
- **Arquivos:** `credentials_sandbox.json` / `credentials_production.json`

---

## 🎨 Interface

### **Design System**
- **shadcn/ui** - Componentes consistentes
- **Tailwind CSS** - Estilização utilitária
- **Radix UI** - Acessibilidade
- **Lucide React** - Ícones modernos

### **Componentes Principais**
- **Cards** - Organização de conteúdo
- **Buttons** - Ações principais
- **Dialogs** - Modais elegantes
- **Toasts** - Notificações não-intrusivas
- **Badges** - Status e labels
- **Inputs** - Campos de formulário

### **Responsividade**
- **Mobile-first** - Design adaptativo
- **Breakpoints** - Tailwind CSS
- **Touch-friendly** - Interface para toque

---

## 🔐 Segurança

### **Autenticação EFI Pay**
- **Basic Auth** - Credenciais em base64
- **mTLS** - Certificados mútuos
- **x-skip-mtls-checking** - Bypass quando necessário

### **Armazenamento Local**
- **JSON** - Configurações em arquivo
- **Certificados** - Arquivos .p12
- **Sem banco** - Simplicidade

### **CORS**
- **Configurado** - Frontend ↔ Backend
- **Porta 8081** - Backend dedicado

---

## 📊 Funcionalidades

### **🎯 Gerenciamento de Webhooks PIX Automático**
- ✅ **Configurar** webhooks que recebem notificações automáticas de pagamentos PIX
- ✅ **Configurar** webhooks de recorrência para cobranças automáticas
- ✅ **Listar** webhooks ativos
- ✅ **Deletar** webhooks
- ✅ **Testar** conexão com EFI
- ✅ **Automatização** - Receber notificações automáticas quando alguém paga PIX

### **🌍 Ambientes Separados**
- ✅ **Sandbox** - Desenvolvimento/testes
- ✅ **Produção** - Ambiente real
- ✅ **Toggle** - Alternar entre ambientes
- ✅ **Credenciais** - Separadas por ambiente
- ✅ **Certificados** - Separados por ambiente

### **📁 Upload de Arquivos**
- ✅ **Certificados** - Upload via interface
- ✅ **Validação** - Apenas arquivos .p12
- ✅ **Feedback** - Status de upload
- ✅ **Organização** - Por ambiente

### **🔔 Notificações**
- ✅ **Toasts** - Notificações elegantes
- ✅ **Status** - Feedback em tempo real
- ✅ **Erros** - Mensagens claras
- ✅ **Sucesso** - Confirmações

### **📊 Monitoramento**
- ✅ **Status** - Backend online/offline
- ✅ **EFI** - Conexão com API
- ✅ **Webhooks** - Status dos webhooks
- ✅ **Certificados** - Existência e validade

---

## 🤝 Contribuindo

### **Desenvolvimento**
```bash
# Instala dependências
pnpm install

# Desenvolvimento completo
pnpm dev:all

# Apenas frontend
pnpm dev --filter=frontend

# Apenas backend
pnpm dev --filter=backend

# Build completo
pnpm build

# Limpeza
pnpm clean
```

### **Comandos Úteis**
```bash
# Verificar status
pnpm lint

# Formatar código
pnpm format

# Limpar cache
pnpm clean
```

---

## 🎯 Por que este Projeto?

### **Overengineering? Talvez...**
Mas é **incrivelmente útil** para quem:
- 🎯 **Não gosta de terminal** - Interface visual é melhor
- 🎯 **Gerencia múltiplos ambientes** - Sandbox/Produção
- 🎯 **Quer feedback visual** - Status em tempo real
- 🎯 **Precisa de simplicidade** - Cliques vs comandos
- 🎯 **Valoriza UX** - Interface moderna e responsiva

### **Vantagens Reais**
- ✅ **Produtividade** - Configuração rápida
- ✅ **Visualização** - Status claro
- ✅ **Organização** - Ambientes separados
- ✅ **Manutenção** - Código limpo e organizado
- ✅ **Escalabilidade** - Monorepo bem estruturado

---

## 📝 Licença - MIT
Pode usar a vontade
---

**Feito com ❤️ e muito overengineering**  
*Porque às vezes a melhor solução é a mais elaborada!* 😄 