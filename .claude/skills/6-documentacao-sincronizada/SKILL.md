---
name: 6-documentacao-sincronizada
description: Etapa 6 de 7 do fluxo de desenvolvimento deste projeto — põe a documentação existente em sincronia com o código (README, CLAUDE.md, rules, dominio.md, roadmap, CHANGELOG, .env.example, docstrings) e fecha o documento da feature em docs/features/ com o que foi construído, as armadilhas e como verificar. Use depois da etapa 5, sempre que houver mudança que afete setup, dependências, contrato de API, modelo de dados, comandos, estrutura de pastas ou variáveis de ambiente, e quando o usuário mencionar README, documentação, docs desatualizados, onboarding ou "documentar o que foi feito". Termina indicando a etapa 7 (/7-commits-granulares).
---

# Etapa 6 — Documentação sincronizada

1. `/1-usecasesrefinement` — casos de uso e de falha
2. `/2-technicalrefinement` — opções técnicas e decisões
3. `/3-implementation` — implementar o que foi decidido
4. `/4-revisao-estrutural` — código morto, duplicação, dívida
5. `/5-securitycheck` — segurança do que foi implementado
6. **`/6-documentacao-sincronizada`** — docs e registro da feature ← você está aqui
7. `/7-commits-granulares` — commits e push

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

E os gatilhos próprios deste projeto, que valem em toda rodada do fluxo:

| Mudou | Verifique |
|---|---|
| Qualquer efeito para quem usa o app | `CHANGELOG.md`, seção `[Não lançado]`, na categoria certa, em português, pelo efeito — não pela implementação. Mudança só de ferramenta ou doc de desenvolvimento não ganha entrada |
| Item do roadmap concluído | `docs/roadmap.md`: o item sai, o próximo de "Próximo" sobe para "Em andamento"; a linha **Em andamento** no fim do `CLAUDE.md` acompanha |
| Teste novo ou removido | contagens em `CLAUDE.md` e `README.md` (`pytest` e `npm test`) |
| Arquivo ou pasta nova | árvore de pastas no `CLAUDE.md` e no `README.md` |
| Regra de negócio, dívida aceita, decisão deliberada | `docs/dominio.md` (conceitos, regras, **Dívidas conhecidas**) |
| Estado do que funciona | seção "Estado atual" do `README.md` |
| Edição local em arquivo de terceiro (componente shadcn) | item "Local edits to shadcn files" em `rules-frontend.md` |

`.claude/rules/` e `.claude/skills/` só mudam com autorização explícita do usuário na
conversa. Se estiverem desatualizados, diga o que está errado e peça — não edite antes.

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
parte inseparável da mudança (ex: `.env.example` junto com a variável nova, ou a entrada do
CHANGELOG, que vai no mesmo commit da feature).

## Passo 6 — fechar o documento da feature

Dentro do fluxo existe `docs/features/<arquivo>.md`, aberto na etapa 1. Preencha as seções
**(6)**, confira **Contratos alterados** contra o código final (o plano da etapa 2 pode ter
mudado na 3), troque o status para `concluído` no documento e no índice
`docs/features/README.md`, e preencha a **Entrada no CHANGELOG** com a linha escrita acima.

```markdown
## O que foi construído (6)

Por camada, não por arquivo. O papel de cada peça nova, não o diff.

### Backend
### Frontend
### Infra / dados

## Armadilhas (6)

Só o que vale a pena a próxima pessoa saber — ver a regra de filtro abaixo.

## Como verificar (6)

Passos concretos para alguém confirmar na mão: comandos, rotas, o que observar na tela.
```

**A regra de filtro das armadilhas.** Durante o desenvolvimento aparecem bugs; a maioria é
lixo de processo — você quebrou algo enquanto construía e consertou dez minutos depois. Isso
**não entra**: erro de versão intermediária, import esquecido, refactor pela metade, qualquer
coisa cuja lição seja "eu tinha errado e depois acertei".

Registre quando o problema:

- **mudou uma decisão de design** — um caminho quebrou por motivo estrutural e a feature
  ficou diferente por causa disso
- **expôs algo que já existia** e não foi criado pela feature
- **vai acontecer de novo** com quem mexer na área — pegadinha da biblioteca, do framework,
  do ambiente
- **não é visível no código final** — quem ler o resultado não deduz por que está assim

O teste: *a próxima pessoa a mexer aqui perderia tempo se não soubesse disso?* Se não, corta.

```markdown
### <o sintoma, em uma frase>

**Causa:** <o motivo real>
**Como se manifesta:** <o que a pessoa vai ver>
**O que fazer:** <a saída>
```

Mostre o documento ao usuário e pergunte especificamente sobre as armadilhas — você pode ter
promovido um tropeço a armadilha, ou inferido um motivo que ninguém disse.

O documento não repete o CHANGELOG nem os commits: ele os referencia e acrescenta o que
nenhum dos dois carrega, o raciocínio. Doc desatualizado pela feature (README, rules) é
corrigido nos passos acima, não descrito aqui.

## Ao terminar

Encerre sempre com este bloco:

```
Etapa 6 de 7 concluída — documentação atualizada e docs/features/<arquivo>.md concluído.
Próximo passo: 7 — commits e envio para o repositório remoto (/7-commits-granulares).
```

E pergunte: **"Sigo para a etapa 7?"** Com um sim, chame a skill `7-commits-granulares`. Com
um não, pare.
