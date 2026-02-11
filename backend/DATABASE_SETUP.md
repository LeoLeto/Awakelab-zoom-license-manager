# 📊 MongoDB Database Setup & Schema

## Database Architecture

The Zoom License Manager uses MongoDB to store and manage licenses and their assignments. This document describes the database structure, models, and operations.

## Collections

### 1. `licenses` Collection

Stores Zoom license account information.

**Schema:**
```typescript
{
  _id: ObjectId,
  cuenta: String,              // Account name
  usuarioMoodle: String,       // Moodle username
  email: String,               // Unique email
  claveAnfitrionZoom: String,  // Zoom host key
  claveUsuarioMoodle: String,  // Moodle user password
  passwordZoom: String,        // Zoom password
  passwordEmail: String,       // Email password
  estado: String,              // 'libre' | 'ocupado' | 'mantenimiento'
  observaciones: String,       // Optional notes
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `email` (unique)
- `estado`
- `cuenta`

**Example Document:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "cuenta": "Account 001",
  "usuarioMoodle": "teacher001",
  "email": "teacher001@example.com",
  "claveAnfitrionZoom": "123456",
  "claveUsuarioMoodle": "moodle_pass",
  "passwordZoom": "Zoom@Pass123",
  "passwordEmail": "Email@Pass123",
  "estado": "libre",
  "observaciones": "Primary account",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 2. `assignments` Collection

Tracks license assignments to teachers.

**Schema:**
```typescript
{
  _id: ObjectId,
  licenseId: ObjectId,          // Reference to licenses
  nombreApellidos: String,      // Teacher name
  correocorporativo: String,    // Corporate email
  area: String,                 // Area/Department
  comunidadAutonoma: String,    // Autonomous community
  tipoUso: String,              // Platform type
  fechaInicioUso: Date,         // Start date
  fechaFinUso: Date,            // End date
  estado: String,               // 'activo' | 'expirado' | 'cancelado'
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `licenseId`
- `correocorporativo`
- `estado`
- `fechaInicioUso`, `fechaFinUso`
- Compound: `estado`, `fechaInicioUso`, `fechaFinUso`

**Example Document:**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "licenseId": "507f1f77bcf86cd799439011",
  "nombreApellidos": "Juan Pérez",
  "correocorporativo": "juan.perez@example.com",
  "area": "Mathematics",
  "comunidadAutonoma": "Madrid",
  "tipoUso": "Zoom Meetings",
  "fechaInicioUso": "2024-01-15T00:00:00.000Z",
  "fechaFinUso": "2024-02-15T23:59:59.999Z",
  "estado": "activo",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Connection Configuration

### Local MongoDB
```env
MONGODB_URI=mongodb://localhost:27017/zoom_licenses
```

### MongoDB Atlas (Cloud)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zoom_licenses
```

## Database Services

### LicenseService

**Available Methods:**
- `getAllLicenses()` - Get all licenses
- `getLicenseById(id)` - Get license by ID
- `getLicenseByEmail(email)` - Get license by email
- `getLicensesByStatus(estado)` - Get licenses by status
- `createLicense(data)` - Create new license
- `updateLicense(id, data)` - Update license
- `deleteLicense(id)` - Delete license (checks for active assignments)
- `getAvailableLicenses(startDate, endDate)` - Get available licenses for date range
- `getLicenseWithAssignment(id)` - Get license with current assignment
- `getAllLicensesWithAssignments()` - Get all licenses with their assignments

### AssignmentService

**Available Methods:**
- `getAllAssignments()` - Get all assignments
- `getAssignmentById(id)` - Get assignment by ID
- `getAssignmentsByLicense(licenseId)` - Get assignments for a license
- `getActiveAssignments()` - Get currently active assignments
- `getAssignmentsByTeacher(email)` - Get assignments by teacher email
- `createAssignment(data)` - Create new assignment (checks availability)
- `updateAssignment(id, data)` - Update assignment (checks conflicts)
- `cancelAssignment(id)` - Cancel assignment (updates license status)
- `deleteAssignment(id)` - Delete assignment
- `markExpiredAssignments()` - Mark expired assignments (cron job)
- `getExpiringAssignments(daysAhead)` - Get assignments expiring soon

## Business Logic

### License State Management

**Estados (States):**
1. **libre** - Available for assignment
2. **ocupado** - Currently assigned
3. **mantenimiento** - Under maintenance, not available

**State Transitions:**
- `libre` → `ocupado`: When assignment is created
- `ocupado` → `libre`: When last assignment expires/cancelled
- Any → `mantenimiento`: Manual intervention

### Assignment Conflict Detection

The system prevents overlapping assignments:
```typescript
// Checks for date range conflicts
const overlapping = assignments.find(a => 
  a.fechaInicioUso <= newEndDate && 
  a.fechaFinUso >= newStartDate
);
```

### Automatic Expiration

A cron job runs daily at 1:00 AM to:
1. Find all assignments with `fechaFinUso < now`
2. Update their `estado` to `expirado`
3. Update license `estado` to `libre` if no other active assignments

## Data Validation

### License Validation
```typescript
{
  email: /^\S+@\S+\.\S+$/,  // Valid email format
  estado: ['libre', 'ocupado', 'mantenimiento'],
}
```

### Assignment Validation
```typescript
{
  correocorporativo: /^\S+@\S+\.\S+$/,  // Valid email format
  estado: ['activo', 'expirado', 'cancelado'],
  fechaFinUso: Must be > fechaInicioUso
}
```

## Sample Data Seed Script

```javascript
// Create sample licenses
await License.create([
  {
    cuenta: "Account 001",
    usuarioMoodle: "teacher001",
    email: "teacher001@example.com",
    claveAnfitrionZoom: "123456",
    claveUsuarioMoodle: "moodle_pass",
    passwordZoom: "Zoom@Pass123",
    passwordEmail: "Email@Pass123",
    estado: "libre"
  },
  // ... more licenses
]);

// Create sample assignment
await Assignment.create({
  licenseId: licenseId,
  nombreApellidos: "Juan Pérez",
  correocorporativo: "juan.perez@example.com",
  area: "Mathematics",
  comunidadAutonoma: "Madrid",
  tipoUso: "Zoom Meetings",
  fechaInicioUso: new Date(),
  fechaFinUso: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  estado: "activo"
});
```

## Performance Considerations

### Indexes
All indexes are automatically created on application startup via Mongoose schemas.

### Query Optimization
- Use `lean()` for read-only queries
- Populate only necessary fields
- Use projection to limit returned fields

### Connection Pooling
Mongoose handles connection pooling automatically. Default pool size is 5.

## Backup & Recovery

### Export Data
```bash
# Export all data
mongodump --uri="mongodb://localhost:27017/zoom_licenses" --out=./backup

# Export specific collection
mongodump --uri="mongodb://localhost:27017/zoom_licenses" --collection=licenses --out=./backup
```

### Import Data
```bash
# Restore all data
mongorestore --uri="mongodb://localhost:27017/zoom_licenses" ./backup/zoom_licenses

# Restore specific collection
mongorestore --uri="mongodb://localhost:27017/zoom_licenses" --collection=licenses ./backup/zoom_licenses/licenses.bson
```

## Monitoring

### Check Database Status
```javascript
// In your application
const dbStatus = db.getConnectionStatus(); // true/false
```

### MongoDB Compass
Use MongoDB Compass GUI to:
- Browse collections
- Run queries
- Monitor performance
- Create indexes

Download: https://www.mongodb.com/products/compass

## Security Best Practices

1. **Authentication**: Always use username/password for MongoDB
2. **Network**: Restrict MongoDB port (27017) access
3. **Encryption**: Use TLS/SSL for connections in production
4. **Backups**: Regular automated backups
5. **Monitoring**: Set up MongoDB monitoring and alerts

## Common Operations

### Find Available Licenses
```javascript
const available = await License.find({ estado: 'libre' });
```

### Check License Availability for Date Range
```javascript
const licenses = await licenseService.getAvailableLicenses(
  new Date('2024-01-15'),
  new Date('2024-02-15')
);
```

### Get Active Assignments
```javascript
const active = await Assignment.find({
  estado: 'activo',
  fechaInicioUso: { $lte: new Date() },
  fechaFinUso: { $gte: new Date() }
});
```

## Troubleshooting

### Connection Issues
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Ensure MongoDB is running locally or connection string is correct.

### Duplicate Key Error
```
E11000 duplicate key error collection: zoom_licenses.licenses index: email_1
```
**Solution**: Email already exists. Use a different email or update existing license.

### Date Range Conflicts
```
License is not available for the requested date range
```
**Solution**: Check existing assignments for that license and choose different dates.

---

For API endpoints documentation, see: [backend/API_DOCS.md](API_DOCS.md)
