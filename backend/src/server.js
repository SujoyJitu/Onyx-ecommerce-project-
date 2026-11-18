require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');

// Create the Express application.
const app = express();

// Allow cross-origin requests and read JSON request bodies.
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

// Let clients check whether the backend is running.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Onyx backend is running' });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ message: 'Request body must contain valid JSON.' });
  }
  if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
  console.error(error);
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

// Use the configured port, or 5000 when no port is set.
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET must be set in the environment before starting the server.');
  process.exit(1);
}

// Connect to MongoDB before accepting requests.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
