import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Import the getWeekStart function from the frontend
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  // JavaScript: Sunday = 0, Monday = 1, ..., Saturday = 6
  // Calculate days to subtract to get to Monday
  const daysToMonday = day === 0 ? 6 : day - 1
  // Use setDate to avoid timezone issues
  const monday = new Date(d)
  monday.setDate(d.getDate() - daysToMonday)
  return monday.toISOString().split('T')[0]
}

async function debugButtonState() {
  try {
    console.log('🔍 Debugging button state issue...');
    
    // Get current week start (same as frontend)
    const currentWeek = '2025-09-08';
    
    console.log('\n📅 Current week start:', currentWeek);
    
    // Get all reports for teacher 13
    const allReports = await pool.query(`
      SELECT lr.*, s.name as student_name, t.name as teacher_name
      FROM lesson_reports lr
      JOIN students s ON lr.student_id = s.id
      JOIN teachers t ON lr.teacher_id = t.id
      WHERE lr.teacher_id = 13
      ORDER BY lr.created_at DESC
    `);
    
    console.log(`\n📋 Found ${allReports.rows.length} reports:`);
    
    // Get schedules for teacher 13 for current week
    const schedules = await pool.query(`
      SELECT ss.*, s.name as student_name, t.name as teacher_name
      FROM student_schedules ss
      JOIN students s ON ss.student_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.teacher_id = 13 
        AND ss.week_start_date = $1
      ORDER BY ss.day_of_week, ss.time_slot
    `, [currentWeek]);
    
    console.log(`\n📅 Found ${schedules.rows.length} schedules for current week:`);
    
    // Test the matching logic
    const currentWeekReports = allReports.rows.filter(report => {
      const reportDate = new Date(report.lesson_date)
      const reportDateStr = reportDate.getFullYear() + '-' + 
        String(reportDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(reportDate.getDate()).padStart(2, '0')
      const reportWeekStart = getWeekStart(reportDateStr)
      return reportWeekStart === currentWeek
    });
    
    console.log(`\n✅ Reports matching current week: ${currentWeekReports.length}`);
    
    // Generate report keys
    const reportKeys = currentWeekReports.map(report => {
      const reportDate = new Date(report.lesson_date)
      const reportDateStr = reportDate.getFullYear() + '-' + 
        String(reportDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(reportDate.getDate()).padStart(2, '0')
      const reportWeekStart = getWeekStart(reportDateStr)
      return `${report.student_id}-${reportWeekStart}-${report.time_slot}`
    });
    
    console.log('\n🔑 Generated report keys:', reportKeys);
    
    // Test each schedule against the report keys
    console.log('\n🧪 Testing schedule vs report matching:');
    schedules.rows.forEach((schedule, index) => {
      const lessonDate = schedule.week_start_date || currentWeek
      const lessonWeekStart = getWeekStart(lessonDate)
      const lessonKey = `${schedule.student_id}-${lessonWeekStart}-${schedule.time_slot}`
      const hasReport = reportKeys.includes(lessonKey)
      
      console.log(`\n  Schedule ${index + 1}:`);
      console.log(`    Student: ${schedule.student_name} (ID: ${schedule.student_id})`);
      console.log(`    Time Slot: ${schedule.time_slot}`);
      console.log(`    Week Start: ${lessonWeekStart}`);
      console.log(`    Generated Key: ${lessonKey}`);
      console.log(`    Has Report: ${hasReport}`);
      console.log(`    Should be disabled: ${hasReport ? 'YES' : 'NO'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugButtonState();
