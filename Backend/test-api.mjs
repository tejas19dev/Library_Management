const BASE = 'http://localhost:5000/api';
let TOKEN = '';
let CREATED_BOOK_ID = '';
let TRANSACTION_ID = '';

const emailTest = `test_${Date.now()}@library.dev`;
const passwordTest = 'TestPass123!';

const log = (status, label, detail = '') => {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`  ${icon} [${status}] ${label}${detail ? ' — ' + detail : ''}`);
};

async function req(method, path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function runTests() {
    console.log('\n══════════════════════════════════════════════════');
    console.log('  📚 Library Management System — API Test Suite');
    console.log('══════════════════════════════════════════════════\n');

    // ── 1. Health Check ──
    console.log('▶ 1. Health Check');
    try {
        const r = await fetch('http://localhost:5000/');
        const d = await r.json();
        if (r.ok) log('PASS', 'GET /  →  Server is running', d.status);
        else log('FAIL', 'GET /  →  Server not responding');
    } catch {
        log('FAIL', 'GET /  →  Server offline — start with: npm run dev in Backend/');
        process.exit(1);
    }

    // ── 2. Auth: Signup ──
    console.log('\n▶ 2. Authentication');
    {
        const r = await req('POST', '/auth/signup', { email: emailTest, password: passwordTest, full_name: 'Test User' });
        if (r.status === 201) log('PASS', 'POST /auth/signup');
        else log('WARN', 'POST /auth/signup', `${r.status} — ${r.data.error || '(may already exist)'}`);
    }

    // ── 3. Auth: Login ──
    {
        const r = await req('POST', '/auth/login', { email: emailTest, password: passwordTest });
        if (r.status === 200 && r.data.token) {
            TOKEN = r.data.token;
            log('PASS', 'POST /auth/login', `Token received (${TOKEN.slice(0, 20)}...)`);
        } else {
            log('FAIL', 'POST /auth/login', r.data.error);
            console.log('\n  ⚠️  Cannot continue authenticated tests without a valid token.');
            return;
        }
    }

    // ── 4. Books ──
    console.log('\n▶ 3. Books API');
    {
        const r = await req('GET', '/books');
        if (r.status === 200) log('PASS', 'GET /books', `${Array.isArray(r.data) ? r.data.length : (r.data?.data?.length ?? '?')} books returned`);
        else log('FAIL', 'GET /books', r.data.error);
    }
    {
        const r = await req('POST', '/books', { title: 'API Test Book', author: 'Tester', category: 'Test', isbn: '000-TEST', quantity: 3 }, TOKEN);
        if (r.status === 201) {
            CREATED_BOOK_ID = r.data.book?.id || r.data.id || '';
            log('PASS', 'POST /books', `ID: ${CREATED_BOOK_ID}`);
        } else {
            log('FAIL', 'POST /books', r.data.error || r.data.message);
        }
    }
    if (CREATED_BOOK_ID) {
        const r = await req('PUT', `/books/${CREATED_BOOK_ID}`, { title: 'API Test Book (Updated)' }, TOKEN);
        if (r.status === 200) log('PASS', `PUT /books/${CREATED_BOOK_ID}`);
        else log('FAIL', `PUT /books/${CREATED_BOOK_ID}`, r.data.error);
    }

    // ── 5. Transactions ──
    console.log('\n▶ 4. Transactions API');
    if (CREATED_BOOK_ID) {
        const r = await req('POST', '/transactions/issue', { book_id: CREATED_BOOK_ID }, TOKEN);
        if (r.status === 201) {
            TRANSACTION_ID = r.data.transaction?.id || '';
            log('PASS', 'POST /transactions/issue', `TXN ID: ${TRANSACTION_ID}`);
        } else {
            log('FAIL', 'POST /transactions/issue', r.data.error);
        }
    }
    {
        const r = await req('GET', '/transactions/history', null, TOKEN);
        if (r.status === 200) log('PASS', 'GET /transactions/history', `${Array.isArray(r.data) ? r.data.length : '?'} records`);
        else log('FAIL', 'GET /transactions/history', r.data.error);
    }
    if (TRANSACTION_ID) {
        const r = await req('POST', '/transactions/return', { transaction_id: TRANSACTION_ID }, TOKEN);
        if (r.status === 200) log('PASS', 'POST /transactions/return', `Fine: ₹${r.data.fine || 0}`);
        else log('FAIL', 'POST /transactions/return', r.data.error);
    }

    // ── 6. Admin Dashboard ──
    console.log('\n▶ 5. Admin Dashboard');
    {
        const r = await req('GET', '/admin/stats', null, TOKEN);
        if (r.status === 200) log('PASS', 'GET /admin/stats', JSON.stringify(r.data.stats));
        else log('FAIL', 'GET /admin/stats', r.data.error);
    }

    // ── 7. Cleanup ──
    console.log('\n▶ 6. Cleanup');
    if (CREATED_BOOK_ID) {
        const r = await req('DELETE', `/books/${CREATED_BOOK_ID}`, null, TOKEN);
        if (r.status === 200) log('PASS', `DELETE /books/${CREATED_BOOK_ID}`);
        else log('WARN', `DELETE /books/${CREATED_BOOK_ID}`, r.data.error || '(may need admin role)');
    }

    console.log('\n══════════════════════════════════════════════════');
    console.log('  ✅ Test run complete!');
    console.log('══════════════════════════════════════════════════\n');
}

runTests().catch(err => {
    console.error('Fatal test error:', err.message);
    process.exit(1);
});
