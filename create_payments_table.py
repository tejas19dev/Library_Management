"""
create_payments_table.py — Create payments table for Stripe
Run: python create_payments_table.py
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, "Backend", ".env")
load_dotenv(ENV_PATH)
DATABASE_URL = os.getenv("DATABASE_URL_DIRECT", os.getenv("DATABASE_URL", ""))

def get_connection():
    global DATABASE_URL
    if not DATABASE_URL:
        print("Enter your Supabase DB password:")
        password = input("    Password: ").strip()
        if not password:
            sys.exit("No password provided")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        return conn
    except Exception as e:
        sys.exit(f"Connection failed: {e}")

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_session_id TEXT UNIQUE,
    stripe_payment_intent TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""

if __name__ == "__main__":
    print("Creating payments table...")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
        print("✅ Payments table created!")
        
        # Enable RLS
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;")
        print("✅ RLS enabled on payments")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()