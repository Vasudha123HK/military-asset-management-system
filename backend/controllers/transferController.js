import db from '../config/db.js';
import { logAuditAction } from '../middlewares/loggerMiddleware.js';

export const createTransfer = async (req, res) => {
  const { sourceBaseId, destinationBaseId, equipmentTypeId, quantity } = req.body;
  const userId = req.user.id;

  if (!sourceBaseId || !destinationBaseId || !equipmentTypeId || !quantity || parseInt(quantity) <= 0) {
    return res.status(400).json({ error: 'Valid sourceBaseId, destinationBaseId, equipmentTypeId, and positive quantity are required.' });
  }

  if (parseInt(sourceBaseId) === parseInt(destinationBaseId)) {
    return res.status(400).json({ error: 'Source and destination bases must be different.' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch names for audit logging details
    const sourceRes = await client.query('SELECT name FROM bases WHERE id = $1', [sourceBaseId]);
    const destRes = await client.query('SELECT name FROM bases WHERE id = $1', [destinationBaseId]);
    const eqRes = await client.query('SELECT name FROM equipment_types WHERE id = $1', [equipmentTypeId]);

    if (sourceRes.rows.length === 0 || destRes.rows.length === 0 || eqRes.rows.length === 0) {
      throw new Error('Invalid source base, destination base, or equipment type.');
    }

    const sourceBaseName = sourceRes.rows[0].name;
    const destBaseName = destRes.rows[0].name;
    const eqName = eqRes.rows[0].name;

    // 2. Check source base stock
    const stockQuery = 'SELECT quantity FROM assets WHERE base_id = $1 AND equipment_type_id = $2';
    const stockRes = await client.query(stockQuery, [sourceBaseId, equipmentTypeId]);

    if (stockRes.rows.length === 0 || parseInt(stockRes.rows[0].quantity) < parseInt(quantity)) {
      const currentStock = stockRes.rows.length > 0 ? stockRes.rows[0].quantity : 0;
      throw new Error(`Insufficient stock at source base. Required: ${quantity}, Available: ${currentStock}`);
    }

    // 3. Subtract quantity from source base's assets
    const newSourceQty = parseInt(stockRes.rows[0].quantity) - parseInt(quantity);
    await client.query(
      'UPDATE assets SET quantity = $1 WHERE base_id = $2 AND equipment_type_id = $3',
      [newSourceQty, sourceBaseId, equipmentTypeId]
    );

    // 4. Add quantity to destination base's assets (upsert)
    const destStockRes = await client.query(stockQuery, [destinationBaseId, equipmentTypeId]);
    if (destStockRes.rows.length > 0) {
      const newDestQty = parseInt(destStockRes.rows[0].quantity) + parseInt(quantity);
      await client.query(
        'UPDATE assets SET quantity = $1 WHERE base_id = $2 AND equipment_type_id = $3',
        [newDestQty, destinationBaseId, equipmentTypeId]
      );
    } else {
      await client.query(
        'INSERT INTO assets (base_id, equipment_type_id, quantity) VALUES ($1, $2, $3)',
        [destinationBaseId, equipmentTypeId, quantity]
      );
    }

    // 5. Insert Transfer Record
    const transferQuery = `
      INSERT INTO transfers (source_base_id, destination_base_id, equipment_type_id, quantity, status, initiated_by)
      VALUES ($1, $2, $3, $4, 'COMPLETED', $5)
      RETURNING id, created_at;
    `;
    const transferRes = await client.query(transferQuery, [
      sourceBaseId,
      destinationBaseId,
      equipmentTypeId,
      quantity,
      userId
    ]);
    const transferId = transferRes.rows[0].id;
    const createdAt = transferRes.rows[0].created_at;

    // 6. Log Action in Audit Table
    const details = `Transferred ${quantity} units of ${eqName} from base ${sourceBaseName} to base ${destBaseName}`;
    await logAuditAction(userId, 'TRANSFER', details, client);

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Transfer completed successfully and inventory balances updated.',
      transferId,
      sourceBaseId,
      destinationBaseId,
      equipmentTypeId,
      quantity,
      createdAt
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transfer transaction failed:', error.message);
    return res.status(500).json({ error: 'Transfer failed: ' + error.message });
  } finally {
    client.release();
  }
};

export const getTransfers = async (req, res) => {
  const { baseId, equipmentTypeId } = req.query;

  try {
    // If baseId query parameter is present (or injected by enforceBaseScope), filter by it
    // Note: a base commander should see transfers where their base is either the source or destination!
    let query = `
      SELECT t.id, t.source_base_id, b_src.name AS source_base_name, t.destination_base_id, 
             b_dst.name AS destination_base_name, t.equipment_type_id, eq.name AS equipment_name, 
             eq.category AS equipment_category, t.quantity, t.status, t.created_at, u.username AS initiated_by_username
      FROM transfers t
      LEFT JOIN bases b_src ON t.source_base_id = b_src.id
      LEFT JOIN bases b_dst ON t.destination_base_id = b_dst.id
      JOIN equipment_types eq ON t.equipment_type_id = eq.id
      LEFT JOIN users u ON t.initiated_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (baseId) {
      params.push(baseId);
      query += ` AND (t.source_base_id = $${params.length} OR t.destination_base_id = $${params.length})`;
    }

    if (equipmentTypeId) {
      params.push(equipmentTypeId);
      query += ` AND t.equipment_type_id = $${params.length}`;
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await db.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Failed to retrieve transfers:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve transfers.' });
  }
};
