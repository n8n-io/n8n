# ✅ Setup Mínimo - WhatsApp Chatbot en 5 minutos

## Lo que necesitas

| Item | Dónde obtenerlo |
|------|-----------------|
| **Token de API** | Facebook Developers Console |
| **ID del Número** | WhatsApp Business Manager |
| **n8n instalado** | Tu máquina o servidor |

## 1️⃣ Obtener Credenciales (5 min)

```bash
# Ve a https://developers.facebook.com/

# En "Mis Aplicaciones" → Tu App → WhatsApp
# Copia:
# - Token de Acceso (Permanente)
# - ID del Número de Teléfono

echo "WHATSAPP_API_TOKEN=EWBUU..." >> .env
echo "WHATSAPP_PHONE_ID=1234567890" >> .env
```

## 2️⃣ Configurar en n8n (1 min)

1. Abre n8n
2. Nuevo flujo → Busca "WhatsApp Chatbot"
3. Rellena los campos

## 3️⃣ Prueba Rápida (1 min)

En el nodo, configura:

```
Operación: Procesar Mensaje
Token: {{ $env.WHATSAPP_API_TOKEN }}
Número Phone: {{ $env.WHATSAPP_PHONE_ID }}
Destino: +599xxxxxxxxx (tu número)
Mensaje: ¡Hola desde n8n!
```

Click "Test" → ¡Listo!

## 4️⃣ Envío Automático (2 min)

Conecta un trigger:

```
Webhook → WhatsApp → Email
```

Cuando recibas un mensaje, envía una respuesta automática.

## ❌ Errores Comunes

| Error | Solución |
|-------|----------|
| `Token inválido` | Regenera en Developer Console |
| `Número no válido` | Usa +codigopais sin espacios |
| `Request failed` | Verifica conexión a internet |

## ✅ Checklist

- [ ] Token obtenido
- [ ] Nodo añadido en n8n
- [ ] Credenciales rellenadas
- [ ] Mensaje de prueba enviado
- [ ] Respuesta automática configurada

---

📖 Para más: [Leer GUIA-RAPIDA.md](./GUIA-RAPIDA.md)
