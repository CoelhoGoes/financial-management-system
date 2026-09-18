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
por usuário em `/auth/me` ou pela tela de configuração. Aceita de 1 a 28 e vale **25** enquanto
ninguém mudar.

**Renda mensal** (`monthly_income`) — valor fixo que o usuário declara ganhar por mês. Não é um
lançamento; é um campo do usuário, somado automaticamente em todo mês do resumo. Começa em
**0**, então uma conta recém-criada mostra saldo como se não houvesse renda até alguém informá-la.

Os dois valores padrão vivem no `default=` de `models.py` — é de lá que eles devem ser lidos, não
repetidos em outro lugar.

## Categorias

Estas são as listas fechadas usadas pelo app. Não invente categoria nova sem conversar — elas
aparecem no resumo por categoria e mudar a lista quebra a comparação com meses anteriores.

**Gastos:** Mercado, Alimentação, Transporte, Moradia, Contas, Lazer, Saúde, Educação,
Assinaturas, Outros

**Entradas:** Salário, Freela, Reembolso, Presente, Venda, Outros

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

### O que entra no resumo por categoria

A categoria de um mês soma os **gastos à vista feitos nele** mais as **parcelas da fatura que
vence nele** — a mesma divisão do saldo acima. A consequência é que uma compra parcelada
aparece na categoria em cada mês em que uma parcela vence, e não no mês em que foi comprada.

Por isso `/summary/{month}/categories` devolve cada item com o número da parcela
(`3/9`, nulo quando é à vista): sem isso, um gasto de Lazer aparece num mês em que nada de
lazer foi comprado, e o número parece erro. Os totais por categoria somam exatamente o
`total_spent` do `/summary` do mesmo mês.

### Tendência

`/trend` devolve uma lista de resumos mensais, um por mês, terminando no mês passado em `until`
e voltando `months` meses. Cada item é o mesmo `Summary` de `/summary/{month}` — não há cálculo
novo, só repetição do mesmo cálculo em meses diferentes.

Sem `until`, o servidor usa o mês atual **em UTC**: ele não conhece o fuso de quem pergunta.
Quem se importa com o próprio fuso manda `until` — é o que a tela de tendência deve fazer
quando existir (ver `docs/roadmap.md`).

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
- **`/summary`, `/summary/{month}/categories` e `/trend` carregam todos os lançamentos do
  usuário na memória** e filtram em Python, em vez de filtrar no SQL. Na escala de um usuário
  isso é irrelevante; é o primeiro lugar para olhar se ficar lento. A tela de resumo chama os
  dois primeiros em paralelo, então são **duas varreduras completas e dois cálculos de fatura**
  por carregamento — quem for fazer o filtro em SQL ganha o dobro do que parece.
- **`frontend/api.js` é JavaScript puro e vive fora de `src/`.** O resto do frontend é
  TypeScript. Isso significa que as respostas da API chegam como `any` e os tipos em `types.ts`
  são aplicados manualmente na chamada. Mover para `src/api.ts` tipado resolveria, mas quebra os
  imports existentes.
- **`frontend/src/types.ts` é um espelho manual de `backend/app/schemas.py`.** Nada garante que
  os dois estejam sincronizados. Gerar os tipos a partir do OpenAPI do FastAPI resolveria.
- **`shiftMonth` no frontend duplica `shift_month` do `service.py`.** Os dois somam e subtraem
  mês no formato `YYYY-MM`. O do frontend só decide qual mês pedir na navegação entre telas —
  é presentação, não cálculo de dinheiro — mas fica na fronteira da regra de não ter lógica no
  cliente. **Monitorar:** se ele começar a decidir algo além de qual mês buscar, virou regra de
  negócio no lugar errado e precisa voltar para o servidor.
- **A camada de API roda em sqlite por padrão.** `backend/tests/test_api.py` sobe o app contra
  um sqlite temporário: rápido e sem container. A mesma suíte roda contra Postgres apontando
  `TEST_DATABASE_URL` (veja o README), e foi verificada nos dois — mas a execução do dia a dia é
  em sqlite, então uma divergência só de Postgres só aparece se alguém rodar a versão opcional.
  O cálculo de dinheiro não corre esse risco: `test_service.py` não usa banco nenhum.

## O que eu ainda não entendo do que herdei

Anote aqui o que existe no projeto mas você não sabe explicar — evita que uma decisão acidental
seja tratada como intencional. Esta seção deve encolher com o tempo.

- **Por que `closing_day` vai só até 28?** O limite está em `schemas.py`
  (`Field(ge=1, le=28)`). A explicação mais provável é evitar dias que não existem em
  fevereiro, mas não foi possível determinar o motivo real — quem escreveu não registrou.
