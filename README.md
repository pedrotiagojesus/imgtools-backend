# imgtools-backend

Backend robusto e production-ready para manipulação de imagens com funcionalidades como ajuste de DPI, redimensionamento, conversão de imagens e criação de PDFs a partir de imagens.

---

## Tecnologias Utilizadas

-   Node.js + TypeScript
-   Express.js
-   Multer (upload de arquivos)
-   Sharp (processamento de imagens)
-   Winston (logging estruturado)
-   Zod (validação de configuração)
-   Express Rate Limit (proteção contra abuso)
-   CORS
-   Deploy no Render

---

## Funcionalidades da API

### Endpoints de Processamento de Imagens

| Endpoint               | Método | Descrição                                  | Parâmetros principais                         |
| ---------------------- | ------ | ------------------------------------------ | --------------------------------------------- |
| `/api/convert-image`   | POST   | Converter Imagens                          | `image` (arquivo), `format` (png/jpg/webp)    |
| `/api/resize-image`    | POST   | Redimensionar imagem                       | `image` (arquivo), `width`, `height`          |
| `/api/pdf-from-images` | POST   | Criar PDF a partir de uma lista de imagens | JSON com URLs ou arquivos                     |
| `/api/ajust-dpi`       | POST   | Ajustar DPI de uma imagem                  | `image` (arquivo), `dpi` (número obrigatório) |

### Endpoints de Monitorização

| Endpoint        | Método | Descrição                                      |
| --------------- | ------ | ---------------------------------------------- |
| `/health`       | GET    | Verifica o estado operacional da API           |
| `/health/ready` | GET    | Verifica se a API está pronta para receber requests |

---

## Instalação e Configuração Local

1. Clone o repositório:

```bash
git clone https://github.com/pedrotiagojesus/imgtools-backend.git
cd imgtools-backend
```

2. Instale as dependências:

```bash
npm install
```

3. Crie um arquivo `.env` na raiz (use `.env.example` como referência):

```bash
cp .env.example .env
```

Edite o arquivo `.env` conforme necessário. Veja a seção [Variáveis de Ambiente](#variáveis-de-ambiente) para detalhes.

4. Execute o projeto:

Modo desenvolvimento:

```bash
npm run dev
```

Modo produção:

```bash
npm run build
npm start
```

---

## Variáveis de Ambiente

A aplicação utiliza as seguintes variáveis de ambiente para configuração:

### Obrigatórias

| Variável | Descrição | Exemplo |
| -------- | --------- | ------- |
| `PORT` | Porta onde a API será executada | `4000` |

### Opcionais (com valores padrão)

| Variável | Descrição | Padrão | Exemplo |
| -------- | --------- | ------ | ------- |
| `NODE_ENV` | Ambiente de execução | `development` | `production` |
| `CORS_ORIGIN` | Origens permitidas para CORS (separadas por vírgula) | `*` | `http://localhost:3000,https://example.com` |
| `LOG_LEVEL` | Nível de logging (error, warn, info, debug) | `info` | `debug` |
| `LOG_FORMAT` | Formato dos logs (json, simple) | `simple` | `json` |
| `RATE_LIMIT_WINDOW_MS` | Janela de tempo para rate limiting (ms) | `900000` (15 min) | `600000` |
| `RATE_LIMIT_MAX_REQUESTS` | Máximo de requests por janela | `100` | `200` |
| `REQUEST_TIMEOUT_MS` | Timeout para requests HTTP (ms) | `30000` (30s) | `60000` |
| `IMAGE_PROCESSING_TIMEOUT_MS` | Timeout para processamento de imagens (ms) | `25000` (25s) | `50000` |
| `MAX_FILE_SIZE_MB` | Tamanho máximo de arquivo (MB) | `50` | `100` |
| `MAX_FILES_PER_REQUEST` | Máximo de arquivos por request | `10` | `20` |
| `TEMP_FILE_MAX_AGE_MS` | Idade máxima de ficheiros temporários (ms) | `3600000` (1h) | `7200000` |
| `CLEANUP_INTERVAL_MS` | Intervalo de limpeza periódica (ms) | `300000` (5 min) | `600000` |
| `DISK_SPACE_THRESHOLD` | Limite de uso de disco (0-1) | `0.9` (90%) | `0.85` |

### Configuração de Exemplo

Veja o arquivo `.env.example` para uma configuração completa com comentários explicativos.

---

## Segurança e Validação

A API implementa múltiplas camadas de segurança para proteger contra ataques e garantir operação estável.

### Validação de Upload de Ficheiros

Todos os uploads são validados antes de serem processados:

- **Tipo MIME**: Apenas tipos de imagem permitidos (image/jpeg, image/png, image/webp, image/gif, image/bmp, image/tiff)
- **Tamanho máximo**: Configurável via `MAX_FILE_SIZE_MB` (padrão: 50MB)
- **Número de ficheiros**: Limitado por `MAX_FILES_PER_REQUEST` (padrão: 10 ficheiros)
- **Nomes únicos**: Geração automática de nomes únicos para evitar colisões

### Gestão de Ficheiros Temporários

- Registo automático de todos os ficheiros temporários criados
- Limpeza garantida após conclusão de operações (sucesso ou erro)
- Limpeza periódica de ficheiros órfãos (mais de 1 hora)
- Verificação de espaço em disco antes de aceitar uploads

### Proteção de Recursos

- Timeouts configuráveis para prevenir operações penduradas
- Verificação de espaço em disco (rejeita uploads se > 90% usado)
- Monitorização de uso de memória
- Limpeza automática de recursos em caso de erro

---

## Rate Limiting

A API implementa rate limiting para proteger contra abuso e garantir disponibilidade para todos os utilizadores.

### Comportamento

- Por padrão, cada endereço IP pode fazer até **100 requests em 15 minutos**
- Quando o limite é excedido, a API retorna status **429 (Too Many Requests)**
- O header `Retry-After` indica quando o cliente pode tentar novamente
- Todos os eventos de rate limiting são registados nos logs

### Configuração

Ajuste o rate limiting através das variáveis de ambiente:

```bash
RATE_LIMIT_WINDOW_MS=900000      # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100      # 100 requests por janela
```

### Exemplo de Resposta (429)

```json
{
  "error": "Too many requests from this IP, please try again later.",
  "statusCode": 429,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Health Checks

A API expõe endpoints de health check para monitorização e orquestração (Kubernetes, Docker, etc.).

### GET /health

Verifica o estado operacional da API, incluindo:
- Acesso ao sistema de ficheiros (diretórios de upload e output)
- Uso de memória (alerta se > 90%)
- Disponibilidade geral do sistema

**Resposta de Sucesso (200):**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2025-11-12T10:30:00.000Z",
  "checks": {
    "filesystem": "ok",
    "memory": "ok"
  }
}
```

**Resposta de Erro (503):**

```json
{
  "status": "unhealthy",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2025-11-12T10:30:00.000Z",
  "checks": {
    "filesystem": "error",
    "memory": "ok"
  }
}
```

### GET /health/ready

Verifica se a API está pronta para receber requests (readiness probe).

**Resposta (200):**

```json
{
  "status": "ready"
}
```

---

## Exemplos de Uso

### Alterar DPI:

```bash
curl -X POST http://localhost:4000/api/ajust-dpi \
  -F "image=@imagem.png" \
  -F "dpi=300"
```

### Alterar as dimensões da image:

```bash
curl -X POST http://localhost:4000/api/resize-image \
  -F "image=@imagem.png" \
  -F "width=300" \
  -F "height=400"
```

### Converter imagem:

```bash
curl -X POST http://localhost:4000/api/convert-image \
  -F "image=@imagem.png" \
  -F "format=png"
```

### Criar PDF:

```bash
curl -X POST http://localhost:4000/api/pdf-from-images \
  -H "Content-Type: application/json" \
  -d '{"images": ["url1.jpg", "url2.png"]}'\
  -F "pdfTitle=O meu PDF"\
  -F "pdfAuthor=Pedro Jesus"\
  -F "pdfSubject=O meu primeiro PDF"\
  -F "pdfCreator=Pedro Jesus"\
```

---

## Troubleshooting

### A aplicação não inicia

**Problema:** Erro de validação de variáveis de ambiente

```
Error: Environment validation failed
```

**Solução:** Verifique se todas as variáveis obrigatórias estão definidas no arquivo `.env`. Use `.env.example` como referência.

---

### Erro 429 (Too Many Requests)

**Problema:** Cliente está a fazer demasiados requests

**Solução:**
- Aguarde o tempo indicado no header `Retry-After`
- Implemente retry logic com backoff exponencial no cliente
- Se necessário, ajuste `RATE_LIMIT_MAX_REQUESTS` no servidor

---

### Erro 507 (Insufficient Storage)

**Problema:** Disco está com mais de 90% de capacidade

**Solução:**
- Liberte espaço em disco
- Ajuste `DISK_SPACE_THRESHOLD` se necessário
- Verifique se ficheiros temporários estão a ser limpos corretamente

---

### Erro 408 (Request Timeout)

**Problema:** Operação de processamento excedeu o timeout

**Solução:**
- Reduza o tamanho ou complexidade da imagem
- Aumente `REQUEST_TIMEOUT_MS` se operações legítimas estão a falhar
- Verifique os logs para identificar operações lentas

---

### Upload rejeitado (400 Bad Request)

**Problema:** Ficheiro não passa na validação

**Possíveis causas:**
- Tipo de ficheiro não permitido (apenas imagens são aceites)
- Ficheiro excede `MAX_FILE_SIZE_MB` (padrão: 50MB)
- Demasiados ficheiros num único request (máximo: `MAX_FILES_PER_REQUEST`)

**Solução:** Verifique os requisitos de upload e ajuste o ficheiro ou configuração conforme necessário.

---

### Logs não aparecem

**Problema:** Nível de log está muito restritivo

**Solução:** Ajuste `LOG_LEVEL` no `.env`:

```bash
LOG_LEVEL=debug  # Para desenvolvimento
LOG_LEVEL=info   # Para produção
```

---

### Health check retorna 503

**Problema:** Recursos críticos não estão disponíveis

**Solução:**
- Verifique permissões dos diretórios `tmp/upload` e `tmp/output`
- Verifique uso de memória do sistema
- Consulte os logs para detalhes específicos do erro

---

### Ficheiros temporários não são limpos

**Problema:** Diretório `tmp` está a acumular ficheiros

**Solução:**
- Verifique se `CLEANUP_INTERVAL_MS` está configurado corretamente
- Verifique os logs para erros de limpeza
- Execute limpeza manual se necessário:

```bash
# Windows
rmdir /s /q tmp\upload
rmdir /s /q tmp\output
mkdir tmp\upload
mkdir tmp\output

# Linux/Mac
rm -rf tmp/upload/* tmp/output/*
```

---

### Erro de validação de tipo MIME

**Problema:** Upload rejeitado com "Invalid file type"

**Solução:**
- Verifique se o ficheiro é realmente uma imagem
- Tipos permitidos: JPEG, PNG, WebP, GIF, BMP, TIFF
- Alguns ficheiros podem ter extensão incorreta - verifique o tipo real do ficheiro

---

### Performance lenta no processamento

**Problema:** Operações de imagem demoram muito tempo

**Solução:**
- Reduza o tamanho das imagens antes de enviar
- Aumente `IMAGE_PROCESSING_TIMEOUT_MS` se necessário
- Verifique recursos do sistema (CPU, memória)
- Considere processar imagens em lote menor

---

### Erro "Environment validation failed"

**Problema:** Variáveis de ambiente com formato inválido

**Solução:**
- Verifique se valores numéricos são números válidos
- Verifique se `PORT` está entre 1 e 65535
- Verifique se `LOG_LEVEL` é um dos valores: error, warn, info, debug
- Verifique se `NODE_ENV` é um dos valores: development, production, test
- Use `.env.example` como referência para formato correto

---

## Gestão de Erros

A API implementa um sistema centralizado de gestão de erros que garante respostas consistentes e informativas.

### Tipos de Erro

| Código | Tipo | Descrição |
| ------ | ---- | --------- |
| 400 | ValidationError | Dados de entrada inválidos |
| 404 | NotFoundError | Recurso não encontrado |
| 408 | TimeoutError | Operação excedeu tempo limite |
| 429 | RateLimitError | Demasiados requests |
| 507 | InsufficientStorageError | Espaço em disco insuficiente |
| 500 | InternalServerError | Erro interno do servidor |

### Formato de Resposta de Erro

Todos os erros seguem o mesmo formato:

```json
{
  "error": "Descrição do erro",
  "statusCode": 400,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "details": {
    "field": "Informação adicional (quando aplicável)"
  }
}
```

### Request ID

Cada request recebe um ID único (UUID) que:
- É incluído em todas as respostas (sucesso e erro)
- É registado em todos os logs relacionados
- Facilita o rastreamento de problemas específicos
- Pode ser usado para correlacionar logs e requests

---

## Logs e Monitorização

A aplicação utiliza Winston para logging estruturado em formato JSON.

### Estrutura dos Logs

```json
{
  "level": "info",
  "message": "Request completed",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/api/convert-image",
  "statusCode": 200,
  "duration": 1234
}
```

### Níveis de Log

- `error`: Erros que requerem atenção imediata
- `warn`: Situações anormais mas não críticas (rate limiting, recursos baixos)
- `info`: Eventos importantes (requests, operações, limpeza de ficheiros)
- `debug`: Informação detalhada para debugging (validações, detalhes de processamento)

### Configuração de Logs

Para desenvolvimento, use formato simples e nível debug:

```bash
LOG_FORMAT=simple
LOG_LEVEL=debug
```

Para produção, use formato JSON e nível info:

```bash
LOG_FORMAT=json
LOG_LEVEL=info
```

### Eventos Registados

A API regista automaticamente:
- Início e conclusão de todos os requests HTTP
- Erros com stack trace completo
- Violações de rate limiting
- Operações de limpeza de ficheiros temporários
- Verificações de health check
- Timeouts de operações
- Alertas de espaço em disco

---

## Boas Práticas e Recomendações

### Ambiente de Produção

Ao fazer deploy em produção, considere:

1. **Variáveis de Ambiente:**
   - Use `NODE_ENV=production`
   - Configure `LOG_FORMAT=json` para facilitar parsing
   - Configure `LOG_LEVEL=info` ou `warn`
   - Defina `CORS_ORIGIN` com domínios específicos (não use `*`)

2. **Rate Limiting:**
   - Ajuste limites baseado no tráfego esperado
   - Considere usar Redis para rate limiting distribuído em múltiplas instâncias

3. **Monitorização:**
   - Configure health checks no orquestrador (Kubernetes, Docker Swarm)
   - Use `/health` para liveness probe
   - Use `/health/ready` para readiness probe
   - Monitore logs para identificar padrões de erro

4. **Recursos:**
   - Garanta espaço em disco adequado para ficheiros temporários
   - Configure limpeza periódica agressiva se tráfego for alto
   - Monitore uso de memória e CPU

5. **Segurança:**
   - Use HTTPS em produção
   - Configure firewall para limitar acesso
   - Revise regularmente logs de rate limiting
   - Mantenha dependências atualizadas

### Performance

Para melhor performance:

- Use `IMAGE_PROCESSING_TIMEOUT_MS` menor que `REQUEST_TIMEOUT_MS`
- Configure `CLEANUP_INTERVAL_MS` baseado no volume de uploads
- Considere usar CDN para servir imagens processadas
- Implemente cache de resultados se aplicável

### Escalabilidade

Para escalar horizontalmente:

- Use storage partilhado para ficheiros temporários (NFS, S3)
- Configure rate limiting com backend distribuído (Redis)
- Use load balancer com sticky sessions se necessário
- Monitore métricas de cada instância individualmente

---

## Contribuição

1. Faça fork do projeto
2. Crie sua branch:

```bash
git checkout -b feature/nova-funcionalidade
```

3. Envie as alterações:

```bash
git push origin feature/nova-funcionalidade
```

---

## Licença

MIT © Pedro Jesus
