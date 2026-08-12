import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pool;
let isInMemory = false;

const initDb = async (selectedPool) => {
  try {
    const schemaPath = path.join(__dirname, '../models/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema script. We split by semicolon to run statements sequentially,
    // which is safer and works across both real pg and pg-mem environments.
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await selectedPool.query(statement);
    }

    console.log('Database schema verified/created successfully.');

    // Seed default Bases
    const baseCheck = await selectedPool.query('SELECT COUNT(*) FROM bases');
    if (parseInt(baseCheck.rows[0].count) === 0) {
      console.log('Seeding bases...');
      await selectedPool.query(`
        INSERT INTO bases (id, name, location) VALUES
        (1, 'Fort Bragg', 'North Carolina'),
        (2, 'Camp Pendleton', 'California'),
        (3, 'Fort Hood', 'Texas')
      `);
      try {
        await selectedPool.query("SELECT setval('bases_id_seq', 3)");
      } catch (seqErr) {
        // Suppress sequence errors in environments that don't support setval
      }
    }

    // Seed default Equipment Types
    const eqCheck = await selectedPool.query('SELECT COUNT(*) FROM equipment_types');
    if (parseInt(eqCheck.rows[0].count) === 0) {
      console.log('Seeding equipment types...');
      await selectedPool.query(`
        INSERT INTO equipment_types (id, name, category) VALUES
        (1, 'M4 Carbine', 'WEAPON'),
        (2, 'M249 SAW', 'WEAPON'),
        (3, 'Humvee (M1114)', 'VEHICLE'),
        (4, 'Oshkosh L-ATV', 'VEHICLE'),
        (5, '5.56mm Ammo', 'AMMUNITION'),
        (6, '120mm Tank Shell', 'AMMUNITION')
      `);
      try {
        await selectedPool.query("SELECT setval('equipment_types_id_seq', 6)");
      } catch (seqErr) {
        // Suppress sequence errors
      }
    }

    // Seed default Users
    const userCheck = await selectedPool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) === 0) {
      console.log('Seeding demo users...');
      const adminHash = await bcrypt.hash('Admin@123', 10);
      const cmdHash = await bcrypt.hash('Commander@123', 10);
      const logHash = await bcrypt.hash('Logistics@123', 10);
      const vasudhaHash = await bcrypt.hash('Vasudha@123', 10);
      const suchithHash = await bcrypt.hash('suchith@123', 10);
      await selectedPool.query(`
        INSERT INTO users (username, password_hash, role, base_id) VALUES
        ('admin', '${adminHash}', 'ADMIN', NULL),
        ('vasudha', '${vasudhaHash}', 'ADMIN', NULL),
        ('suchith', '${suchithHash}', 'ADMIN', NULL),
        ('commander_a', '${cmdHash}', 'BASE_COMMANDER', 1),
        ('commander_b', '${cmdHash}', 'BASE_COMMANDER', 2),
        ('logistics_a', '${logHash}', 'LOGISTICS_OFFICER', 1),
        ('logistics_b', '${logHash}', 'LOGISTICS_OFFICER', 2)
      `);
    }

    // Seed default Purchases and Assets (initial stock)
    const purchaseCheck = await selectedPool.query('SELECT COUNT(*) FROM purchases');
    if (parseInt(purchaseCheck.rows[0].count) === 0) {
      console.log('Seeding initial purchases and assets stock...');
      await selectedPool.query(`
        INSERT INTO purchases (base_id, equipment_type_id, quantity) VALUES
        (1, 1, 50),
        (1, 3, 10),
        (1, 5, 10000),
        (2, 1, 30),
        (2, 4, 5),
        (2, 5, 5000)
      `);

      await selectedPool.query(`
        INSERT INTO assets (base_id, equipment_type_id, quantity) VALUES
        (1, 1, 50),
        (1, 3, 10),
        (1, 5, 10000),
        (2, 1, 30),
        (2, 4, 5),
        (2, 5, 5000)
      `);
    }
    console.log('Database initialization and seeding completed successfully.');
  } catch (error) {
    console.error('Error during database initialization:', error);
  }
};

const connectDb = async () => {
  if (process.env.DATABASE_URL) {
    try {
      console.log('Attempting connection to PostgreSQL database using DATABASE_URL...');
      const realPool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false }
      });
      // Ping check
      await realPool.query('SELECT NOW()');
      console.log('Connected to PostgreSQL successfully.');
      pool = realPool;
      isInMemory = false;
      await initDb(pool);
      return;
    } catch (e) {
      console.error('Failed to connect to PostgreSQL. Falling back to in-memory database. Error:', e.message);
    }
  } else {
    console.log('No DATABASE_URL configured in backend. Starting in-memory database fallback...');
  }

  // Fallback to pg-mem
  try {
    const { newDb } = await import('pg-mem');
    const memDb = newDb();

    // Register setval mock function in pg-mem
    memDb.public.registerFunction({
      name: 'setval',
      args: ['text', 'integer'],
      returns: 'integer',
      implementation: (seqName, val) => val
    });

    const { Pool } = memDb.adapters.createPg();
    pool = new Pool();
    isInMemory = true;
    console.log('In-memory PostgreSQL-compatible database initialized successfully.');
    await initDb(pool);
  } catch (err) {
    console.error('Critical error: Could not initialize in-memory database.', err);
    process.exit(1);
  }
};

// Start connection process immediately
connectDb();

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: async () => pool.connect(),
  isInMemory: () => isInMemory
};

export default db;
