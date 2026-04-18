"""
set_admin.py — Set a user as admin
Run: python set_admin.py
Then enter the email of the user you want to make admin
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
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        return conn
    except Exception as e:
        sys.exit(f"Connection failed: {e}")

if __name__ == "__main__":
    email = input("Enter user email to make admin: ").strip()
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE public.users SET role = 'admin' WHERE email = %s RETURNING id, email, role;", (email,))
            result = cur.fetchone()
            if result:
                print(f"✅ User {email} is now an admin!")
            else:
                print(f"❌ User {email} not found in users table")
                print("\nCurrent users:")
                cur.execute("SELECT email, role FROM public.users")
                for row in cur.fetchall():
                    print(f"  - {row[0]} ({row[1]})")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()