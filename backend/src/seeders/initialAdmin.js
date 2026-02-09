import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`  Email: ${existingAdmin.email}`);
      console.log('Skipping seed...');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Abubakar',
      email: 'admin@abubakartrust.in',
      password: 'Admin@123',
      role: 'admin',
      phone: '+91-0000000000',
      isActive: true,
    });

    console.log('Admin user created successfully!');
    console.log(`  Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Password: Admin@123`);
    console.log('\nPlease change the password after first login.');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();