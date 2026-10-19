#!/bin/zsh
cd -- "${0:A:h}"
if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$NODE_BIN" ]]; then
  echo 'Установите Node.js 22.12 или новее, затем выполните npm install и npm run dev.'
  read -r '?Нажмите Enter для выхода…'
  exit 1
fi
if [[ ! -f node_modules/vite/bin/vite.js ]]; then
  echo 'Сначала установите зависимости: npm install'
  read -r '?Нажмите Enter для выхода…'
  exit 1
fi
echo 'Откройте в браузере адрес Local, который появится ниже. Для остановки нажмите Ctrl+C.'
"$NODE_BIN" node_modules/vite/bin/vite.js --host 127.0.0.1
