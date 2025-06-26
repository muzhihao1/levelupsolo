// 生成安全的密钥
import crypto from 'crypto';

console.log('🔐 生成安全密钥...\n');

// 生成 JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET=' + jwtSecret);

// 生成 JWT Refresh Secret
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_REFRESH_SECRET=' + jwtRefreshSecret);

// 生成 Session Secret
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('SESSION_SECRET=' + sessionSecret);

console.log('\n✅ 请将这些密钥复制到你的 .env.supabase 文件中');
console.log('⚠️  重要：不要将这些密钥提交到版本控制系统！');