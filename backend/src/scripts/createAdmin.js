require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const CommissionSetting = require('../models/CommissionSetting');

async function createAdmin() {
  const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGO_URI || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD before running admin:create.');
  }
  if (ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  await mongoose.connect(MONGO_URI);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (await User.exists({ email })) throw new Error('An account with ADMIN_EMAIL already exists.');
  await User.create({ name: ADMIN_NAME.trim(), email, password: ADMIN_PASSWORD, role: 'admin', emailVerified: true });
  await CommissionSetting.updateOne({ _id: 'global' }, { $setOnInsert: { rate: 0 } }, { upsert: true });
  process.stdout.write(`Admin account created for ${email}.\n`);
}

createAdmin()
  .catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
