import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { apiLogger } from './middlewares/loggerMiddleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import transferRoutes from './routes/transferRoutes.js';

// Database initialization triggers when imported
import db from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading frontend assets if hosted together
}));
app.use(cors()); // Allow requests from all origins
app.use(express.json());

// Global audit logging middleware for mutations
app.use(apiLogger);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    database: db.isInMemory() ? 'In-Memory Emulated (pg-mem)' : 'PostgreSQL Live Connected',
    timestamp: new Date()
  });
});

// Mounting application routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/transfers', transferRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Military Asset Management System API Service    `);
  console.log(`  Listening at http://localhost:${PORT}           `);
  console.log(`  Database Mode: ${db.isInMemory() ? 'IN-MEMORY MOCK' : 'LIVE POSTGRESQL'}`);
  console.log(`==================================================`);
});
