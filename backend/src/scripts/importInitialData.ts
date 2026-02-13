import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { License } from '../models/License.model';
import { Assignment } from '../models/Assignment.model';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * Import script to populate License and Assignment collections from parsed JSON files
 * 
 * Usage:
 * 1. Ensure MongoDB is running (or using MongoDB Atlas)
 * 2. Run from backend directory: npx ts-node src/scripts/importInitialData.ts
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
    console.log('✅ Connected to MongoDB successfully');

    // Read JSON files from first ingestion folder
    const dataPath = path.join(__dirname, '..', '..', '..', 'first ingestion');
    const licensesData: LicenseData[] = JSON.parse(
      fs.readFileSync(path.join(dataPath, 'licenses.json'), 'utf-8')
    );
    const assignmentsData: AssignmentData[] = JSON.parse(
      fs.readFileSync(path.join(dataPath, 'assignments.json'), 'utf-8')
    );

    console.log(`\n📊 Found ${licensesData.length} licenses and ${assignmentsData.length} assignments to import`);

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('\n🗑️  Clearing existing data...');
    await License.deleteMany({});
    await Assignment.deleteMany({});
    console.log('✅ Existing data cleared');

    // Import licenses
    console.log('\n📥 Importing licenses...');
    const insertedLicenses = await License.insertMany(licensesData);
    console.log(`✅ Imported ${insertedLicenses.length} licenses`);

    // Create a map of email to license _id
    const emailToLicenseId = new Map<string, mongoose.Types.ObjectId>();
    insertedLicenses.forEach((license) => {
      emailToLicenseId.set(license.email, license._id);
    });

    // Import assignments with license references
    console.log('\n📥 Importing assignments...');
    const assignmentsToInsert = assignmentsData
      .map((assignment) => {
        const licenseId = emailToLicenseId.get(assignment.licenseEmail);
        if (!licenseId) {
          console.warn(`⚠️  Warning: No license found for email ${assignment.licenseEmail}`);
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
    console.log(`✅ Imported ${insertedAssignments.length} assignments`);

    // Print summary statistics
    console.log('\n╔════════════════════════════════════╗');
    console.log('║       Import Summary               ║');
    console.log('╠════════════════════════════════════╣');
    console.log(`║ Total Licenses: ${insertedLicenses.length.toString().padEnd(18)}║`);
    console.log(`║   - libre: ${insertedLicenses.filter(l => l.estado === 'libre').length.toString().padEnd(23)}║`);
    console.log(`║   - ocupado: ${insertedLicenses.filter(l => l.estado === 'ocupado').length.toString().padEnd(21)}║`);
    console.log(`║   - mantenimiento: ${insertedLicenses.filter(l => l.estado === 'mantenimiento').length.toString().padEnd(15)}║`);
    console.log('╠════════════════════════════════════╣');
    console.log(`║ Total Assignments: ${insertedAssignments.length.toString().padEnd(15)}║`);
    console.log(`║   - activo: ${insertedAssignments.filter(a => a.estado === 'activo').length.toString().padEnd(20)}║`);
    console.log(`║   - expirado: ${insertedAssignments.filter(a => a.estado === 'expirado').length.toString().padEnd(18)}║`);
    console.log(`║   - cancelado: ${insertedAssignments.filter(a => a.estado === 'cancelado').length.toString().padEnd(17)}║`);
    console.log('╚════════════════════════════════════╝');

    console.log('\n✅ Data import completed successfully');

  } catch (error) {
    console.error('❌ Error importing data:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the import
importData()
  .then(() => {
    console.log('\n🎉 Import process finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import process failed:', error);
    process.exit(1);
  });
