#!/bin/sh
# Este script garante a compatibilidade entre o n8n e o ambiente do Google Cloud Run.

# O Cloud Run define a variável de ambiente $PORT para informar ao contêiner
# em qual porta ele deve escutar. O n8n, por outro lado, usa a variável N8N_PORT.
# Este bloco verifica se $PORT existe e, se existir, mapeia seu valor para N8N_PORT.
if; then
  export N8N_PORT=$PORT
fi

# Após o mapeamento da porta, este comando executa o script de entrada original
# da imagem do n8n. Isso é crucial para garantir que toda a lógica de inicialização
# padrão do n8n (como configuração de banco de dados, etc.) seja executada normalmente.
# O 'exec' substitui o processo do shell pelo processo do n8n, o que é uma boa prática.
exec /usr/local/bin/docker-entrypoint.sh
