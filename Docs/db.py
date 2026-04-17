"""
db.py — Upload books_2000_all_topics.xlsx → Supabase
Uses psycopg2 (direct PostgreSQL).

Requirements:  python -m pip install pandas openpyxl psycopg2-binary python-dotenv"""

import os
import sys
import math
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# ──────────────────────────────────────────────────────────────
# 1.  Credentials
# ──────────────────────────────────────────────────────────────

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
ENV_PATH   = os.path.join(BASE_DIR, "Backend", ".env")
EXCEL_PATH = os.path.join(BASE_DIR, "books_2000_all_topics.xlsx")

load_dotenv(ENV_PATH)

# Pooler URL (port 6543, transaction mode) — for data inserts
DATABASE_URL = os.getenv("DATABASE_URL", "")
# Direct session URL (port 5432) — for DDL like CREATE TABLE
DATABASE_URL_DIRECT = os.getenv("DATABASE_URL_DIRECT", "") or DATABASE_URL

if not DATABASE_URL:
    sys.exit("❌  DATABASE_URL not set in Backend/.env")

def get_connection(url: str, label: str = "") -> psycopg2.extensions.connection:
    try:
        conn = psycopg2.connect(url)
        conn.autocommit = False
        print(f"✅  Connected{' (' + label + ')' if label else ''} to Supabase DB")
        return conn
    except Exception as e:
        sys.exit(f"❌  Connection failed{' (' + label + ')' if label else ''}: {e}")


# ──────────────────────────────────────────────────────────────
# 2.  Create table (if not exists)
# ──────────────────────────────────────────────────────────────

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS public.book_info (
    id              SERIAL PRIMARY KEY,
    title           TEXT,
    author          TEXT,
    publisher       TEXT,
    category        TEXT,
    permission      TEXT,
    paperback       TEXT,
    ebook           TEXT,
    language        TEXT,
    isbn10          TEXT,
    isbn13          TEXT,
    cover_image_url TEXT,
    description     TEXT,
    source_url      TEXT,
    price_inr       INT
);
"""

def create_table(conn):
    with conn.cursor() as cur:
        cur.execute(CREATE_SQL)
    conn.commit()
    print("✅  Table `book_info` ready\n")


# ──────────────────────────────────────────────────────────────
# 3.  Read & normalise Excel
# ──────────────────────────────────────────────────────────────

# All columns we want to insert (order matches INSERT below)
COLUMNS = [
    "title", "author", "publisher", "category",
    "permission", "paperback", "ebook", "language",
    "isbn10", "isbn13", "cover_image_url", "description",
    "source_url", "price_inr",
]

def clean(v):
    if v is None:
        return None
    try:
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
    except Exception:
        pass
    return v.item() if hasattr(v, "item") else v


def load_excel() -> list[tuple]:
    print(f"📖  Reading {os.path.basename(EXCEL_PATH)} …")
    df = pd.read_excel(EXCEL_PATH, engine="openpyxl")
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    print(f"   Excel columns : {list(df.columns)}")
    print(f"   Total rows    : {len(df)}\n")

    # Keep only columns that exist; fill missing ones with None
    rows = []
    for _, row in df.iterrows():
        rows.append(tuple(clean(row.get(col)) for col in COLUMNS))

    return rows


# ──────────────────────────────────────────────────────────────
# 4.  Insert in batches
# ──────────────────────────────────────────────────────────────

INSERT_SQL = f"""
    INSERT INTO public.book_info ({", ".join(COLUMNS)})
    VALUES %s
"""

BATCH_SIZE = 200   # execute_values handles large chunks efficiently

def upload(conn, rows: list[tuple]):
    total   = len(rows)
    batches = math.ceil(total / BATCH_SIZE)
    success = 0

    print(f"🚀  Uploading {total} rows in {batches} batches …\n")

    with conn.cursor() as cur:
        for i in range(0, total, BATCH_SIZE):
            batch     = rows[i : i + BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            try:
                execute_values(cur, INSERT_SQL, batch)
                conn.commit()
                success += len(batch)
                pct = int(success / total * 100)
                print(f"  ✅  [{pct:3d}%] Batch {batch_num}/{batches} — {len(batch)} rows")
            except KeyboardInterrupt:
                conn.rollback()
                print("\n⛔  Interrupted — rolling back last batch.")
                break
            except Exception as e:
                conn.rollback()
                print(f"  ❌  Batch {batch_num}/{batches} error: {e}")

    print()
    print("═" * 50)
    print(f"  🎉  Inserted : {success} / {total}")
    if success < total:
        print(f"  ❌  Failed  : {total - success}")
    print("═" * 50)


# ──────────────────────────────────────────────────────────────
# 5.  Main
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 50)
    print("  📚  Library Data Uploader → Supabase")
    print("=" * 50 + "\n")

    # Use direct connection for DDL (CREATE TABLE)
    ddl_conn = get_connection(DATABASE_URL_DIRECT, "direct")
    create_table(ddl_conn)
    ddl_conn.close()

    # Use pooler connection for bulk inserts
    data_conn = get_connection(DATABASE_URL, "pooler")
    rows = load_excel()
    upload(data_conn, rows)
    data_conn.close()
