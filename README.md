# Pregador da Palavra

Aplicação web com cadastro e login, painel para igrejas, sessões seguras, proteção CSRF, limite de tentativas, biblioteca de sermões por igreja, apresentação, importação local de Bíblias, preparação de pedidos para assistentes externos, PWA básico e tema claro/escuro.

## Instalação e execução

1. Instale Node.js 20+ e Docker.
2. Se ainda não existir, crie `.env` a partir de `.env.example`. Defina um `SESSION_SECRET` e um `APP_ACCESS_SECRET` seguros (`openssl rand -base64 48`) e escolha sua própria `APP_ACCESS_PASSWORD` com pelo menos 16 caracteres. Não compartilhe nem envie esses valores pelo Git ou por mensagens.
3. Inicie os serviços locais: `docker compose up -d` (PostgreSQL e Ollama).
4. Baixe uma vez o modelo gratuito leve: `docker compose exec ollama ollama pull qwen2.5:1.5b`.
5. Instale as dependências: `npm install`.
6. Execute as migrações: `npx prisma migrate dev`.
7. (Opcional, apenas para desenvolvimento) Rode `npm run db:seed` para criar `demo@pregador.local` / `Demo@12345`.
8. Inicie o aplicativo: `npm run dev` e abra http://localhost:3000.
9. Rode `npm test` para executar os testes de validação.

O acesso ao aplicativo é protegido pela senha em `APP_ACCESS_PASSWORD` e permanece liberado por até 12 horas após a validação, ou até sair da conta. Depois dessa tela, use também sua conta pessoal em `/entrar`. O aplicativo bloqueia as demais rotas se a senha ou o segredo de assinatura não estiverem configurados, inclusive em desenvolvimento.

## Git

Configure sua identidade antes de criar commits:

```bash
git config user.name "Seu Nome"
git config user.email "seu-email@exemplo.com"
git add .
git commit -m "Fase 1: base do projeto"
git push
```

O arquivo `.env` contém configurações locais e não deve ser enviado ao Git.

## Notas

- Os sermões ficam no banco e são isolados por igreja. A Bíblia ARC em `public/biblia/arc.json` é carregada automaticamente quando não há uma tradução salva no navegador; anotações ficam somente neste aparelho.
- **Configuração sem cobrança de API:** o serviço Ollama é iniciado pelo Docker Compose e usa `OLLAMA_URL="http://localhost:11434"` e `AI_MODEL="qwen2.5:1.5b"` no `.env`. Não configure `OPENAI_BASE_URL` nem uma API externa. O assistente chama o modelo local após consentimento explícito; confira todo conteúdo e referências antes de usar. O modelo usa armazenamento, memória, processamento e energia do computador. Se tiver memória suficiente, pode escolher outro modelo Ollama.
- O GitHub Copilot ajuda a desenvolver o projeto, mas uma assinatura Copilot não fornece, por si só, uma chave de API para o app usar como provedor de IA. Continue usando o Copilot no VS Code e Ollama para as gerações dentro do app.
- Para manter o conjunto sem mensalidades, execute o app e o PostgreSQL localmente (`docker compose up -d`). Hospedagem pública, domínio, serviços de IA por API e recursos de nuvem podem gerar cobrança; esta configuração local não exige esses serviços.
- A configuração do Holyrics fica no painel e é isolada por igreja. O modo conector usa o serviço em `holyrics-connector/`; mantenha a chave e o token apenas no servidor/conector e configure `ALLOWED_ORIGINS` no conector para a origem do aplicativo.
- Para os ícones do PWA, adicione `icon-192.png` e `icon-512.png` em `public/` e liste-os em `src/app/manifest.ts`.
- O limitador de tentativas é em memória e atende apenas uma instância; em produção, use Redis.
- Para isolar dados entre igrejas, inclua `churchId` nos novos modelos e filtre as consultas por esse campo.
