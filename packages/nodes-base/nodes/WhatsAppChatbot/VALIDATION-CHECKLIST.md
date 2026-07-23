# ✅ Checklist de Validación - WhatsApp Chatbot

Usa este checklist para asegurar que todo está configurado correctamente.

## 📋 Pre-Requisitos

- [ ] Cuenta de Meta activa
- [ ] Cuenta de negocio en Meta
- [ ] Número de teléfono verificado
- [ ] n8n instalado y ejecutándose
- [ ] Acceso a https://developers.facebook.com/
- [ ] Acceso a editor de código (VS Code o similar)

## 🔐 Configuración de Credenciales

### Meta/WhatsApp

- [ ] Token de acceso generado en Meta Developers
- [ ] Token de acceso permanente (no temporal)
- [ ] Token copiado en variable de entorno `WHATSAPP_API_TOKEN`
- [ ] ID del número de teléfono obtenido
- [ ] ID copiado en variable de entorno `WHATSAPP_PHONE_ID`
- [ ] ID de cuenta de negocio guardado
- [ ] Token de webhook generado (si aplica)

### Archivo .env

- [ ] Archivo `.env` creado en la raíz del proyecto
- [ ] Todas las variables de entorno completadas
- [ ] Archivo `.env` agregado a `.gitignore`
- [ ] No hay tokens guardados en código fuente

### Credenciales en n8n

- [ ] Credencial "WhatsApp Chatbot API" creada en n8n
- [ ] Token válido ingresado
- [ ] Phone ID válido ingresado
- [ ] Credencial probada exitosamente

## 📦 Instalación del Nodo

- [ ] Carpeta `WhatsAppChatbot` creada en `packages/nodes-base/nodes/`
- [ ] Archivo `WhatsAppChatbot.node.ts` presente
- [ ] Archivo `index.ts` presente con export correcto
- [ ] Archivo `WhatsAppChatbot.node.json` presente
- [ ] Archivo `whatsapp.svg` presente
- [ ] Archivo `credentials/WhatsAppChatbotApi.credentials.ts` presente

### Compilación

- [ ] Código compila sin errores: `pnpm build`
- [ ] Tests pasan: `pnpm test`
- [ ] No hay advertencias de tipo en TypeScript
- [ ] No hay errores de ESLint

## 🧪 Pruebas Básicas

### En n8n

- [ ] Nodo "WhatsApp Chatbot" aparece en la lista de nodos
- [ ] Nodo tiene el ícono verde correcto
- [ ] Se puede arrastrar al canvas
- [ ] Se puede seleccionar operación "Procesar Mensaje"
- [ ] Se puede seleccionar operación "Configurar Reglas"
- [ ] Se puede seleccionar operación "Obtener Historial"

### Configuración

- [ ] Se puede ingresar Token de API
- [ ] Se puede ingresar ID de teléfono
- [ ] Se puede ingresar número destinatario
- [ ] Se puede ingresar mensaje de prueba
- [ ] No hay errores de validación

### Ejecución

- [ ] El nodo ejecuta sin errores
- [ ] Respuesta incluye información de status
- [ ] Respuesta incluye timestamp
- [ ] Respuesta incluye datos del mensaje

## 🔗 Webhook (Opcional)

- [ ] URL del webhook es HTTPS
- [ ] URL del webhook es accesible desde internet
- [ ] Webhook v registrado en Meta Developers
- [ ] Verify Token coincide en Meta y en n8n
- [ ] Webhook recibe mensajes de prueba
- [ ] Webhook procesa correctamente

## 🤖 Prueba de Mensaje

### Envío Manual

- [ ] Puedes enviar un mensaje de prueba manualmente
- [ ] Mensaje se envía sin errores
- [ ] Respuesta llega al número especificado
- [ ] Timestamp es correcto
- [ ] Status es "enviado"

### Webhook

- [ ] Webhook recibe mensaje entrante
- [ ] Nodo procesa mensaje correctamente
- [ ] Respuesta automática se envía
- [ ] Respuesta llega dentro de 1-2 segundos
- [ ] No hay errores en logs

## 💾 Base de Datos (Si Aplica)

- [ ] BD correctamente configurada
- [ ] Conexión a BD probada
- [ ] Tabla `whatsapp_conversations` creada
- [ ] Schema de tabla es correcto
- [ ] Mensajes se guardan correctamente
- [ ] Historial se puede recuperar

## 🧠 Integración con IA (Si Aplica)

- [ ] OpenAI API key configurada
- [ ] Modelo OpenAI seleccionado
- [ ] `useAI: true` en parámetros
- [ ] Respuestas generadas por IA son coherentes
- [ ] Latencia es aceptable (< 5 segundos)

## 📊 Monitoreo y Logging

- [ ] Logs de n8n muestran ejecuciones
- [ ] Errores se registran correctamente
- [ ] Puedes ver status de cada mensaje
- [ ] Historial de conversaciones está disponible
- [ ] Estadísticas se pueden extraer

## 🔒 Seguridad

- [ ] Tokens no están en código fuente
- [ ] Tokens están en variables de entorno
- [ ] Credenciales están encriptadas en n8n
- [ ] Webhook verifica tokens correctamente
- [ ] Rate limiting está configurado
- [ ] Validación de entrada en lugar

## 🚀 Rendimiento

- [ ] Tiempo de respuesta < 2 segundos (sin IA)
- [ ] Tiempo de respuesta < 5 segundos (con IA)
- [ ] No hay memory leaks
- [ ] CPU usage es normal
- [ ] Puede procesar múltiples mensajes simultáneamente

## 📝 Documentación

- [ ] README.md leído
- [ ] SETUP.md completado
- [ ] EXAMPLES.md revisados
- [ ] .env.example entendido
- [ ] example-workflow.json importado y probado

## 🐛 Troubleshooting Completado

- [ ] Revisaste errores comunes en SETUP.md
- [ ] Logs no muestran errores no controlados
- [ ] Webhook funciona correctamente
- [ ] Credenciales son válidas
- [ ] Números de teléfono tienen formato correcto

## ✨ Final

- [ ] Todo funciona como se espera
- [ ] Puedes enviar mensajes exitosamente
- [ ] Puedes recibir mensajes en webhook (si aplica)
- [ ] Respuestas automáticas funcionan
- [ ] Base de datos guarda historial

## 📞 Próximos Pasos

Una vez marcados todos los checkboxes:

1. ✅ Integra con tu aplicación
2. ✅ Configura casos de uso específicos
3. ✅ Monitorea y optimiza
4. ✅ Escala según sea necesario
5. ✅ Mantén y actualiza

---

## 🆘 Si Algo No Funciona

### Errores Comunes y Soluciones

**Error: "Token inválido"**
```bash
# 1. Verifica el token en Meta Developers
# 2. Asegúrate de que tiene permisos: whatsapp_business_messaging
# 3. Regenera el token
# 4. Actualiza en variables de entorno
```

**Error: "Número inválido"**
```bash
# 1. Valida el formato: +codigopais numero
# 2. Ejemplo correcto: +599xxxxxxx
# 3. Asegúrate que esté registrado en el número comercial
```

**Error: "Webhook no recibe mensajes"**
```bash
# 1. Verifica URL del webhook es HTTPS
# 2. Comprueba accesibilidad desde internet
# 3. Verifica Verify Token en Meta Developers
# 4. Revisa logs de Meta para errores
```

**Error: "Conexión a BD falla"**
```bash
# 1. Verifica conexión a BD
# 2. Comprueba credenciales DB
# 3. Valida que tabla existe
# 4. Verifica permisos de usuario DB
```

### Logs para Debug

Busca estos archivos:
- n8n logs: `/path/to/n8n/logs.txt`
- Sistema: Ver en consola de Meta Developers
- BD: Ver logs del servidor de BD

---

**¡Felicidades! Tu WhatsApp Chatbot está listo para producción.** 🎉
