require('dotenv').config();

const { verifyToken, errorResponse, successResponse, query, corsHeaders } = require('./utils/database.js')
const crypto = require('crypto')

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  const { path } = event
  const method = event.httpMethod

  try {
    // Verify authentication
    try {
      verifyToken(event)
    } catch (error) {
      return errorResponse(401, 'Unauthorized')
    }

    if (path === '/api/versions' && method === 'GET') {
      return await getVersions()
    }

    return errorResponse(404, 'Not found')
  } catch (error) {
    console.error('Versions API error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

async function getVersions() {
  // Compute fast collection-level versions from updated_at and counts
  const resources = {
    teachers: `SELECT COALESCE(MAX(updated_at),'epoch')::text AS max_updated, COUNT(*)::int AS count FROM teachers`,
    students: `SELECT COALESCE(MAX(updated_at),'epoch')::text AS max_updated, COUNT(*)::int AS count FROM students`,
    schedules: `SELECT COALESCE(MAX(updated_at),'epoch')::text AS max_updated, COUNT(*)::int AS count FROM student_schedules`,
    files: `SELECT COALESCE(MAX(updated_at),'epoch')::text AS max_updated, COUNT(*)::int AS count FROM files`,
    reports: `SELECT COALESCE(MAX(updated_at),'epoch')::text AS max_updated, COUNT(*)::int AS count FROM lesson_reports`,
    attendance: `SELECT COALESCE(MAX(updated_at),'epoch')::text AS max_updated, COUNT(*)::int AS count FROM student_schedules WHERE attendance_status IS NOT NULL`,
    content: `SELECT COALESCE(MAX(updated_at),'epoch')::text AS max_updated, COUNT(*)::int AS count FROM content`,
  }

  const versions = {}
  for (const [name, sql] of Object.entries(resources)) {
    try {
      const res = await query(sql)
      const row = res.rows[0] || { max_updated: 'epoch', count: 0 }
      const hash = crypto.createHash('sha1').update(`${row.max_updated}|${row.count}`).digest('hex')
      versions[name] = {
        version: hash,
        lastUpdated: row.max_updated,
        count: row.count
      }
    } catch (e) {
      // Table may not exist in some environments; skip gracefully
      versions[name] = {
        version: 'na',
        lastUpdated: 'epoch',
        count: 0
      }
    }
  }

  return successResponse({ versions })
}


