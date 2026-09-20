/**
 * Tests the front-end behaviour of the soli/featured-image block.
 *
 * The block is an editor-side tool that sets the featured image and orchestra
 * categories of a post. On the front end it renders nothing: the group list
 * that used to sit under the featured image was removed. These tests pin that
 * down and keep the PHP `render_callback` covered as a diagnostics probe.
 */

const { test, expect } = require( '@playwright/test' );
const {
	loginAndGetNonce,
	authenticatedRest,
	createCategory,
	expectNoPhpDiagnostics,
} = require( './helpers' );

const BLOCK_MARKUP = '<!-- wp:soli/featured-image /-->';
const PAGE_TITLE = 'Featured image block e2e';

test.describe( 'Featured image block front-end', () => {
	let pageId;

	test.beforeAll( async ( { browser } ) => {
		const context = await browser.newContext();
		const adminPage = await context.newPage();
		const nonce = await loginAndGetNonce( adminPage );

		// An opted-in category on the post proves the block stays silent even
		// when it previously had something to show.
		const enabled = await createCategory( adminPage, nonce, 'Harmonie ' + Date.now() );
		const update = await authenticatedRest( adminPage, nonce, {
			route: '/soli_featured_image/v1/category-images',
			method: 'POST',
			body: [ { category_id: enabled.id, enabled: true, image_id: 1 } ],
		} );
		expect( update.status ).toBe( 200 );

		const created = await authenticatedRest( adminPage, nonce, {
			route: '/wp/v2/pages',
			method: 'POST',
			body: {
				title: PAGE_TITLE,
				status: 'publish',
				content: BLOCK_MARKUP,
				categories: [ enabled.id ],
			},
		} );

		expect( created.status ).toBe( 201 );
		pageId = created.body.id;

		await context.close();
	} );

	// Every front-end page this spec loads runs the block's `render_callback`,
	// so each one is also a PHP diagnostics probe.
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

		// The page itself must have rendered, otherwise the diagnostics
		// assertion would be vacuous.
		await expect( page ).toHaveTitle( new RegExp( PAGE_TITLE ) );
		await expectNoPhpDiagnostics( page );
	} );

	test( 'renders no group list or block wrapper on the front end', async ( {
		page,
	} ) => {
		await page.goto( `/?page_id=${ pageId }` );

		await expect( page.locator( '.soli-groups' ) ).toHaveCount( 0 );
		await expect( page.locator( '.block-featured-image' ) ).toHaveCount( 0 );
		await expect( page.locator( '[data-attributes]' ) ).toHaveCount( 0 );
	} );

	test( 'enqueues no front-end bundle', async ( { page } ) => {
		await page.goto( `/?page_id=${ pageId }`, { waitUntil: 'load' } );

		await expect(
			page.locator( 'script[src*="blocks/featured-image/build/"]' )
		).toHaveCount( 0 );
		await expect(
			page.locator( 'link[href*="blocks/featured-image/build/"]' )
		).toHaveCount( 0 );
	} );
} );
