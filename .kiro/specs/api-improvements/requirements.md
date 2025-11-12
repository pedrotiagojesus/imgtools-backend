# Requirements Document

## Introduction

Este documento define os requisitos para melhorar a robustez, segurança e manutenibilidade do imgtools-backend. O sistema atual processa imagens através de múltiplos endpoints, mas carece de proteções essenciais contra ataques, gestão adequada de erros, e mecanismos de monitorização. As melhorias propostas visam tornar a API production-ready mantendo a simplicidade da arquitetura existente.

## Glossary

- **API**: Application Programming Interface - o sistema backend que processa imagens
- **Middleware**: Função que intercepta requests HTTP antes de chegarem às rotas
- **Rate Limiting**: Mecanismo que limita o número de requests por cliente num período de tempo
- **Error Handler**: Componente centralizado que processa e formata erros
- **Validation Schema**: Estrutura que define regras de validação para dados de entrada
- **Logger**: Sistema estruturado de registo de eventos e erros
- **Health Check**: Endpoint que verifica o estado operacional da API
- **Environment Variables**: Variáveis de configuração do sistema
- **File Upload**: Processo de envio de ficheiros para a API
- **Multer**: Biblioteca Node.js para handling de file uploads

## Requirements

### Requirement 1

**User Story:** Como administrador do sistema, quero que a API tenha proteção contra uploads maliciosos, para que o servidor não seja comprometido ou sobrecarregado.

#### Acceptance Criteria

1. WHEN um cliente tenta fazer upload de um ficheiro, THE API SHALL validar o tipo MIME do ficheiro antes de aceitar o upload
2. WHEN um cliente tenta fazer upload de um ficheiro, THE API SHALL rejeitar ficheiros que excedam 50MB de tamanho
3. WHEN um cliente tenta fazer upload de múltiplos ficheiros, THE API SHALL limitar o número máximo a 10 ficheiros por request
4. WHEN um cliente envia um ficheiro com extensão não permitida, THE API SHALL retornar erro 400 com mensagem descritiva
5. WHEN um cliente tenta fazer upload de um ficheiro corrompido, THE API SHALL capturar o erro e retornar resposta apropriada

### Requirement 2

**User Story:** Como administrador do sistema, quero que a API tenha rate limiting, para que não seja possível abusar dos recursos do servidor.

#### Acceptance Criteria

1. WHEN um cliente excede 100 requests em 15 minutos, THE API SHALL retornar erro 429 (Too Many Requests)
2. WHEN um cliente é bloqueado por rate limiting, THE API SHALL incluir headers indicando quando pode tentar novamente
3. THE API SHALL aplicar rate limiting baseado no endereço IP do cliente
4. WHEN rate limiting é ativado, THE API SHALL registar o evento no sistema de logs
5. WHERE configuração de ambiente permite, THE API SHALL permitir ajustar os limites de rate via variáveis de ambiente

### Requirement 3

**User Story:** Como desenvolvedor, quero um sistema centralizado de error handling, para que todos os erros sejam tratados de forma consistente e informativa.

#### Acceptance Criteria

1. WHEN ocorre um erro em qualquer rota, THE API SHALL capturar o erro através de middleware global
2. WHEN um erro é capturado, THE API SHALL retornar resposta JSON estruturada com código de status apropriado
3. WHEN um erro é capturado, THE API SHALL registar detalhes completos no sistema de logs
4. THE API SHALL distinguir entre erros operacionais (4xx) e erros de sistema (5xx)
5. WHEN ocorre erro 5xx, THE API SHALL ocultar detalhes internos na resposta ao cliente
6. WHEN ocorre erro de validação, THE API SHALL incluir detalhes específicos sobre campos inválidos

### Requirement 4

**User Story:** Como desenvolvedor, quero validação robusta de variáveis de ambiente, para que a aplicação não inicie com configuração inválida.

#### Acceptance Criteria

1. WHEN a aplicação inicia, THE API SHALL validar todas as variáveis de ambiente obrigatórias
2. WHEN uma variável de ambiente obrigatória está ausente, THE API SHALL terminar o processo com erro descritivo
3. WHEN uma variável de ambiente tem formato inválido, THE API SHALL terminar o processo com erro descritivo
4. THE API SHALL fornecer valores default seguros para variáveis opcionais
5. WHEN validação de ambiente falha, THE API SHALL listar todas as variáveis problemáticas

### Requirement 5

**User Story:** Como administrador do sistema, quero logging estruturado, para que possa monitorizar e diagnosticar problemas em produção.

#### Acceptance Criteria

1. THE API SHALL registar todos os requests HTTP com método, path, status code e duração
2. WHEN ocorre um erro, THE API SHALL registar stack trace completo e contexto relevante
3. THE API SHALL usar níveis de log apropriados (error, warn, info, debug)
4. WHERE ambiente é produção, THE API SHALL registar apenas níveis info e superiores
5. THE API SHALL incluir timestamps e request IDs em todos os logs
6. THE API SHALL formatar logs em JSON para facilitar parsing

### Requirement 6

**User Story:** Como operador de infraestrutura, quero endpoints de health check, para que possa monitorizar o estado da API.

#### Acceptance Criteria

1. THE API SHALL expor endpoint GET /health que retorna status 200 quando operacional
2. WHEN o endpoint /health é chamado, THE API SHALL verificar disponibilidade de recursos críticos
3. WHEN recursos críticos estão indisponíveis, THE API SHALL retornar status 503
4. THE API SHALL incluir informação sobre versão e uptime na resposta de health check
5. THE API SHALL expor endpoint GET /health/ready para verificação de readiness

### Requirement 7

**User Story:** Como desenvolvedor, quero timeouts configuráveis nas operações, para que requests não fiquem pendurados indefinidamente.

#### Acceptance Criteria

1. THE API SHALL aplicar timeout de 30 segundos em todas as operações de processamento de imagem
2. WHEN uma operação excede o timeout, THE API SHALL cancelar a operação e retornar erro 408
3. WHEN timeout ocorre, THE API SHALL limpar recursos alocados (ficheiros temporários)
4. WHERE configuração permite, THE API SHALL permitir ajustar timeout via variável de ambiente
5. WHEN timeout é atingido, THE API SHALL registar o evento com detalhes da operação

### Requirement 8

**User Story:** Como desenvolvedor, quero melhor gestão de ficheiros temporários, para que não haja memory leaks ou disco cheio.

#### Acceptance Criteria

1. WHEN ficheiros temporários são criados, THE API SHALL registar metadata para tracking
2. WHEN uma operação termina (sucesso ou erro), THE API SHALL garantir limpeza de todos os ficheiros temporários
3. THE API SHALL executar limpeza periódica de ficheiros temporários órfãos
4. WHEN disco atinge 90% de capacidade, THE API SHALL rejeitar novos uploads com erro 507
5. THE API SHALL limpar ficheiros temporários com mais de 1 hora de idade

### Requirement 9

**User Story:** Como desenvolvedor, quero documentação OpenAPI/Swagger, para que a API seja fácil de integrar e testar.

#### Acceptance Criteria

1. THE API SHALL expor especificação OpenAPI 3.0 em /api-docs/swagger.json
2. THE API SHALL expor interface Swagger UI em /api-docs
3. THE API SHALL documentar todos os endpoints com parâmetros, responses e exemplos
4. THE API SHALL incluir schemas de validação na documentação
5. THE API SHALL manter documentação sincronizada com implementação

### Requirement 10

**User Story:** Como desenvolvedor, quero arquivo .env.example, para que seja fácil configurar o ambiente de desenvolvimento.

#### Acceptance Criteria

1. THE API SHALL incluir ficheiro .env.example na raiz do projeto
2. THE API SHALL documentar todas as variáveis de ambiente no .env.example
3. THE API SHALL incluir valores de exemplo seguros no .env.example
4. THE API SHALL incluir comentários explicativos para cada variável
5. THE API SHALL manter .env.example atualizado quando novas variáveis são adicionadas
