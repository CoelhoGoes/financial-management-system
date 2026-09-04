---
name: revisao-estrutural
description: Revisão de qualidade e manutenibilidade do código — código morto, lógica duplicada, componentes órfãos, complexidade desnecessária, dependências não usadas e dívida técnica. Roda em modo somente-relatório, agrupado por nível de confiança, sem apagar nada. Use sempre que houver alteração estrutural no projeto (mover/renomear pastas ou módulos, trocar biblioteca, remover feature, refatorar camadas, mudar modelo de dados) e sempre que o usuário mencionar código morto, limpeza, arquivo abandonado, dívida técnica, refatoração ou "o que dá pra remover". Ao terminar um refactor grande, ofereça esta revisão mesmo sem o usuário pedir.
---

# Revisão estrutural

Depois de uma mudança estrutural, sobra lixo: funções que ninguém mais chama, imports órfãos,
componentes de UI que perderam a tela, dependências que saíram do caminho. Este é um passe de
**diagnóstico**, não de execução — nada é apagado aqui.

## Antes de analisar

1. **Rode a ferramenta de análise estática da stack primeiro** e use a saída como ponto de
   partida, não como verdade:
   - Python: `vulture`, `ruff --select F401,F841`, `pip-audit` para dependências
   - TS/JS: `ts-prune` ou `knip`, `depcheck` para pacotes npm não usados
   - Se a ferramenta não estiver instalada, diga ao usuário e siga na mão em vez de instalar
     coisa no ambiente dele sem perguntar.

   Essas ferramentas erram em três casos previsíveis: import dinâmico, roteamento por string e
   dispatch por reflexão. Trate toda saída como hipótese.

2. **Confirme manualmente cada item.** Faça grep/busca de referências no repositório inteiro
   antes de marcar algo como não usado. Procure também os chamadores não óbvios:
   - configs de CI, Dockerfile, docker-compose
   - cron jobs, tasks agendadas, workers
   - feature flags e variáveis de ambiente
   - rotas de API consumidas por um cliente externo que não está neste repositório
   - templates, arquivos de tradução, fixtures de teste

3. **Cheque a idade do código** com `git log` / `git blame`. Código adicionado nos últimos
   commits provavelmente é trabalho em andamento, não código morto. Trate com ceticismo
   redobrado ou não inclua no relatório.

4. **Não toque em:** migrations (`alembic/versions/`, `migrations/`), código gerado ou vendorizado,
   `node_modules/`, `__pycache__/`, arquivos de configuração, e qualquer caminho que o usuário
   marcar como fora de escopo. Se o projeto tiver outras pastas intocáveis, pergunte antes do
   primeiro relatório e registre a resposta aqui.

## O que procurar

1. Código morto: funções, arquivos, componentes, rotas, endpoints, variáveis, imports, dependências
2. Lógica duplicada que deveria ser consolidada
3. Componentes de UI sem uso
4. Implementações complexas demais para o que fazem
5. Código legado que perdeu a razão de existir
6. Queries ao banco ou chamadas de API redundantes
7. Arquivos aparentemente abandonados ou desconectados da aplicação
8. Oportunidades de reduzir dívida técnica

## O que reportar em cada achado

- **Local:** caminho do arquivo e linha(s)
- **Confiança:** alta (verificado, nenhuma referência em lugar nenhum) / média (nenhuma
  referência encontrada, mas pode ser usado externamente ou dinamicamente) / baixa (parece não
  usado, precisa de confirmação humana)
- **Por que é desnecessário:** razão concreta e verificável, não palpite
- **Impacto de remover:** linhas removidas, complexidade reduzida, ganho de performance ou bundle
- **Risco antes de apagar:** o que pode quebrar, o que checar primeiro
- **Ação recomendada:** apagar agora / precisa de confirmação / precisa de período de depreciação

Se não conseguir preencher "por que é desnecessário" com uma razão verificável, o item não entra
no relatório. Um achado incerto apresentado com confiança alta destrói a utilidade das outras
classificações.

## Formato de saída

Agrupe por **nível de confiança** (alta primeiro), não por categoria. Dentro de cada grupo,
ordene por impacto.

```markdown
# Revisão estrutural — <data>

**Escopo analisado:** <pastas/módulos>
**Ferramentas usadas:** <o que rodou e o que a saída indicou>

## Confiança alta — PR de limpeza sugerido
...

## Confiança média — precisa de aval
...

## Confiança baixa — só levantamento
...

## Resumo
- N itens de confiança alta, ~X linhas removíveis
- N itens aguardando confirmação
```

Só itens de **confiança alta** entram no PR de limpeza sugerido. Média e baixa ficam numa lista
de acompanhamento separada, que exige aval explícito do usuário antes de qualquer ação.

## Regra de execução

Este passe é **somente relatório**. Não apague nem modifique nada. Pare depois de produzir o
relatório e espere o usuário aprovar quais itens executar.

Quando ele aprovar, execute em commits separados por natureza do item (ver skill
`commits-granulares`) e rode os testes entre cada remoção — não junte dez deleções num commit só,
porque se algo quebrar não dá pra saber qual foi.
