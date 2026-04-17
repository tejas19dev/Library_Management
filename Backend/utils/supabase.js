import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Resolve .env path relative to this file — works from any working directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
// Accept both SUPABASE_ANON_KEY and SUPABASE_KEY (either name works)
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    console.error('   SUPABASE_URL   :', supabaseUrl  ? '✅ set' : '❌ missing');
    console.error('   SUPABASE_KEY   :', supabaseKey  ? '✅ set' : '❌ missing');
    process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase client ready →', supabaseUrl);
