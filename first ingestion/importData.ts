import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { License } from '../backend/src/models/License.model';
import { Assignment } from '../backend/src/models/Assignment.model';

/**
 * Import script to populate License and Assignment collections from parsed JSON files
 * 
 * Usage:
 * 1. Ensure MongoDB is running
 * 2. Update MONGODB_URI with your connection string
 * 3. Place licenses.json and assignments.json in the same directory
 * 4. Run: npx ts-node importData.ts
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zoom_licenses';

interface LicenseData {
  cuenta: string;
  usuarioMoodle: string;
  email: string;
  claveAnfitrionZoom: string;
  claveUsuarioMoodle: string;
  passwordZoom: string;
  passwordEmail: string;
  estado: 'libre' | 'ocupado' | 'mantenimiento';
  observaciones?: string;
}

interface AssignmentData {
  licenseEmail: string;
  nombreApellidos: string;
  correocorporativo: string;
  area: string;
  comunidadAutonoma: string;
  tipoUso: string;
  fechaInicioUso: string | null;
  fechaFinUso: string | null;
  estado: 'activo' | 'expirado' | 'cancelado';
}

async function importData() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Read JSON files
    const licensesData: LicenseData[] = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'licenses.json'), 'utf-8')
    );
    const assignmentsData: AssignmentData[] = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'assignments.json'), 'utf-8')
    );

    console.log(`\nFound ${licensesData.length} licenses and ${assignmentsData.length} assignments to import`);

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('\nClearing existing data...');
    await License.deleteMany({});
    await Assignment.deleteMany({});
    console.log('Existing data cleared');

    // Import licenses
    console.log('\nImporting licenses...');
    const insertedLicenses = await License.insertMany(licensesData);
    console.log(`✓ Imported ${insertedLicenses.length} licenses`);

    // Create a map of email to license _id
    const emailToLicenseId = new Map<string, mongoose.Types.ObjectId>();
    insertedLicenses.forEach((license) => {
      emailToLicenseId.set(license.email, license._id);
    });

    // Import assignments with license references
    console.log('\nImporting assignments...');
    const assignmentsToInsert = assignmentsData
      .map((assignment) => {
        const licenseId = emailToLicenseId.get(assignment.licenseEmail);
        if (!licenseId) {
          console.warn(`⚠ Warning: No license found for email ${assignment.licenseEmail}`);
          return null;
        }

        return {
          licenseId,
          nombreApellidos: assignment.nombreApellidos,
          correocorporativo: assignment.correocorporativo,
          area: assignment.area,
          comunidadAutonoma: assignment.comunidadAutonoma,
          tipoUso: assignment.tipoUso,
          fechaInicioUso: assignment.fechaInicioUso ? new Date(assignment.fechaInicioUso) : new Date(),
          fechaFinUso: assignment.fechaFinUso ? new Date(assignment.fechaFinUso) : new Date(),
          estado: assignment.estado,
        };
      })
      .filter((a) => a !== null);

    const insertedAssignments = await Assignment.insertMany(assignmentsToInsert);
    console.log(`✓ Imported ${insertedAssignments.length} assignments`);

    // Print summary statistics
    console.log('\n=== Import Summary ===');
    console.log(`Total Licenses: ${insertedLicenses.length}`);
    console.log(`  - libre: ${insertedLicenses.filter(l => l.estado === 'libre').length}`);
    console.log(`  - ocupado: ${insertedLicenses.filter(l => l.estado === 'ocupado').length}`);
    console.log(`  - mantenimiento: ${insertedLicenses.filter(l => l.estado === 'mantenimiento').length}`);
    
    console.log(`\nTotal Assignments: ${insertedAssignments.length}`);
    console.log(`  - activo: ${insertedAssignments.filter(a => a.estado === 'activo').length}`);
    console.log(`  - expirado: ${insertedAssignments.filter(a => a.estado === 'expirado').length}`);
    console.log(`  - cancelado: ${insertedAssignments.filter(a => a.estado === 'cancelado').length}`);

    console.log('\n✓ Data import completed successfully');

  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the import
importData()
  .then(() => {
    console.log('\n✓ Import process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Import process failed:', error);
    process.exit(1);
  });
