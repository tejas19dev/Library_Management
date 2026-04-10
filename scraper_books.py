"""
FreeComputerBooks.com — Full Scraper (All Categories, All Books)
================================================================
Scrapes every category page listed on sitemap.html, then scrapes
each individual book page for: title, author, price, cover image,
description, and source URL.

Run:
    pip install requests beautifulsoup4 pandas openpyxl
    python scraper_books.py

Output: books_data_full.xlsx  (in same folder as the script)
"""

import re
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, quote_plus
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ─────────────────────────────────────────────────────────────────────────────
BASE_URL   = "https://freecomputerbooks.com"
SITEMAP    = BASE_URL + "/sitemap.html"
HEADERS    = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}
DELAY = 1.0   # seconds between requests

# Patterns that indicate a page is NOT an individual book
NON_BOOK_PATTERNS = [
    "Category", "sitemap", "recentbooks", "top-",
    "books2024", "books2025", "books2026", "books2023",
    "books2022", "books2021", "books202",
    "about_books", "books_faq", "otherBooks",
    "miscellaneousBooks", "miscBooks",
    "searchEngines", "webTools", "mobile.html",
]

books_data    = []
visited_books = set()

# ─────────────────────────────────────────────────────────────────────────────
def get(url, timeout=15):
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
        return r
    except Exception as e:
        print(f"    ✗ GET failed {url}: {e}")
        return None


def is_book_page(href):
    """True if href looks like an individual book detail page."""
    if not href or not href.endswith(".html"):
        return False
    if any(p in href for p in NON_BOOK_PATTERNS):
        return False
    # Category listing pages end with 'Books.html' or 'Category.html'
    if href.endswith("Books.html") or href.endswith("Category.html"):
        return False
    return True


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — collect every category/listing page from the sitemap
# ─────────────────────────────────────────────────────────────────────────────
def get_all_category_pages():
    print(f"  Fetching sitemap: {SITEMAP}")
    r = get(SITEMAP)
    if not r:
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    pages = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        full = urljoin(BASE_URL + "/", href)
        if (BASE_URL in full
                and href.endswith(".html")
                and not any(p in href for p in [
                    "about_books", "books_faq", "otherBooks",
                    "searchEngines", "webTools", "tradepub"
                ])):
            pages.add(full)
    return list(pages)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — extract book page links from a category/listing page
# ─────────────────────────────────────────────────────────────────────────────
def get_book_links(listing_url):
    r = get(listing_url)
    if not r:
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not is_book_page(href):
            continue
        full = urljoin(BASE_URL + "/", href)
        if full not in visited_books and BASE_URL in full:
            visited_books.add(full)
            links.append(full)
    return links


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — scrape one book detail page
# ─────────────────────────────────────────────────────────────────────────────
def scrape_book(url):
    r = get(url)
    if not r:
        return
    soup = BeautifulSoup(r.text, "html.parser")

    # ── Title ──────────────────────────────────────────────────────────────
    title = "N/A"
    h1 = soup.find("h1")
    if h1:
        title = h1.get_text(strip=True)

    # ── Author ─────────────────────────────────────────────────────────────
    # Book pages have:  <li><strong>Author(s):</strong> Name</li>
    author = "N/A"
    for li in soup.find_all("li"):
        text = li.get_text(strip=True)
        m = re.match(r"Authors?\s*[:(]\s*(.+)", text, re.IGNORECASE)
        if m:
            author = m.group(1).strip().rstrip(")")
            break
    if author == "N/A":
        for strong in soup.find_all(["strong", "b"]):
            if re.search(r"author", strong.get_text(), re.IGNORECASE):
                sib = strong.next_sibling
                if sib:
                    candidate = str(sib).strip().lstrip(":").strip()
                    if candidate:
                        author = candidate
                        break

    # ── Cover image ────────────────────────────────────────────────────────
    # Site stores covers at:  /covers/Book-Name_43x55.jpg
    cover_img = "N/A"
    for img in soup.find_all("img"):
        src = img.get("src", "")
        if "/covers/" in src:
            cover_img = urljoin(BASE_URL + "/", src)
            break
    if cover_img == "N/A" and title != "N/A":
        cover_img = (
            "https://www.google.com/search?tbm=isch&q="
            + quote_plus(title + " book cover")
        )

    # ── Description ────────────────────────────────────────────────────────
    # Appears after a bold "Book Description" heading on the page
    description = "N/A"
    desc_header = soup.find(
        lambda t: t.name in ["strong", "b", "h2", "h3", "p"]
                  and "book description" in t.get_text(strip=True).lower()
    )
    if desc_header:
        for sib in desc_header.find_next_siblings():
            text = sib.get_text(strip=True)
            if text and len(text) > 30:
                description = text[:1500]
                break
    if description == "N/A":
        best = ""
        for p in soup.find_all("p"):
            t = p.get_text(strip=True)
            if len(t) > 80 and len(t) > len(best):
                best = t
        if best:
            description = best[:1500]

    books_data.append({
        "Book Name":       title,
        "Author Name":     author,
        "Price":           "Free",
        "Cover Image URL": cover_img,
        "Description":     description,
        "Source URL":      url,
    })
    print(f"  [{len(books_data):>4}] {title[:70]}")


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — write formatted Excel file
# ─────────────────────────────────────────────────────────────────────────────
def save_excel(path="books_data_full.xlsx"):
    wb = Workbook()
    ws = wb.active
    ws.title = "All Books"

    hdr_fill  = PatternFill("solid", start_color="1F4E79", end_color="1F4E79")
    hdr_font  = Font(name="Arial", bold=True, color="FFFFFF", size=11)
    hdr_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    dat_font  = Font(name="Arial", size=10)
    dat_align = Alignment(vertical="top", wrap_text=True)
    thin = Side(style="thin", color="CCCCCC")
    brd  = Border(left=thin, right=thin, top=thin, bottom=thin)
    alt  = [
        PatternFill("solid", start_color="FFFFFF", end_color="FFFFFF"),
        PatternFill("solid", start_color="D6E4F0", end_color="D6E4F0"),
    ]

    COLS   = ["#", "Book Name", "Author Name", "Price",
              "Cover Image URL", "Description", "Source URL"]
    WIDTHS = [5,   50,           35,            10, 60, 100, 60]

    for c, (h, w) in enumerate(zip(COLS, WIDTHS), 1):
        cell = ws.cell(row=1, column=c, value=h)
        cell.font = hdr_font; cell.fill = hdr_fill
        cell.alignment = hdr_align; cell.border = brd
        ws.column_dimensions[get_column_letter(c)].width = w
    ws.row_dimensions[1].height = 28
    ws.freeze_panes = "A2"

    for r, d in enumerate(books_data, 2):
        fill = alt[(r - 2) % 2]
        values = [r - 1, d["Book Name"], d["Author Name"], d["Price"],
                  d["Cover Image URL"], d["Description"], d["Source URL"]]
        for c, v in enumerate(values, 1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.font = dat_font; cell.fill = fill
            cell.alignment = dat_align; cell.border = brd
        ws.row_dimensions[r].height = 70

    wb.save(path)
    print(f"\n✅  Saved {len(books_data)} books → {path}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("=" * 65)
    print("  FreeComputerBooks — Complete Scraper (All Pages)")
    print("=" * 65)

    print("\n[1/4] Collecting category/listing pages from sitemap …")
    listing_pages = get_all_category_pages()
    print(f"      → {len(listing_pages)} listing pages found\n")

    print("[2/4] Scanning every listing page for book links …")
    all_book_links = []
    for i, page in enumerate(listing_pages, 1):
        print(f"  ({i:>3}/{len(listing_pages)}) {page}")
        links = get_book_links(page)
        all_book_links.extend(links)
        print(f"          +{len(links):>3} links  |  total so far: {len(all_book_links)}")
        time.sleep(DELAY)
    print(f"\n      → {len(all_book_links)} unique book pages to scrape\n")

    print("[3/4] Scraping each book page …")
    for link in all_book_links:
        scrape_book(link)
        time.sleep(DELAY)
    print(f"\n      → {len(books_data)} books scraped\n")

    print("[4/4] Writing Excel file …")
    save_excel("books_data_full.xlsx")


if __name__ == "__main__":
    main()
