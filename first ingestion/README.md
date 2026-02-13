# CSV to MongoDB Import - Analysis & Instructions

## Overview
This package contains parsed data from your license management CSV and scripts to import it into MongoDB.

## Files Included

- `licenses.json` - 205 license records
- `assignments.json` - 142 assignment records
- `importData.ts` - TypeScript script to import data into MongoDB
- `License.model.updated.ts` - Updated License schema (minor improvements)

## Data Analysis

### Licenses (205 records)
- **libre**: 30 licenses
- **ocupado**: 146 licenses  
- **mantenimiento**: 29 licenses (CUENTA INACTIVA in CSV)

### Assignments (142 records)
- **activo**: 140 assignments
- **expirado**: 2 assignments
- **cancelado**: 0 assignments

### Key Observations

1. **63 licenses have no assignments** - These are either:
   - Inactive accounts (CUENTA INACTIVA)
   - Free licenses available for use
   - Licenses without assigned users

2. **Data Mapping**:
   - `Estado: OCUPADO` → License: `ocupado`, Assignment: `activo`
   - `Estado: LIBRE` → License: `libre`, Assignment: `expirado` (if dates exist)
   - `Estado: CUENTA INACTIVA` → License: `mantenimiento`, Assignment: `cancelado`

3. **Date Handling**:
   - Dates in format: M/D/YYYY
   - "CUENTA INACTIVA" in date fields → `null`
   - All dates converted to ISO format

4. **Email as Link**:
   - Licenses are uniquely identified by `email`
   - Assignments reference licenses via `licenseEmail` → converted to `licenseId` during import

## Schema Updates (Minor)

### License.model.ts
- Added `index: true` to `cuenta` field for better query performance
- Added `index: true` to `estado` field (already existed)
- No breaking changes - fully compatible with your existing schema

### Assignment.model.ts
- No changes needed - your schema is perfect for this data

## Import Instructions

### Option 1: Direct MongoDB Import (using mongoimport)

```bash
# Import licenses
mongoimport --db your_database_name --collection licenses --file licenses.json --jsonArray

# Then manually update assignments to add licenseId references
# (This requires a separate script to match emails to ObjectIds)
```

### Option 2: TypeScript Import Script (Recommended)

```bash
# 1. Install dependencies (if not already installed)
npm install mongoose

# 2. Update MongoDB URI in importData.ts
# Edit line 18: const MONGODB_URI = 'mongodb://localhost:27017/your_database_name';

# 3. Run the import script
npx ts-node importData.ts
```

The TypeScript script will:
- Connect to MongoDB
- Clear existing data (optional - comment out if needed)
- Import all licenses
- Create ObjectId references
- Import all assignments with proper licenseId links
- Display statistics

### Option 3: Manual Review First

You can review the JSON files directly:
- `licenses.json` - All license data
- `assignments.json` - All assignment data (with `licenseEmail` as reference)

## Data Validation Notes

### Emails Found
All emails follow proper format and are lowercased:
- `@grupoaspasia.com` - Most common
- `@formatecyl.com` - FORMATECYL accounts
- `@adalidsc.com` - ADALIDSC accounts
- `@fpaspasia.com` - FP ASPASIA accounts
- Others: `@institutoeuropa.com`, `@tematformacion.com`, `@grupoinsem.com`, `@awakelab.world`

### Missing Fields Handling
- Empty `comunidadAutonoma` → "No especificado"
- Empty `area` → "No especificado"
- Empty `tipoUso` → "No especificado"
- Missing dates → `null`
- Missing observaciones → `null`

## Sample Records

### Sample License
```json
{
  "cuenta": "Cuenta 1",
  "usuarioMoodle": "videoconferencia11",
  "email": "videoconferencia11@grupoaspasia.com",
  "claveAnfitrionZoom": "717141",
  "claveUsuarioMoodle": "videoconferencia11",
  "passwordZoom": "Sas92872",
  "passwordEmail": "Sas92872",
  "estado": "ocupado",
  "observaciones": null
}
```

### Sample Assignment
```json
{
  "licenseEmail": "videoconferencia11@grupoaspasia.com",
  "nombreApellidos": "MARTA MAXE NAVARRO",
  "correocorporativo": "mmaxe@grupoaspasia.com",
  "area": "GERENCIA TERRITORIAL",
  "comunidadAutonoma": "CATALUÑA",
  "tipoUso": "USO ASOCIADO A LMS MOODLE GRUPO ASPASIA",
  "fechaInicioUso": "2023-01-01T00:00:00",
  "fechaFinUso": "2050-12-31T00:00:00",
  "estado": "activo"
}
```

## Post-Import Recommendations

1. **Verify Data Integrity**
   ```typescript
   // Check all assignments have valid license references
   const assignmentsWithoutLicense = await Assignment.find({
     licenseId: { $exists: false }
   });
   
   // Check license-assignment consistency
   const occupiedLicenses = await License.find({ estado: 'ocupado' });
   for (const license of occupiedLicenses) {
     const activeAssignment = await Assignment.findOne({
       licenseId: license._id,
       estado: 'activo'
     });
     if (!activeAssignment) {
       console.log(`License ${license.email} is occupied but has no active assignment`);
     }
   }
   ```

2. **Set up Automated Estado Updates**
   - Create a cron job to check `fechaFinUso` and update expired assignments
   - Update license `estado` when assignments change

3. **Add Validation Middleware**
   - When creating assignment: verify license is `libre`
   - When assignment becomes `cancelado`: set license to `libre`
   - When assignment becomes `activo`: set license to `ocupado`

## Questions or Issues?

If you encounter any issues during import or have questions about the data mapping, please let me know!
