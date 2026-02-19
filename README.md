# Zoom License Manager

A comprehensive dashboard for managing Zoom licenses and their corresponding Moodle accounts.

## Features

- **Automated Password Management**: Programmatically change Zoom and Moodle passwords
- **License Assignment Tracking**: Monitor which teachers are using which licenses
- **Time-based Access Control**: Automatic expiration and renewal system
- **Request Management**: Teachers can request licenses, admins can approve
- **Conflict Prevention**: Avoid double-booking of licenses

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL
- **APIs**: Zoom API, Moodle API

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Zoom Admin Account with API credentials
- Moodle Admin Access

### Installation

```bash
# Install all dependencies
npm run install:all

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your Zoom API credentials

# Run development servers
npm run dev
```

### Environment Variables

Create a `backend/.env` file with:

```
# Zoom API
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret

# Database
MONGODB_URI=mongodb://localhost:27017/zoom_licenses

# Server
PORT=3001
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_secret_key
```

## Project Structure

```
zoom-license-manager/
├── backend/          # Node.js + TypeScript API
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   └── package.json
├── frontend/         # React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   └── package.json
└── package.json      # Root package
```

## Current Implementation Status

### Phase 1: Password Management ✅ COMPLETE
- [x] Project structure setup
- [x] Zoom API integration
- [x] Password change functionality
- [x] Bulk password operations

### Phase 2: Database & License Management ✅ COMPLETE
- [x] MongoDB schema and connection
- [x] License CRUD operations
- [x] Assignment tracking and management
- [x] Automated expiration handling

### Phase 3: React Frontend Dashboard ✅ COMPLETE
- [x] Admin dashboard with license overview
- [x] Assignment management interface
- [x] Teacher portal with request form
- [x] Navigation and routing
- [x] Responsive design

See [PHASE3_COMPLETE.md](docs/PHASE3_COMPLETE.md) for detailed Phase 3 documentation.

### Phase 4: Automation (Planned)
- [ ] Scheduled password rotation
- [ ] Email notifications
- [ ] Usage analytics

## License

MIT
