#!/usr/bin/env bash
# Sobe a aplicação inteira: Postgres + API em Docker, frontend em modo dev.
#
#   ./dev.sh
#
# Os containers ficam de pé ao sair (Ctrl+C só encerra o Vite), porque subir o
# Postgres de novo é a parte lenta. Para derrubá-los: docker compose down
set -euo pipefail

cd "$(dirname "$0")"

vermelho() { printf '\033[31m%s\033[0m\n' "$1"; }
verde()    { printf '\033[32m%s\033[0m\n' "$1"; }
cinza()    { printf '\033[90m%s\033[0m\n' "$1"; }

# --- pré-requisitos -------------------------------------------------------
for cmd in docker npm; do
  command -v "$cmd" >/dev/null || { vermelho "Falta o comando '$cmd'."; exit 1; }
done
docker compose version >/dev/null 2>&1 || {
  vermelho "Falta o plugin Compose v2 ('docker compose', sem hífen)."
  cinza    "Ubuntu/Debian: sudo apt-get install docker-compose-v2"
  exit 1
}

# --- .env -----------------------------------------------------------------
# O backend recusa subir sem JWT_SECRET ou com menos de 32 bytes (RFC 7518).
MIN_BYTES=32

if [ ! -f .env ]; then
  cinza "Criando .env a partir do .env.example…"
  cp .env.example .env
  # remove o placeholder antes de acrescentar o valor real
  sed -i '/^JWT_SECRET=/d' .env
  printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 32)" >> .env
  verde ".env criado com um JWT_SECRET novo."
elif ! grep -q '^JWT_SECRET=..*' .env; then
  cinza "JWT_SECRET ausente no .env; gerando…"
  sed -i '/^JWT_SECRET=/d' .env
  printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 32)" >> .env
  verde "JWT_SECRET gerado."
else
  bytes=$(grep -m1 '^JWT_SECRET=' .env | sed 's/^JWT_SECRET=//' | tr -d '\n' | wc -c)
  if [ "$bytes" -lt "$MIN_BYTES" ]; then
    vermelho "JWT_SECRET tem $bytes bytes; o mínimo é $MIN_BYTES. A API não vai subir."
    cinza    "Não troco sozinho porque trocar invalida as sessões abertas. Para corrigir:"
    echo
    printf '  %s\n' "sed -i '/^JWT_SECRET=/d' .env && printf 'JWT_SECRET=%s\\n' \"\$(openssl rand -hex 32)\" >> .env"
    echo
    exit 1
  fi
fi

# --- backend --------------------------------------------------------------
cinza "Subindo Postgres e API…"
docker compose up -d --build --wait

# o serviço api não tem healthcheck no compose, então o --wait não cobre: espera o /health
printf '\033[90mEsperando a API responder'
for _ in $(seq 1 60); do
  if curl -sf -m 2 http://localhost:8000/health >/dev/null 2>&1; then
    printf '\033[0m\n'; verde "API no ar em http://localhost:8000  (docs em /docs)"
    break
  fi
  printf '.'; sleep 1
done
if ! curl -sf -m 2 http://localhost:8000/health >/dev/null 2>&1; then
  printf '\033[0m\n'; vermelho "A API não respondeu em 60s. Últimas linhas do log:"
  docker compose logs --tail 15 api
  exit 1
fi

# --- frontend -------------------------------------------------------------
cd frontend
[ -d node_modules ] || { cinza "Instalando dependências do frontend…"; npm install; }

echo
verde "Frontend em http://localhost:5173"
cinza "Ctrl+C encerra o Vite. Os containers seguem de pé — 'docker compose down' para derrubar."
echo
exec npm run dev
