import { fetchAPI, showToast } from './api.js';
import { checkAuth, login, parseJwt, logout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Global Logout Listeners
    document.querySelectorAll('[data-icon="logout"]').forEach(el => {
        const link = el.closest('a') || el.closest('button');
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
    });

    const path = window.location.pathname;

    // Route logic
    if (path.includes('login_page.html')) {
        initLogin();
    } else if (path.includes('signup_page.html')) {
        initSignup();
    } else if (path.includes('books.html')) {
        initBooksCatalog();
    } else if (path.includes('dashboard.html')) {
        checkAuth(true); // requires admin
        initDashboard();
    } else if (path.includes('issue_return_mgmt.html')) {
        checkAuth(true); // admin normally handles this table, or change if users can view
        initTransactions();
    } else if (path.includes('admin_add_edit_book.html')) {
        checkAuth(true);
        initAddBook();
    } else if (path.includes('user_profile.html')) {
        checkAuth();
        initUserProfile();
    } else if (path.includes('members.html')) {
        checkAuth(true); // admin-only
        initMembers();
    } else if (path.includes('issue.html')) {
        checkAuth(true);
        initManualIssue();
    }
});

// -------------- PAGE SPECIFIC LOGIC --------------

function initLogin() {
    const form = document.querySelector("form");
    if (!form) return;

    // Check if URL has access_token from Supabase OAuth
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const token = hashParams.get('access_token');
    
    if (token) {
        localStorage.setItem('token', token);
        const decoded = parseJwt(token);
        if (decoded?.role === 'admin') {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'books.html';
        }
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const submitBtn = form.querySelector("button[type='submit']");
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = "Authenticating...";
        submitBtn.disabled = true;

        try {
            await login(email, password);
        } catch (error) {
            // Toast automatically handled by fetchAPI
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ── SIGNUP PAGE ────────────────────────────────────────────────
function initSignup() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('full_name').value.trim();
        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirm  = document.getElementById('confirm_password').value;

        // Client-side validation
        if (!fullName || fullName.length < 2) {
            alert('Please enter your full name.');
            return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Enter a valid email address.');
            return;
        }
        if (!password || password.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            alert('Passwords do not match.');
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.textContent = 'Creating account...';
        btn.disabled = true;

        try {
            // 1. Register
            await fetchAPI('/auth/signup', { method: 'POST', body: { email, password, full_name: fullName, role: 'user' } });

            // 2. Auto-login
            const loginData = await fetchAPI('/auth/login', { method: 'POST', body: { email, password } }, true);
            localStorage.setItem('token', loginData.token);
            alert('Account created! Welcome to The Archive.');

            setTimeout(() => {
                window.location.href = 'books.html';
            }, 800);
        } catch (err) {
            btn.textContent = 'Create Account';
            btn.disabled = false;
        }
    });
}

function initBooksCatalog() {
    const container = document.getElementById('books-grid');
    if (!container) return;

    window.issueBook = async (bookId) => {
        try {
            await fetchAPI('/transactions/issue', {
                method: 'POST',
                body: { book_id: bookId }
            });
            loadBooks(); // refresh
        } catch(err) {
            // handlded by toast
        }
    };

    async function loadBooks(query = '') {
        container.innerHTML = `<div class='col-span-full text-center py-10'><div class='w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4'></div><p class='text-on-surface-variant font-medium'>Fetching the archive...</p></div>`;
        try {
            const url = query ? `/books/search?q=${encodeURIComponent(query)}` : `/books`;
            const payload = await fetchAPI(url, {}, true); // silent load to avoid spinner overlay spam
            let books = [];
            // Handle if backend wraps in { books: [] } or returns []
            if (Array.isArray(payload)) {
                books = payload;
            } else if (payload && Array.isArray(payload.books)) {
                books = payload.books;
            } else {
                books = payload.data || [];
            }
            
            container.innerHTML = "";
            if (books.length === 0) {
                container.innerHTML = "<p class='col-span-full text-center py-10 text-on-surface-variant'>No works found in the archive.</p>";
                return;
            }

            books.forEach(book => {
                const coverUrl = book.cover_image_url || '';
                const coverHtml = coverUrl
                    ? `<img src="${coverUrl}" alt="${book.title}" class="w-full h-full object-cover" onerror="this.style.display='none'">`
                    : `<span class="material-symbols-outlined text-4xl text-on-surface-variant/30">auto_stories</span>`;
                const isbn = book.isbn13 || book.isbn10 || 'N/A';
                const statusHtml = `<span class="inline-flex items-center px-4 py-1.5 rounded-full bg-tertiary-container text-xs font-black text-on-tertiary-container uppercase tracking-tight shadow-sm border border-tertiary-container/50"><span class="w-1.5 h-1.5 rounded-full bg-on-tertiary-container mr-2 animate-pulse"></span>Available</span>`;
                container.innerHTML += `
<div class="group bg-surface-container-lowest rounded-[2rem] p-6 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 border border-outline-variant/10 hover:border-primary/20 flex flex-col h-full relative overflow-hidden">
    <!-- Decorative background element -->
    <div class="absolute -right-16 -top-16 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>

        <div class="flex gap-6 mb-8 relative">
        <div class="w-32 h-44 rounded-xl overflow-hidden shadow-lg shadow-on-surface/10 group-hover:shadow-primary/20 group-hover:-translate-y-2 transition-all duration-500 relative bg-surface-container-low flex items-center justify-center">
            ${coverHtml}
        </div>
        <div class="flex-1 pt-2">
            ${statusHtml}
            <h3 class="font-headline font-extrabold text-xl text-on-surface mt-4 tracking-tight leading-tight group-hover:text-primary transition-colors">${book.title}</h3>
            <p class="text-on-surface-variant text-sm font-medium mt-2">${book.author}</p>
        </div>
    </div>
    <div class="mt-auto space-y-4">
        <div class="flex items-center justify-between">
            <div class="flex flex-col">
                <span class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Category</span>
                <span class="text-xs font-medium text-on-surface bg-surface-container py-1 px-3 rounded-md mt-1 inline-block">${book.category}</span>
            </div>
            <div class="text-right">
                <span class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Accession No.</span>
                <span class="block text-xs font-mono text-on-surface mt-1">${isbn}</span>
            </div>
        </div>
        <div class="pt-4 border-t border-outline-variant/20 flex justify-between items-center">
            <button class="text-on-surface-variant hover:text-primary transition-colors p-2 -ml-2 rounded-full hover:bg-surface-container flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px]" data-icon="bookmark_add">bookmark_add</span>
            </button>
            <button onclick="issueBook('${book.id}')" class="bg-on-surface hover:bg-primary text-surface-container-lowest font-headline font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-md transition-all duration-300 active:scale-95 group/btn flex items-center gap-2">
                Issue Asset <span class="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
            </button>
        </div>
    </div>
</div>
                `;
            });
        } catch(err) {
            container.innerHTML = `<p class='col-span-full text-center py-10 text-error font-medium'>Error loading archive: ${err.message}</p>`;
        }
    }

    loadBooks();

    const searchInput = document.querySelector('input[placeholder="Search the archives..."]') || document.querySelector('input[type="text"]');
    if (searchInput) {
        let timeout = null;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                loadBooks(e.target.value);
            }, 500);
        });
    }
}

function initDashboard() {
    const statsElements = {
        totalBooks: document.getElementById('stat-total-books'),
        totalIssued: document.getElementById('stat-issued-books'),
        overdueItems: document.getElementById('stat-overdue-books')
    };

    async function loadStats() {
        try {
            const data = await fetchAPI('/admin/stats');
            if (statsElements.totalBooks) statsElements.totalBooks.innerText = data.stats.totalBooks || 0;
            if (statsElements.totalIssued) statsElements.totalIssued.innerText = data.stats.issuedBooks || 0;
            if (statsElements.overdueItems) statsElements.overdueItems.innerText = data.stats.overdueBooks || 0;
        } catch (err) {
            console.error("Dashboard stats error", err);
        }
    }
    loadStats();
}

function initTransactions() {
    const tbody = document.getElementById("transaction-list");
    if (!tbody) return;

    window.returnBook = async (txnId) => {
        try {
            const res = await fetchAPI('/transactions/return', {
                method: 'POST',
                body: { transaction_id: txnId }
            });
            // Toast automatically handled
            if (res.fine > 0) showToast('error', `Late fine applied: ₹${res.fine}`);
            loadTx();
        } catch (err) {}
    };

    async function loadTx() {
        tbody.innerHTML = "<tr><td colspan='6' class='text-center py-4'>Loading history...</td></tr>";
        try {
            const history = await fetchAPI("/transactions/history", {}, true);
            tbody.innerHTML = "";
            let dataArr = Array.isArray(history) ? history : (history.data || []);
            
            if (dataArr.length === 0) {
                tbody.innerHTML = "<tr><td colspan='6' class='text-center py-4'>No recent transactions found.</td></tr>";
                return;
            }

            dataArr.forEach(txn => {
                const isOverdue = txn.status === 'issued' && new Date(txn.due_date) < new Date();
                const d = new Date(txn.issue_date);
                const dd = new Date(txn.due_date);
                
                const statusUI = txn.status === 'returned' 
                    ? `<span class="inline-flex items-center px-2 py-1 rounded bg-surface-container-highest text-[10px] font-black uppercase tracking-tight">Returned</span>`
                    : isOverdue 
                        ? `<span class="inline-flex items-center px-2 py-1 rounded bg-error-container text-[10px] font-black text-on-error-container uppercase tracking-tight">Overdue</span>`
                        : `<span class="inline-flex items-center px-2 py-1 rounded bg-tertiary-container text-[10px] font-black text-on-tertiary-container uppercase tracking-tight">Active</span>`;

                const actionBtn = txn.status === 'issued' 
                    ? `<button onclick="returnBook('${txn.id}')" class="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg hover:bg-primary-dim transition-colors shadow-sm">Return Asset</button>`
                    : `<span class="text-xs text-on-surface-variant font-bold">₹${txn.fine_amount || 0} Fine</span>`;

                tbody.innerHTML += `
                    <tr class="group hover:bg-surface-container-low transition-colors">
                        <td class="px-6 py-4 bg-surface-container-low rounded-l-xl first:group-hover:bg-transparent">
                            <p class="font-bold text-on-surface">${txn.book_info ? txn.book_info.title : 'Unknown'}</p>
                            <p class="text-xs text-on-surface-variant font-medium">${txn.book_info ? txn.book_info.author : 'Unknown'}</p>
                        </td>
                        <td class="px-6 py-4 bg-surface-container-low first:group-hover:bg-transparent">User</td>
                        <td class="px-6 py-4 bg-surface-container-low first:group-hover:bg-transparent">
                            <p class="text-sm font-medium">${d.toLocaleDateString()}</p>
                        </td>
                        <td class="px-6 py-4 bg-surface-container-low first:group-hover:bg-transparent">
                            <p class="text-sm font-bold ${isOverdue ? 'text-error' : ''}">${dd.toLocaleDateString()}</p>
                        </td>
                        <td class="px-6 py-4 bg-surface-container-low first:group-hover:bg-transparent">${statusUI}</td>
                        <td class="px-6 py-4 bg-surface-container-low rounded-r-xl text-right first:group-hover:bg-transparent">${actionBtn}</td>
                    </tr>
                `;
            });
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan='6' class='text-center py-4 text-error'>Error: ${err.message}</td></tr>`;
        }
    }
    loadTx();
}

function initAddBook() {
    const form = document.getElementById("add-book-form");
    if(!form) return;
    
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const categoryVal = document.getElementById('book-category').value;
        const payload = {
            title:           document.getElementById('book-title').value,
            author:          document.getElementById('book-author').value,
            publisher:       document.getElementById('book-publisher')?.value || '',
            category:        categoryVal === 'Select Category' ? 'General' : categoryVal,
            isbn10:          document.getElementById('book-isbn')?.value || null,
            price_inr:       parseInt(document.getElementById('book-price')?.value || '0'),
            language:        document.getElementById('book-language')?.value || 'English',
        };

        try {
            await fetchAPI('/books', {
                method: 'POST',
                body: payload
            });
            form.reset();
        } catch (err) {}
    });
}

function initManualIssue() {
    // issue.html if it acts as admin_add_edit_book? 
    // It seems user combined them. We'll reuse initAddBook and initTransactions if elements exist.
    initAddBook();
    initTransactions();
}

function initUserProfile() {
    async function loadProfile() {
        try {
            // 1. Load user info from /auth/me
            const meData = await fetchAPI('/auth/me', {}, true);
            const user = meData?.user;
            if (user) {
                // Update name in the hero section
                const nameEl = document.querySelector('h2.text-4xl');
                if (nameEl) nameEl.textContent = user.full_name || user.email;

                // Update role badge
                const roleEl = document.querySelector('.bg-tertiary-container.text-on-tertiary-container');
                if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Admin' : 'Member';

                // Update avatar initials fallback
                const avatarImg = document.querySelector('.h-40.w-40 img');
                if (avatarImg) avatarImg.alt = user.full_name || 'User';
            }

            // 2. Load borrow history
            const history = await fetchAPI('/transactions/history', {}, true);
            const items = Array.isArray(history) ? history : (history?.data || []);

            // Update Books Read stat
            const booksReadEl = document.querySelector('.bg-tertiary-container p.text-3xl');
            if (booksReadEl) booksReadEl.textContent = items.length;

            // Populate borrow history list
            const historyContainer = document.querySelector('.col-span-12.lg\\:col-span-7 .space-y-4');
            if (historyContainer && items.length > 0) {
                historyContainer.innerHTML = '';
                items.slice(0, 5).forEach(txn => {
                    const bookInfo = txn.book_info || {};
                    const cover = bookInfo.cover_image_url || '';
                    const coverHtml = cover
                        ? `<img src="${cover}" class="w-full h-full object-cover" alt="Cover" onerror="this.style.display='none'">`
                        : `<span class="material-symbols-outlined text-2xl text-slate-300">auto_stories</span>`;
                    const isActive = txn.status === 'issued';
                    const statusBadge = isActive
                        ? `<span class="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded uppercase">Active</span>`
                        : `<span class="px-3 py-1 bg-tertiary-container text-on-tertiary-container text-[10px] font-black rounded uppercase">Returned</span>`;
                    const dateStr = isActive
                        ? `Due: ${new Date(txn.due_date).toLocaleDateString()}`
                        : `Returned: ${txn.return_date ? new Date(txn.return_date).toLocaleDateString() : '—'}`;

                    historyContainer.innerHTML += `
                        <div class="group bg-surface-container-lowest p-5 rounded-2xl flex items-center gap-6 hover:shadow-xl hover:shadow-slate-200/40 transition-all">
                            <div class="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 shadow-sm bg-slate-100 flex items-center justify-center">
                                ${coverHtml}
                            </div>
                            <div class="flex-1">
                                <div class="flex justify-between items-start">
                                    <h4 class="font-bold text-lg text-slate-800">${bookInfo.title || 'Unknown Title'}</h4>
                                    ${statusBadge}
                                </div>
                                <p class="text-slate-500 text-sm">${bookInfo.author || ''} • ${dateStr}</p>
                            </div>
                        </div>`;
                });
            }
        } catch (err) {
            console.error('Profile load error:', err);
        }
    }
    loadProfile();
}

function initMembers() {
    const tbody = document.getElementById('members-tbody');
    if (!tbody) return;

    async function loadMembers() {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">Loading members...</td></tr>`;
        try {
            const data = await fetchAPI('/admin/users', {}, true);
            const users = data?.users || [];
            if (users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No members found.</td></tr>`;
                return;
            }
            tbody.innerHTML = '';
            users.forEach((u, i) => {
                tbody.innerHTML += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${u.full_name || '—'}</td>
                        <td>${u.email}</td>
                        <td><span class="px-2 py-0.5 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">${u.role}</span></td>
                        <td>${new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>`;
            });
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Failed to load members.</td></tr>`;
        }
    }
    loadMembers();
}
