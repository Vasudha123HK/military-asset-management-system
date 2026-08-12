-- Bases Table
CREATE TABLE IF NOT EXISTS bases (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(150) NOT NULL
);

-- Equipment Categories / Types Table
CREATE TABLE IF NOT EXISTS equipment_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('WEAPON', 'VEHICLE', 'AMMUNITION'))
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER')),
  base_id INT REFERENCES bases(id) ON DELETE SET NULL
);

-- Assets Table (Current stock at each base for each equipment type)
CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  base_id INT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  equipment_type_id INT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  UNIQUE (base_id, equipment_type_id)
);

-- Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  base_id INT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  equipment_type_id INT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transfers Table
CREATE TABLE IF NOT EXISTS transfers (
  id SERIAL PRIMARY KEY,
  source_base_id INT REFERENCES bases(id) ON DELETE SET NULL,
  destination_base_id INT REFERENCES bases(id) ON DELETE SET NULL,
  equipment_type_id INT REFERENCES equipment_types(id) ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) DEFAULT 'COMPLETED', -- 'PENDING', 'IN_TRANSIT', 'COMPLETED'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  initiated_by INT REFERENCES users(id) ON DELETE SET NULL
);

-- Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  base_id INT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  equipment_type_id INT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  assigned_to VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'RETURNED'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenditures Table
CREATE TABLE IF NOT EXISTS expenditures (
  id SERIAL PRIMARY KEY,
  base_id INT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  equipment_type_id INT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'PURCHASE', 'TRANSFER', 'ASSIGNMENT', 'EXPENDITURE', 'LOGIN'
  details TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
