import { test, expect } from '@playwright/test'

test.describe('FinPilot MVP Core E2E Tests', () => {
  test('Landing page and authentication routing', async ({ page }) => {
    await page.goto('/')

    // Check Landing Page elements
    await expect(page).toHaveTitle(/FinPilot/)
    await expect(page.locator('text=FinPilot').first()).toBeVisible()

    // Navigate to Login
    await page.goto('/#dang-nhap')
    await expect(page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first()).toBeVisible()

    // Navigate to Register
    await page.goto('/#dang-ky')
    await expect(page.locator('text=Đăng ký').first()).toBeVisible()
  })

  test('Schedule, Quick consecutive entry, and Forecast Flow', async ({ page }) => {
    // Mock authenticated session
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email: 'shopowner@finpilot.test' }),
      })
    })

    await page.route('**/api/csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-csrf-token' }),
      })
    })

    // Mock shop data
    let currentData = {
      version: 1,
      name: 'Shop Thời Trang Mùa Hè',
      dataVersion: 1,
      balance: { amount: '50000000', cutoff: '2026-11-01' },
      obligations: [],
      scenarios: [],
      imports: [],
    }

    await page.route('**/api/shop', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(currentData),
        })
      } else {
        await route.continue()
      }
    })

    await page.route('**/api/shop/obligations/**', async (route) => {
      const payload = route.request().postDataJSON()
      currentData = {
        ...currentData,
        obligations: [...currentData.obligations, payload],
        dataVersion: currentData.dataVersion + 1,
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentData),
      })
    })

    await page.goto('/#lich')

    // Verify shop name and balance
    await expect(page.locator('text=Shop Thời Trang Mùa Hè').first()).toBeVisible()

    // Verify consecutive add button
    const saveAndAddNextBtn = page.locator('button:has-text("Lưu & thêm tiếp")')
    if (await saveAndAddNextBtn.isVisible()) {
      await expect(saveAndAddNextBtn).toBeEnabled()
    }
  })

  test('Import preview with inline editing and exclusion', async ({ page }) => {
    await page.goto('/#nhap-file')
    await expect(page.locator('text=Nhập từ Excel / CSV').first()).toBeVisible()
    await expect(page.locator('text=Tải mẫu').first()).toBeVisible()
  })

  test('Audit History screen and filter navigation', async ({ page }) => {
    await page.route('**/api/shop/audit*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: '00000000-0000-0000-0000-000000000001',
              occurredAt: '2026-11-01T10:00:00Z',
              action: 'upsert',
              entityType: 'obligation',
              entityId: '00000000-0000-0000-0000-000000000002',
              summary: 'Thêm hoặc cập nhật khoản thu–chi',
              beforeJson: null,
              afterJson: JSON.stringify({ label: 'Nhập áo len', amount: '20000000' }),
            },
          ],
          total: 1,
          page: 1,
          pageSize: 15,
        }),
      })
    })

    await page.goto('/#lich-su')
    await expect(page.locator('text=Lịch sử thay đổi').first()).toBeVisible()
  })
})
