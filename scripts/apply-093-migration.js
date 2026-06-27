const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase/migrations/093_notifications.sql'), 'utf8');
const password = process.argv[2];

(async () => {
  const client = new Client({
    host: 'db.vpnglqdkdxlkjfruwqtz.supabase.co',
    port: 5432,
    user: 'cli_login_postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected, running 093...');
  await client.query(sql);
  console.log('Migration 093 SQL applied!');

  try {
    await client.query(
      `INSERT INTO supabase_migrations.schema_migrations (version, name, statements, rolled_back) VALUES ($1, $2, $3, false) ON CONFLICT (version) DO NOTHING`,
      ['093', 'notifications', ['CREATE TABLE public.notifications']]
    );
    console.log('Tracking record inserted!');
  } catch (e) {
    console.log('Note: Could not insert tracking record:', e.message);
  }

  await client.end();
  console.log('Done!');
})().catch(err => { console.error('Error:', err.message); process.exit(1); });
