import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testSimpleRestore() {
  try {
    console.log('🔧 Testing simple constraint restoration...');
    
    // First, let's check what constraints currently exist
    console.log('📋 Checking current constraints...');
    const constraints = await pool.query(`
      SELECT conname, contype, confrelid::regclass as referenced_table
      FROM pg_constraint 
      WHERE conrelid = 'schedule_history'::regclass
    `);
    console.log('Current constraints:', constraints.rows);
    
    // Drop the existing constraint if it exists
    console.log('🗑️ Dropping existing constraint...');
    await pool.query(`
      ALTER TABLE schedule_history DROP CONSTRAINT IF EXISTS schedule_history_schedule_id_fkey
    `);
    
    // Recreate the constraint
    console.log('🔗 Creating new constraint...');
    await pool.query(`
      ALTER TABLE schedule_history
      ADD CONSTRAINT schedule_history_schedule_id_fkey
      FOREIGN KEY (schedule_id)
      REFERENCES student_schedules(id)
      ON DELETE RESTRICT
    `);
    
    // Verify it was created
    console.log('✅ Verifying constraint creation...');
    const newConstraints = await pool.query(`
      SELECT conname, contype, confrelid::regclass as referenced_table
      FROM pg_constraint 
      WHERE conrelid = 'schedule_history'::regclass
      AND conname = 'schedule_history_schedule_id_fkey'
    `);
    console.log('New constraint:', newConstraints.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testSimpleRestore();
