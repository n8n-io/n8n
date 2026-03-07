# 🟢 WhatsApp Chatbot Node para n8n

Envía mensajes, configura respuestas automáticas y gestiona historial de conversaciones en WhatsApp de forma segura y profesional.

## ✨ Características

- 📨 **Envío de Mensajes** - Procesa y envía mensajes a WhatsApp directamente
- 🤖 **Respuestas Automáticas** - Detecta palabras clave y responde automáticamente
- 🧠 **IA Integrada** - Compatible con OpenAI para respuestas inteligentes contextualmente
- 💾 **Historial** - Almacena todas las conversaciones en base de datos (si está configurada)
- 🔐 **Seguridad Robusta** - Validación RFC, credenciales encriptadas, manejo de errores
- ⚡ **Rendimiento** - Procesamiento rápido de múltiples mensajes

## 🚀 Operaciones Principales

### 1. Procesar Mensaje
Envía un mensaje a un contacto en WhatsApp.

**Parámetros:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|----------|------------|
| `apiToken` | string | ✅ | Token de acceso de WhatsApp Business API |
| `phoneNumberId` | string | ✅ | ID del número de teléfono comercial |
| `recipientNumber` | string | ✅ | Número del destinatario (+codigopais...) |
| `message` | string | ✅ | Contenido del mensaje (máx 4096 caracteres) |
| `useAI` | boolean | ❌ | Usar IA para procesar respuesta |
| `saveToDb` | boolean | ❌ | Guardar en base de datos |

**Respuesta:**
```json
{
  "success": true,
  "status": "accepted",
  "messageId": "wamid.xxx...",
  "recipientNumber": "+599xxxxxxxxx",
  "messageLength": 45,
  "timestamp": "2026-02-08T21:44:00.000Z",
  "useAI": false,
  "savedToDb": true
}
```

### 2. Configurar Reglas
Establece palabras clave que disparan respuestas automáticas.

**Parámetros:**
| Parámetro | Tipo | Descripción |
|-----------|------|------------|
| `phoneNumberId` | string | ID del número de teléfono comercial |
| `keywords` | string | Palabras clave (una por línea) |
| `autoResponse` | string | Mensaje de respuesta automática |
| `useAI` | boolean | Generar respuesta con IA |

**Respuesta:**
```json
{
  "config": {
    "phoneNumberId": "12345",
    "keywords": ["hola", "ayuda", "precio"],
    "autoResponse": "Gracias por contactarnos...",
    "active": true,
    "useAI": false
  },
  "status": "configurado",
  "keywordCount": 3,
  "timestamp": "2026-02-08T21:44:00.000Z"
}
```

### 3. Obtener Historial
Recupera el historial de conversaciones (estructura lista para integración con BD).

**Parámetros:**
| Parámetro | Tipo | Descripción |
|-----------|------|------------|
| `phoneNumberId` | string | ID del número de teléfono comercial |

## 🔒 Validaciones Incluidas

✅ **Validación de Números** - Formato internacional (+codigopais código área número)
✅ **Normalización** - Limpia automáticamente números con espacios o caracteres especiales
✅ **Sanitización** - Limita mensajes a 4096 caracteres (máximo WhatsApp)
✅ **Extracción Automática** - Lee números desde payload de webhooks
✅ **Manejo de Errores** - Gestión robusta con opción `continueOnFail`

## 📝 Ejemplos de Números Válidos

| Número | País | Válido |
|--------|------|--------|
| `+599xxxxxxxxx` | Curazao | ✅ |
| `+1xxxxxxxxxx` | USA | ✅ |
| `+34xxxxxxxxx` | España | ✅ |
| `+34 xxx xx xx` | España (espacios) | ⚠️ Se normaliza |
| `599xxxxxxxxx` | Sin + | ❌ |

## 🔧 Configuración Rápida

1. **Crea credenciales en n8n:**
   - Ve a "Credentials" → "New"
   - Busca "WhatsApp Chatbot API"
   - Pega tu token de acceso y ID del teléfono

2. **Arrastra el nodo al workflow**

3. **Configura la operación:** Procesar Mensaje, Configurar Reglas, etc.

4. **Prueba:**
   ```
   Webhook → WhatsApp Chatbot → Respuestas
   ```

## 📚 Documentación Completa

- [SETUP.md](./SETUP.md) - Guía paso a paso (8 pasos)
- [EXAMPLES.md](./EXAMPLES.md) - 4 ejemplos prácticos
- [VALIDATION-CHECKLIST.md](./VALIDATION-CHECKLIST.md) - Lista de verificación
- [RESUMEN.md](./RESUMEN.md) - Resumen del proyecto

## 🎯 Casos de Uso

- 📋 **Atención al Cliente** - Responder FAQs automáticamente
- 📅 **Citas** - Confirmaciones automáticas de reservas
- 🛍️ **E-Commerce** - Confirmación de órdenes y actualizaciones de envío
- 📱 **Notificaciones** - Alertas, recordatorios, promociones

## 🐛 Troubleshooting

**Error: Número inválido**
```
Solución: Usa formato +CODIGOPAÍS NÚMERO
Ejemplo: +599xxxxxxxxx (mínimo 1-15 dígitos después del +)
```

**Error: Token inválido**
```
Solución: Verifica que sea token PERMANENTE en Meta Developers
Asegúrate de tener permisos: whatsapp_business_messaging
```

**Webhook no recibe mensajes**
```
Solución:
1. URL debe ser HTTPS
2. URL debe ser accesible desde internet
3. Verify Token debe coincidir en Meta Developers
```

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Versión | 1.0 |
| Líneas de Código | ~330 |
| Tests Unitarios | 40+ |
| Operaciones | 3 |
| Validaciones | 5+ |

## 🔗 Recursos

- [API Oficial de WhatsApp](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta Developers](https://developers.facebook.com/)
- [n8n Documentation](https://docs.n8n.io/)

## ✅ Requisitos

- n8n: 1.0+
- WhatsApp Business Account
- Token de acceso de Meta
- Número de teléfono verificado

## 📄 Licencia

MIT - Libre para usar y modificar

---

**¿Necesitas ayuda?** Consulta la documentación o crea un issue en el repositorio.
