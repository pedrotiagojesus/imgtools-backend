# imgtools-backend

Backend para manipulação de imagens com funcionalidades como ajuste de DPI, redimensionamento, conversão de imagens e criação de PDFs a partir de imagens.

---

## Tecnologias Utilizadas

- Node.js + TypeScript
- Express.js
- Multer (upload de arquivos)
- Sharp (processamento de imagens)
- CORS
- Deploy no Render

---

## Funcionalidades da API

| Endpoint                | Método | Descrição                              | Parâmetros principais               |
|------------------------|--------|----------------------------------------|-------------------------------------|
| `/api/convert-image`    | POST   | Converter PNG → SVG (e futuros formatos) | `image` (arquivo)                  |
| `/api/resize-image`     | POST   | Redimensionar imagem                   | `image` (arquivo), `width`, `height` (opcionais) |
| `/api/pdf-from-images`  | POST   | Criar PDF a partir de uma lista de imagens | JSON com URLs ou arquivos           |
| `/api/ajust-dpi`        | POST   | Ajustar DPI de uma imagem              | `image` (arquivo), `dpi` (número obrigatório) |

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

3. Crie um arquivo `.env` na raiz:

```bash
PORT=4000
```

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
  -F "image=@imagem.png"
```

### Criar PDF: (EM DESENVOLVIMENTO)

```bash
curl -X POST http://localhost:4000/api/pdf-from-images \
  -H "Content-Type: application/json" \
  -d '{"images": ["url1.jpg", "url2.png"]}'
```

---

## Estrutura do Projeto

```bash
.
├── src/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── app.ts
├── LICENSE.md/
├── render.yaml/
├── README.md/
└── package.json
```

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