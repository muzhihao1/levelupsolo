import postgres from 'postgres';

// 测试不同的连接字符串格式
const connections = [
  {
    name: 'Supabase Pooler',
    url: 'postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-us-west-1.pooler.supabase.com:6543/postgres'
  },
  {
    name: 'Supabase Direct',
    url: 'postgresql://postgres.ooepnnsbmtyrcqlqykkr:zbrGHpuON0CNfZBt@aws-0-us-west-1.pooler.supabase.com:5432/postgres'
  },
  {
    name: 'Original Format',
    url: 'postgresql://postgres:zbrGHpuON0CNfZBt@db.ooepnnsbmtyrcqlqykkr.supabase.co:5432/postgres'
  }
];

async function testConnections() {
  for (const conn of connections) {
    console.log(`\n测试 ${conn.name}...`);
    try {
      const sql = postgres(conn.url);
      const result = await sql`SELECT 1 as test`;
      console.log('✅ 连接成功！');
      await sql.end();
    } catch (error) {
      console.log('❌ 连接失败:', error.message);
    }
  }
}

testConnections();