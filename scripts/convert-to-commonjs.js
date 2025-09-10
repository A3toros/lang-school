#!/usr/bin/env node

// Script to convert ES modules to CommonJS for Netlify Functions
import fs from 'fs'
import path from 'path'

const functionsDir = 'functions'

function convertFile(filePath) {
  console.log(`Converting ${filePath}...`)
  
  let content = fs.readFileSync(filePath, 'utf8')
  
  // Convert imports to requires
  content = content.replace(/import\s+{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"]/g, 'const { $1 } = require(\'$2\')')
  content = content.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require(\'$2\')')
  content = content.replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require(\'$2\')')
  
  // Convert exports
  content = content.replace(/export\s+const\s+handler/g, 'exports.handler')
  content = content.replace(/export\s+{\s*([^}]+)\s*}/g, (match, exports) => {
    const exportList = exports.split(',').map(e => e.trim()).join(',\n  ')
    return `module.exports = {\n  ${exportList}\n}`
  })
  
  // Add dotenv config at the top if not present
  if (!content.includes('require(\'dotenv\').config()') && !content.includes('dotenv')) {
    content = 'require(\'dotenv\').config();\n\n' + content
  }
  
  fs.writeFileSync(filePath, content)
  console.log(`✅ Converted ${filePath}`)
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir)
  
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      processDirectory(filePath)
    } else if (file.endsWith('.js')) {
      convertFile(filePath)
    }
  }
}

console.log('🔄 Converting ES modules to CommonJS for Netlify Functions...\n')
processDirectory(functionsDir)
console.log('\n✅ Conversion complete!')
