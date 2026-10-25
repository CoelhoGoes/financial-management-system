---
name: 5-securitycheck
description: Etapa 5 de 7 do fluxo de desenvolvimento deste projeto — revisão de segurança depois da implementação: vulnerabilidades em dependências (pip-audit e npm audit, separando o que o item introduziu do que já existia) e leitura do diff contra os invariantes de segurança do projeto (escopo por usuário do JWT, conta excluída, 401 vs 403, limitador de tentativas, validação de entrada, segredos). Entrega relatório por severidade e não corrige nada sozinho. Use depois da etapa 4, e sempre que o usuário mencionar segurança, vulnerabilidade, CVE, audit, vazamento ou "isso é seguro?". Termina indicando a etapa 6 (/6-documentacao-sincronizada).
---

# Etapa 5 — Revisão de segurança

1. `/1-usecasesrefinement` — casos de uso e de falha
2. `/2-technicalrefinement` — opções técnicas e decisões
3. `/3-implementation` — implementar o que foi decidido
4. `/4-revisao-estrutural` — código morto, duplicação, dívida
5. **`/5-securitycheck`** — segurança do que foi implementado ← você está aqui
6. `/6-documentacao-sincronizada` — docs e registro da feature
7. `/7-commits-granulares` — commits e push

Um passe de **diagnóstico**, como a etapa 4: nada é corrigido aqui. Correção aprovada volta
para a etapa 3 (com teste que reproduz o problema) e o fluxo segue dali.

## Escopo

Dentro do fluxo: o diff do item (`git diff` desde o início do item, mais o que ainda não foi
commitado) e as dependências do projeto inteiro. Rodada avulsa: o repositório.

## Parte 1 — dependências

Rode por `uvx`/`npx`, sem instalar nada no projeto e sem pedir autorização:

```bash
# a partir da raiz do repositório
uvx pip-audit -r backend/requirements.txt
cd frontend && npm audit --json        # tudo
cd frontend && npm audit --omit=dev    # só o que vai para o bundle
```

O que importa no relatório:

- **Runtime vs desenvolvimento.** `requirements.txt` vai para a imagem Docker e
  `dependencies` do `package.json` vão para o bundle; `devDependencies` e
  `requirements-dev.txt` não saem da máquina de quem desenvolve. Mesma severidade, risco
  diferente — diga qual é qual.
- **Introduzido pelo item vs já existia.** Se o item mexeu em dependência, compare com o
  estado anterior: `git stash` (ou `git show <base>:frontend/package-lock.json`), rode o
  audit, compare os pacotes. Achado que já existia não bloqueia o item; vai para a lista de
  pendências.
- **Caminho até o pacote.** Vulnerabilidade num pacote só alcançável por uma ferramenta de CLI
  (o `shadcn`, por exemplo) não é a mesma coisa que no servidor. Diga por onde ele entra.

Atualizar dependência é decisão do usuário (`CLAUDE.md` → Decisões, quando é de runtime).
Nunca rode `npm audit fix` por conta própria — ele pode subir versão maior.

## Parte 2 — o diff contra os invariantes deste projeto

Leia o diff com esta lista. Cada item já foi decisão consciente no projeto; o que o quebra é
achado.

**Backend**

- **Escopo pelo usuário do JWT.** Toda leitura ou escrita de `Entry` filtra por `user.id` de
  `current_user` — nunca por id vindo do cliente. Endpoint novo usa `_owned_entry` quando
  busca um lançamento por id (404, não 403, para não confirmar que o id existe).
- **Endpoint protegido depende de `current_user`.** Rota nova sem ele é pública.
- **Conta excluída.** Busca por e-mail filtra `deleted_at IS NULL` (`_active_user` em
  `api/auth.py`); pode haver mais de uma linha com o mesmo e-mail.
- **401 vs 403.** `401` faz o frontend apagar o token e deslogar. Erro de senha numa ação de
  quem já está logado é `403`.
- **Senha conferida = limitador.** Todo endpoint que verifica senha passa pelo limitador de
  tentativas do login (`ensure_login_allowed` / `record_failed_login`), com a mesma chave.
- **Mensagem que não confirma dado.** Login e cadastro não dizem se o e-mail existe.
- **Validação na fronteira.** Entrada passa por schema Pydantic com limites (`Field`,
  `Literal`); dinheiro é `Decimal`. Campo que o servidor não aceita é recusado (`422`), não
  ignorado em silêncio.
- **SQL.** Consulta pelo ORM ou com parâmetro; `text()` com string montada é achado.
- **Upload.** Tamanho limitado antes de processar (o OFX responde `413`).
- **Segredos.** `JWT_SECRET` e afins só por variável de ambiente; nada de segredo em log,
  mensagem de erro, teste versionado ou commit. O `.env` não se lê nem se commita.

**Frontend**

- Token só em `localStorage` sob `gf:token`, enviado só para a `VITE_API_URL`.
- Nada de `dangerouslySetInnerHTML` com dado vindo da API ou do extrato.
- Dado pessoal ou financeiro nunca em URL ou query string.

**Infra**

- `ALLOWED_ORIGINS` sem `*`; porta do Postgres exposta só em desenvolvimento.
- Variável nova de segredo entra no `.env.example` com valor de exemplo inofensivo.

Para conferir segredo vazado no diff, uma busca rápida ajuda, mas não substitui ler:

```bash
git diff <base> | grep -nEi "secret|password|token|api[_-]?key|BEGIN .*PRIVATE"
```

## Relatório

```markdown
# Revisão de segurança — <data> — <item>

## Dependências
### Introduzidas por este item
### Já existiam (pendências, não bloqueiam)

## Diff
### Alta — corrigir antes de commitar
### Média — corrigir ou registrar a decisão de aceitar
### Baixa — anotação

## Verificado e sem achado
<a lista acima, item por item, para mostrar que foi lido — não só o que deu problema>
```

Cada achado: local (arquivo:linha), o que está errado, como explorar em uma frase, e a correção
sugerida. Achado incerto vai como incerto, não promovido a alta.

**Pare e espere** o usuário decidir o que corrigir. Achado alto sem correção não segue para a
etapa 7 sem um "aceito" explícito, registrado em **Decisões** no documento da feature.

## Ao terminar

Encerre sempre com este bloco:

```
Etapa 5 de 7 concluída — <n> achados no diff, <n> vulnerabilidades introduzidas, <n> já existentes.
Próximo passo: 6 — atualização da documentação (/6-documentacao-sincronizada).
```

E pergunte: **"Sigo para a etapa 6?"** Com um sim, chame a skill
`6-documentacao-sincronizada`. Com um não, pare.
