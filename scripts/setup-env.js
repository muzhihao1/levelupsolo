import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 Level Up Solo 环境配置助手\n');

const questions = [
  {
    key: 'SUPABASE_ANON_KEY',
    question: '请输入 Supabase Anon Key (从 Dashboard → Settings → API 获取): ',
    required: true
  },
  {
    key: 'SUPABASE_PASSWORD',
    question: '请输入你的 Supabase 数据库密码: ',
    required: true
  },
  {
    key: 'OLD_DATABASE_URL',
    question: '请输入原 Replit 数据库 URL (可选，用于数据迁移): ',
    required: false
  },
  {
    key: 'OPENAI_API_KEY',
    question: '请输入 OpenAI API Key (可选): ',
    required: false
  }
];

const config = {
  // Supabase 配置
  SUPABASE_URL: 'https://ooepnnsbmtyrcqlqykkr.supabase.co',
  SUPABASE_ANON_KEY: '',
  SUPABASE_DATABASE_URL: '',
  
  // 原数据库
  OLD_DATABASE_URL: '',
  
  // OpenAI
  OPENAI_API_KEY: '',
  
  // 生成的密钥
  JWT_SECRET: '060ebddee5d7b4a2dbc66cafc81326546d8aac719e04eade2233ef5b4055e15576ffac0dd78a2d48d5e1e3b94d22ab6016f8c18ad2725ccc691d34c20e8574a0',
  JWT_REFRESH_SECRET: 'd7043074e205e119d0570ccf4b234a34f669fbc7147b0400beb7ff7a718a46e4f52764d7cfc262c70023f5c31cb9efdf305f69a2d18aab734803e32267b17d62',
  SESSION_SECRET: '23499aaf081691f4840a7c61a3338be598cd113e61b1595152d46899f181bd6e',
  
  // 应用配置
  NODE_ENV: 'production',
  VERCEL_URL: 'https://levelupsolo.vercel.app'
};

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupEnvironment() {
  for (const q of questions) {
    const answer = await askQuestion(q.question);
    if (q.required && !answer) {
      console.log('❌ 这是必填项，请重新运行脚本');
      process.exit(1);
    }
    
    if (q.key === 'SUPABASE_PASSWORD') {
      config.SUPABASE_DATABASE_URL = `postgresql://postgres:${answer}@db.ooepnnsbmtyrcqlqykkr.supabase.co:5432/postgres`;
    } else {
      config[q.key] = answer;
    }
  }
  
  // 生成 .env 文件内容
  let envContent = '';
  for (const [key, value] of Object.entries(config)) {
    if (value) {
      envContent += `${key}=${value}\n`;
    }
  }
  
  // 写入文件
  fs.writeFileSync('.env', envContent);
  console.log('\n✅ 环境配置文件 .env 已创建！');
  
  // 同时创建 .env.local 用于本地开发
  const localConfig = { ...config };
  localConfig.NODE_ENV = 'development';
  localConfig.SUPABASE_URL = 'https://ooepnnsbmtyrcqlqykkr.supabase.co';
  
  let localEnvContent = '';
  for (const [key, value] of Object.entries(localConfig)) {
    if (value) {
      localEnvContent += `${key}=${value}\n`;
    }
  }
  
  fs.writeFileSync('.env.local', localEnvContent);
  console.log('✅ 本地开发配置文件 .env.local 已创建！');
  
  rl.close();
}

setupEnvironment().catch(console.error);