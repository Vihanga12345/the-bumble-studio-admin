import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

async function runSQL() {
  const client = new Client({
    connectionString: 'postgresql://postgres.pnafvjrbfgphnbytgrqd:Asd2001..@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database successfully');

    // Read and execute the SQL file
    console.log('Reading SQL file...');
    const sql = fs.readFileSync('Quick_Fix_Schema.sql', 'utf8');
    console.log('SQL file read, executing...');
    
    const result = await client.query(sql);
    console.log('SQL executed successfully');
    
    // Show results if any
    if (result.rows && result.rows.length > 0) {
      console.log('Results:');
      result.rows.forEach(row => console.log(row));
    }

  } catch (error) {
    console.error('Error occurred:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    console.log('Closing database connection...');
    await client.end();
    console.log('Done.');
  }
}

runSQL(); 