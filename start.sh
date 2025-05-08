    #!/bin/sh
    set -e

    # N8N_PORT es la variable que n8n internamente usa para saber en qué puerto escuchar.
    # PORT es la variable estándar que Cloud Run provee y espera que la aplicación escuche.
    export N8N_PORT=${PORT}

    # Iniciar n8n
    exec node /home/n8n/packages/cli/bin/n8n start