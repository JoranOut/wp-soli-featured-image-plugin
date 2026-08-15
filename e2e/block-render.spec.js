/**
 * Tests the front-end rendering of the soli/featured-image block.
 *
 * The block derives the groups it shows from the categories assigned to the
 * post, filtered by the `soli_featured_image_enabled` term meta. These tests
 * cover the PHP `render_callback` *and* the compiled `build/frontend.js` bundle
 * that hydrates its output, so a broken block build fails them.
 */

const { test, expect } = require( '@playwright/test' );
const {
	loginAndGetNonce,
	authenticatedRest,
	createCategory,
	createTopLevelCategory,
	expectNoPhpDiagnostics,
} = require( './helpers' );

const BLOCK_MARKUP = '<!-- wp:soli/featured-image /-->';

test.describe( 'Featured image block front-end', () => {
	let pageId;
	let enabledCategoryName;
	let disabledCategoryName;

	test.beforeAll( async ( { browser } ) => {
		const context = await browser.newContext();
		const adminPage = await context.newPage();
		const nonce = await loginAndGetNonce( adminPage );

		const stamp = Date.now();
		const enabled = await createCategory( adminPage, nonce, 'Harmonie ' + stamp );
		const disabled = await createCategory( adminPage, nonce, 'Stil Orkest ' + stamp );
		enabledCategoryName = enabled.name;
		disabledCategoryName = disabled.name;

		// Only one of the two categories opts in to a featured image.
		const update = await authenticatedRest( adminPage, nonce, {
			route: '/soli_featured_image/v1/category-images',
			method: 'POST',
			body: [
				{ category_id: enabled.id, enabled: true, image_id: 1 },
				{ category_id: disabled.id, enabled: false, image_id: 2 },
			],
		} );
		expect( update.status ).toBe( 200 );

		const created = await authenticatedRest( adminPage, nonce, {
			route: '/wp/v2/pages',
			method: 'POST',
			body: {
				title: 'Featured image block e2e',
				status: 'publish',
				content: BLOCK_MARKUP,
				categories: [ enabled.id, disabled.id ],
			},
		} );

		expect( created.status ).toBe( 201 );
		expect( created.body.categories ).toEqual(
			expect.arrayContaining( [ enabled.id, disabled.id ] )
		);
		pageId = created.body.id;

		await context.close();
	} );

	// Every front-end page this spec loads runs the block's `render_callback`,
	// so each one is also a PHP diagnostics probe. Asserting here means a new
	// test cannot be added that silently skips the check.
	test.afterEach( async ( { page } ) => {
		if ( ! page.url().startsWith( 'http' ) ) {
			return;
		}

		await expectNoPhpDiagnostics( page );
	} );

	test( 'does not emit PHP errors while rendering the block', async ( {
		page,
	} ) => {
		await page.goto( `/?page_id=${ pageId }` );

		// The `render_callback` output must actually be on the page, otherwise
		// the diagnostics assertion below would be vacuous. `data-attributes`
		// survives hydration, unlike the `block-featured-image` class that
		// frontend.js strips.
		await expect( page.locator( '[data-attributes]' ) ).toHaveCount( 1 );

		await expectNoPhpDiagnostics( page );
	} );

	test( 'renders only the categories that opted in', async ( { page } ) => {
		await page.goto( `/?page_id=${ pageId }` );

		const raw = await page.evaluate( () => {
			const el = document.querySelector( '[data-attributes]' );
			return el ? el.getAttribute( 'data-attributes' ) : null;
		} );

		expect( raw ).not.toBeNull();
		expect( JSON.parse( raw ) ).toEqual( [ enabledCategoryName ] );
		expect( JSON.parse( raw ) ).not.toContain( disabledCategoryName );
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

	test( 'renders nothing for a category outside the orkesten parent, even with stale enabled-meta', async ( {
		page,
	} ) => {
		const nonce = await loginAndGetNonce( page );

		// The meta is set directly through core's terms endpoint, bypassing the
		// plugin's save guard - the render side must still refuse it.
		const outsider = await createTopLevelCategory(
			page,
			nonce,
			'Buiten Orkesten ' + Date.now(),
			{ soli_featured_image_enabled: true, soli_featured_image_id: 1 }
		);

		const created = await authenticatedRest( page, nonce, {
			route: '/wp/v2/pages',
			method: 'POST',
			body: {
				title: 'Featured image outsider e2e',
				status: 'publish',
				content: BLOCK_MARKUP,
				categories: [ outsider.id ],
			},
		} );
		expect( created.status ).toBe( 201 );

		await page.goto( `/?page_id=${ created.body.id }` );

		const raw = await page.evaluate( () => {
			const el = document.querySelector( '[data-attributes]' );
			return el ? el.getAttribute( 'data-attributes' ) : null;
		} );
		expect( raw ).not.toBeNull();
		expect( JSON.parse( raw ) ).toEqual( [] );
	} );

	test( 'hydrates the block into a group list', async ( { page } ) => {
		await page.goto( `/?page_id=${ pageId }` );

		const groupList = page.locator( '.soli-groups' );
		await expect( groupList ).toBeVisible();

		const groups = groupList.locator( '.group' );
		await expect( groups ).toHaveCount( 1 );
		await expect( groups.locator( 'p' ) ).toHaveText( [ enabledCategoryName ] );
	} );
} );
