import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Public pages
// ---------------------------------------------------------------------------

test('home page loads with correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Prepful/);
});

test('home page shows sign-in button when logged out', async ({ page }) => {
  await page.goto('/');
  // At least one "Sign in" or "Get started" CTA should be visible
  const cta = page.getByRole('button', { name: /sign in|get started/i }).first();
  await expect(cta).toBeVisible();
});

test('home page shows all six feature cards', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('a').filter({ hasText: /Mock Interviews|Resume Analyser|Code Sandbox|Study Plan|Collab Editor|Progress Dashboard/ });
  await expect(cards).toHaveCount(6);
});

// ---------------------------------------------------------------------------
// Auth redirects
// ---------------------------------------------------------------------------

test('unauthenticated user is redirected from /dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/sign-in/);
});

test('unauthenticated user is redirected from /interview', async ({ page }) => {
  await page.goto('/interview');
  await expect(page).toHaveURL(/sign-in/);
});

test('unauthenticated user is redirected from /resume', async ({ page }) => {
  await page.goto('/resume');
  await expect(page).toHaveURL(/sign-in/);
});

test('unauthenticated user is redirected from /study-plan', async ({ page }) => {
  await page.goto('/study-plan');
  await expect(page).toHaveURL(/sign-in/);
});

// ---------------------------------------------------------------------------
// Public API routes — should not require auth for webhook
// ---------------------------------------------------------------------------

test('webhook endpoint is publicly accessible (returns non-401)', async ({ request }) => {
  // We expect a 400/500 because the body is invalid, but NOT a 401
  // This confirms the route is correctly excluded from auth middleware
  const res = await request.post('/api/webhooks/clerk', {
    data: {},
    headers: { 'content-type': 'application/json' },
  });
  expect(res.status()).not.toBe(401);
});

// ---------------------------------------------------------------------------
// API auth guards
// ---------------------------------------------------------------------------

test('GET /api/analytics returns 401 when not logged in', async ({ request }) => {
  const res = await request.get('/api/analytics');
  expect(res.status()).toBe(401);
});

test('POST /api/resumes returns 401 when not logged in', async ({ request }) => {
  const res = await request.post('/api/resumes', { data: {} });
  expect(res.status()).toBe(401);
});

test('POST /api/execute returns 401 when not logged in', async ({ request }) => {
  const res = await request.post('/api/execute', { data: {} });
  expect(res.status()).toBe(401);
});

test('POST /api/study-plan returns 401 when not logged in', async ({ request }) => {
  const res = await request.post('/api/study-plan', { data: {} });
  expect(res.status()).toBe(401);
});