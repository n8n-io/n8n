# Guía de Configuración - WhatsApp Chatbot

## Requisitos Previos

- Cuenta de Meta (Facebook)
- Cuenta de negocio de Meta
- Número de teléfono verificado
- n8n instalado y ejecutándose

## Paso 1: Crear una Aplicación de Meta

1. Dirígete a [Meta Developers](https://developers.facebook.com/)
2. Inicia sesión con tu cuenta
3. Haz clic en **"Mis Aplicaciones"** > **"Crear aplicación"**
4. Selecciona **"Tipo de aplicación"** → **"Negocio"**
5. Completa los detalles:
   - **Nombre de la aplicación**: "Mi Chatbot"
   - **Email de contacto**: tu@email.com
   - **Propósito de la aplicación**: Selecciona las opciones relevantes

## Paso 2: Añadir WhatsApp Business API

1. En tu aplicación, ve a **"Productos"** (lado izquierdo)
2. Busca **"WhatsApp"**
3. Haz clic en **"Configurar"**
4. Selecciona el tipo de integración: **Nube de Meta** o **Proveedor de Soluciones**
5. Completa el formulario de incorporación

## Paso 3: Obtener Credenciales

### 3.1 Token de Acceso

1. Ve a **"Configuración"** > **"Usuarios y Funciones"** > **"Usuarios del Sistema"**
2. Haz clic en **"Agregar"**
3. Completa los detalles del usuario del sistema
4. Selecciona los permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Genera un token de acceso permanente
6. **Copia y guarda este token de forma segura**

### 3.2 ID del Número de Teléfono

1. Ve a **"Configuración"** > **"Panel de Control**"
2. Busca **"Números de teléfono"**
3. Copia el **ID del Número de Teléfono**

### 3.3 ID de la Cuenta de Negocio

1. Ve a **Panel de Control** de tu cuenta de negocio
2. En la sección **"Información general"**, copia tu **ID de Cuenta de Negocio**

## Paso 4: Configurar Webhook (Opcional pero Recomendado)

### 4.1 URL del Webhook

1. Tu webhook debe estar alojado en internet (HTTPS requerido)
2. En n8n, crea un nodo Webhook:

```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "whatsapp-webhook"
  },
  "name": "Webhook"
}
```

3. Esto generará una URL como:
   ```
   https://tu-n8n-instance.com/webhook/whatsapp-webhook
   ```

### 4.2 Registrar Webhook en Meta

1. Ve a **"Configuración"** > **"Webhooks"**
2. Haz clic en **"Editar"**
3. Ingresa tu URL del webhook
4. Ingresa el **Verify Token** (puedes inventar uno, ej: `my_secure_token_123`)
5. Selecciona los eventos a recibir:
   - ✅ `messages`
   - ✅ `message_status`
   - ✅ `message_template_status_update`

### 4.3 Verificar Webhook en n8n

Agregar validación en tu nodo Webhook:

```javascript
// En el webhook, validar el token
if (req.query['hub.verify_token'] !== 'my_secure_token_123') {
  return 403; // Prohibido
}
return req.query['hub.challenge'];
```

## Paso 5: Configurar el Nodo en n8n

### 5.1 Via Interfaz de Usuario

1. En n8n, crea un nuevo workflow
2. Busca **"WhatsApp Chatbot"**
3. Configura los parámetros:
   - **Token de API**: Pega el token del Paso 3.1
   - **ID del Teléfono**: Pega el ID del Paso 3.2

### 5.2 Via JSON (Recomendado para Seguridad)

Usa variables de entorno:

```json
{
  "parameters": {
    "operation": "processMessage",
    "apiToken": "{{ $env.WHATSAPP_API_TOKEN }}",
    "phoneNumberId": "{{ $env.WHATSAPP_PHONE_ID }}",
    "recipientNumber": "+599xxxxxxx",
    "message": "Hola desde n8n!"
  }
}
```

En tu archivo `.env`:

```bash
WHATSAPP_API_TOKEN=your_token_here
WHATSAPP_PHONE_ID=1234567890
```

## Paso 6: Prueba de Conexión

### 6.1 Prueba Manual

1. En el workflow, agrega un nodo de prueba:

```json
{
  "parameters": {
    "operation": "processMessage",
    "message": "Mensaje de prueba"
  }
}
```

2. Haz clic en **"Test"** (símbolo de play)
3. Verifica que recibas respuesta sin errores

### 6.2 Prueba de Webhook

1. Usa `curl` desde tu terminal para simular un mensaje:

```bash
curl -X POST https://tu-n8n-instance.com/webhook/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "599xxxxxxx",
            "type": "text",
            "text": { "body": "Hola!" }
          }]
        }
      }]
    }]
  }'
```

## Paso 7: Crear Workflow Completo

### Ejemplo Básico:

```
1. Webhook (recibe mensaje de WhatsApp)
   ↓
2. Set (extrae información)
   ↓
3. WhatsApp Chatbot (procesa y responde)
   ↓
4. Log (registra la transacción)
```

### JSON del Workflow:

```json
{
  "nodes": [
    {
      "parameters": { "httpMethod": "POST", "path": "whatsapp" },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "parameters": {
        "operation": "processMessage",
        "apiToken": "{{ $env.WHATSAPP_API_TOKEN }}",
        "phoneNumberId": "{{ $env.WHATSAPP_PHONE_ID }}",
        "recipientNumber": "={{ $json.entry[0].changes[0].value.messages[0].from }}",
        "message": "Gracias por tu mensaje. Nos contactaremos contigo pronto."
      },
      "name": "WhatsApp Chatbot",
      "type": "n8n-nodes-base.whatsAppChatbot"
    }
  ],
  "connections": {
    "Webhook": { "main": [["WhatsApp Chatbot"]] }
  }
}
```

## Paso 8: Configuración Avanzada

### 8.1 Respuestas Dinámicas

```json
{
  "operation": "processMessage",
  "message": "={{ 'Hola ' + $json.contact.name + '!' }}"
}
```

### 8.2 Escalado con Cola de Menajes

```json
{
  "parameters": {
    "operation": "processMessage",
    "saveToDb": true,
    "useAI": true
  }
}
```

### 8.3 Integración con OpenAI

```
Webhook → OpenAI → WhatsApp Chatbot
```

## Solución de Problemas

### ❌ "Token inválido"
- Verifica que el token no haya expirado
- Genera uno nuevo en la consola del developer
- Asegúrate de que tenga los permisos correctos

### ❌ "Número de teléfono inválido"
- Formato requerido: `+codigopais número` (ej: `+599xxxxxxx`)
- El teléfono debe estar registrado en el número comercial

### ❌ "Webhook no recibe mensajes"
- Verifica que el URL sea HTTPS (HTTP no soportado)
- Comprueba que el servidor sea accesible desde internet
- Revisa los logs de Meta en "Información del Webhook"

### ❌ "Mensajes no enviados"
- Verifica los logs de n8n
- Revisa la consola de Meta para errores de API
- Asegúrate de que el cliente haya marcado el número como contacto

## Mejores Prácticas

🔒 **Seguridad**
- Nunca guardes tokens en código
- Usa variables de entorno
- Rotea los tokens regularmente
- Autentica webhooks con verificación de tokens

🚀 **Rendimiento**
- Usa una cola para procesar muchos mensajes
- Implementa rate limiting
- Cachea respuestas frecuentes

📊 **Monitoreo**
- Registra todos los mensajes
- Monitorea errores de API
- Mantén estadísticas de uso

## Recursos Útiles

- [Documentación de WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Guía de Webhooks de Meta](https://developers.facebook.com/docs/whatsapp/webhooks)
- [Códigos de Error de WhatsApp](https://developers.facebook.com/docs/whatsapp/reference/errors)
- [Límites de Tasa (Rate Limiting)](https://developers.facebook.com/docs/graph-api/overview#rate-limiting)

## Soporte

Para reportar problemas:
1. Abre un issue en el repositorio de n8n
2. Incluye: versión de n8n, logs de error, pasos para reproducir
3. No incluyas tokens o información sensible
