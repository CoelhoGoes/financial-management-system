---
name: documentacao-sincronizada
description: Mantém a documentação existente do projeto em sincronia com o código — README, docs de API, variáveis de ambiente, .env.example, instruções de setup, diagramas, docstrings e comentários que descrevem comportamento. Detecta o que ficou desatualizado depois de uma mudança e corrige. Use sempre que houver mudança que afete setup, dependências, contrato de API, modelo de dados, comandos, estrutura de pastas ou variáveis de ambiente, e sempre que o usuário mencionar README, documentação, docs desatualizados ou onboarding. Ao terminar qualquer mudança relevante, verifique a documentação mesmo sem o usuário pedir. Esta skill NÃO cria registros de decisão — para isso use a skill registro-de-alteracoes.
---

# Documentação sincronizada

Documentação errada é pior que documentação ausente: ela faz a pessoa perder uma hora seguindo
um passo que não existe mais. O objetivo aqui não é escrever mais docs, é impedir que os que já
existem mintam.

## Passo 1 — inventário

Na primeira vez que rodar no projeto, mapeie o que existe:

```bash
fd -e md -e rst --max-depth 3 | head -50
ls docs/ 2>/dev/null
```

Procure também: `README.md`, `CONTRIBUTING.md`, `.env.example`, `docker-compose.yml` (comentários),
`openapi.json`/`swagger`, diagramas (`.mmd`, `.drawio`, `.png` em docs/), docstrings de módulos
públicos, e comentários de cabeçalho que descrevem arquitetura.

Se o projeto tiver poucos docs, diga isso ao usuário em vez de sair criando arquivos novos por
conta própria. Criar documentação nova é uma decisão dele.

## Passo 2 — mapa de gatilhos

Depois de uma mudança, verifique o que ela invalida. Este é o mapa padrão:

| Mudou no código | Verifique |
|---|---|
| Dependência adicionada/removida | README (requisitos), `pyproject.toml`/`package.json`, instruções de instalação |
| Variável de ambiente | `.env.example`, README (configuração), `docker-compose.yml` |
| Comando de execução, script, task | README (como rodar), `CONTRIBUTING.md`, Makefile |
| Rota ou contrato de API | docs de API, exemplos de request/response, coleção Postman/Insomnia |
| Modelo de dados / schema | diagrama ER, docs de domínio, exemplos de payload |
| Estrutura de pastas | seção de estrutura no README, caminhos citados em qualquer doc |
| Porta, serviço, container | README, `docker-compose.yml`, instruções de setup local |
| Comportamento de função pública | docstring da função, exemplos que a usam |

Se a mudança não cair em nenhuma linha do mapa, provavelmente não há doc a atualizar — diga isso
e pare. Não force uma edição só para ter feito algo.

## Passo 3 — verificar, não adivinhar

Para cada doc candidato, **compare com o código real**, não com a memória da conversa:

- Comandos citados no README: confira que existem (`Makefile`, `package.json` scripts, `pyproject`)
- Caminhos citados: confira que o arquivo/pasta existe hoje
- Variáveis de ambiente: compare a lista do `.env.example` com o que o código realmente lê
  (`os.getenv`, `os.environ`, `process.env`, `Settings`)
- Portas e URLs: compare com `docker-compose.yml` e configs
- Exemplos de payload: compare com o schema/modelo atual

Um doc que você não conseguiu verificar contra o código não deve ser "corrigido" por dedução.
Marque como "não verificado" no relatório e pergunte.

## Passo 4 — corrigir

Edite o mínimo necessário. Regras:

**Não reescreva o que está correto.** Um diff de documentação com 200 linhas alteradas para uma
mudança de uma variável de ambiente é impossível de revisar.

**Preserve o tom e o idioma do documento.** Se o README está em português, escreva em português.
Se usa tabelas, use tabelas.

**Não apague seções que você não entende.** Uma seção aparentemente obsoleta pode descrever algo
que existe fora deste repositório. Sinalize em vez de remover.

**Exemplos devem ser copiáveis.** Se você atualizar um comando ou snippet, ele precisa funcionar
como está escrito — teste os comandos que der para testar.

## Passo 5 — reportar

Termine com um resumo curto:

```markdown
## Documentação atualizada

- `README.md` — seção "Configuração": adicionadas `DATABASE_URL` e `REDIS_HOST`
- `.env.example` — mesmas duas variáveis, com valores de exemplo

## Verificado e já estava correto
- `docs/api.md`

## Não verificado / precisa de você
- `docs/arquitetura.md` cita um serviço `worker-faturas` que não achei no repositório —
  ainda existe?
```

As alterações de documentação vão em commit `docs(escopo): ...` separado, exceto quando forem
parte inseparável da mudança (ex: `.env.example` junto com a variável nova).
