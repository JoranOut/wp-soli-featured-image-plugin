const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for the Soli Featured Image plugin e2e tests.
 *
 * The tests run against the wp-env "tests" environment (port 8889) so that they
 * never touch the development database on port 8888.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
	use: {
		baseURL: process.env.WP_BASE_URL || 'http://localhost:8889',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'npm run env:start',
		url: process.env.WP_BASE_URL || 'http://localhost:8889',
		reuseExistingServer: true,
		timeout: 180000,
	},
});
