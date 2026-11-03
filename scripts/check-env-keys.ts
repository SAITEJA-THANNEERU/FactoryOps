import dotenv from 'dotenv';
dotenv.config({ override: true });

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY present:', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY));
console.log('SUPABASE_SECRET_KEY present:', Boolean(process.env.SUPABASE_SECRET_KEY));
console.log('SUPABASE_KEY present:', Boolean(process.env.SUPABASE_KEY));
console.log('SUPABASE_ANON_KEY present:', Boolean(process.env.SUPABASE_ANON_KEY));
console.log('DATABASE_URL present:', Boolean(process.env.DATABASE_URL));
console.log('PGDATABASE / PGHOST present:', Boolean(process.env.PGHOST));

if (process.env.SUPABASE_KEY) {
  console.log('SUPABASE_KEY prefix:', process.env.SUPABASE_KEY.substring(0, 15));
}
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('SUPABASE_SERVICE_ROLE_KEY prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 15));
}
