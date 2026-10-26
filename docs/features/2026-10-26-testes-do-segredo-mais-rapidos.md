# Testes do segredo mais rápidos

- **Status:** concluído
- **Início:** 2026-10-26
- **Item do roadmap:** acelerar os 8 testes de `TestFailFastDoSegredo`
- **Entrada no CHANGELOG:** nenhuma — muda só a suíte de testes, sem efeito para quem usa o app

## O que a feature entrega (1)

A suíte do backend roda mais rápido, sem perder a garantia que esses testes dão hoje: a API
se recusa a subir sem `JWT_SECRET`, ou com um segredo de menos de 32 bytes, e a mensagem diz
o que está errado e como gerar uma chave.

Não muda nada para quem usa o sistema. Muda para quem desenvolve: o `pytest` do dia a dia
fica mais curto.

## Motivação (1)

Registrada no `docs/roadmap.md`: cada um dos 8 testes sobe um subprocesso Python que importa
o app inteiro. Em 02/10/2026 somavam ~16s de 37s.

Medição de hoje (26/10/2026, `pytest --durations`, sqlite): **12,8s de 26,5s** — quase
metade da suíte. Cada teste leva de 1,2s a 1,8s; o de fronteira (32 vs 31 bytes) importa duas
vezes e leva 2,8s. O resto da suíte, 126 testes, leva ~14s.

Estado atual: a verificação está no nível do módulo, em `backend/app/infra/security.py`
(linhas 12–24) — o `raise RuntimeError` acontece no import. Por isso o teste precisa de um
processo novo: num processo onde o módulo já foi importado, o import não roda de novo.

## Casos de uso (1)

- **UC1 — Rodar a suíte inteira.** Quem: quem desenvolve. O quê: roda `pytest` no backend.
  Resultado: os casos do segredo continuam passando, e a suíte termina em menos tempo que
  hoje.
- **UC2 — Rodar só os testes do segredo.** Quem: quem desenvolve, mexendo em
  `security.py`. O quê: roda só essa classe
  (`pytest "tests/test_api.py::TestFailFastDoSegredo"`). Resultado: passa sozinha, sem
  depender da ordem nem de outro teste ter rodado antes.
- **UC3 — Os mesmos comportamentos continuam cobertos.** Quem: a suíte. O quê: cada
  comportamento testado hoje continua com teste:
  1. sem `JWT_SECRET`, a API não sobe
  2. a mensagem diz como resolver (`openssl rand -hex 32`)
  3. com segredo válido, o import passa
  4. segredo curto (`abc`, 31 bytes, vazio) também impede a subida
  5. a mensagem do segredo curto diz o tamanho e o mínimo
  6. exatamente 32 bytes passa, 31 não

## Casos de falha (1)

- **F1 — A verificação deixa de rodar na subida.** Quando: alguém move a checagem para
  dentro de uma função que ninguém chama no boot, ou para depois do primeiro request.
  Esperado: algum teste falha. É o motivo de os testes existirem: o perigo não é a regra
  errada, é a API subir sem ela.
- **F2 — Estado vazando entre testes.** Quando: a forma mais rápida de testar mexe em
  `os.environ` ou no módulo já importado (`security.SECRET`) dentro do processo do pytest.
  Esperado: nenhum outro teste enxerga o segredo trocado — os testes de token e login
  continuam passando em qualquer ordem.
- **F3 — Teste que passa com e sem a regra.** Quando: o teste novo verifica uma cópia da
  regra, ou uma função que o boot não usa. Esperado: tirar a checagem de `security.py` faz
  algum teste falhar (conferido na etapa 3, rodando contra o código sem a regra).
- **F4 — Mensagem truncada ou trocada.** Quando: o texto do erro muda. Esperado: o teste
  pega, como hoje (os testes 2 e 5 conferem trechos da mensagem).

Pulados de propósito: sessão, conta excluída, recurso de outro usuário, rede, celular — o item
não toca em endpoint nem em tela.

## Perguntas abertas (1)

Nenhuma. Respondidas em 26/10/2026:

- **O que o teste precisa provar sobre a subida:** um teste continua de ponta a ponta (processo
  novo, `import app.main` sem segredo falha) e cobre o F1. Os demais casos do UC3 testam a
  regra direto, sem subprocesso.
- **Meta de tempo:** o mais rápido possível, desde que o custo da otimização valha a pena —
  cada ganho é pesado contra o que ele complica (etapa 2).

## Fora do escopo (1, revisado na 2)

- Os outros testes lentos (o `setup` de 1,1s do primeiro teste de autenticação é a criação
  do banco sqlite, uma vez por sessão) — o item é só esta classe.
- Mudar a regra em si (o mínimo de 32 bytes, o texto das mensagens).

## Decisões (2)

### A regra vira a função `check_secret`, testada direto, mais um subprocesso para o boot

_Revisada na etapa 7: substitui a decisão abaixo._

**Escolhido:** a verificação de `security.py` passa a ser `check_secret(secret)`, chamada pelo
próprio módulo no import (`SECRET = check_secret(os.getenv("JWT_SECRET"))`) — o comportamento
da subida não muda. Os casos de regra e de mensagem chamam a função; um único teste sobe um
processo Python novo sem `JWT_SECRET` e prova que o import do app aplica a regra (F1). É o
desenho que a etapa 1 tinha escolhido ("1 ponta a ponta + regra rápida").

**Motivo da revisão:** a versão da etapa 3 (abaixo) funcionava, mas os testes precisavam
limpar `sys.modules` e de um comentário explicando por quê. Com a regra numa função, o teste
é uma chamada.

**Alternativas:** mover a limpeza de `sys.modules` para uma fixture do `conftest.py`,
compartilhada com a `client` — o truque sairia de vista, mas continuaria lá; ou manter a
versão da etapa 3.

**Custo aceito:** mexe em código do app (`infra/security.py`, uma função extraída, sem mudar
mensagem nem limite). E só o teste de subprocesso cobre "o boot chama a regra" — conferido:
trocando a chamada por `os.getenv` puro, só ele falha.

### ~~Os casos importam `app.main` dentro do processo do pytest, mais um subprocesso de reforço~~

_Implementada na etapa 3 e substituída na 7 pela decisão acima._ Cada caso tirava `app.*` de
`sys.modules` com `monkeypatch` e importava `app.main` de novo. Medido em 26/10/2026: o
primeiro import in-process custa ~1s, os seguintes de 0,01s a 0,34s; um subprocesso, ~1,3s.

## Contratos alterados (2, confirmado na 6)

Nenhum contrato externo — sem API, schema, tipos ou variável de ambiente. Internamente,
`backend/app/infra/security.py` ganha `check_secret(secret: str | None) -> str`.

## Plano de implementação (2)

Na classe `TestFailFastDoSegredo` de `backend/tests/test_api.py`, mais a extração da função
em `security.py`. Nenhum arquivo novo, nenhuma dependência.

Caso → teste:

- **UC3.1** (sem segredo não sobe) → `test_sem_jwt_secret_a_aplicacao_nao_sobe`
  (subprocesso) e `test_sem_segredo_a_regra_recusa`
- **UC3.2** (mensagem diz como resolver) → `test_a_mensagem_diz_como_resolver`
- **UC3.3** (segredo válido passa) → `test_segredo_valido_passa`
- **UC3.4** (`abc`, 31 bytes, vazio) → `test_segredo_curto_tambem_impede_a_subida`
- **UC3.5** (mensagem com tamanho e mínimo) →
  `test_a_mensagem_do_segredo_curto_diz_o_tamanho_e_o_minimo`
- **UC3.6** (fronteira 32/31) → `test_exatamente_32_bytes_passa`
- **UC1** → `pytest --durations` antes e depois
- **UC2** → a classe sozinha passa (`pytest "tests/test_api.py::TestFailFastDoSegredo"`)
- **F1** → o teste de subprocesso
- **F2** → a suíte inteira passa com a classe rodando primeiro e na ordem normal
- **F3** → desligar a regra e ver os testes falharem (ver **Como verificar**)
- **F4** → os `match` de mensagem dos casos UC3.2 e UC3.5

## O que foi construído (6)

### Backend

- `infra/security.py`: a verificação do segredo virou `check_secret`, chamada no import. Mesmas
  mensagens, mesmo mínimo de 32 bytes; a API continua sem subir com segredo ausente ou curto
- `TestFailFastDoSegredo`: 8 testes chamam `check_secret` direto; um sobe um processo Python
  sem `JWT_SECRET` e confere que `import app.main` falha
- Resultado: a suíte do backend foi de 26,5s para ~15,7s; a classe, de 12,8s para ~1,3s (o
  subprocesso). 136 testes (1 pulado no sqlite)

### Frontend

Nada.

### Infra / dados

Nada. A etapa 5 achou 15 vulnerabilidades do `npm audit` que já existiam, nenhuma vinda deste
item; viraram o próximo item do roadmap.

## Armadilhas (6)

Nenhuma.

## Como verificar (6)

```bash
cd backend
uv run --no-project --with-requirements requirements.txt \
  --with-requirements requirements-dev.txt pytest -q --durations=5
```

- A suíte passa (136, 1 pulado) em ~15s; no `--durations`, o único teste da classe acima de
  0,5s é `test_sem_jwt_secret_a_aplicacao_nao_sobe` (~1,3s)
- Rodar a classe antes do resto não quebra nada: `pytest -q
  "tests/test_api.py::TestFailFastDoSegredo" tests/`
- Para conferir que o boot aplica a regra: em `app/infra/security.py`, troque
  `SECRET = check_secret(os.getenv("JWT_SECRET"))` por `SECRET = os.getenv("JWT_SECRET")`,
  rode a classe (só `test_sem_jwt_secret_a_aplicacao_nao_sobe` falha) e desfaça
