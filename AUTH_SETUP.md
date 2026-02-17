# Authentication Setup Guide

## Overview
The application now includes authentication for the Administrator panel. Only authenticated administrators can access the admin dashboard and manage licenses.

## Key Features
- ✅ JWT-based authentication
- ✅ Protected admin routes
- ✅ No self-registration (admins can only be created by other admins)
- ✅ Superadmin account initialization
- ✅ Admin management interface

## Setup Instructions

### 1. Configure Environment Variables

Add the following to your `backend/.env` file:

```bash
# JWT Secret for authentication (use a strong random string)
JWT_SECRET=your_random_secret_key_change_this_in_production

# Superadmin Account Password
SUPERADMIN_PASSWORD=your_secure_superadmin_password_here
```

### 2. Initialize the Superadmin Account

Run the initialization script to create the Superadmin account:

```bash
cd backend
npm run init-superadmin
```

This creates a user with:
- Username: `Superadmin`
- Password: The value from `SUPERADMIN_PASSWORD` environment variable

### 3. Login

1. Navigate to `/login` or click the "Login" link in the navigation
2. Use the Superadmin credentials to login
3. You'll be redirected to the Admin Dashboard

## Admin Management

### Accessing Admin Management
1. Login as an administrator
2. Go to the Admin Dashboard
3. Click on the "👥 Administradores" tab

### Creating New Admins
1. Click "Add New Admin" button
2. Enter a username (minimum 3 characters)
3. Enter a password (minimum 6 characters)
4. Click "Create Admin"

### Deleting Admins
- Any admin can delete other admins (except themselves and the Superadmin account)
- The Superadmin account cannot be deleted for system integrity

## API Endpoints

### Authentication Endpoints

#### Login
```
POST /api/auth/login
Body: { username: string, password: string }
Response: { token: string, admin: { id, username, lastLogin } }
```

#### Get Current Admin
```
GET /api/auth/me
Headers: { Authorization: "Bearer <token>" }
Response: { id, username, createdAt, lastLogin }
```

#### Logout
```
POST /api/auth/logout
Headers: { Authorization: "Bearer <token>" }
```

### Admin Management Endpoints

#### List All Admins
```
GET /api/admins
Headers: { Authorization: "Bearer <token>" }
```

#### Create New Admin
```
POST /api/admins
Headers: { Authorization: "Bearer <token>" }
Body: { username: string, password: string }
```

#### Delete Admin
```
DELETE /api/admins/:id
Headers: { Authorization: "Bearer <token>" }
```

#### Change Password
```
PUT /api/admins/change-password
Headers: { Authorization: "Bearer <token>" }
Body: { currentPassword: string, newPassword: string }
```

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt with salt rounds
2. **JWT Tokens**: Expire after 2 weeks (14 days)
3. **Protected Routes**: All admin endpoints require valid JWT token
4. **Minimum Password Length**: 6 characters
5. **Minimum Username Length**: 3 characters
6. **Self-Deletion Prevention**: Admins cannot delete their own account
7. **Superadmin Protection**: The Superadmin account cannot be deleted

## Frontend Components

### New Components
- `Login.tsx`: Login form component
- `ProtectedRoute.tsx`: Route wrapper for authentication
- `AdminManagement.tsx`: Admin user management interface
- `AuthContext.tsx`: Authentication state management

### Updated Components
- `Navigation.tsx`: Shows login/logout and current user
- `AdminDashboard.tsx`: Now protected and includes admin management tab
- `App.tsx`: Wrapped with AuthProvider and includes protected routes
- `api.service.ts`: Automatically includes JWT token in all requests

## Usage Flow

1. **Initial Setup**:
   - Configure `.env` with JWT_SECRET and SUPERADMIN_PASSWORD
   - Run `npm run init-superadmin` to create the first admin

2. **Login**:
   - Navigate to `/login`
   - Enter Superadmin credentials
   - Get redirected to protected admin dashboard

3. **Create Additional Admins**:
   - Go to "Administradores" tab
   - Add new admin accounts as needed

4. **Managing Admins**:
   - View all administrators and their details
   - Delete admins when needed (except Superadmin)
   - Track who created each admin and last login times

## Troubleshooting

### "JWT_SECRET is not defined" Error
Make sure you've set `JWT_SECRET` in your `backend/.env` file.

### "SUPERADMIN_PASSWORD environment variable is not set" Error
Add `SUPERADMIN_PASSWORD` to your `backend/.env` file before running the init script.

### "Superadmin account already exists"
The Superadmin account has already been created. You can skip the initialization.

### Can't Access Admin Dashboard
Make sure you're logged in. The dashboard is now protected and requires authentication.

### Token Expired
Tokens expire after 2 weeks (14 days). Simply login again to get a new token.
