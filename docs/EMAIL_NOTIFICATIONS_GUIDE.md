# Guía de Notificaciones por Correo Electrónico

## 📧 Descripción General

El sistema de gestión de licencias Zoom ahora incluye un completo sistema de notificaciones por correo electrónico que automatiza la comunicación con docentes y administradores.

## ✨ Características Implementadas

### 1. **Notificaciones de Expiración** ⏰
- Se envían automáticamente a los docentes antes de que expire su licencia
- El tiempo de aviso es configurable (por defecto: 2 días antes)
- Incluye toda la información relevante de la asignación

### 2. **Confirmación de Asignación** ✅
- Se envía cuando un administrador aprueba una solicitud
- Incluye credenciales de acceso (email y contraseña)
- Contiene fechas de inicio y fin de la licencia

### 3. **Notificación de Solicitudes Pendientes** 📋
- Alerta a los administradores cuando un docente crea una nueva solicitud
- Incluye detalles del solicitante y período requerido
- Configurable (puede desactivarse)

### 4. **Notificación de Cambio de Contraseña** 🔐
- Informa a administradores cuando se rotan contraseñas automáticamente
- Incluye la nueva contraseña generada
- Configurable (puede desactivarse)

## 🔧 Configuración

### Configuración SMTP

Accede a **Panel de Administración → Configuración → Configuración de Correo Electrónico**

#### Parámetros Requeridos:

1. **🌐 Servidor SMTP**
   - Ejemplo: `smtp.gmail.com`
   - Debe ser un servidor SMTP válido

2. **🔌 Puerto SMTP**
   - Puerto 587 para TLS (recomendado)
   - Puerto 465 para SSL
   - Puerto 25 para sin cifrado (no recomendado)

3. **🔒 Usar SSL/TLS**
   - Activar si usas puerto 465
   - Desactivar para puerto 587 (usa STARTTLS)

4. **👤 Usuario SMTP**
   - Tu dirección de correo completa
   - Ejemplo: `sistema@awakelab.cl`

5. **🔑 Contraseña SMTP**
   - Contraseña de la cuenta de correo
   - Para Gmail: usar "Contraseña de aplicación"
   - Se almacena de forma segura en la base de datos

6. **📤 Remitente**
   - Nombre y correo que aparecerá como remitente
   - Formato: `Nombre <correo@dominio.com>`
   - Ejemplo: `Sistema de Licencias Zoom <noreply@awakelab.cl>`

7. **👥 Correos Administradores**
   - Lista de correos separados por comas
   - Ejemplo: `admin1@awakelab.cl, admin2@awakelab.cl`
   - Recibirán notificaciones administrativas

#### Configuración de Notificaciones:

8. **📧 Notificar Expiración**
   - Activar/desactivar avisos de expiración a docentes
   - Si está desactivado, no se enviarán correos

9. **🔐 Notificar Cambio de Contraseña**
   - Enviar correo a admins cuando se rotan contraseñas
   - Útil para auditoría

10. **📋 Notificar Nuevas Solicitudes**
    - Alertar a admins de solicitudes pendientes
    - Permite respuesta rápida a docentes

### Ejemplo de Configuración con Gmail

```
Servidor SMTP: smtp.gmail.com
Puerto SMTP: 587
Usar SSL/TLS: Desactivado (usa STARTTLS)
Usuario SMTP: sistema@awakelab.cl
Contraseña SMTP: [Contraseña de aplicación de Google]
Remitente: Sistema de Licencias Zoom <sistema@awakelab.cl>
Correos Administradores: admin1@awakelab.cl, admin2@awakelab.cl
```

**⚠️ Importante para Gmail:**
1. Habilitar "Verificación en dos pasos" en tu cuenta Google
2. Ir a https://myaccount.google.com/apppasswords
3. Generar una "Contraseña de aplicación" para "Correo"
4. Usar esa contraseña generada (no tu contraseña normal)

### Ejemplo de Configuración con Office 365

```
Servidor SMTP: smtp.office365.com
Puerto SMTP: 587
Usar SSL/TLS: Desactivado (usa STARTTLS)
Usuario SMTP: sistema@awakelab.cl
Contraseña SMTP: [Contraseña de la cuenta]
Remitente: Sistema de Licencias Zoom <sistema@awakelab.cl>
Correos Administradores: admin1@awakelab.cl, admin2@awakelab.cl
```

## 🧪 Probar Configuración

1. Ve a **Panel de Administración → Configuración**
2. Desplázate a la sección **"Configuración de Correo Electrónico"**
3. Busca el recuadro **"🧪 Probar Configuración de Correo"**
4. Ingresa un correo electrónico de prueba
5. Haz clic en **"📧 Enviar Correo de Prueba"**
6. Verifica que el correo llegue correctamente

Si el correo no llega:
- ✅ Verifica los datos de configuración SMTP
- ✅ Revisa la carpeta de spam
- ✅ Asegúrate de que el servidor permita SMTP
- ✅ Revisa los logs del servidor backend

## 📨 Tipos de Correos

### 1. Confirmación de Asignación

**Cuándo se envía:** Cuando un administrador asigna una licencia a una solicitud pendiente

**Destinatario:** Docente que solicitó la licencia

**Contenido:**
- ✅ Email de la licencia asignada
- 📅 Fechas de inicio y fin
- 🖥️ Plataforma (Zoom)
- 🔐 Contraseña de acceso
- ⚠️ Advertencias importantes

**Ejemplo de contenido:**
```
¡Hola Juan Pérez!

Tu solicitud de licencia de Zoom ha sido aprobada.

Email de la Licencia: profesor001@awakelab.cl
Fecha de Inicio: 15/01/2024
Fecha de Fin: 31/01/2024
Plataforma: Zoom

Contraseña: Abc123!@#

Importante:
- La licencia estará activa hasta la fecha de fin indicada
- Después de esa fecha, la contraseña será cambiada automáticamente
- Si necesitas extender el período, contacta al administrador
```

### 2. Aviso de Expiración

**Cuándo se envía:** N días antes de la fecha de fin (configurable, por defecto 2 días)

**Destinatario:** Docente con la licencia asignada

**Contenido:**
- ⏰ Días restantes
- 📧 Email de la licencia
- 📅 Fecha de expiración
- 🔒 Qué sucederá después
- ❓ Cómo extender

**Ejemplo de contenido:**
```
¡Hola Juan Pérez!

Tu licencia de Zoom está por expirar en 2 días.

Email de la Licencia: profesor001@awakelab.cl
Fecha de Expiración: 31/01/2024

¿Qué sucederá después de la expiración?
- La contraseña será cambiada automáticamente por seguridad
- No podrás acceder a la cuenta después de la fecha
- La licencia quedará disponible para otros docentes

¿Necesitas más tiempo?
Contacta al administrador lo antes posible.
```

### 3. Notificación de Solicitud Pendiente

**Cuándo se envía:** Cuando un docente crea una nueva solicitud desde el portal

**Destinatarios:** Todos los administradores configurados

**Contenido:**
- 👤 Datos del docente solicitante
- 📅 Período solicitado
- 🏢 Área del docente
- 📋 Acción requerida

**Ejemplo de contenido:**
```
¡Hola Administrador!

Se ha recibido una nueva solicitud de licencia de Zoom.

Docente: Juan Pérez
Email: juan.perez@awakelab.cl
Área: Tecnología
Período Solicitado: 15/01/2024 - 31/01/2024

Acción requerida:
Ingresa al Panel de Administración para asignar una licencia.
```

### 4. Notificación de Cambio de Contraseña

**Cuándo se envía:** Cuando el sistema rota automáticamente una contraseña

**Destinatarios:** Administradores (si la opción está activada)

**Contenido:**
- 📧 Licencia actualizada
- 🔑 Nueva contraseña generada
- 📝 Motivo del cambio

**Ejemplo de contenido:**
```
¡Hola!

La contraseña de una licencia de Zoom ha sido actualizada.

Licencia: profesor001@awakelab.cl
Nueva Contraseña: Xyz789!@#
Motivo: Rotación automática - Licencia disponible

Esta contraseña ha sido generada automáticamente y cumple
con todos los requisitos de seguridad de Zoom.
```

## 🤖 Automatización

### Cron Job de Expiración (9:00 AM diario)

**Tarea:** Enviar avisos de expiración

**Proceso:**
1. Se ejecuta automáticamente cada día a las 9:00 AM
2. Busca todas las asignaciones activas
3. Calcula qué licencias expiran en N días (configurable)
4. Envía correo de advertencia a cada docente afectado
5. Registra en logs los correos enviados

**Configuración:**
- Activar/desactivar: **📧 Notificar Expiración**
- Días de aviso: **⏰ Días de Aviso Previo** (por defecto: 2)

### Cron Job de Rotación (1:00 AM diario)

**Tarea:** Rotar contraseñas y notificar

**Proceso:**
1. Se ejecuta después de rotar contraseñas
2. Si está configurado, envía notificación por cada contraseña rotada
3. Incluye la nueva contraseña en el correo

**Configuración:**
- Activar/desactivar: **🔐 Notificar Cambio de Contraseña**

### Eventos de Tiempo Real

**Solicitud Pendiente Creada:**
- Se envía inmediatamente cuando un docente crea una solicitud
- No depende de cron jobs

**Asignación Aprobada:**
- Se envía inmediatamente cuando el admin asigna una licencia
- El docente recibe sus credenciales al instante

## 🔒 Seguridad

### Contraseñas en Correos

- ✅ Las contraseñas solo se envían UNA VEZ al confirmar la asignación
- ✅ Los correos de expiración NO incluyen contraseñas
- ✅ Se recomienda al docente no reenviar el correo con credenciales
- ✅ Los correos usan conexiones SMTP cifradas

### Almacenamiento de Credenciales SMTP

- La contraseña SMTP se almacena en la base de datos MongoDB
- Se recomienda usar variables de entorno para mayor seguridad
- Considera usar secretos de Azure Key Vault en producción

### Recomendaciones

1. **Usar cuenta de correo dedicada:** No uses tu correo personal
2. **Contraseñas de aplicación:** Para Gmail/Office365, usa contraseñas de app
3. **Limitar permisos:** La cuenta solo necesita enviar correos
4. **Monitorear uso:** Revisa logs para detectar comportamientos extraños
5. **Cifrado TLS:** Siempre usa TLS/SSL para conexiones SMTP

## 🐛 Troubleshooting

### El correo de prueba no llega

**Problema:** Al hacer clic en "Enviar Correo de Prueba", no llega nada

**Soluciones:**
1. Verifica que todas las configuraciones estén correctas
2. Revisa la carpeta de spam/junk
3. Verifica que el servidor SMTP permita conexiones desde tu IP
4. Para Gmail: asegúrate de usar contraseña de aplicación
5. Revisa los logs del servidor backend:
   ```bash
   cd backend
   npm run dev
   # Busca mensajes de error en la consola
   ```

### Error: "Authentication failed"

**Problema:** Error de autenticación SMTP

**Soluciones:**
1. Verifica usuario y contraseña
2. Para Gmail: usa contraseña de aplicación, no tu contraseña normal
3. Asegúrate de que la cuenta permita SMTP
4. Verifica que no tengas 2FA sin contraseña de app

### Error: "ECONNREFUSED" o "Connection timeout"

**Problema:** No se puede conectar al servidor SMTP

**Soluciones:**
1. Verifica el servidor SMTP (ejemplo: `smtp.gmail.com`)
2. Verifica el puerto (587 para TLS, 465 para SSL)
3. Revisa firewall / configuración de red
4. Asegúrate de que el servidor permita conexiones salientes

### Los correos se marcan como spam

**Problema:** Los correos llegan pero van a spam

**Soluciones:**
1. Configura SPF, DKIM y DMARC en tu dominio
2. Usa un remitente válido del mismo dominio
3. Evita palabras "sospechosas" en el asunto
4. Pide a los usuarios que marquen como "no spam"

### Las notificaciones no se envían automáticamente

**Problema:** Los cron jobs no envían correos

**Soluciones:**
1. Verifica que el servidor backend esté corriendo
2. Revisa que las opciones de notificación estén activadas
3. Verifica la configuración SMTP completa
4. Revisa los logs del cron job en la consola

## 📊 Monitoreo

### Logs del Backend

El sistema registra todos los eventos de email:

```
✅ Email sent to: profesor@awakelab.cl
📧 Found 5 assignments expiring in 2 days
⚠️  Email configuration incomplete. Skipping email send.
❌ Error sending email: Authentication failed
```

### Historial de Cambios

Los envíos de correo relacionados con cambios de licencias se registran en el historial del sistema:
- Cambios de contraseña
- Asignaciones de licencias
- Actualizaciones de configuración

## 🎯 Mejores Prácticas

1. **Prueba primero:** Siempre envía un correo de prueba después de configurar

2. **Revisa regularmente:** Verifica que los correos se envíen correctamente

3. **Mantén actualizado:** Actualiza los correos de administradores cuando cambien

4. **Comunica a los usuarios:** Avisa a los docentes que recibirán notificaciones

5. **Personaliza según necesidad:** Ajusta los días de aviso según tu operación

6. **Monitorea el sistema:** Revisa logs regularmente para detectar problemas

## 🔄 Variables de Entorno (Opcional)

Para mayor seguridad, puedes usar variables de entorno en lugar de la base de datos:

```env
# .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sistema@awakelab.cl
SMTP_PASSWORD=contraseña-de-aplicacion
SMTP_FROM=Sistema de Licencias Zoom <sistema@awakelab.cl>
ADMIN_EMAILS=admin1@awakelab.cl,admin2@awakelab.cl
```

**Nota:** Esta funcionalidad no está implementada actualmente, pero sería una mejora futura recomendada.

## 📚 Documentación Técnica

### Arquitectura del Sistema

```
┌─────────────────┐
│  Cron Jobs      │
│  (1 AM, 9 AM)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐       ┌─────────────────┐
│ Email Service   │◄──────│ Settings Model  │
└────────┬────────┘       └─────────────────┘
         │
         │ nodemailer
         ▼
┌─────────────────┐
│  SMTP Server    │
│  (Gmail, O365)  │
└─────────────────┘
```

### Servicios Involucrados

1. **email.service.ts**
   - Gestiona envío de correos
   - Plantillas HTML para cada tipo
   - Manejo de errores

2. **settings.service.ts**
   - Almacena configuración SMTP
   - Controla activación de notificaciones

3. **assignment.service.ts**
   - Envía confirmaciones de asignación
   - Notifica solicitudes pendientes

4. **cron.ts**
   - Programa tareas automáticas
   - Envía avisos de expiración
   - Notifica rotaciones de contraseña

### Base de Datos

**Colección: settings**
```json
{
  "key": "emailHost",
  "value": "smtp.gmail.com",
  "description": "Servidor SMTP...",
  "updatedAt": "2024-01-15T10:00:00Z",
  "updatedBy": "admin"
}
```

## 🚀 Próximas Mejoras

Ideas para futuras versiones:

- [ ] Plantillas personalizables desde la UI
- [ ] Historial de correos enviados
- [ ] Reintento automático en caso de fallo
- [ ] Variables de entorno para credenciales
- [ ] Integración con Azure Communication Services
- [ ] Soporte para múltiples idiomas
- [ ] Estadísticas de entrega y apertura
- [ ] Correos programados personalizados

---

**Implementado:** Enero 2024  
**Versión:** 6.0  
**Autor:** Sistema de Gestión de Licencias Zoom
