# Ejemplos de Uso - WhatsApp Chatbot

## Ejemplo 1: Respuesta Automática Simple

Este workflow recibe un webhook y envía una respuesta automática.

### Estructura del Workflow:

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "whatsapp-webhook"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1
    },
    {
      "parameters": {
        "operation": "processMessage",
        "apiToken": "{{ $env.WHATSAPP_API_TOKEN }}",
        "phoneNumberId": "{{ $env.WHATSAPP_PHONE_ID }}",
        "recipientNumber": "={{ $json.sender }}",
        "message": "Hola! Gracias por contactarnos. Un agente te responderá pronto."
      },
      "name": "WhatsApp Chatbot",
      "type": "n8n-nodes-base.whatsAppChatbot",
      "typeVersion": 1
    }
  ]
}
```

## Ejemplo 2: Respuestas Basadas en Palabras Clave

Detecta palabras clave y responde automáticamente.

### Lógica:

1. **Webhook** recibe el mensaje
2. **Condicional** verifica si contiene palabras clave
3. **WhatsApp Chatbot** envía respuesta específica

### Pseudocódigo:

```javascript
// Configurar palabras clave
const keywords = {
  "hola": "¡Hola! ¿Cómo estás?",
  "ayuda": "Estamos aquí para ayudarte. ¿Cuál es tu pregunta?",
  "horario": "Atendemos de lunes a viernes, 9am a 6pm",
  "precio": "Te enviaré nuestra lista de precios"
};

// Detectar palabra clave y responder
if (keywords[messageText.toLowerCase()]) {
  sendWhatsAppMessage(keywords[messageText.toLowerCase()]);
}
```

## Ejemplo 3: Con IA (OpenAI)

Combina WhatsApp Chatbot con IA para respuestas inteligentes.

### Workflow:

1. **Webhook** → recibe mensaje
2. **WhatsApp Chatbot** → "processMessage" con `useAI: true`
3. **OpenAI** → genera respuesta inteligente basada en contexto
4. **WhatsApp Chatbot** → envía respuesta IA

### Parámetros:

```json
{
  "operation": "processMessage",
  "apiToken": "{{ $env.WHATSAPP_API_TOKEN }}",
  "useAI": true,
  "message": "{{ $node['OpenAI'].json.text }}"
}
```

## Ejemplo 4: Guardar Historial

Guarda automáticamente el historial en una base de datos.

### Estructura:

```javascript
// Después de procesar el mensaje
const messages = {
  phoneNumberId: "{{ $json.phoneNumberId }}",
  message: "{{ $json.message }}",
  sender: "{{ $json.sender }}",
  timestamp: new Date(),
  response: "{{ $json.response }}",
  saveToDb: true
};

// Guardar en PostgreSQL, MongoDB, etc.
await database.save('conversations', messages);
```

## Configuración Recomendada de Credenciales

Crea variables de entorno para mayor seguridad:

```bash
# .env
WHATSAPP_API_TOKEN=your_token_here
WHATSAPP_PHONE_ID=1234567890
WHATSAPP_WEBHOOK_TOKEN=secure_webhook_token
```

Úsalas en los nodos:

```
"apiToken": "={{ $env.WHATSAPP_API_TOKEN }}"
```

## Casos de Uso

### 📋 Atención al Cliente
- Responder preguntas frecuentes
- Confirmaciones de pedidos
- Notificaciones de estado

### 📅 Citas y Reservas
- Confirmar citas automáticamente
- Recordatorios antes de la cita
- Cancelaciones

### 🛍️ E-commerce
- Confirmación de órdenes
- Actualizaciones de envío
- Ofertas personalizadas

### 📱 Notificaciones
- Alertas de sistema
- Promociones
- Recordatorios

## Integración con Otros Servicios

El nodo se puede combinar con:

- **Stripe**: Para pagos
- **Twilio**: Para telecomunicaciones
- **Airtable**: Para base de datos
- **Zapier**: Para integraciones externas
- **Google Sheets**: Para registros
- **OpenAI**: Para respuestas con IA

## Troubleshooting

### Error: "Token de API inválido"
- Verifica que el token sea correcto en Meta Developers
- Asegúrate de que el token tenga permisos para WhatsApp

### Mensajes no se envían
- Valida el formato del número de teléfono (+código país...)
- Verifica que el número esté registrado en el número de teléfono comercial

### Webhook no recibe mensajes
- Configura correctamente la URL del webhook en Meta Developers
- Verifica que el servidor sea accesible desde internet

## API Reference

### Método: processMessage

Envía un mensaje a través de WhatsApp.

**Request:**
```json
{
  "messaging_product": "whatsapp",
  "to": "+599xxxxxxxxx",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "Tu mensaje aquí"
  }
}
```

**Response:**
```json
{
  "messages": [
    {
      "id": "wamid.xxxxx...",
      "message_status": "accepted"
    }
  ],
  "contacts": [
    {
      "input": "+599xxxxxxxxx",
      "wa_id": "599xxxxxxxxx"
    }
  ]
}
```

## Próximas Versiones

Características planeadas para futuras versiones:

- ✅ Envío de imágenes y documentos
- ✅ Plantillas de mensajes
- ✅ Botones interactivos
- ✅ Listas de selección
- ✅ Análisis de conversaciones
- ✅ Integración con CRM
