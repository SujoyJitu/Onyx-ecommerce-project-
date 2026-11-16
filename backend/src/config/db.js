const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require('mongoose');

// Connect to the database using the URI from the environment.
async function connectDB() {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    // Stop the server if the database connection fails.
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
