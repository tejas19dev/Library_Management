import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Resolve .env path relative to this file — works from any working directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl  = process.env.SUPABASE_URL;
const supabaseKey  = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const serviceKey   = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    console.error('   SUPABASE_URL :', supabaseUrl  ? '✅ set' : '❌ missing');
    console.error('   ANON KEY     :', supabaseKey  ? '✅ set' : '❌ missing');
    process.exit(1);
}

// Regular client (anon key) — for auth and user-facing reads
export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client (service role key) — bypasses RLS, used only in trusted backend code
// Falls back to anon key if service key not set (will log a warning)
if (!serviceKey) {
    console.warn('⚠️  SUPABASE_SERVICE_KEY not set — profile inserts may fail under RLS.');
}
export const supabaseAdmin = createClient(supabaseUrl, serviceKey || supabaseKey);

console.log('✅ Supabase client ready →', supabaseUrl);
