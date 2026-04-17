import requests
import pandas as pd
import time
import random
import psycopg2
from dotenv import load_dotenv
import os

# ================= LOAD ENV =================

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# ================= CONFIG =================

BASE_URL = "https://openlibrary.org/search.json"
COVER_URL = "https://covers.openlibrary.org/b/id/{}-L.jpg"

TOPICS = [
    "programming", "python", "java", "javascript",
    "machine learning", "data science",
    "web development", "database systems"
]

books_data = []
visited = set()

# ================= DB CONNECT =================

def connect_db():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Connected to Supabase DB")
        return conn
    except Exception as e:
        print("❌ DB Connection Error:", e)
        return None

# ================= CREATE TABLE =================

def create_table(conn):
    query = """
    CREATE TABLE IF NOT EXISTS book_info (
        id SERIAL PRIMARY KEY,
        title TEXT,
        author TEXT,
        publisher TEXT,
        category TEXT,
        language TEXT,
        isbn10 TEXT,
        isbn13 TEXT,
        cover_image_url TEXT,
        description TEXT,
        source_url TEXT,
        price_inr INT
    );
    """
    cur = conn.cursor()
    cur.execute(query)
    conn.commit()
    cur.close()
    print("✅ Table ready")

# ================= FETCH BOOKS =================

def fetch_books(limit=200):
    for topic in TOPICS:
        print(f"\n🔍 Fetching: {topic}")
        page = 1

        while len(books_data) < limit:
            try:
                res = requests.get(BASE_URL, params={"q": topic, "page": page}, timeout=15)
                data = res.json()
            except Exception as e:
                print(f"  ⚠️  Request failed on page {page}: {e}")
                break

            docs = data.get("docs", [])
            if not docs:
                break

            for book in docs:
                if len(books_data) >= limit:
                    break

                key = book.get("key")
                if not key or key in visited:
                    continue
                visited.add(key)

                isbn10, isbn13 = None, None
                if "isbn" in book:
                    for i in book["isbn"]:
                        if len(i) == 10 and isbn10 is None:
                            isbn10 = i
                        elif len(i) == 13 and isbn13 is None:
                            isbn13 = i

                cover_id = book.get("cover_i")
                cover_image_url = COVER_URL.format(cover_id) if cover_id else None

                first_sentence = book.get("first_sentence")
                if isinstance(first_sentence, dict):
                    description = first_sentence.get("value", "N/A")
                elif isinstance(first_sentence, str):
                    description = first_sentence
                else:
                    description = "N/A"

                books_data.append({
                    "title":           book.get("title") or "N/A",
                    "author":          ", ".join(book.get("author_name", [])) or "N/A",
                    "publisher":       ", ".join(book.get("publisher", [])) or "N/A",
                    "category":        topic,
                    "language":        ", ".join(book.get("language", [])) or "N/A",
                    "isbn10":          isbn10,
                    "isbn13":          isbn13,
                    "cover_image_url": cover_image_url,
                    "description":     description,
                    "source_url":      f"https://openlibrary.org{key}",
                    "price_inr":       random.randint(300, 1500)
                })

            print(f"  Page {page} | Total books so far: {len(books_data)}")
            page += 1
            time.sleep(1)

            if len(books_data) >= limit:
                break

# ================= SAVE EXCEL =================

def save_excel(filename="books.xlsx"):
    df = pd.DataFrame(books_data)
    df.to_excel(filename, index=False)
    print(f"✅ Excel saved → {filename}  ({len(books_data)} rows)")

# ================= INSERT DB =================

def insert_db(conn):
    cur = conn.cursor()

    query = """
        INSERT INTO book_info
        (title, author, publisher, category, language, isbn10, isbn13,
         cover_image_url, description, source_url, price_inr)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    success = 0
    for book in books_data:
        try:
            cur.execute(query, (
                book["title"],
                book["author"],
                book["publisher"],
                book["category"],
                book["language"],
                book["isbn10"],
                book["isbn13"],
                book["cover_image_url"],
                book["description"],
                book["source_url"],
                book["price_inr"]
            ))
            success += 1
        except Exception as e:
            print(f"  ❌ Insert Error: {e}")
            conn.rollback()

    conn.commit()
    cur.close()
    print(f"✅ Inserted {success}/{len(books_data)} books into DB")

# ================= MAIN =================

if __name__ == "__main__":
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set in .env — cannot connect to DB.")
        print("   Add it in Backend/.env like:")
        print("   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres")
        exit(1)

    conn = connect_db()

    if conn:
        create_table(conn)
        fetch_books(200)   # change to 2000 for full dataset
        save_excel()
        insert_db(conn)
        conn.close()
        print("\n🎉 ALL DONE SUCCESSFULLY")
    else:
        print("❌ Could not connect to DB. Saving to Excel only.")
        fetch_books(200)
        save_excel()
