require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const categories = ['Phones', 'Laptops', 'Fashion', 'Home', 'Watches', 'Beauty'];

async function seedCategories() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be set in backend/.env.');
  await mongoose.connect(process.env.MONGO_URI);
  await Category.bulkWrite(categories.map((name) => ({
    updateOne: {
      filter: { slug: name.toLowerCase() },
      update: { $setOnInsert: { name, slug: name.toLowerCase() } },
      upsert: true,
    },
  })));
  console.log(`Category seed complete (${categories.length} categories).`);
}

seedCategories().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
