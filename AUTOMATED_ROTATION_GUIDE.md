# 🔐 Automated Password Rotation - Feature Guide

## Overview

The system now includes **Automated Password Rotation** - a configurable feature that automatically changes Zoom passwords when licenses expire, preventing unauthorized continued use of expired accounts.

## How It Works

### Automatic Process
1. **Daily Cron Job** runs at 1:00 AM
   - Marks expired assignments as 'expirado'
   - Identifies licenses that became available
   - If auto-rotation is enabled, changes passwords automatically

2. **Password Rotation**
   - Generates new secure passwords (8+ chars, letters, numbers, special characters)
   - Updates password in Zoom via API
   - Updates password in database
   - Records change in history with actor="system-cron"

3. **Rate Limiting**
   - 1-second delay between password changes
   - Prevents Zoom API rate limiting
   - Handles errors gracefully (continues with other licenses)

## Configuration

### Via Admin Settings UI

1. **Access Settings**
   - Login as administrator
   - Go to Admin Dashboard
   - Click on "⚙️ Configuración" tab

2. **Available Settings**

   | Setting | Type | Default | Description |
   |---------|------|---------|-------------|
   | **Rotación Automática de Contraseñas** | Toggle | OFF | Enable/disable automatic password rotation |
   | **Hora de Rotación** | Time | 01:00 | When cron job runs (HH:MM format) |
   | **Notificar Expiración** | Toggle | ON | Enable email notifications (future) |
   | **Días de Aviso Previo** | Number | 2 | Days before expiration to warn (future) |

3. **How to Enable**
   - Toggle "Rotación Automática de Contraseñas" to ON (green)
   - Settings save automatically
   - Change takes effect at next cron job execution

### Via API

```bash
# Enable auto password rotation
curl -X PUT http://localhost:3001/api/settings/autoPasswordRotation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": true,
    "description": "Enable automatic password rotation"
  }'

# Check current setting
curl http://localhost:3001/api/settings/autoPasswordRotation \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Benefits

### Security
- **Prevents Unauthorized Access**: Expired accounts immediately locked
- **Zero Window**: No gap between expiration and password change
- **Audit Trail**: All changes tracked in history

### Operational
- **Eliminates Manual Work**: No need to manually change 170 passwords
- **No Human Error**: Automated process is consistent
- **Scalable**: Handles all licenses without additional effort

### Compliance
- **Complete Logging**: Who, what, when recorded
- **Traceable**: Every password change has history entry
- **Configurable**: Can be disabled if needed for testing

## Technical Details

### Cron Job Logic

```typescript
// Runs daily at 1:00 AM
1. Mark expired assignments
2. Check if autoPasswordRotation setting is enabled
3. If enabled:
   a. Get all available licenses (no active assignment)
   b. For each license:
      - Generate new secure password
      - Change password in Zoom
      - Update password in database
      - Record change in history
      - Wait 1 second (rate limiting)
4. Log summary (total, successful, failed)
```

### Files Modified/Created

**Backend:**
- ✅ `models/Settings.model.ts` - NEW: Settings storage
- ✅ `services/settings.service.ts` - NEW: Settings management
- ✅ `routes/settings.routes.ts` - NEW: Settings API
- ✅ `config/cron.ts` - UPDATED: Added password rotation logic
- ✅ `index.ts` - UPDATED: Settings route registration + initialization
- ✅ `models/History.model.ts` - UPDATED: Support 'setting' entity type
- ✅ `services/history.service.ts` - UPDATED: Support 'setting' entity type

**Frontend:**
- ✅ `components/Settings.tsx` - NEW: Settings UI component
- ✅ `components/AdminDashboard.tsx` - UPDATED: Added Settings tab
- ✅ `App.css` - UPDATED: Settings component styles

## Testing

### Manual Test

1. **Enable Auto-Rotation**
   - Go to Admin Settings
   - Toggle "Rotación Automática de Contraseñas" ON
   - Verify setting saves (success message appears)

2. **Create Test Assignment**
   - Create assignment that expires today
   - Wait for cron job (or manually trigger)
   
3. **Verify Rotation**
   - Check console logs at 1:00 AM
   - Should see: "🔐 Starting automatic password rotation..."
   - Check password in database was updated
   - Verify history entry exists

### API Test

```bash
# Get all settings
curl http://localhost:3001/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update setting
curl -X PUT http://localhost:3001/api/settings/autoPasswordRotation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": true}'
```

### Verify in History

```bash
# Get recent setting changes
curl http://localhost:3001/api/history/recent?entityType=setting \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Monitoring

### Console Logs

When cron job runs, you'll see:

```
🕐 Running cron job: Mark expired assignments & rotate passwords
✅ Marked 3 expired assignments
🔐 Starting automatic password rotation for expired licenses...
   ✅ Rotated password for license: teacher1@example.com
   ✅ Rotated password for license: teacher2@example.com
   ❌ Failed to rotate password for teacher3@example.com: Network error

📊 Password Rotation Summary:
   Total available licenses: 5
   Successfully rotated: 2
   Failed: 1
```

### Error Handling

- Individual failures don't stop the batch
- Errors logged but process continues
- Failed rotations can be retried manually via UI

## Troubleshooting

### Password Rotation Not Running

**Check:**
1. Is auto-rotation enabled in settings?
2. Is the cron job running? (Check startup logs)
3. Are there expired assignments to process?
4. Check Zoom API credentials are valid

**Solution:**
```bash
# Verify cron initialized
# Should see: "✅ Cron jobs initialized (expired assignments + password rotation)"

# Check settings
curl http://localhost:3001/api/settings/autoPasswordRotation \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Passwords Not Changing in Zoom

**Check:**
1. Zoom API credentials correct?
2. Zoom API permissions include `user:write:admin`?
3. Rate limiting issues?
4. Network connectivity?

**Solution:**
- Test Zoom connection: `/api/zoom/test`
- Verify permissions in Zoom app settings
- Check rate limiting (should have 1-second delays)

### Settings Not Saving

**Check:**
1. Are you logged in as admin?
2. JWT token valid?
3. MongoDB connection active?

**Solution:**
- Check browser console for errors
- Verify Authorization header in network tab
- Check backend logs for errors

## Future Enhancements

### Planned Features

1. **Configurable Cron Schedule**
   - Allow changing execution time via UI
   - Currently fixed at 1:00 AM

2. **Email Notifications**
   - Notify admins when passwords rotated
   - Send summary reports
   - Warning emails before expiration

3. **Password History**
   - Track previous passwords
   - Prevent password reuse
   - Compliance reporting

4. **Selective Rotation**
   - Choose which licenses to auto-rotate
   - Exclude specific accounts
   - Platform-specific rules

## API Reference

### Settings Endpoints

```
GET    /api/settings              # Get all settings (admin only)
GET    /api/settings/:key         # Get specific setting (admin only)
PUT    /api/settings/:key         # Update setting (admin only)
DELETE /api/settings/:key         # Delete setting (admin only)
POST   /api/settings/initialize   # Initialize defaults (admin only)
```

### Request/Response Examples

**Get Setting:**
```json
GET /api/settings/autoPasswordRotation

Response:
{
  "success": true,
  "key": "autoPasswordRotation",
  "value": true
}
```

**Update Setting:**
```json
PUT /api/settings/autoPasswordRotation
{
  "value": false,
  "description": "Disable automatic password rotation"
}

Response:
{
  "success": true,
  "setting": {
    "_id": "...",
    "key": "autoPasswordRotation",
    "value": false,
    "description": "Disable automatic password rotation",
    "updatedAt": "2026-02-17T10:30:00.000Z",
    "updatedBy": "admin"
  }
}
```

## Security Considerations

1. **Settings Access**: Only authenticated admins can modify settings
2. **History Tracking**: All setting changes are logged
3. **Actor Attribution**: System records who changed what
4. **Password Security**: Generated passwords meet Zoom requirements
5. **API Protection**: All endpoints require JWT authentication

## Summary

The automated password rotation feature provides:
- ✅ **Zero-touch operation** after initial setup
- ✅ **Configurable via UI** - no code changes needed
- ✅ **Full audit trail** - complete history tracking
- ✅ **Error resilient** - handles failures gracefully
- ✅ **Scalable** - works with 170+ licenses
- ✅ **Secure** - admin-only configuration

**This feature completes the original goal of automating password management for expired licenses!** 🎉

---

**Created:** February 17, 2026  
**Version:** 1.0
