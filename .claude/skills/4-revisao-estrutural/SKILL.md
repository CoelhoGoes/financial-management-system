---
name: 4-revisao-estrutural
description: Etapa 4 de 7 do fluxo de desenvolvimento deste projeto — revisão de qualidade e manutenibilidade depois da implementação: código morto, lógica duplicada, dependências não usadas e dívida técnica. Roda as ferramentas via uvx/npx, sem instalar nada, e entrega relatório agrupado por confiança sem apagar nada. Vulnerabilidades em dependências NÃO são daqui — são da etapa 5 (/5-securitycheck). Use depois da etapa 3, sempre que houver alteração estrutural (mover ou renomear módulos, trocar biblioteca, remover feature, refatorar camadas, mudar modelo de dados) e quando o usuário mencionar código morto, limpeza, arquivo abandonado, dívida técnica, dependência não usada, refatoração ou "o que dá pra remover". Esta é a skill de revisão deste projeto — neste repositório use esta, não a genérica revisao-de-codigo. Termina indicando a etapa 5.
---

# Etapa 4 — Revisão estrutural

1. `/1-usecasesrefinement` — casos de uso e de falha
2. `/2-technicalrefinement` — opções técnicas e decisões
3. `/3-implementation` — implementar o que foi decidido
4. **`/4-revisao-estrutural`** — código morto, duplicação, dívida ← você está aqui
5. `/5-securitycheck` — segurança do que foi implementado
6. `/6-documentacao-sincronizada` — docs e registro da feature
7. `/7-commits-granulares` — commits e push

Depois de uma mudança estrutural sobra lixo: funções que ninguém chama, imports órfãos,
dependências que saíram do caminho. Este é um passe de **diagnóstico**. Nada é apagado aqui.

Dentro do fluxo, o foco é o que a etapa 3 mudou (`git diff` desde o início do item) e o que
essa mudança pode ter deixado órfão em outros lugares. Rodada avulsa, o escopo é o repositório.

Vulnerabilidade em dependência (`pip-audit`, `npm audit`) é da etapa 5. Se ver uma aqui, deixe
para lá — ela vai aparecer no relatório certo.

## Ferramentas

Rode tudo por `uvx` / `npx`. **Nenhuma dessas ferramentas é instalada no ambiente** — não entram
em `requirements.txt` nem em `package.json`, não sujam o venv, não aparecem no `git status`.
Não peça autorização para rodá-las; o que exige autorização é alterar arquivo.

```bash
# Backend — a partir da raiz do repositório
uvx ruff check backend/

# Frontend
cd frontend && npx -y knip
```

Se a rede estiver indisponível, diga isso e siga na análise manual — mas não presuma que está.

**Não use `vulture` neste projeto.** Já foi testado aqui: 19 achados, 19 falsos positivos. Num
repositório que é FastAPI + Pydantic + SQLAlchemy quase inteiro, praticamente todo símbolo é
resolvido por decorator ou por metaclasse, e a ferramenta acerta perto de zero.

## Falsos positivos conhecidos deste repositório

Verifique esta lista **antes** de reportar qualquer coisa. Cada item aqui já foi investigado e
descartado uma vez; reportar de novo só faz o usuário perder tempo.

| Achado | Por que é falso positivo |
| --- | --- |
| `ruff B008` em `Depends(get_session)`, `Query(...)` | É a forma obrigatória de injeção de dependência do FastAPI. 19 dos 20 achados de ruff são isto. |
| Endpoints de `backend/app/api/` reportados como função não usada | Registrados por decorator `@router.get/post/...`, nunca chamados por nome. |
| Campos de `api/schemas.py` (ou das dataclasses de `domain/service.py`) reportados como variável não usada | São campos de modelo Pydantic, lidos por metaclasse — e as dataclasses do domínio são lidas campo a campo pelo `response_model`. |
| `@remixicon/react` sem referência em `src/` | Declarado em `components.json` como `iconLibrary`. O CLI do shadcn gera os imports quando componentes forem instalados. Remover quebra o próximo `npx shadcn add`. |
| `oxlint` reportado como dependência não usada | É usado em `npm run lint`. O knip erra isso quando `node_modules` não está instalado. |
| Apelidos de `src/shared/types.ts` sem import por nome (`InvoiceInstallment`, `CategoryItem`, …) | `types.ts` dá nome curto a todo schema da API, usado ou não. Tipos aninhados são usados estruturalmente (`items: CategoryItem[]`), nunca importados soltos. Esperado, não abandono. |
| Exportações de `src/shared/api-schema.d.ts` sem uso (`paths`, `operations`, `webhooks`, `$defs`) | Arquivo gerado pelo `openapi-typescript` (`npm run gen:types`). Nunca se edita à mão; o que ele exporta não é decisão nossa. |
| Exportações de `src/presentation/components/ui/` sem uso | Componentes shadcn existem por convenção da biblioteca, não por demanda atual. |

**A regra por trás da tabela:** ferramentas de análise estática não leem arquivos de
configuração que declaram coisas. Antes de chamar uma dependência de morta, confira quem a
declara — `components.json`, scripts do `package.json`, `vite.config.ts`, `docker-compose.yml`,
`Dockerfile`.

## Configuração do ruff

Sem configuração, ruff é 95% ruído aqui. A correção certa **não** é ignorar `B008`, e sim
declarar que as chamadas do FastAPI são imutáveis, preservando a regra para o caso real
(`def f(x = [])`):

```toml
# backend/pyproject.toml
[tool.ruff.lint.flake8-bugbear]
extend-immutable-calls = ["fastapi.Depends", "fastapi.Query"]
```

Criar esse arquivo exige autorização do usuário (ver `CLAUDE.md` → Decisões). Enquanto não
existir, rode ruff assim mesmo e descarte os `B008` na leitura.

## Não toque

`alembic/versions/` e `migrations/` (quando existirem), `frontend/dist/`, `node_modules/`,
`__pycache__/`, `.venv/`, `frontend/package-lock.json`, `.agents/`, `.claude/`, `.env`.

Se precisar mexer em qualquer coisa sob `.claude/`, peça autorização explícita antes.

## O que procurar

1. Código morto: funções, arquivos, componentes, rotas, variáveis, imports, dependências
2. Lógica duplicada que deveria ser consolidada
3. Implementações complexas demais para o que fazem
4. Código legado que perdeu a razão de existir
5. Queries ao banco ou chamadas de API redundantes
6. Arquivos aparentemente abandonados ou desconectados da aplicação
7. Oportunidades de reduzir dívida técnica

Para código morto: confirme com grep antes de reportar, e procure os chamadores não óbvios —
`Dockerfile`, `docker-compose.yml`, scripts do `package.json`, workers, feature flags, e rotas
consumidas por um cliente que ainda não existe neste repositório.

Cheque também `git log` no que for reportar: código dos últimos commits provavelmente é trabalho
em andamento, não código morto.

## O que reportar

- **Local:** caminho e linha(s)
- **Confiança:** alta (verificado, nenhuma referência) / média (nada encontrado, mas pode ser
  usado externamente ou dinamicamente) / baixa (parece não usado, precisa de humano)
- **Por que é desnecessário:** razão concreta e verificável, não palpite
- **Impacto de remover:** linhas, complexidade, bundle
- **Risco:** o que pode quebrar
- **Ação recomendada:** apagar / precisa de confirmação / precisa de depreciação

Item sem razão verificável não entra no relatório. Um achado incerto apresentado como confiança
alta destrói a utilidade das outras classificações.

## Formato de saída

```markdown
# Revisão estrutural — <data>

**Escopo:** <pastas/módulos>
**Ferramentas:** <o que rodou, quantos achados brutos, quantos sobraram após o filtro>

## Confiança alta — PR de limpeza sugerido
## Confiança média — precisa de aval
## Confiança baixa — só levantamento

## Resumo
```

Agrupe por confiança, não por categoria. Dentro do grupo, ordene por impacto. Só confiança alta
entra no PR de limpeza sugerido.

Ao relatar as ferramentas, diga quantos achados brutos e quantos sobraram depois do filtro da
tabela acima — isso mostra ao usuário que o ruído foi descartado, não ignorado.

## Regra de execução

**Somente relatório.** Não apague nem modifique nada. Pare e espere o usuário aprovar quais
itens executar.

Quando ele aprovar, aplique os itens rodando os checks da etapa 3 entre cada remoção — não
junte dez deleções de uma vez, porque se algo quebrar não dá pra saber qual foi. Os commits
saem na etapa 7, separados por natureza do item.

Remoção de código, arquivo ou dependência precisa de aprovação explícita (`CLAUDE.md` →
Decisões) — a aprovação do relatório vale para os itens aprovados, não para os vizinhos.

## Ao terminar

Encerre sempre com este bloco:

```
Etapa 4 de 7 concluída — <n> achados (<n> aplicados, <n> deixados para depois).
Próximo passo: 5 — revisão de segurança (/5-securitycheck).
```

E pergunte: **"Sigo para a etapa 5?"** Com um sim, chame a skill `5-securitycheck`. Com um
não, pare.
