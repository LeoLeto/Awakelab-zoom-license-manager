# Email Notifications - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Start Backend & Frontend

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

### Step 2: Configure SMTP (Gmail Example)

1. **Login as Admin** at `http://localhost:5173`

2. **Navigate to Settings:**
   - Click "Panel de Administración"
   - Go to "⚙️ Configuración" tab
   - Scroll to "📧 Configuración de Correo Electrónico"

3. **Enter Gmail SMTP Settings:**
   ```
   🌐 Servidor SMTP: smtp.gmail.com
   🔌 Puerto SMTP: 587
   🔒 Usar SSL/TLS: ❌ Desactivado
   👤 Usuario SMTP: tu-email@gmail.com
   🔑 Contraseña SMTP: [tu contraseña de aplicación]
   📤 Remitente: Sistema Zoom <tu-email@gmail.com>
   👥 Correos Administradores: admin1@gmail.com, admin2@gmail.com
   ```

4. **Get Gmail App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and generate password
   - Copy the 16-character password
   - Paste it in "Contraseña SMTP"

### Step 3: Test Your Configuration

1. Scroll down to "🧪 Probar Configuración de Correo"
2. Enter your email address
3. Click "📧 Enviar Correo de Prueba"
4. Check your inbox (and spam folder)
5. You should receive a test email!

### Step 4: Enable Notifications

Toggle the switches you want:
- ✅ **📧 Notificar Expiración** - Warn teachers before expiration
- ✅/❌ **🔐 Notificar Cambio de Contraseña** - Notify admins of rotations
- ✅ **📋 Notificar Nuevas Solicitudes** - Alert admins of new requests

### Step 5: You're Done! 🎉

The system will now automatically:
- ✅ Send confirmation emails when you assign licenses
- ✅ Warn teachers 2 days before expiration (9 AM daily)
- ✅ Notify you of new pending requests
- ✅ (Optional) Notify you when passwords are rotated

## 📧 What Emails Will Be Sent?

### When You Assign a License
**To:** Teacher  
**Content:** License email, password, dates, instructions  
**Timing:** Immediately

### 2 Days Before Expiration
**To:** Teacher  
**Content:** Warning about upcoming expiration  
**Timing:** Daily at 9:00 AM

### When Teacher Creates Request
**To:** All admins  
**Content:** Teacher details, requested period  
**Timing:** Immediately

### When Password is Rotated (Optional)
**To:** All admins  
**Content:** License email, new password  
**Timing:** Daily at 1:00 AM

## ⚙️ Office 365 Configuration

If using Office 365 instead:
```
🌐 Servidor SMTP: smtp.office365.com
🔌 Puerto SMTP: 587
🔒 Usar SSL/TLS: ❌ Desactivado
👤 Usuario SMTP: tu-email@organizacion.com
🔑 Contraseña SMTP: [tu contraseña normal]
```

## 🐛 Common Issues

### "Authentication failed"
- Gmail: Use App Password, not regular password
- Enable 2-Step Verification first
- Generate new App Password

### "Connection timeout"
- Check server and port
- Verify firewall isn't blocking port 587
- Try port 465 with SSL/TLS enabled

### Email goes to spam
- Use a professional email account
- Configure SPF/DKIM records for your domain
- Ask recipients to mark as "not spam"

## 📚 Full Documentation

For complete details, see [EMAIL_NOTIFICATIONS_GUIDE.md](EMAIL_NOTIFICATIONS_GUIDE.md)

## 🎯 Next Steps

After email is working:
1. Test the complete workflow:
   - Create a test assignment
   - Check that confirmation email arrives
   - Wait for expiration warning (or change dates to test)
2. Add all admin emails to receive notifications
3. Communicate to teachers that they'll receive automated emails
4. Monitor logs for any delivery issues

---

**Ready to go!** Your system now has full email automation! 🚀
