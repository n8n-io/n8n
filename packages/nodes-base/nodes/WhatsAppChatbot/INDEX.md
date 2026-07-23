# 📚 Índice - WhatsApp Chatbot para n8n

Bienvenido. Aquí encontrarás todo lo que necesitas para integrar WhatsApp Business API en tus flujos de trabajo de n8n.

## 🚀 Empezar Ahora

**Si estás apurado** (5 minutos):
→ Lee [INICIO-RAPIDO.md](./INICIO-RAPIDO.md)

**Si prefieres hacerlo paso a paso** (15 minutos):
→ Lee [GUIA-RAPIDA.md](./GUIA-RAPIDA.md)

**Si necesitas completitud** (30 minutos):
→ Lee [SETUP.md](./SETUP.md)

---

## 📖 Documentación Completa

### 🎯 Guías de Inicio
| Documento | Duración | Nivel | Contenido |
|-----------|----------|--------|-----------|
| [INICIO-RAPIDO.md](./INICIO-RAPIDO.md) | 5 min | Principiante | Setup mínimo y pruebas |
| [GUIA-RAPIDA.md](./GUIA-RAPIDA.md) | 15 min | Principiante | Todo lo esencial |
| [SETUP.md](./SETUP.md) | 30 min | Intermedio | Configuración completa |

### 📋 Referencias
| Documento | Contenido |
|-----------|-----------|
| [README.md](./README.md) | Documentación técnica del nodo |
| [CHECKLIST.md](./CHECKLIST.md) | Estado y verificación |
| [MEJORAS-COMPLETAS.md](./MEJORAS-COMPLETAS.md) | Cambios implementados |
| [CHANGELOG.md](./CHANGELOG.md) | Historial de versiones |

### 💻 Ejemplos
| Archivo | Descripción |
|---------|-------------|
| [ejemplo-flujo-completo.json](./ejemplo-flujo-completo.json) | Flujo de trabajo práctico |
| [example-workflow.json](./example-workflow.json) | Alternativa de flujo |
| [.env.example](./.env.example) | Variables de entorno |

### 🛠️ Utilidades
| Archivo | Uso |
|---------|-----|
| [test-chatbot.sh](./test-chatbot.sh) | Validar instalación |
| [verify-installation.sh](./verify-installation.sh) | Verificar archivos |
| [install.sh](./install.sh) | Instalación automática |

---

## 🎓 Rutas de Aprendizaje

### 1️⃣ Ruta Rápida (5 min)
```
INICIO-RAPIDO.md
    ↓
Configura en n8n
    ↓
Envía primer mensaje
```

### 2️⃣ Ruta Estándar (20 min)
```
GUIA-RAPIDA.md
    ↓
SETUP.md (Paso 3: Obtener Credenciales)
    ↓
n8n → Nuevo nodo → Configurar
    ↓
Prueba → Soluciona errores
    ↓
Importa ejemplo-flujo-completo.json
```

### 3️⃣ Ruta Avanzada (1 hora)
```
README.md
    ↓
SETUP.md (Todos los pasos)
    ↓
Revisa el código en WhatsAppChatbot.node.ts
    ↓
Integra con tus sistemas
    ↓
Personaliza operaciones
```

---

## ❓ Preguntas Frecuentes

### P: ¿Cuánto tiempo tarda la configuración?
**R:** Entre 5-30 minutos dependiendo de tu experiencia

### P: ¿Necesito experiencia programando?
**R:** No. Solo necesitas obtener credenciales de Meta y configurarlas en n8n

### P: ¿Cuáles son los costos?
**R:** WhatsApp tiene planes gratuitos y de pago. Primeros 1000 mensajes suelen ser gratis

### P: ¿Puedo recibir mensajes también?
**R:** Sí, próxima actualización incluirá webhooks para mensajes entrantes

### P: ¿Puedo enviar imágenes?
**R:** Próxima actualización lo incluirá

---

## 🔧 Tres Operaciones Principales

### 1. Procesar Mensaje
Envía un mensaje de texto a un contacto

**Configuración:**
- Token de API ✅
- ID del Número de Teléfono ✅
- Número del Destinatario ✅
- Contenido del Mensaje ✅

**Ejemplo:**
```json
{
  "operation": "processMessage",
  "message": "¡Hola desde n8n!"
}
```

### 2. Configurar Reglas
Define palabras clave que disparen respuestas automáticas

**Configuración:**
- Token ✅
- Palabras clave (una por línea) ✅
- Respuesta automática ✅

**Ejemplo:**
```
Keywords: hola, ayuda, horario
Response: Gracias, te atenderemos pronto
```

### 3. Obtener Historial
Prepara la estructura para el historial de conversaciones

---

## ✅ Checklist de Instalación

- [ ] Acceda a Meta Developers
- [ ] Obtuve mi Token de API
- [ ] Obtuve mi Phone Number ID
- [ ] Instalé n8n
- [ ] Añadí el nodo WhatsApp Chatbot
- [ ] Configuré las credenciales
- [ ] Realicé un test
- [ ] Importé un flujo de ejemplo
- [ ] Envié mi primer mensaje

---

## 🆘 Soporte

### Si algo no funciona:

1. **Token inválido**
   → Regenera en Developer Console
   → Ve a [SETUP.md › Paso 3](./SETUP.md#paso-3-obtener-credenciales)

2. **Número no válido**
   → Usa formato: +codigopais sin espacios
   → Ej: +599123456789

3. **No encuentra el nodo**
   → Reconstruye n8n: `npm run build`
   → Reinicia: `npm start`

4. **Otros errores**
   → Revisa [SETUP.md › Solución de Problemas](./SETUP.md#solución-de-problemas)

---

## 🎯 Siguientes Pasos Después de Setup

1. ✅ Enviar tu primer mensaje
2. 📧 Integrar con Gmail
3. 📊 Guardar historial en BD
4. 🤖 Agrupar con IA (OpenAI)
5. 🔔 Crear notificaciones automáticas

---

## 📊 Información Técnica

- **Versión**: 1.0
- **Compatible con**: n8n v0.190+
- **API**: WhatsApp Cloud API v18.0
- **Lenguaje**: TypeScript
- **Soporte**: WhatsApp Business API

---

## 🚀 Comenzar

**¿Listo?** Elige tu ruta:

- 🏃 [Rápido: 5 minutos](./INICIO-RAPIDO.md)
- 🚶 [Normal: 15 minutos](./GUIA-RAPIDA.md)
- 🧗 [Completo: 30 minutos](./SETUP.md)

---

*Última actualización: Febrero 2024*
