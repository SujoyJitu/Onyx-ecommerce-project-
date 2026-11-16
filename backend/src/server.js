require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Create the Express application.
const app = express();

// Allow cross-origin requests and read JSON request bodies.
app.use(cors());
app.use(express.json());

// Let clients check whether the backend is running.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Onyx backend is running' });
});

// Use the configured port, or 5000 when no port is set.
const PORT = process.env.PORT || 5000;

// Connect to MongoDB before accepting requests.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
