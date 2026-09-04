# Domínio — Gestão Financeira

As regras de negócio deste projeto, em português e em prosa. O código em
`backend/app/service.py` é a implementação; este arquivo é o significado. Quando os dois
divergirem, **este arquivo está certo e o código tem um bug** — ou este arquivo está
desatualizado e precisa ser corrigido junto.

Leia antes de mexer em qualquer coisa em `service.py`.

## Conceitos

**Lançamento** (`Entry`, tabela `lancamentos`) — qualquer movimento de dinheiro. Tem tipo,
valor, descrição, categoria, data e forma de pagamento.

**Tipo** — `gasto` (saída) ou `entrada` (receita).

**Forma** (`method`) — `avista` (débito, dinheiro, PIX: sai do saldo na hora) ou `credito`
(cartão: vira parcela numa fatura futura).

**Fatura** — o conjunto de parcelas de crédito que vencem num determinado mês. Não é uma tabela:
é calculada na hora a partir dos lançamentos.

**Dia de fechamento** (`closing_day`) — dia do mês em que a fatura do cartão fecha. Configurado
por usuário em `/auth/me`.

**Renda mensal** (`monthly_income`) — valor fixo que o usuário declara ganhar por mês. Não é um
lançamento; é um campo do usuário, somado automaticamente em todo mês do resumo.

## Categorias

Estas são as listas fechadas usadas pelo app. Não invente categoria nova sem conversar — elas
aparecem no resumo por categoria e mudar a lista quebra a comparação com meses anteriores.

**Gastos:** Mercado, Alimentação, Transporte, Moradia, Contas, Lazer, Saúde, Educação,
Assinaturas, Outros

**Entradas:** Freela, Reembolso, Presente, Venda, Outros

## Regras

### Uma entrada nunca é no crédito

Lançamento com `type == "entrada"` não pode ter `method == "credito"`. Não faz sentido receber
dinheiro no cartão de crédito neste modelo. Validado no endpoint de criação em
`routers/finance.py`.

### Em que fatura uma compra cai

Uma compra no crédito **antes** do dia de fechamento entra na fatura do **mês seguinte**. No dia
do fechamento ou depois, pula para a fatura do mês **subsequente**.

Exemplo com fechamento no dia 20:

| Data da compra | Fatura em que cai |
| --- | --- |
| 05/09 | outubro |
| 19/09 | outubro |
| 20/09 | novembro |
| 28/09 | novembro |

A intuição: comprou depois que a fatura fechou, não deu tempo de entrar nela.

### Como as parcelas se dividem

Um valor parcelado em N vezes é dividido em N pedaços `Decimal`. A divisão raramente é exata, e
**a última parcela absorve o resto**, para que a soma das parcelas seja exatamente igual ao
total da compra.

`100,00` em 3x → `33,33 + 33,33 + 33,34`.

Nunca arredonde cada parcela independentemente: `33,33 × 3 = 99,99` e some centavo evaporado.

As parcelas se espalham por meses consecutivos a partir da fatura em que a compra caiu (regra
anterior). Uma compra de 3x que cai na fatura de outubro gera parcelas em outubro, novembro e
dezembro.

### Como o saldo do mês é calculado

```
saldo disponível = renda mensal
                 + entradas do mês (lançamentos type=entrada)
                 - gastos à vista do mês (type=gasto, method=avista)
                 - total da fatura que vence no mês
```

O que entra na conta como fatura é a **fatura que vence naquele mês**, não as compras feitas
naquele mês. É essa distinção que faz o número ser útil: mostra o que vai sair da conta, não o
que foi gasto.

### Tendência

`/trend` devolve uma lista de resumos mensais, um por mês, terminando no mês atual (ou no mês
passado em `until`) e voltando `months` meses. Cada item é o mesmo `Summary` de
`/summary/{month}` — não há cálculo novo, só repetição do mesmo cálculo em meses diferentes.

## Invariantes

**Dinheiro é sempre `Decimal`, nunca `float`.** Da coluna `Numeric(12,2)` no banco, passando
pelo schema Pydantic, até a aritmética em `service.py`. Float acumula erro de arredondamento e
em dinheiro isso vira centavo perdido que ninguém consegue explicar depois.

Na API, valores monetários saem como **string** no JSON (é assim que o FastAPI serializa
`Decimal`). O frontend converte com `Number()` só na hora de formatar.

**A regra vive no backend.** Nenhum cálculo de fatura, saldo ou parcela pode ser reimplementado
no frontend, nem "só para mostrar rápido na tela". O motivo é concreto: o plano é ter um app
nativo depois, e duas implementações da mesma regra sempre divergem.

**Todo acesso a lançamento é escopado pelo usuário do JWT.** Nunca por um id de usuário que veio
do cliente.

## Dívidas conhecidas

Coisas que estão assim de propósito ou por falta de tempo — não são bugs a corrigir sem
conversar antes.

- **Sem Alembic.** O schema é criado com `Base.metadata.create_all`, que cria tabelas novas mas
  não altera as existentes. Mudar uma coluna hoje exige migração manual ou recriar o banco. Vale
  trazer Alembic quando houver dado real que não pode ser perdido.
- **`/summary` e `/trend` carregam todos os lançamentos do usuário na memória** e filtram em
  Python, em vez de filtrar no SQL. Na escala de um usuário isso é irrelevante; é o primeiro
  lugar para olhar se ficar lento.
- **`frontend/api.js` é JavaScript puro e vive fora de `src/`.** O resto do frontend é
  TypeScript. Isso significa que as respostas da API chegam como `any` e os tipos em `types.ts`
  são aplicados manualmente na chamada. Mover para `src/api.ts` tipado resolveria, mas quebra os
  imports existentes.
- **`frontend/src/types.ts` é um espelho manual de `backend/app/schemas.py`.** Nada garante que
  os dois estejam sincronizados. Gerar os tipos a partir do OpenAPI do FastAPI resolveria.
- **Sem testes.** As funções de `service.py` foram escritas puras justamente para serem
  testáveis sem Postgres, mas a suíte ainda não existe.

## O que eu ainda não entendo do que herdei

Anote aqui o que existe no projeto mas você não sabe explicar — evita que uma decisão acidental
seja tratada como intencional. Esta seção deve encolher com o tempo.

- (nada registrado ainda)
