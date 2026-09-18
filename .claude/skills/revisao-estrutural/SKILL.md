---
name: revisao-estrutural
description: Revisão de qualidade e manutenibilidade deste repositório — código morto, lógica duplicada, dependências não usadas, vulnerabilidades conhecidas e dívida técnica. Roda as ferramentas via uvx/npx, sem instalar nada, e entrega relatório agrupado por confiança sem apagar nada. Use sempre que houver alteração estrutural (mover ou renomear módulos, trocar biblioteca, remover feature, refatorar camadas, mudar modelo de dados) e sempre que o usuário mencionar código morto, limpeza, arquivo abandonado, dívida técnica, dependência não usada, vulnerabilidade, refatoração ou "o que dá pra remover". Ao terminar um refactor grande, ofereça esta revisão mesmo sem o usuário pedir. Esta é a skill de revisão deste projeto — neste repositório use esta, não a genérica revisao-de-codigo.
---

# Revisão estrutural

Depois de uma mudança estrutural sobra lixo: funções que ninguém chama, imports órfãos,
dependências que saíram do caminho, pacotes com CVE aberto. Este é um passe de **diagnóstico**.
Nada é apagado aqui.

## Ferramentas

Rode tudo por `uvx` / `npx`. **Nenhuma dessas ferramentas é instalada no ambiente** — não entram
em `requirements.txt` nem em `package.json`, não sujam o venv, não aparecem no `git status`.
Não peça autorização para rodá-las; o que exige autorização é alterar arquivo.

```bash
# Backend — a partir da raiz do repositório
uvx pip-audit -r backend/requirements.txt
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
| Endpoints de `routers/` reportados como função não usada | Registrados por decorator `@router.get/post/...`, nunca chamados por nome. |
| Campos de `schemas.py` reportados como variável não usada | São campos de modelo Pydantic, lidos por metaclasse. |
| `@remixicon/react` sem referência em `src/` | Declarado em `components.json` como `iconLibrary`. O CLI do shadcn gera os imports quando componentes forem instalados. Remover quebra o próximo `npx shadcn add`. |
| `oxlint` reportado como dependência não usada | É usado em `npm run lint`. O knip erra isso quando `node_modules` não está instalado. |
| Interfaces de `types.ts` sem import por nome (`InvoiceInstallment`, `CategoryItem`, …) | `types.ts` é espelho manual de `schemas.py`, por invariante do `CLAUDE.md`. Tipos aninhados são usados estruturalmente (`items: CategoryItem[]`), nunca importados soltos. Esperado, não abandono. |
| Exportações de `src/components/ui/` sem uso | Componentes shadcn existem por convenção da biblioteca, não por demanda atual. |

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

1. **Vulnerabilidades conhecidas em dependências** — é o único item desta lista que não se acha
   lendo código. Ler `security.py` não substitui consulta a banco de CVE.
2. Código morto: funções, arquivos, componentes, rotas, variáveis, imports, dependências
3. Lógica duplicada que deveria ser consolidada
4. Implementações complexas demais para o que fazem
5. Código legado que perdeu a razão de existir
6. Queries ao banco ou chamadas de API redundantes
7. Arquivos aparentemente abandonados ou desconectados da aplicação
8. Oportunidades de reduzir dívida técnica

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

## Vulnerabilidades em dependências
<saída do pip-audit, separada do resto — é decisão de bump de versão, não de limpeza>

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

Quando ele aprovar, execute em commits separados por natureza do item (ver
`commits-granulares`), rodando os checks entre cada remoção — não junte dez deleções num commit
só, porque se algo quebrar não dá pra saber qual foi.
