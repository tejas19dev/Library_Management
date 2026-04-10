# Frontend to Backend Integration Readiness

The goal is to connect your standalone Frontend (HTML + Inline JS) with the Express Backend smoothly. Currently, the frontend JS is mostly implemented inside `<script>` tags using hardcoded data or `localStorage`. 

To make your frontend production-ready and fully integrated with the backend, we need to complete the following phases.

## Proposed Changes

---

### Backend Preparations

To allow requests from the frontend to the backend, the backend must enable **CORS** (Cross-Origin Resource Sharing) and properly parse JSON request bodies.

#### [MODIFY] package.json
- Add the `cors` package to dependencies. (Requires running `npm install cors` in your terminal).

#### [MODIFY] server.js
- Import and configure `cors` middleware.
- Add `express.json()` middleware to parse incoming request data (like when submitting a form or checking out the cart).

---

### Frontend Setup

Instead of hardcoding `http://localhost:4000/api` inside every single HTML file, we will create a global JavaScript utility that handles backend requests. This keeps the code clean and makes deployment easier.

#### [NEW] Frontend/src/utils/api.js
- Create a global `API_BASE_URL`.
- Implement wrapper functions (e.g., `apiGet`, `apiPost`, `apiPut`, `apiDelete`) that automatically include headers for JSON, handle HTTP errors, and interact seamlessly with your backend endpoints.

#### [MODIFY] Frontend/src/pages/*.html
- We will add the `<script src="../utils/api.js"></script>` to your HTML layouts (like `books.html`, `cart.html`, `payment.html`) so the frontend has access to the central `API` module.
- Based on your priority, I can also refactor an example page (e.g., `books.html` or `cart.html`) to demonstrate querying backend routes for data instead of relying on `localStorage`.

## Open Questions

> [!IMPORTANT]
> The backend currently doesn't have any data models or routes (e.g., `/api/books`, `/api/cart`) created yet. Would you like me to create the frontend API functions to expect specific endpoints, or should we also create basic Express routes for the backend during this integration?
> Do you want me to convert **all** the HTML pages to use the new API wrapper, or just one as an example so you can get a feel for how to structure the rest?

## Verification Plan

### Manual Verification
1. I will provide the updated code with `cors` running. You will start the backend (`npm start`).
2. We will load one of the modified frontend pages.
3. We will monitor the browser's Network tab to confirm that it sends a successful `GET` or `POST` request to the backend with no CORS errors.
