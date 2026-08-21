/**
 * Smoke tests: the plugin activates and registers its block.
 */

const { test, expect } = require( '@playwright/test' );
const {
	loginAsAdmin,
	loginAndGetNonce,
	authenticatedRest,
	expectNoPhpDiagnostics,
} = require( './helpers' );

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
		// WordPress core deprecations cannot turn CI red. This only covers the
		// admin request; the block's render_callback runs on the front end and
		// is asserted in block-render.spec.js.
		await expectNoPhpDiagnostics( page );
	} );

	test( 'registers the soli/featured-image block type', async ( { page } ) => {
		const nonce = await loginAndGetNonce( page );

		const { status, body } = await authenticatedRest( page, nonce, {
			route: '/wp/v2/block-types/soli/featured-image',
		} );
		const editorStyles =
			body.editor_style_handles || body.editor_style || [];

		expect( status ).toBe( 200 );
		expect( body.name ).toBe( 'soli/featured-image' );
		expect( Array.isArray( editorStyles ) ? editorStyles : [ editorStyles ] ).toContain(
			'block-featured-image-css'
		);
	} );

	test( 'loads the block stylesheet into the active editor document', async ( {
		page,
	} ) => {
		await loginAsAdmin( page );
		await page.goto( '/wp-admin/post-new.php?post_type=page' );

		const editorFrame = page.locator( 'iframe[name="editor-canvas"]' );

		// The fully-iframed block editor (editor-canvas) was progressively
		// introduced across WordPress versions. On older builds the block
		// renders directly in the main document; on newer ones it lives inside
		// the iframe. Both paths must be verified: the block must be visible and
		// its stylesheet + emotion styles must land in the correct document.
		const hasEditorCanvas = await editorFrame
			.waitFor( { state: 'attached', timeout: 15000 } )
			.then( () => true )
			.catch( () => false );

		if ( hasEditorCanvas ) {
			// WP 7.x+ iframed editor: block and all styles live inside the iframe.
			const editorCanvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
			await expect( editorCanvas.locator( '.soli-featured-image' ) ).toHaveCount(
				1
			);

			const iframeAssets = await editorFrame.evaluate( ( iframe ) => {
				const doc = iframe.contentDocument;

				return {
					stylesheets: Array.from(
						doc.querySelectorAll( 'link[rel="stylesheet"]' ),
						( link ) => link.href
					),
					emotionStyles: Array.from(
						doc.querySelectorAll( 'style[data-emotion]' ),
						( style ) => style.getAttribute( 'data-emotion' ) || ''
					),
				};
			} );

			expect(
				iframeAssets.stylesheets.some( ( href ) =>
					href.includes( '/blocks/featured-image/build/index.css' )
				)
			).toBe( true );
			expect(
				iframeAssets.emotionStyles.some( ( key ) =>
					key.startsWith( 'soli-featured-image' )
				)
			).toBe( true );
		} else {
			// WP 6.x non-iframed editor: block and all styles live in the main
			// document. The emotion cache targets blockRoot.ownerDocument.head,
			// which is document.head when there is no iframe.
			await expect( page.locator( '.soli-featured-image' ) ).toHaveCount( 1 );

			const mainAssets = await page.evaluate( () => ( {
				stylesheets: Array.from(
					document.querySelectorAll( 'link[rel="stylesheet"]' ),
					( link ) => link.href
				),
				emotionStyles: Array.from(
					document.querySelectorAll( 'style[data-emotion]' ),
					( style ) => style.getAttribute( 'data-emotion' ) || ''
				),
			} ) );

			expect(
				mainAssets.stylesheets.some( ( href ) =>
					href.includes( '/blocks/featured-image/build/index.css' )
				)
			).toBe( true );
			expect(
				mainAssets.emotionStyles.some( ( key ) =>
					key.startsWith( 'soli-featured-image' )
				)
			).toBe( true );
		}
	} );
} );
