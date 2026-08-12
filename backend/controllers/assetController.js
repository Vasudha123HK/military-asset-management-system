import db from '../config/db.js';
import { logAuditAction } from '../middlewares/loggerMiddleware.js';

export const getDashboardMetrics = async (req, res) => {
  try {
    const { baseId, equipmentTypeId, startDate, endDate } = req.query;

    const query = `
      WITH
        purchases_before AS (
          SELECT COALESCE(SUM(quantity), 0) AS total
          FROM purchases
          WHERE ($1::int IS NULL OR base_id = $1)
            AND ($2::int IS NULL OR equipment_type_id = $2)
            AND ($3::timestamp IS NOT NULL AND created_at < $3)
        ),
        transfers_in_before AS (
          SELECT COALESCE(SUM(quantity), 0) AS total
          FROM transfers
          WHERE ($1::int IS NULL OR destination_base_id = $1)
            AND ($2::int IS NULL OR equipment_type_id = $2)
            AND ($3::timestamp IS NOT NULL AND created_at < $3)
            AND status = 'COMPLETED'
        ),
        transfers_out_before AS (
          SELECT COALESCE(SUM(quantity), 0) AS total
          FROM transfers
          WHERE ($1::int IS NULL OR source_base_id = $1)
            AND ($2::int IS NULL OR equipment_type_id = $2)
            AND ($3::timestamp IS NOT NULL AND created_at < $3)
            AND status = 'COMPLETED'
        ),
        assignments_before AS (
          SELECT COALESCE(SUM(quantity), 0) AS total
          FROM assignments
          WHERE ($1::int IS NULL OR base_id = $1)
            AND ($2::int IS NULL OR equipment_type_id = $2)
            AND ($3::timestamp IS NOT NULL AND created_at < $3)
        ),
        expenditures_before AS (
          SELECT COALESCE(SUM(quantity), 0) AS total
          FROM expenditures
          WHERE ($1::int IS NULL OR base_id = $1)
            AND ($2::int IS NULL OR equipment_type_id = $2)
            AND ($3::timestamp IS NOT NULL AND created_at < $3)
        ),
        purchases_range AS (
          SELECT COALESCE(SUM(quantity), 0) AS total
          FROM purchases
          WHERE ($1::int IS NULL OR base_id = $1)
            AND ($2::int IS NULL OR equipment_type_id = $2)
            AND ($3::timestamp IS NULL OR created_at >= $3)
            AND ($4::timestamp IS NULL OR created_at <= $4)
        ),
        transfers_in_range AS (
          SELECT COALESCE(SUM(quantity), 0) AS total
          FROM transfers
          WHERE ($1::int IS NULL OR destination_base_id = $1)
            AND ($2::int IS NULL OR equipment_type_id = $2)
            AND ($3::timestamp IS NULL OR created_at >= $3)
            AND ($4::timestamp IS NULL OR created_at <= $4)
            AND status = 'COMPLETED'
        ),
        transfers_out_range AS (
          SELECT COALESCE(SUM(quantity), 0) AS total
          FROM transfers
          WHERE ($1::int IS NULL OR source_base_id = $1)
            AND ($2::int IS NULL OR equipment_type_id = $2)
            AND ($3::timestamp IS NULL OR created_at >= $3)
            AND ($4::timestamp IS NULL OR created_at <= $4)
            AND status = 'COMPLETED'
        ),
        assignments_range AS (
          SELECT COALESCE(SUM(quantity), 0) AS total
          FROM assignments
          WHERE ($1::int IS NULL OR base_id = $1)
            AND ($2::int IS NULL OR equipment_type_id = $2)
            AND ($3::timestamp IS NULL OR created_at >= $3)
            AND ($4::timestamp IS NULL OR created_at <= $4)
        ),
        expenditures_range AS (
          SELECT COALESCE(SUM(quantity), 0) AS total
          FROM expenditures
          WHERE ($1::int IS NULL OR base_id = $1)
            AND ($2::int IS NULL OR equipment_type_id = $2)
            AND ($3::timestamp IS NULL OR created_at >= $3)
            AND ($4::timestamp IS NULL OR created_at <= $4)
        )
      SELECT
        -- Before range calculations (Opening Balance)
        (pb.total + tib.total - tob.total - ab.total - eb.total)::int AS "openingBalance",
        -- Range calculations
        pr.total::int AS "purchases",
        tir.total::int AS "transfersIn",
        tor.total::int AS "transfersOut",
        (pr.total + tir.total - tor.total)::int AS "netMovement",
        ar.total::int AS "assigned",
        er.total::int AS "expended",
        -- Closing balance
        ((pb.total + tib.total - tob.total - ab.total - eb.total) + 
         (pr.total + tir.total - tor.total) - ar.total - er.total)::int AS "closingBalance"
      FROM
        purchases_before pb, transfers_in_before tib, transfers_out_before tob, 
        assignments_before ab, expenditures_before eb, purchases_range pr, 
        transfers_in_range tir, transfers_out_range tor, assignments_range ar, expenditures_range er;
    `;

    const result = await db.query(query, [
      baseId ? parseInt(baseId) : null,
      equipmentTypeId ? parseInt(equipmentTypeId) : null,
      startDate || null,
      endDate || null
    ]);

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to get dashboard metrics:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

export const getAssets = async (req, res) => {
  const { baseId, equipmentTypeId } = req.query;

  try {
    let query = `
      SELECT a.id, a.base_id, b.name AS base_name, a.equipment_type_id, eq.name AS equipment_name, 
             eq.category AS equipment_category, a.quantity
      FROM assets a
      JOIN bases b ON a.base_id = b.id
      JOIN equipment_types eq ON a.equipment_type_id = eq.id
      WHERE 1=1
    `;
    const params = [];

    if (baseId) {
      params.push(baseId);
      query += ` AND a.base_id = $${params.length}`;
    }

    if (equipmentTypeId) {
      params.push(equipmentTypeId);
      query += ` AND a.equipment_type_id = $${params.length}`;
    }

    query += ' ORDER BY b.name, eq.name';

    const result = await db.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Failed to retrieve assets:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve assets.' });
  }
};

export const createAssignment = async (req, res) => {
  const { baseId, equipmentTypeId, quantity, assignedTo } = req.body;
  const userId = req.user.id;

  if (!baseId || !equipmentTypeId || !quantity || parseInt(quantity) <= 0 || !assignedTo) {
    return res.status(400).json({ error: 'Valid baseId, equipmentTypeId, assignedTo, and positive quantity are required.' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check stock availability
    const stockQuery = 'SELECT quantity FROM assets WHERE base_id = $1 AND equipment_type_id = $2';
    const stockRes = await client.query(stockQuery, [baseId, equipmentTypeId]);

    if (stockRes.rows.length === 0 || parseInt(stockRes.rows[0].quantity) < parseInt(quantity)) {
      const currentStock = stockRes.rows.length > 0 ? stockRes.rows[0].quantity : 0;
      throw new Error(`Insufficient stock. Required: ${quantity}, Available: ${currentStock}`);
    }

    // Decrement stock
    const newQty = parseInt(stockRes.rows[0].quantity) - parseInt(quantity);
    await client.query(
      'UPDATE assets SET quantity = $1 WHERE base_id = $2 AND equipment_type_id = $3',
      [newQty, baseId, equipmentTypeId]
    );

    // Record assignment
    const assignQuery = `
      INSERT INTO assignments (base_id, equipment_type_id, quantity, assigned_to, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      RETURNING id, created_at;
    `;
    const assignRes = await client.query(assignQuery, [baseId, equipmentTypeId, quantity, assignedTo]);

    // Log action
    const baseRes = await client.query('SELECT name FROM bases WHERE id = $1', [baseId]);
    const eqRes = await client.query('SELECT name FROM equipment_types WHERE id = $1', [equipmentTypeId]);
    const details = `Assigned ${quantity} units of ${eqRes.rows[0].name} from base ${baseRes.rows[0].name} to ${assignedTo}`;
    await logAuditAction(userId, 'ASSIGNMENT', details, client);

    await client.query('COMMIT');
    return res.status(201).json({
      message: 'Assignment recorded successfully.',
      assignmentId: assignRes.rows[0].id,
      createdAt: assignRes.rows[0].created_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assignment transaction failed:', error.message);
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const createExpenditure = async (req, res) => {
  const { baseId, equipmentTypeId, quantity, reason } = req.body;
  const userId = req.user.id;

  if (!baseId || !equipmentTypeId || !quantity || parseInt(quantity) <= 0 || !reason) {
    return res.status(400).json({ error: 'Valid baseId, equipmentTypeId, reason, and positive quantity are required.' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check stock availability
    const stockQuery = 'SELECT quantity FROM assets WHERE base_id = $1 AND equipment_type_id = $2';
    const stockRes = await client.query(stockQuery, [baseId, equipmentTypeId]);

    if (stockRes.rows.length === 0 || parseInt(stockRes.rows[0].quantity) < parseInt(quantity)) {
      const currentStock = stockRes.rows.length > 0 ? stockRes.rows[0].quantity : 0;
      throw new Error(`Insufficient stock to expend. Required: ${quantity}, Available: ${currentStock}`);
    }

    // Decrement stock
    const newQty = parseInt(stockRes.rows[0].quantity) - parseInt(quantity);
    await client.query(
      'UPDATE assets SET quantity = $1 WHERE base_id = $2 AND equipment_type_id = $3',
      [newQty, baseId, equipmentTypeId]
    );

    // Record expenditure
    const expendQuery = `
      INSERT INTO expenditures (base_id, equipment_type_id, quantity, reason)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at;
    `;
    const expendRes = await client.query(expendQuery, [baseId, equipmentTypeId, quantity, reason]);

    // Log action
    const baseRes = await client.query('SELECT name FROM bases WHERE id = $1', [baseId]);
    const eqRes = await client.query('SELECT name FROM equipment_types WHERE id = $1', [equipmentTypeId]);
    const details = `Expended ${quantity} units of ${eqRes.rows[0].name} at base ${baseRes.rows[0].name}. Reason: ${reason}`;
    await logAuditAction(userId, 'EXPENDITURE', details, client);

    await client.query('COMMIT');
    return res.status(201).json({
      message: 'Expenditure recorded successfully.',
      expenditureId: expendRes.rows[0].id,
      createdAt: expendRes.rows[0].created_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Expenditure transaction failed:', error.message);
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const getAssignments = async (req, res) => {
  const { baseId, equipmentTypeId } = req.query;

  try {
    let query = `
      SELECT a.id, a.base_id, b.name AS base_name, a.equipment_type_id, eq.name AS equipment_name, 
             eq.category AS equipment_category, a.quantity, a.assigned_to, a.status, a.created_at
      FROM assignments a
      JOIN bases b ON a.base_id = b.id
      JOIN equipment_types eq ON a.equipment_type_id = eq.id
      WHERE 1=1
    `;
    const params = [];

    if (baseId) {
      params.push(baseId);
      query += ` AND a.base_id = $${params.length}`;
    }

    if (equipmentTypeId) {
      params.push(equipmentTypeId);
      query += ` AND a.equipment_type_id = $${params.length}`;
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await db.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve assignments.' });
  }
};

export const getExpenditures = async (req, res) => {
  const { baseId, equipmentTypeId } = req.query;

  try {
    let query = `
      SELECT e.id, e.base_id, b.name AS base_name, e.equipment_type_id, eq.name AS equipment_name, 
             eq.category AS equipment_category, e.quantity, e.reason, e.created_at
      FROM expenditures e
      JOIN bases b ON e.base_id = b.id
      JOIN equipment_types eq ON e.equipment_type_id = eq.id
      WHERE 1=1
    `;
    const params = [];

    if (baseId) {
      params.push(baseId);
      query += ` AND e.base_id = $${params.length}`;
    }

    if (equipmentTypeId) {
      params.push(equipmentTypeId);
      query += ` AND e.equipment_type_id = $${params.length}`;
    }

    query += ' ORDER BY e.created_at DESC';

    const result = await db.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve expenditures.' });
  }
};

export const getBases = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, location FROM bases ORDER BY name');
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve bases.' });
  }
};

export const getEquipmentTypes = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, category FROM equipment_types ORDER BY category, name');
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve equipment types.' });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    let query = `
      SELECT al.id, al.user_id, u.username, al.action, al.details, al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Base Commanders should only see audit logs corresponding to users of their base
    if (req.user && req.user.role === 'BASE_COMMANDER') {
      params.push(req.user.baseId);
      query += ` AND (u.base_id = $${params.length} OR al.details LIKE '%base #' || $${params.length} || '%' OR al.details LIKE '%' || (SELECT name FROM bases WHERE id = $${params.length}) || '%')`;
    }

    query += ' ORDER BY al.created_at DESC LIMIT 100';

    const result = await db.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
};
