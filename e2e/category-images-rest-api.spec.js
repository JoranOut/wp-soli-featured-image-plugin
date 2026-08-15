/**
 * Tests for the category based featured image REST API
 * (`soli_featured_image/v1/category-images` and
 * `soli_featured_image/v1/all-categories`).
 */

const { test, expect } = require( '@playwright/test' );
const {
	restUrl,
	loginAndGetNonce,
	authenticatedRest,
	createCategory,
	createTopLevelCategory,
} = require( './helpers' );

const CATEGORY_IMAGES_ROUTE = '/soli_featured_image/v1/category-images';
const ALL_CATEGORIES_ROUTE = '/soli_featured_image/v1/all-categories';

test.describe( 'Category images REST API', () => {
	test( 'exposes enabled category images publicly', async ( { request } ) => {
		const response = await request.get( restUrl( CATEGORY_IMAGES_ROUTE ) );

		expect( response.status() ).toBe( 200 );
		expect( Array.isArray( await response.json() ) ).toBe( true );
	} );

	test( 'rejects unauthenticated writes', async ( { request } ) => {
		const response = await request.post( restUrl( CATEGORY_IMAGES_ROUTE ), {
			data: [ { category_id: 1, enabled: true } ],
		} );

		expect( response.status() ).toBe( 401 );
	} );

	test( 'keeps the full category list behind a capability check', async ( {
		request,
	} ) => {
		const response = await request.get( restUrl( ALL_CATEGORIES_ROUTE ) );

		expect( response.status() ).toBe( 401 );
	} );

	test( 'lists every category with its enabled state for an editor', async ( {
		page,
	} ) => {
		const nonce = await loginAndGetNonce( page );
		const category = await createCategory( page, nonce, 'Listed ' + Date.now() );

		const { status, body } = await authenticatedRest( page, nonce, {
			route: ALL_CATEGORIES_ROUTE,
		} );

		expect( status ).toBe( 200 );

		const entry = body.find( ( item ) => item.category_id === category.id );
		expect( entry ).toBeDefined();
		expect( entry.name ).toBe( category.name );
		expect( entry.enabled ).toBe( false );
		expect( entry.image_id ).toBe( 0 );
	} );

	test( 'stores the image per category and publishes only enabled ones', async ( {
		page,
		request,
	} ) => {
		const nonce = await loginAndGetNonce( page );
		const enabled = await createCategory( page, nonce, 'Enabled ' + Date.now() );
		const disabled = await createCategory( page, nonce, 'Disabled ' + Date.now() );

		const update = await authenticatedRest( page, nonce, {
			route: CATEGORY_IMAGES_ROUTE,
			method: 'POST',
			body: [
				{ category_id: enabled.id, enabled: true, image_id: 4242 },
				{ category_id: disabled.id, enabled: false, image_id: 1717 },
			],
		} );

		expect( update.status ).toBe( 200 );

		const updatedEnabled = update.body.find(
			( item ) => item.category_id === enabled.id
		);
		const updatedDisabled = update.body.find(
			( item ) => item.category_id === disabled.id
		);
		expect( updatedEnabled ).toMatchObject( {
			enabled: true,
			image_id: 4242,
		} );
		expect( updatedDisabled ).toMatchObject( {
			enabled: false,
			image_id: 1717,
		} );

		// The public endpoint only exposes the categories that were enabled.
		const response = await request.get( restUrl( CATEGORY_IMAGES_ROUTE ) );
		expect( response.status() ).toBe( 200 );

		const published = await response.json();
		expect(
			published.find( ( item ) => item.category_id === enabled.id )
		).toMatchObject( { name: enabled.name, image_id: 4242 } );
		expect(
			published.find( ( item ) => item.category_id === disabled.id )
		).toBeUndefined();
	} );

	test( 'sanitizes the stored image id', async ( { page } ) => {
		const nonce = await loginAndGetNonce( page );
		const category = await createCategory( page, nonce, 'Sanitized ' + Date.now() );

		const update = await authenticatedRest( page, nonce, {
			route: CATEGORY_IMAGES_ROUTE,
			method: 'POST',
			body: [ { category_id: category.id, enabled: true, image_id: '-12abc' } ],
		} );

		expect( update.status ).toBe( 200 );
		expect(
			update.body.find( ( item ) => item.category_id === category.id ).image_id
		).toBe( 12 );
	} );

	test( 'never lists or saves a category outside the orkesten parent', async ( {
		page,
		request,
	} ) => {
		const nonce = await loginAndGetNonce( page );
		const outsider = await createTopLevelCategory(
			page,
			nonce,
			'Nieuws ' + Date.now()
		);

		// Not offered in the settings modal.
		const all = await authenticatedRest( page, nonce, {
			route: ALL_CATEGORIES_ROUTE,
		} );
		expect( all.status ).toBe( 200 );
		expect(
			all.body.find( ( item ) => item.category_id === outsider.id )
		).toBeUndefined();

		// A save attempt is silently skipped, not stored.
		const update = await authenticatedRest( page, nonce, {
			route: CATEGORY_IMAGES_ROUTE,
			method: 'POST',
			body: [ { category_id: outsider.id, enabled: true, image_id: 99 } ],
		} );
		expect( update.status ).toBe( 200 );
		expect(
			update.body.find( ( item ) => item.category_id === outsider.id )
		).toBeUndefined();

		// Not exposed publicly either.
		const response = await request.get( restUrl( CATEGORY_IMAGES_ROUTE ) );
		expect( response.status() ).toBe( 200 );
		const published = await response.json();
		expect(
			published.find( ( item ) => item.category_id === outsider.id )
		).toBeUndefined();
	} );

	test( 'ignores stale enabled-meta on a category outside the orkesten parent', async ( {
		page,
		request,
	} ) => {
		const nonce = await loginAndGetNonce( page );
		// Set the plugin's term meta directly through core's terms endpoint,
		// bypassing the plugin's save guard - the read side must still filter.
		const outsider = await createTopLevelCategory(
			page,
			nonce,
			'Stale ' + Date.now(),
			{ soli_featured_image_enabled: true, soli_featured_image_id: 123 }
		);

		const response = await request.get( restUrl( CATEGORY_IMAGES_ROUTE ) );
		expect( response.status() ).toBe( 200 );
		const published = await response.json();
		expect(
			published.find( ( item ) => item.category_id === outsider.id )
		).toBeUndefined();
	} );

	test( 'rejects items without a category id', async ( { page } ) => {
		const nonce = await loginAndGetNonce( page );

		const update = await authenticatedRest( page, nonce, {
			route: CATEGORY_IMAGES_ROUTE,
			method: 'POST',
			body: [ { enabled: true, image_id: 1 } ],
		} );

		expect( update.status ).toBe( 400 );
		expect( update.body.code ).toBe( 'invalid_data' );
	} );

	test( 'rejects a payload that is not a list', async ( { page } ) => {
		const nonce = await loginAndGetNonce( page );

		const update = await authenticatedRest( page, nonce, {
			route: CATEGORY_IMAGES_ROUTE,
			method: 'POST',
			body: 'not-an-array',
		} );

		expect( update.status ).toBe( 400 );
		expect( update.body.code ).toBe( 'invalid_data' );
	} );

	test( 'silently skips unknown categories', async ( { page } ) => {
		const nonce = await loginAndGetNonce( page );

		const update = await authenticatedRest( page, nonce, {
			route: CATEGORY_IMAGES_ROUTE,
			method: 'POST',
			body: [ { category_id: 999999, enabled: true, image_id: 1 } ],
		} );

		expect( update.status ).toBe( 200 );
		expect(
			update.body.find( ( item ) => item.category_id === 999999 )
		).toBeUndefined();
	} );
} );

test.describe( 'Category taxonomy registration', () => {
	test( 'registers the category taxonomy for pages', async ( { page } ) => {
		const nonce = await loginAndGetNonce( page );

		const { status, body } = await authenticatedRest( page, nonce, {
			route: '/wp/v2/taxonomies/category',
		} );

		expect( status ).toBe( 200 );
		expect( body.types ).toContain( 'post' );
		expect( body.types ).toContain( 'page' );
	} );
} );
