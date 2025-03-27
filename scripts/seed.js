#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables with explicit path
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('Seeding database with sample data...');

async function seedDatabase() {
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
    const sqlFilePath = path.join(process.cwd(), 'src/lib/migrations/seed_data.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('SQL file read successfully. Size:', sqlContent.length, 'bytes');

    // Execute the SQL statements
    console.log('Executing seed SQL...');
    const { error } = await supabase.rpc('exec_sql', { sql_string: sqlContent });

    if (error) {
      console.error('Error seeding database:', error);
      process.exit(1);
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase()
  .then(() => console.log('Database seeding completed successfully'))
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  });