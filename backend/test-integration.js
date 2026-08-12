import { log } from 'console';

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  log('==================================================');
  log('   MILITARY ASSET SYSTEM INTEGRATION TESTS        ');
  log('==================================================');

  let adminToken = '';
  let commanderToken = '';
  let logisticsToken = '';

  // 1. Authenticate Admin
  try {
    log('\n[TEST 1] Authenticating Admin user...');
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
    });
    const data = await res.json();
    if (res.status === 200 && data.token) {
      adminToken = data.token;
      log('✓ Admin authenticated successfully.');
    } else {
      throw new Error(`Auth failed: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    log('✗ Test 1 Failed:', err.message);
    process.exit(1);
  }

  // 2. Authenticate Base Commander A (Fort Bragg - Base 1)
  try {
    log('\n[TEST 2] Authenticating Base Commander A...');
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'commander_a', password: 'Commander@123' })
    });
    const data = await res.json();
    if (res.status === 200 && data.token) {
      commanderToken = data.token;
      log('✓ Base Commander A authenticated.');
    } else {
      throw new Error(`Auth failed: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    log('✗ Test 2 Failed:', err.message);
    process.exit(1);
  }

  // 3. Authenticate Logistics Officer A (Fort Bragg - Base 1)
  try {
    log('\n[TEST 3] Authenticating Logistics Officer A...');
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'logistics_a', password: 'Logistics@123' })
    });
    const data = await res.json();
    if (res.status === 200 && data.token) {
      logisticsToken = data.token;
      log('✓ Logistics Officer A authenticated.');
    } else {
      throw new Error(`Auth failed: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    log('✗ Test 3 Failed:', err.message);
    process.exit(1);
  }

  // 4. Test RBAC scope enforcement for Base Commander A (should not see assets of Base 2)
  try {
    log('\n[TEST 4] Verifying Base Commander Scope Gating...');
    const res = await fetch(`${BASE_URL}/assets?baseId=2`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${commanderToken}` }
    });
    const assets = await res.json();
    
    // The middleware enforceBaseScope forces baseId to user's assigned base (Base 1)
    // So all returned assets should belong to Base 1 (Fort Bragg) only!
    const otherBaseAssets = assets.filter(a => a.base_id !== 1);
    if (otherBaseAssets.length === 0) {
      log('✓ RBAC Scope enforced successfully. Commander was locked to Base 1.');
    } else {
      throw new Error(`Security breach: Commander accessed assets of Base: ${otherBaseAssets[0].base_id}`);
    }
  } catch (err) {
    log('✗ Test 4 Failed:', err.message);
    process.exit(1);
  }

  // 5. Test RBAC permissions block (Logistics Officer cannot create assignments)
  try {
    log('\n[TEST 5] Verifying Logistics Role Access Gating...');
    const res = await fetch(`${BASE_URL}/assets/assignments`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${logisticsToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        baseId: 1,
        equipmentTypeId: 1,
        quantity: 5,
        assignedTo: 'Squad Alpha'
      })
    });
    if (res.status === 403) {
      log('✓ Access Gated correctly. Logistics Officer was blocked (403 Forbidden).');
    } else {
      throw new Error(`Role block failed: server returned status ${res.status}`);
    }
  } catch (err) {
    log('✗ Test 5 Failed:', err.message);
    process.exit(1);
  }

  // 6. Test Transaction Integrity: Rollback on Insufficient Stock
  try {
    log('\n[TEST 6] Testing Transaction Rollback on Over-draw...');
    const res = await fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${logisticsToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceBaseId: 1,
        destinationBaseId: 2,
        equipmentTypeId: 1, // M4 Carbine
        quantity: 999999 // Over-draw
      })
    });
    const data = await res.json();
    if (res.status === 500 && data.error.includes('Insufficient stock')) {
      log('✓ Over-draw blocked and rolled back successfully: ' + data.error);
    } else {
      throw new Error(`Transaction safety check failed: returned status ${res.status}`);
    }
  } catch (err) {
    log('✗ Test 6 Failed:', err.message);
    process.exit(1);
  }

  // 7. Test Atomic Stock Transfer: Valid move (5 units of M4 Carbine from Base 1 to Base 2)
  try {
    log('\n[TEST 7] Executing Atomic Stock Transfer (5 units)...');
    
    // Fetch initial stock levels
    const initialRes = await fetch(`${BASE_URL}/assets`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const initialAssets = await initialRes.json();
    const initSrcStock = initialAssets.find(a => a.base_id === 1 && a.equipment_type_id === 1)?.quantity || 0;
    const initDstStock = initialAssets.find(a => a.base_id === 2 && a.equipment_type_id === 1)?.quantity || 0;

    log(`  Initial Stock - Base 1: ${initSrcStock}, Base 2: ${initDstStock}`);

    // Perform transfer
    const transferRes = await fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${logisticsToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceBaseId: 1,
        destinationBaseId: 2,
        equipmentTypeId: 1,
        quantity: 5
      })
    });
    
    if (transferRes.status !== 201) {
      const errData = await transferRes.json();
      throw new Error(`Transfer request failed: ${JSON.stringify(errData)}`);
    }
    
    // Fetch final stock levels
    const finalRes = await fetch(`${BASE_URL}/assets`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const finalAssets = await finalRes.json();
    const finalSrcStock = finalAssets.find(a => a.base_id === 1 && a.equipment_type_id === 1)?.quantity || 0;
    const finalDstStock = finalAssets.find(a => a.base_id === 2 && a.equipment_type_id === 1)?.quantity || 0;

    log(`  Final Stock   - Base 1: ${finalSrcStock}, Base 2: ${finalDstStock}`);

    if (finalSrcStock === initSrcStock - 5 && finalDstStock === initDstStock + 5) {
      log('✓ Atomic stock transfer verified. Stock decremented at source and incremented at destination.');
    } else {
      throw new Error('Stock balance mismatch after transfer!');
    }
  } catch (err) {
    log('✗ Test 7 Failed:', err.message);
    process.exit(1);
  }

  log('\n==================================================');
  log('   ALL INTEGRATION TESTS PASSED SUCCESSFULLY!    ');
  log('==================================================\n');
};

runTests();
