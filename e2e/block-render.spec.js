/**
 * Tests the front-end rendering of the soli/featured-image block.
 *
 * This covers the PHP `render_callback` (which prints the placeholder div with
 * the selected groups) *and* the compiled `build/frontend.js` bundle that
 * hydrates it, so a broken block build fails these tests.
 */

const { test, expect } = require( '@playwright/test' );
const { loginAndGetNonce, authenticatedRest } = require( './helpers' );

const GROUPS = [ 'Harmonie', 'Bigband' ];

test.describe( 'Featured image block front-end', () => {
	let pageId;

	test.beforeAll( async ( { browser } ) => {
		const context = await browser.newContext();
		const adminPage = await context.newPage();
		const nonce = await loginAndGetNonce( adminPage );

		const created = await authenticatedRest( adminPage, nonce, {
			route: '/wp/v2/pages',
			method: 'POST',
			body: {
				title: 'Featured image block e2e',
				status: 'publish',
				content:
					'<!-- wp:soli/featured-image ' +
					JSON.stringify( { selectedGroups: GROUPS } ) +
					' /-->',
			},
		} );

		expect( created.status ).toBe( 201 );
		pageId = created.body.id;

		await context.close();
	} );

	test( 'renders the placeholder div with the selected groups', async ( { page } ) => {
		await page.goto( `/?page_id=${ pageId }` );

		const raw = await page.evaluate( () => {
			const el = document.querySelector(
				'[data-attributes]'
			);
			return el ? el.getAttribute( 'data-attributes' ) : null;
		} );

		expect( raw ).not.toBeNull();
		expect( JSON.parse( raw ) ).toEqual( GROUPS );
	} );

	test( 'enqueues the compiled front-end bundle', async ( { page } ) => {
		const failed = [];
		page.on( 'response', ( response ) => {
			if (
				response.url().includes( '/blocks/featured-image/build/' ) &&
				response.status() >= 400
			) {
				failed.push( `${ response.status() } ${ response.url() }` );
			}
		} );

		await page.goto( `/?page_id=${ pageId }`, { waitUntil: 'load' } );

		await expect(
			page.locator( 'script[src*="blocks/featured-image/build/frontend.js"]' )
		).toHaveCount( 1 );
		expect( failed ).toEqual( [] );
	} );

	test( 'hydrates the block into a group list', async ( { page } ) => {
		await page.goto( `/?page_id=${ pageId }` );

		const groupList = page.locator( '.soli-groups' );
		await expect( groupList ).toBeVisible();

		const groups = groupList.locator( '.group' );
		await expect( groups ).toHaveCount( GROUPS.length );
		await expect( groups.locator( 'p' ) ).toHaveText( GROUPS );
	} );
} );
