# 🚀 Quick Start Guide - Zoom Password Management

This guide helps you set up and test the Zoom password management feature.

## Prerequisites

1. **Zoom Admin Account** with API access
2. **Node.js 18+** installed
3. **MongoDB** (local or MongoDB Atlas)
4. Zoom Server-to-Server OAuth app created

## Step 1: Create Zoom Server-to-Server OAuth App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click **Develop** → **Build App**
3. Choose **Server-to-Server OAuth**
4. Fill in basic information:
   - App Name: "Zoom License Manager"
   - Company Name: Your organization
5. Copy the credentials:
   - **Account ID**
   - **Client ID**
   - **Client Secret**
6. Add scopes (Zoom now uses granular scopes):
   - `user:read:user:admin` - Read user information and get user details
   - `user:update:password:admin` - Update user passwords
   - Optional: `user:read:list_users:admin` - List all users (helpful for browsing)
7. Activate the app

## Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

## Step 3: Set Up MongoDB

### Option A: Local MongoDB

1. Install MongoDB Community Server from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:
   - **Windows**: MongoDB runs as Windows Service automatically
   - **Mac**: `brew services start mongodb-community`
   - **Linux**: `sudo systemctl start mongod` and MongoDB connection:

```env
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here

# MongoDB - Local
MONGODB_URI=mongodb://localhost:27017/zoom_licenses

# MongoDB - Atlas (Cloud) - Use this format if using MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zoom_licenses

PORT=3001
NODE_ENV=development
```

## Step 5ist your IP address
5. Create a database user

## Step 4: Configure Environment Variables

```bash
# Copy the example env file
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your Zoom credentials:

```env
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here

PORT=3001
NODE_ENV=development
```

## Step 4: Start the Backend Server

```bash
✅ Successfully connected to MongoDB
🚀 Server is running on http://localhost:3001
📊 API Health: http://localhost:3001/api/health
✅ Cron jobs initialized
```

## Step 6d see:
```
🚀 Server is running on http://localhost:3001
📊 API Health: http://localhost:3001/api/health
```

## Step 5: Test the Password Management API

### Option A: Using PowerShell (Windows)

```powershell
# Test connection
Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/test"

# Get all Zoom users
Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/users"

# Generate a secure password
Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/generate-password?length=12"

# Change a user's password (replace with actual email)
$body = @{
    userEmail = "teacher001@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/change-password" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

### Option B: Using cURL

```bash
# Test connection
curl http://localhost:3001/api/zoom/test

# Get all users
curl http://localhost:3001/api/zoom/users

# Change password
curl -X POST http://localhost:3001/api/zoom/change-password \
  -H "Content-Type: application/json" \
  -d '{"7: Test License Management API

```powershell
# Get all licenses
Invoke-RestMethod -Uri "http://localhost:3001/api/licenses"

# Create a new license
$licenseBody = @{
    cuenta = "Account 001"
    usuarioMoodle = "teacher001"
    email = "teacher001@example.com"
    claveAnfitrionZoom = "123456"
    claveUsuarioMoodle = "moodle_pass"
    passwordZoom = "Zoom@Pass123"
    passwordEmail = "Email@Pass123"
    estado = "libre"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/licenses" `
  -Method Post `
  -ContentType "application/json" `
  -Body $licenseBody
```
connect to MongoDB"

**Solution:**
- Verify MongoDB is running locally or connection string is correct
- Check firewall settings
- For MongoDB Atlas, ensure your IP is whitelisted
- Verify database user credentials

### ❌ "Failed to 
## Step 8serEmail": "teacher001@example.com"}'
```

### Option C: Using Postman or Thunder Client (VS Code)

1. Import the API endpoints from `backend/API_DOCS.md`
2. Test each endpoint manually

## Step 6: Verify Password Change

After changing a password:

1. Try logging into Zoom with the old password → Should fail
2. Try logging in with the new password → Should succeed
3. ✅ **Phase 2 Complete** - MongoDB the API for the new password

## Common Issues and Solutions

### ❌ "Failed to authenticate with Zoom API"

**Solution:** 
- Verify your Zoom credentials in `.env`
- Make sure the Server-to-Server OAuth app is activated
- Check that you copied the Account ID correctly

### ❌ "Failed to retrieve user"

**Solution:**
- Verify the email exists in your Zoom account
- Check that the user is active (not pending or deactivated)
- Try using the Zoom user ID instead of email

### ❌ "Password does not meet Zoom requirements"

**Solution:**
- Let the system auto-generate passwords (don't provide `newPassword`)
- If providing custom password, ensure:
  - Minimum 8 characters
  - Contains letters AND numbers
  - Optionally contains special characters

## Next Steps

Once password management is working:

1. ✅ **Phase 1 Complete** - Password management working
2. 📊 **Phase 2** - Set up database for license tracking
3. 🎨 **Phase 3** - Build React frontend dashboard
4. 🤖 **Phase 4** - Add automated password rotation

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Store generated passwords securely** - Consider using a password manager or database encryption
3. **Use HTTPS in production** - Passwords are transmitted in API requests
4. **Implement authentication** - Add JWT or OAuth to protect API endpoints
5. **Log password changes** - Keep audit trail of all password modifications
6. **Rate limiting** - Prevent abuse of password change endpoints

## Support

For detailed API documentation, see: `backend/API_DOCS.md`

For Zoom API documentation: https://developers.zoom.us/docs/api/

---

**Ready to test?** Start the server and run your first password change! 🎉
