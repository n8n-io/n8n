# 🚀 Guía Rápida - WhatsApp Chatbot para n8n

## 📋 5 Pasos Rápidos para Comenzar

### Paso 1: Obtén tus Credenciales de WhatsApp
1. Ve a https://developers.facebook.com/
2. Crea una aplicación de negocio
3. Configura WhatsApp Business API
4. Obtén:
   - **Token de Acceso**: Permanente (no expira)
   - **ID del Número de Teléfono**: Identificador único

### Paso 2: Configura n8n
1. Abre n8n
2. Crea un nuevo flujo de trabajo
3. Busca "WhatsApp Chatbot"
4. Añade el nodo

### Paso 3: Añade tus Credenciales
En el nodo WhatsApp Chatbot:
- **Token de API**: Tu token permanente de Meta
- **ID del Número de Teléfono**: El ID de tu número registrado

### Paso 4: Configurar Operación
Elige una operación:
- **Procesar Mensaje**: Envía un mensaje
- **Configurar Reglas**: Define respuestas automáticas
- **Obtener Historial**: Carga conversaciones previas

### Paso 5: Prueba
1. Haz clic en "Test"
2. Revisa la respuesta
3. Si es exitoso, activa el flujo

## 💬 Enviar tu Primer Mensaje

```json
{
  "operation": "processMessage",
  "phoneNumberId": "1234567890123456",
  "recipientNumber": "+599xxxxxxxxx",
  "message": "¡Hola desde n8n!"
}
```

**Resultado esperado:**
```json
{
  "success": true,
  "status": "sent",
  "messageId": "wamid.xxx",
  "timestamp": "2024-02-08T10:30:00.000Z"
}
```

## 🤖 Configurar Respuestas Automáticas

```json
{
  "operation": "configureRules",
  "phoneNumberId": "1234567890123456",
  "keywords": "hola\nayuda\nhorario",
  "autoResponse": "Gracias por tu mensaje. Te atenderemos en breve."
}
```

## ⚙️ Variables de Entorno (Recomendado)

En `.env`:
```bash
WHATSAPP_API_TOKEN=your_token_here
WHATSAPP_PHONE_ID=your_phone_id_here
```

En el nodo:
```
Token: {{ $env.WHATSAPP_API_TOKEN }}
ID:    {{ $env.WHATSAPP_PHONE_ID }}
```

## ❌ Solución de Problemas

| Problema | Solución |
|----------|-----------|
| "Token inválido" | Verifica tu token en Facebook Developers |
| "Número no válido" | Usa formato: `+codigopais numero` (sin espacios) |
| "Número no registrado" | Registra el número en WhatsApp Business Manager |
| "Límite de mensajes" | WhatsApp tiene rate limiting por hora |

## 📚 Próximos Pasos

- ✅ Enviar mensajes simples
- ⬜ Recibir mensajes (Webhooks)
- ⬜ Enviar imágenes/videos
- ⬜ Integración con IA (OpenAI)
- ⬜ Guardar en base de datos

## 🔗 Enlaces Útiles

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [n8n Documentation](https://docs.n8n.io)
- [Meta Developers](https://developers.facebook.com)

---
¿Necesitas ayuda? Revisa `README.md` para más detalles.
