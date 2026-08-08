/**
 * Tests for the featured image group options REST API
 * (`soli_featured_image/v1/options` and `soli_featured_image/v1/update`).
 */

const { test, expect } = require( '@playwright/test' );
const { restUrl, loginAndGetNonce, authenticatedRest } = require( './helpers' );

const OPTIONS_ROUTE = '/soli_featured_image/v1/options';
const UPDATE_ROUTE = '/soli_featured_image/v1/update';

test.describe( 'Featured image options REST API', () => {
	test( 'exposes the options endpoint publicly', async ( { request } ) => {
		const response = await request.get( restUrl( OPTIONS_ROUTE ) );

		expect( response.status() ).toBe( 200 );
		expect( Array.isArray( await response.json() ) ).toBe( true );
	} );

	test( 'rejects unauthenticated writes', async ( { request } ) => {
		const response = await request.post( restUrl( UPDATE_ROUTE ), {
			data: [ { label: 'Sneaky', value: '1' } ],
		} );

		expect( response.status() ).toBe( 401 );
	} );

	test( 'stores options for an authenticated editor and reads them back', async ( {
		page,
		request,
	} ) => {
		const nonce = await loginAndGetNonce( page );

		const update = await authenticatedRest( page, nonce, {
			route: UPDATE_ROUTE,
			method: 'POST',
			body: [
				{ label: 'Harmonie', value: '11' },
				{ label: 'Bigband', value: '22' },
			],
		} );

		expect( update.status ).toBe( 200 );
		expect( update.body ).toEqual( [
			{ label: 'Harmonie', value: '11' },
			{ label: 'Bigband', value: '22' },
		] );

		// The public read endpoint must now return the persisted options.
		const response = await request.get( restUrl( OPTIONS_ROUTE ) );
		expect( response.status() ).toBe( 200 );
		expect( await response.json() ).toEqual( [
			{ label: 'Harmonie', value: '11' },
			{ label: 'Bigband', value: '22' },
		] );
	} );

	test( 'sanitizes option labels and values', async ( { page } ) => {
		const nonce = await loginAndGetNonce( page );

		const update = await authenticatedRest( page, nonce, {
			route: UPDATE_ROUTE,
			method: 'POST',
			body: [
				{
					label: '<script>alert(1)</script>Slagwerk',
					value: '33<b>4</b>',
				},
			],
		} );

		expect( update.status ).toBe( 200 );
		expect( update.body[ 0 ].label ).toBe( 'Slagwerk' );
		expect( update.body[ 0 ].value ).toBe( '334' );
	} );

	test( 'rejects options that are missing a label or value', async ( { page } ) => {
		const nonce = await loginAndGetNonce( page );

		const update = await authenticatedRest( page, nonce, {
			route: UPDATE_ROUTE,
			method: 'POST',
			body: [ { label: 'Incomplete' } ],
		} );

		expect( update.status ).toBe( 400 );
		expect( update.body.code ).toBe( 'invalid_data' );
	} );

	test( 'rejects a payload that is not a list of options', async ( { page } ) => {
		const nonce = await loginAndGetNonce( page );

		const update = await authenticatedRest( page, nonce, {
			route: UPDATE_ROUTE,
			method: 'POST',
			body: 'not-an-array',
		} );

		expect( update.status ).toBe( 400 );
		expect( update.body.code ).toBe( 'invalid_data' );
	} );
} );
