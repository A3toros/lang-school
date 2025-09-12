// Test script to verify rewritten functions work correctly
import { getPool } from './functions/utils/database.js'

async function testDatabaseFunctions() {
  const client = await getPool().connect()
  
  try {
    console.log('🔍 Testing database functions...')
    
    // Test 1: Check if upcoming_schedule_view exists
    try {
      const viewTest = await client.query('SELECT * FROM upcoming_schedule_view LIMIT 1')
      console.log('✅ upcoming_schedule_view exists and is accessible')
    } catch (error) {
      console.log('❌ upcoming_schedule_view not found:', error.message)
    }
    
    // Test 2: Check if mark_schedule_completed function exists
    try {
      const funcTest = await client.query('SELECT mark_schedule_completed(1, 1)')
      console.log('✅ mark_schedule_completed function exists')
    } catch (error) {
      console.log('❌ mark_schedule_completed function not found:', error.message)
    }
    
    // Test 3: Check if cancel_template_and_future_occurrences function exists
    try {
      const funcTest = await client.query('SELECT cancel_template_and_future_occurrences(1, 1, \'test\')')
      console.log('✅ cancel_template_and_future_occurrences function exists')
    } catch (error) {
      console.log('❌ cancel_template_and_future_occurrences function not found:', error.message)
    }
    
    // Test 4: Check if schedule_templates table has new columns
    try {
      const colTest = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'schedule_templates' 
        AND column_name IN ('cancellation_date', 'cancellation_note')
      `)
      if (colTest.rows.length === 2) {
        console.log('✅ schedule_templates has new columns')
      } else {
        console.log('❌ schedule_templates missing new columns')
      }
    } catch (error) {
      console.log('❌ Error checking schedule_templates columns:', error.message)
    }
    
    // Test 5: Check if student_schedules has is_active column
    try {
      const colTest = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'student_schedules' 
        AND column_name = 'is_active'
      `)
      if (colTest.rows.length === 1) {
        console.log('✅ student_schedules has is_active column')
      } else {
        console.log('❌ student_schedules missing is_active column')
      }
    } catch (error) {
      console.log('❌ Error checking student_schedules columns:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message)
  } finally {
    client.release()
  }
}

// Run the test
testDatabaseFunctions().catch(console.error)
