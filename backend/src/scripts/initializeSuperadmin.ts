import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Admin } from '../models/Admin.model';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const initializeSuperadmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zoom_licenses';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if Superadmin already exists
    const existingSuperadmin = await Admin.findOne({ username: 'Superadmin' });
    
    if (existingSuperadmin) {
      console.log('ℹ️  Superadmin account already exists');
      await mongoose.disconnect();
      return;
    }

    // Get password from environment variable
    const superadminPassword = process.env.SUPERADMIN_PASSWORD;
    
    if (!superadminPassword) {
      throw new Error('SUPERADMIN_PASSWORD environment variable is not set');
    }

    // Create Superadmin account
    const superadmin = new Admin({
      username: 'Superadmin',
      password: superadminPassword,
    });

    await superadmin.save();
    console.log('✅ Superadmin account created successfully');
    console.log(`   Username: Superadmin`);
    console.log(`   Password: ${superadminPassword}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error initializing Superadmin:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  initializeSuperadmin();
}

export default initializeSuperadmin;
