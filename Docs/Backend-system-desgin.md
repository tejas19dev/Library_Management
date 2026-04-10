# Library Management Backend Specification

This document satisfies the requested system architecture, database schema, and folder structure. Once you approve this plan, we will begin writing the actual code files for these modules!

---

## 1. Folder Structure (MVC Architecture)

We will expand your current `Backend` directory:
```text
Backend/
├── controllers/          # Business logic for requests
│   ├── authController.js
│   ├── bookController.js
│   ├── transactionController.js
│   ├── reviewController.js
│   └── adminController.js
├── middleware/           # Protected routes & role checks
│   ├── authMiddleware.js # Verifies Supabase JWT
│   └── roleMiddleware.js # Checks User vs Admin
├── routers/              # Express route definitions
│   ├── authRoutes.js
│   ├── bookRoutes.js
│   ├── transactionRoutes.js
│   ├── reviewRoutes.js
│   └── adminRoutes.js
├── utils/
│   ├── supabase.js       # Pre-configured Supabase client
│   └── cronJobs.js       # Basic due date reminder system (Bonus)
├── server.js             # Express entry point
└── .env                  # Port & Supabase API keys
```

---

## 2. Database Schema (Supabase PostgreSQL)

You will need to create the following tables in your Supabase Dashboard:

### `users`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key, references `auth.users(id)` |
| `email` | text | Unique |
| `role` | text | Default `'user'` (values: 'admin', 'user') |
| `full_name` | text | |

### `books`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key, auto-generated |
| `title` | text | |
| `author` | text | |
| `category` | text | |
| `isbn` | text | Unique |
| `quantity` | int | Default `1` |
| `available_quantity` | int | Default `1` |

### `transactions` (Issue/Return)
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `user_id` | uuid | Foreign Key -> `users(id)` |
| `book_id` | uuid | Foreign Key -> `books(id)` |
| `issue_date` | timestamp | Default `now()` |
| `due_date` | timestamp | Default `now() + 14 days` |
| `return_date` | timestamp | Nullable |
| `fine_amount` | numeric | Default `0` |
| `status` | text | Default `'issued'` (values: 'issued', 'returned') |

### `reviews`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `user_id` | uuid | Foreign Key -> `users(id)` |
| `book_id` | uuid | Foreign Key -> `books(id)` |
| `rating` | int | Check: `rating >= 1 AND rating <= 5` |
| `review_text` | text | |

---

## 3. API Endpoints List

### Auth (`/api/auth`)
- `POST /signup` - Register user (Supabase Auth)
- `POST /login` - Login user (Returns JWT token)

### Books (`/api/books`)
- `GET /` - Get books (paginated, e.g., `?page=1&limit=10`) 
- `GET /search` - Search books by title, author, category
- `POST /` - Add book (Admin only)
- `PUT /:id` - Update book (Admin only)
- `DELETE /:id` - Delete book (Admin only)

### Transactions (`/api/transactions`)
- `POST /issue` - Issue a book (Validates `available_quantity > 0`)
- `POST /return` - Return a book (Calculates ₹5/day fine if overdue)
- `GET /history` - View borrow history (Protected: User views own, Admin views all)

### Reviews (`/api/reviews`)
- `POST /` - Add a rating and review
- `GET /:bookId` - Get reviews for a book

### Admin Dashboard (`/api/admin`)
- `GET /stats` - Returns counts (total books, users, issued, overdue)

---

## 4. Sample Integration Examples

Below are snippets illustrating how the requested logic will be built. 

### Middleware Sample (`authMiddleware.js`)
Requires passing the JWT token obtained from Google Login/Supabase Auth in the `Authorization` header.
```javascript
import { supabase } from '../utils/supabase.js';

export const verifyJWT = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    // Validate the token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return res.status(401).json({ error: "Invalid token" });
    
    req.user = user;
    next();
};

export const requireAdmin = async (req, res, next) => {
    // Fetch the user role from public.users
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

    if (userData?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
};
```

### Route & Controller Sample (Issue Book)
```javascript
import express from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { supabase } from '../utils/supabase.js';

const router = express.Router();

router.post('/issue', verifyJWT, async (req, res) => {
    const { book_id } = req.body;
    const userId = req.user.id;

    // 1. Check availability
    const { data: book } = await supabase.from('books').select('*').eq('id', book_id).single();
    
    if (!book || book.available_quantity <= 0) {
        return res.status(400).json({ error: "Book not available" });
    }

    // 2. Insert transaction
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 day borrow period

    const { data: transaction, error: txnError } = await supabase.from('transactions').insert([{
        user_id: userId,
        book_id: book_id,
        due_date: dueDate,
        status: 'issued'
    }]);

    if (txnError) return res.status(500).json({ error: txnError.message });

    // 3. Decrement available_quantity
    await supabase.from('books').update({ 
        available_quantity: book.available_quantity - 1 
    }).eq('id', book_id);

    res.json({ message: "Book issued successfully", due_date: dueDate });
});
export default router;
```

## Open Questions
> [!IMPORTANT]
> 1. To execute this plan, you must create the proposed SQL tables directly in your Supabase SQL Editor. I cannot execute queries directly against your cloud database without an API query script. **Are you comfortable creating these tables in Supabase?**
> 2. Once you approve this, I will set up the MVC folder structure and write out the files. Does the architecture look agreeable to you?
