require('dotenv').config();

const connectDB = require('../src/config/db');
const User = require('../src/models/User');

const SEED_USERS = [
  { name: 'Admin', phoneNumber: '9999999999', role: 'admin' },
  { name: 'John Plumber', phoneNumber: '9876543210', role: 'plumber', status: 'offline' },
  { name: 'Mike Plumber', phoneNumber: '9876543211', role: 'plumber', status: 'offline' },
  { name: 'Sarah Plumber', phoneNumber: '9876543212', role: 'plumber', status: 'offline' },
];

const seed = async () => {
  await connectDB();

  for (const userData of SEED_USERS) {
    const existing = await User.findOne({ phoneNumber: userData.phoneNumber });
    if (existing) {
      existing.name = userData.name;
      existing.role = userData.role;
      if (userData.status) {
        existing.status = userData.status;
      }
      await existing.save();
      console.log(`Updated: ${userData.name} (${userData.phoneNumber})`);
    } else {
      await User.create(userData);
      console.log(`Created: ${userData.name} (${userData.phoneNumber})`);
    }
  }

  console.log('\nSeed complete. Login with phone + OTP:');
  console.log('  Admin:   9999999999');
  console.log('  Plumber: 9876543210, 9876543211, 9876543212');
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
