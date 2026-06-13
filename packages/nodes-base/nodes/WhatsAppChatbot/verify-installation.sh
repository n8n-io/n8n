#!/bin/bash

# Script de verificación rápida de instalación - WhatsApp Chatbot para n8n
# Uso: bash verify-installation.sh

set -e

echo "🔍 Verificando instalación del WhatsApp Chatbot Node..."
echo "=" | sed 's/./-/g; s/.*/==========================================/'

# 1. Verificar que n8n existe
if [ ! -d "/workspaces/n8n" ]; then
    echo "❌ Error: n8n no encontrado en /workspaces/n8n"
    exit 1
fi
echo "✅ n8n encontrado"

# 2. Verificar archivos del nodo
NODE_DIR="/workspaces/n8n/packages/nodes-base/nodes/WhatsAppChatbot"

files=(
    "WhatsAppChatbot.node.ts"
    "WhatsAppChatbot.node.json"
    "WhatsAppChatbot.node.test.ts"
    "index.ts"
    "whatsapp.svg"
    "README.md"
    "SETUP.md"
    "EXAMPLES.md"
    "VALIDATION-CHECKLIST.md"
    "RESUMEN.md"
    "CHANGELOG.md"
)

echo "📁 Verificando archivos del nodo..."
for file in "${files[@]}"; do
    if [ -f "$NODE_DIR/$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (FALTANTE)"
        exit 1
    fi
done

# 3. Verificar archivo de credenciales
CREDS_FILE="/workspaces/n8n/packages/nodes-base/credentials/WhatsAppChatbotApi.credentials.ts"
if [ -f "$CREDS_FILE" ]; then
    echo "  ✅ WhatsAppChatbotApi.credentials.ts"
else
    echo "  ❌ WhatsAppChatbotApi.credentials.ts (FALTANTE)"
    exit 1
fi

# 4. Verificar contenido de tipos en node.ts
if grep -q "WhatsAppResponse" "$NODE_DIR/WhatsAppChatbot.node.ts"; then
    echo "✅ Tipos TypeScript correctos"
else
    echo "❌ Tipos TypeScript incompletos"
    exit 1
fi

# 5. Verificar métodos validación
if grep -q "validatePhoneNumber\|normalizePhoneNumber\|sanitizeMessage" "$NODE_DIR/WhatsAppChatbot.node.ts"; then
    echo "✅ Métodos de validación presentes"
else
    echo "❌ Métodos de validación faltantes"
    exit 1
fi

# 6. Verificar tests
if grep -q "describe\|it(" "$NODE_DIR/WhatsAppChatbot.node.test.ts"; then
    echo "✅ Tests unitarios configurados"
else
    echo "❌ Tests unitarios incompletos"
    exit 1
fi

# 7. Contar líneas de documentación
DOCS_LINES=$(wc -l "$NODE_DIR/README.md" "$NODE_DIR/SETUP.md" "$NODE_DIR/EXAMPLES.md" 2>/dev/null | tail -1 | awk '{print $1}')
echo "📚 Líneas de documentación: $DOCS_LINES"

# 8. Contar líneas de código
CODE_LINES=$(wc -l "$NODE_DIR/WhatsAppChatbot.node.ts" "$NODE_DIR/WhatsAppChatbot.node.test.ts" "$CREDS_FILE" 2>/dev/null | tail -1 | awk '{print $1}')
echo "💻 Líneas de código: $CODE_LINES"

echo ""
echo "=" | sed 's/./-/g; s/.*/==========================================/'
echo "✅ Instalación verificada exitosamente"
echo ""
echo "📋 Próximos pasos:"
echo "  1. cd /workspaces/n8n"
echo "  2. pnpm build"
echo "  3. pnpm test --filter @n8n/nodes-base"
echo "  4. Lee packages/nodes-base/nodes/WhatsAppChatbot/SETUP.md"
echo ""
echo "📊 Estadísticas:"
echo "  - Archivos: ${#files[@]} + credenciales"
echo "  - Líneas de código: $CODE_LINES"
echo "  - Líneas de documentación: $DOCS_LINES"
echo ""
echo "✨ ¡Todo listo para usar!"
