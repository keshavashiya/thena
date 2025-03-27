#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables with explicit path
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Create migrations directory if it doesn't exist
const migrationsDir = path.join(process.cwd(), 'src/lib/migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
  console.log('Created migrations directory');
}

// Ensure create_tables.sql exists (create an empty one if not)
const sqlFilePath = path.join(migrationsDir, 'create_tables.sql');
if (!fs.existsSync(sqlFilePath)) {
  fs.writeFileSync(
    sqlFilePath,
    '-- Your SQL migrations go here\n',
    'utf8'
  );
  console.log('Created empty SQL migrations file');
}

console.log('Running migrations...');

async function runMigrations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Environment variables:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set (value hidden)' : 'MISSING');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set (value hidden)' : 'MISSING');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('\nError: Supabase URL or service key not provided');
    console.log('\nPlease create an .env.local file in the project root with:');
    console.log('NEXT_PUBLIC_SUPABASE_URL=your-project-url');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    process.exit(1);
  }

  // Create a Supabase client with the service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the SQL file content
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('SQL file read successfully. Size:', sqlContent.length, 'bytes');

    // Execute the SQL statements
    console.log('Executing SQL migrations...');
    const { error } = await supabase.rpc('exec_sql', { sql_string: sqlContent });

    if (error) {
      console.error('Error running migrations:', error);
      process.exit(1);
    }

    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Error executing migrations:', error);
    process.exit(1);
  }
}

runMigrations()
  .then(() => console.log('Migration process completed'))
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });