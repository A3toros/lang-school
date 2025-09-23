#!/usr/bin/env node

// Script to generate JWT secrets for development
import crypto from 'crypto';

console.log('🔐 Generating JWT secrets for development...\n');

const jwtSecret = crypto.randomBytes(64).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');

console.log('Add these to your .env file:\n');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}\n`);

console.log('⚠️  Keep these secrets secure and never commit them to version control!');
