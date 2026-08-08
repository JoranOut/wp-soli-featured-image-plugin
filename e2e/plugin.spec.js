/**
 * Smoke tests: the plugin activates and registers its block.
 */

const { test, expect } = require( '@playwright/test' );
const { loginAsAdmin, loginAndGetNonce, authenticatedRest } = require( './helpers' );

test.describe( 'Plugin activation', () => {
	test( 'is active in the WordPress admin', async ( { page } ) => {
		await loginAsAdmin( page );
		await page.goto( '/wp-admin/plugins.php' );

		const row = page.locator( 'tr.active', {
			hasText: 'Soli Featured Image Plugin',
		} );

		await expect( row ).toHaveCount( 1 );
		// An activated plugin offers "Deactivate", never "Activate".
		await expect( row.getByRole( 'link', { name: 'Deactivate' } ) ).toBeVisible();
	} );

	test( 'does not emit PHP errors on the admin dashboard', async ( { page } ) => {
		await loginAsAdmin( page );
		await page.goto( '/wp-admin/' );

		// WP_DEBUG_DISPLAY is enabled in .wp-env.json, so PHP diagnostics end up
		// in the rendered page. Fatals are never acceptable; softer diagnostics
		// are only asserted for this plugin's own files so that unrelated
		// WordPress core deprecations cannot turn CI red.
		const body = await page.locator( 'body' ).innerText();
		expect( body ).not.toMatch( /Fatal error|Parse error/i );
		expect( body ).not.toMatch(
			/(Warning|Notice|Deprecated):[^\n]*(soli-featured-image-plugin\.php|blocks\/(block|settings)\.php|blocks\/featured-image)/i
		);
	} );

	test( 'registers the soli/featured-image block type', async ( { page } ) => {
		const nonce = await loginAndGetNonce( page );

		const { status, body } = await authenticatedRest( page, nonce, {
			route: '/wp/v2/block-types/soli/featured-image',
		} );

		expect( status ).toBe( 200 );
		expect( body.name ).toBe( 'soli/featured-image' );
	} );
} );
