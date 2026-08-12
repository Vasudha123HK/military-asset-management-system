import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { logAuditAction } from '../middlewares/loggerMiddleware.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'military_secret_key_123';

export const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await db.query(query, [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        baseId: user.base_id
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Fetch base name if baseId exists
    let baseName = null;
    if (user.base_id) {
      const baseRes = await db.query('SELECT name FROM bases WHERE id = $1', [user.base_id]);
      if (baseRes.rows.length > 0) {
        baseName = baseRes.rows[0].name;
      }
    }

    // Log login action
    await logAuditAction(user.id, 'LOGIN', `User ${user.username} logged in successfully.`);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        baseId: user.base_id,
        baseName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const query = 'SELECT id, username, role, base_id FROM users WHERE id = $1';
    const result = await db.query(query, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];
    let baseName = null;
    if (user.base_id) {
      const baseRes = await db.query('SELECT name FROM bases WHERE id = $1', [user.base_id]);
      if (baseRes.rows.length > 0) {
        baseName = baseRes.rows[0].name;
      }
    }

    return res.status(200).json({
      id: user.id,
      username: user.username,
      role: user.role,
      baseId: user.base_id,
      baseName
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
