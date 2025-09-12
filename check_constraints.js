import { getPool } from './functions/utils/database.js';

async function checkConstraints() {
  const client = await getPool().connect();
  
  try {
    console.log('🔍 Checking foreign key constraints...');
    
    // Check the foreign key constraint on schedule_history
    const constraints = await client.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'schedule_history'
    `);
    
    console.log('📋 Foreign key constraints on schedule_history:', constraints.rows);
    
    // Check if the constraint is deferrable
    const constraintDetails = await client.query(`
      SELECT conname, condeferrable, condeferred
      FROM pg_constraint 
      WHERE conrelid = 'schedule_history'::regclass
        AND contype = 'f'
    `);
    
    console.log('📋 Constraint details:', constraintDetails.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
  }
}

checkConstraints();
