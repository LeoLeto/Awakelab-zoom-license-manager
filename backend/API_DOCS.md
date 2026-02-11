# Zoom Password Management API

## 🔑 Password Management Endpoints

Base URL: `http://localhost:3001/api/zoom`

### 1. Test Zoom Connection

```http
GET /api/zoom/test
```

**Response:**
```json
{
  "success": true,
  "message": "Zoom API connected successfully"
}
```

---

### 2. Get All Zoom Users

```http
GET /api/zoom/users
```

**Response:**
```json
{
  "success": true,
  "count": 170,
  "users": [
    {
      "id": "abc123",
      "email": "teacher001@moodle.com",
      "first_name": "John",
      "last_name": "Doe",
      "type": 2
    }
  ]
}
```

---

### 3. Get Specific User

```http
GET /api/zoom/users/:userIdOrEmail
```

**Example:**
```http
GET /api/zoom/users/teacher001@moodle.com
```

---

### 4. 🔥 Change User Password (PRIMARY FEATURE)

```http
POST /api/zoom/change-password
Content-Type: application/json

{
  "userEmail": "teacher001@moodle.com",
  "newPassword": "SecurePass123!"  // Optional - will auto-generate if omitted
}
```

**Response:**
```json
{
  "success": true,
  "email": "teacher001@moodle.com",
  "newPassword": "SecurePass123!",
  "message": "Password changed successfully"
}
```

**Auto-generate password example:**
```json
{
  "userEmail": "teacher001@moodle.com"
}
```

---

### 5. Generate Secure Password

```http
GET /api/zoom/generate-password?length=12
```

**Response:**
```json
{
  "success": true,
  "password": "aB3#xK9!mP2q"
}
```

---

### 6. Bulk Change Passwords

```http
POST /api/zoom/bulk-change-password
Content-Type: application/json

{
  "userEmails": [
    "teacher001@moodle.com",
    "teacher002@moodle.com",
    "teacher003@moodle.com"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "success": ["teacher001@moodle.com", "teacher002@moodle.com"],
    "failed": [
      {
        "email": "teacher003@moodle.com",
        "error": "User not found"
      }
    ]
  },
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  }
}
```

---

## 🧪 Testing with cURL

### Test Connection
```bash
curl http://localhost:3001/api/zoom/test
```

### Get All Users
```bash
curl http://localhost:3001/api/zoom/users
```

### Change Password (auto-generate)
```bash
curl -X POST http://localhost:3001/api/zoom/change-password \
  -H "Content-Type: application/json" \
  -d '{"userEmail": "teacher001@moodle.com"}'
```

### Change Password (custom)
```bash
curl -X POST http://localhost:3001/api/zoom/change-password \
  -H "Content-Type: application/json" \
  -d '{"userEmail": "teacher001@moodle.com", "newPassword": "MySecure123!"}'
```

### Generate Password
```bash
curl "http://localhost:3001/api/zoom/generate-password?length=16"
```

---

## 🧪 Testing with PowerShell

### Test Connection
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/test" -Method Get
```

### Change Password
```powershell
$body = @{
    userEmail = "teacher001@moodle.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/change-password" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

---

## Password Requirements

Zoom passwords must meet these criteria:
- **Minimum 8 characters**
- **Must contain letters (a-z, A-Z)**
- **Must contain numbers (0-9)**
- **Can contain special characters** (!@#$%^&*)
- The service validates and auto-generates compliant passwords

---

## Error Responses

### Invalid Email
```json
{
  "success": false,
  "error": "Failed to retrieve user: invalid@email.com"
}
```

### Weak Password
```json
{
  "success": false,
  "error": "Password does not meet Zoom requirements (min 8 chars, mix of letters and numbers)"
}
```

### Missing Credentials
```json
{
  "success": false,
  "error": "Failed to authenticate with Zoom API"
}
```
