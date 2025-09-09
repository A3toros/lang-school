const fs = require('fs');
const path = require('path');

const functionFiles = [
  'analytics.js',
  'attendance.js', 
  'cloudinary.js',
  'content.js',
  'dashboard.js',
  'passwords.js',
  'reports.js',
  'schedules.js',
  'users.js'
];

functionFiles.forEach(filename => {
  const filePath = path.join('functions', filename);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace require statements with import
    content = content.replace(
      /const\s*{\s*[^}]*}\s*=\s*require\(['"]\.\/utils\/database['"]\)/g,
      "import { verifyToken, errorResponse, successResponse, query, getPaginationParams, corsHeaders } from './utils/database.js'"
    );
    
    // Replace other require statements
    content = content.replace(
      /const\s*{\s*[^}]*}\s*=\s*require\(['"]\.\/utils\/jwt['"]\)/g,
      "import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from './utils/jwt.js'"
    );
    
    content = content.replace(
      /const\s*{\s*[^}]*}\s*=\s*require\(['"]\.\/utils\/validation['"]\)/g,
      "import { validateEmail, validatePassword, validateRequired, validateTeacherData, validateStudentData } from './utils/validation.js'"
    );
    
    // Replace exports.handler with export const handler
    content = content.replace(/exports\.handler\s*=/g, 'export const handler =');
    
    // Replace require('./utils/database').corsHeaders with corsHeaders
    content = content.replace(/require\(['"]\.\/utils\/database['"]\)\.corsHeaders/g, 'corsHeaders');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filename}`);
  }
});

console.log('All function files have been converted to ES modules!');
