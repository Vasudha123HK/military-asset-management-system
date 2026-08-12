import db from '../config/db.js';
import { logAuditAction } from '../middlewares/loggerMiddleware.js';

export const createPurchase = async (req, res) => {
  const { baseId, equipmentTypeId, quantity } = req.body;
  const userId = req.user.id;

  if (!baseId || !equipmentTypeId || !quantity || parseInt(quantity) <= 0) {
    return res.status(400).json({ error: 'Valid baseId, equipmentTypeId, and positive quantity are required.' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Check if base and equipment type exist
    const baseCheck = await client.query('SELECT name FROM bases WHERE id = $1', [baseId]);
    if (baseCheck.rows.length === 0) {
      throw new Error(`Base ID ${baseId} does not exist.`);
    }
    const eqCheck = await client.query('SELECT name FROM equipment_types WHERE id = $1', [equipmentTypeId]);
    if (eqCheck.rows.length === 0) {
      throw new Error(`Equipment type ID ${equipmentTypeId} does not exist.`);
    }

    // 2. Insert into purchases table
    const purchaseQuery = `
      INSERT INTO purchases (base_id, equipment_type_id, quantity)
      VALUES ($1, $2, $3)
      RETURNING id, created_at;
    `;
    const purchaseRes = await client.query(purchaseQuery, [baseId, equipmentTypeId, quantity]);
    const purchaseId = purchaseRes.rows[0].id;
    const createdAt = purchaseRes.rows[0].created_at;

    // 3. Upsert assets table
    const assetCheck = await client.query(
      'SELECT id, quantity FROM assets WHERE base_id = $1 AND equipment_type_id = $2',
      [baseId, equipmentTypeId]
    );

    if (assetCheck.rows.length > 0) {
      // Update
      const newQty = parseInt(assetCheck.rows[0].quantity) + parseInt(quantity);
      await client.query(
        'UPDATE assets SET quantity = $1 WHERE base_id = $2 AND equipment_type_id = $3',
        [newQty, baseId, equipmentTypeId]
      );
    } else {
      // Insert
      await client.query(
        'INSERT INTO assets (base_id, equipment_type_id, quantity) VALUES ($1, $2, $3)',
        [baseId, equipmentTypeId, quantity]
      );
    }

    // 4. Log Action in Audit Table
    const details = `Purchased ${quantity} units of ${eqCheck.rows[0].name} for base ${baseCheck.rows[0].name}`;
    await logAuditAction(userId, 'PURCHASE', details, client);

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Purchase completed and inventory updated successfully.',
      purchaseId,
      baseId,
      equipmentTypeId,
      quantity,
      createdAt
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Purchase transaction failed:', error.message);
    return res.status(500).json({ error: 'Purchase transaction failed: ' + error.message });
  } finally {
    client.release();
  }
};

export const getPurchases = async (req, res) => {
  const { baseId, equipmentTypeId } = req.query;

  try {
    // If baseId query parameter is present (or injected by enforceBaseScope), filter by it
    let query = `
      SELECT p.id, p.base_id, b.name AS base_name, p.equipment_type_id, eq.name AS equipment_name, 
             eq.category AS equipment_category, p.quantity, p.created_at
      FROM purchases p
      JOIN bases b ON p.base_id = b.id
      JOIN equipment_types eq ON p.equipment_type_id = eq.id
      WHERE 1=1
    `;
    const params = [];

    if (baseId) {
      params.push(baseId);
      query += ` AND p.base_id = $${params.length}`;
    }

    if (equipmentTypeId) {
      params.push(equipmentTypeId);
      query += ` AND p.equipment_type_id = $${params.length}`;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await db.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Failed to retrieve purchases:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve purchases.' });
  }
};
