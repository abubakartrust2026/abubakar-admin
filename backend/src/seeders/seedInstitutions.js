import dotenv from 'dotenv';
import Institution from '../models/Institution.js';
import connectDB from '../config/db.js';

dotenv.config();

const INSTITUTIONS = [
  { name: 'Abubakar English School', shortName: 'AES', sortOrder: 0 },
  { name: 'Masjid wa Madarsa Abubakar Siddique', shortName: 'Masjid Abubakar Siddique', sortOrder: 1 },
  { name: 'Masjid-e-Ayesha', shortName: 'Masjid-e-Ayesha', sortOrder: 2 },
  { name: 'Maktab Umar', shortName: 'Maktab Umar', sortOrder: 3 },
  { name: 'Binte Abubakar Siddique', shortName: 'Binte Abubakar Siddique', sortOrder: 4 },
];

const seedInstitutions = async () => {
  try {
    await connectDB();

    for (const inst of INSTITUTIONS) {
      const result = await Institution.findOneAndUpdate(
        { name: inst.name },
        { $setOnInsert: inst },
        { upsert: true, new: true }
      );
      console.log(`  ${result.name}`);
    }

    console.log('Institutions seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding institutions:', error.message);
    process.exit(1);
  }
};

seedInstitutions();
