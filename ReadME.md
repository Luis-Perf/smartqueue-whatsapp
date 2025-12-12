# SmartQueue WhatsApp

Pequena POC construída para praticar o stack da vaga de Desenvolvedor(a) Full Stack na Place Consultoria de RH.

A ideia é simular uma API centralizada de comunicação que recebe mensagens de um canal (Typebot/WhatsApp), joga numa fila de mensageria, processa com "IA" e integra com um orquestrador low-code (n8n).

## Arquitetura

- **Node.js + Express**: API que expõe o webhook `/webhooks/typebot` e endpoints de consulta.
- **RabbitMQ**: fila `messages.to_process` para desacoplar recebimento e processamento.
- **Worker em Node.js**: consome a fila, classifica a mensagem por prioridade e atualiza o banco.
- **PostgreSQL**: armazena as mensagens e seus metadados.
- **n8n**: recebe webhook do worker (`/webhook/smartqueue`) e pode disparar ações para mensagens de prioridade alta.
- **Docker Compose**: sobe RabbitMQ, Postgres e n8n.

Fluxo resumido:

1. Uma mensagem é enviada para `POST /webhooks/typebot` (simulando Typebot/WhatsApp).
2. A API grava a mensagem no PostgreSQL e publica na fila do RabbitMQ.
3. O worker consome a fila, aplica uma classificação simples de prioridade (`alta`, `normal`, `baixa`).
4. O worker atualiza a mensagem no banco e notifica o n8n via webhook.
5. O n8n recebe o JSON (`messageId`, `priority`, `text`) e trata mensagens de prioridade alta em um fluxo dedicado.

## Tecnologias utilizadas

- Node.js / Express
- RabbitMQ (mensageria)
- PostgreSQL
- n8n (orquestração de workflows)
- Docker / Docker Compose
- Postman / curl para testes de API

## Próximos passos / Ideias de evolução

Algumas melhorias que eu já deixei mapeadas para evoluir essa POC:

- **Substituir a classificação simples por IA real (OpenAI)**  
  Usar a API da OpenAI (ou outro provedor) para análise de sentimento/intenção da mensagem, ajustando a prioridade com base no contexto real do cliente.

- **Adicionar um pequeno dashboard em React ou Vue**  
  Criar uma interface simples para listar as mensagens do PostgreSQL, com filtros por prioridade, status e canal (WhatsApp, e-mail, etc.), servindo como um painel de monitoramento.

- **Criar templates de integração com gateways como Zenvia/Gupshup**  
  Modelar exemplos de payloads e fluxos para integrar com gateways de comunicação usados no mercado (Zenvia, Gupshup, etc.), aproximando ainda mais da realidade de produção.
  

## Como rodar o projeto

Pré-requisitos:

- Node 18+
- Docker Desktop (com Docker Compose)
- Git

### 1. Clonar o repositório

```bash
git clone https://github.com/Luis-Perf/smartqueue-whatsapp.git
cd smartqueue-whatsapp

