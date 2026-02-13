import mongoose from 'mongoose';
import { License } from '../models/License.model';
import { Assignment } from '../models/Assignment.model';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * Verify data integrity after import
 * 
 * Usage:
 * Run from backend directory: npx ts-node src/scripts/verifyDataIntegrity.ts
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zoom_licenses';

async function verifyDataIntegrity() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    // 1. Check all assignments have valid license references
    console.log('📋 Checking assignment-license relationships...');
    const assignmentsWithoutLicense = await Assignment.find({
      licenseId: { $exists: false }
    });
    
    if (assignmentsWithoutLicense.length > 0) {
      console.log(`⚠️  Found ${assignmentsWithoutLicense.length} assignments without license references`);
    } else {
      console.log('✅ All assignments have valid license references');
    }

    // 2. Check license-assignment consistency for occupied licenses
    console.log('\n📋 Checking occupied license consistency...');
    const occupiedLicenses = await License.find({ estado: 'ocupado' });
    const inconsistencies = [];

    for (const license of occupiedLicenses) {
      const activeAssignment = await Assignment.findOne({
        licenseId: license._id,
        estado: 'activo'
      });
      
      if (!activeAssignment) {
        inconsistencies.push({
          email: license.email,
          cuenta: license.cuenta,
          issue: 'License is occupied but has no active assignment'
        });
      }
    }

    if (inconsistencies.length > 0) {
      console.log(`⚠️  Found ${inconsistencies.length} inconsistencies:\n`);
      inconsistencies.slice(0, 10).forEach(issue => {
        console.log(`   - ${issue.email} (${issue.cuenta}): ${issue.issue}`);
      });
      if (inconsistencies.length > 10) {
        console.log(`   ... and ${inconsistencies.length - 10} more`);
      }
    } else {
      console.log('✅ All occupied licenses have active assignments');
    }

    // 3. Check free licenses don't have active assignments
    console.log('\n📋 Checking free license consistency...');
    const freeLicenses = await License.find({ estado: 'libre' });
    const freeInconsistencies = [];

    for (const license of freeLicenses) {
      const activeAssignment = await Assignment.findOne({
        licenseId: license._id,
        estado: 'activo'
      });
      
      if (activeAssignment) {
        freeInconsistencies.push({
          email: license.email,
          cuenta: license.cuenta,
          assignedTo: activeAssignment.nombreApellidos
        });
      }
    }

    if (freeInconsistencies.length > 0) {
      console.log(`⚠️  Found ${freeInconsistencies.length} free licenses with active assignments:\n`);
      freeInconsistencies.forEach(issue => {
        console.log(`   - ${issue.email}: assigned to ${issue.assignedTo}`);
      });
    } else {
      console.log('✅ No free licenses have active assignments');
    }

    // 4. Check for expired assignments with occupied licenses
    console.log('\n📋 Checking expired assignments...');
    const expiredAssignments = await Assignment.find({ estado: 'expirado' }).populate('licenseId');
    const expiredIssues = expiredAssignments.filter((assignment: any) => 
      assignment.licenseId && assignment.licenseId.estado === 'ocupado'
    );

    if (expiredIssues.length > 0) {
      console.log(`⚠️  Found ${expiredIssues.length} expired assignments with occupied licenses`);
    } else {
      console.log('✅ No expired assignments with occupied licenses');
    }

    // 5. Summary statistics
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║               Data Integrity Summary                  ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    
    const totalLicenses = await License.countDocuments();
    const totalAssignments = await Assignment.countDocuments();
    const activeAssignments = await Assignment.countDocuments({ estado: 'activo' });
    const licensesWithoutAssignment = await License.countDocuments({
      _id: { $nin: await Assignment.distinct('licenseId') }
    });

    console.log(`║ Total Licenses: ${totalLicenses.toString().padEnd(34)} ║`);
    console.log(`║ Total Assignments: ${totalAssignments.toString().padEnd(31)} ║`);
    console.log(`║ Active Assignments: ${activeAssignments.toString().padEnd(30)} ║`);
    console.log(`║ Licenses without assignments: ${licensesWithoutAssignment.toString().padEnd(20)} ║`);
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ Issues Found:                                          ║`);
    console.log(`║   - Assignments without licenses: ${assignmentsWithoutLicense.length.toString().padEnd(16)} ║`);
    console.log(`║   - Occupied without active: ${inconsistencies.length.toString().padEnd(21)} ║`);
    console.log(`║   - Free with active: ${freeInconsistencies.length.toString().padEnd(26)} ║`);
    console.log(`║   - Expired with occupied: ${expiredIssues.length.toString().padEnd(23)} ║`);
    console.log('╚════════════════════════════════════════════════════════╝');

    if (
      assignmentsWithoutLicense.length === 0 &&
      inconsistencies.length === 0 &&
      freeInconsistencies.length === 0 &&
      expiredIssues.length === 0
    ) {
      console.log('\n🎉 All data integrity checks passed!');
    } else {
      console.log('\n⚠️  Some issues were found. Consider running data cleanup.');
    }

    // 6. Recommendations
    console.log('\n📝 Recommendations:');
    console.log('   1. Set up a cron job to check fechaFinUso and update expired assignments');
    console.log('   2. Add validation middleware to maintain license-assignment consistency');
    console.log('   3. Review and fix any inconsistencies found above');
    console.log('   4. Consider implementing automated estado updates');

  } catch (error) {
    console.error('❌ Error verifying data integrity:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the verification
verifyDataIntegrity()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
