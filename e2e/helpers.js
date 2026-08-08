/**
 * Shared helpers for the Soli Featured Image e2e tests.
 *
 * The wp-env test environment uses plain permalinks, so REST requests are made
 * through the `?rest_route=` fallback instead of `/wp-json/`.
 */

const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'password';

/**
 * Builds a REST URL that works with plain permalinks.
 *
 * @param {string} route REST route, e.g. `/soli_featured_image/v1/options`.
 * @return {string} Relative URL.
 */
function restUrl( route ) {
	return '/?rest_route=' + encodeURIComponent( route );
}

/**
 * Logs in as the wp-env administrator.
 *
 * @param {import('@playwright/test').Page} page
 */
async function loginAsAdmin( page ) {
	await page.goto( '/wp-login.php' );
	await page.fill( '#user_login', ADMIN_USER );
	await page.fill( '#user_pass', ADMIN_PASSWORD );
	await page.click( '#wp-submit' );
	await page.waitForURL( /wp-admin/ );
}

/**
 * Logs in and returns a REST nonce for cookie authenticated requests.
 *
 * WordPress only accepts cookie authentication for the REST API when a valid
 * `wp_rest` nonce is supplied, so the nonce is read from the admin page that
 * WordPress prints it on.
 *
 * @param {import('@playwright/test').Page} page
 * @return {Promise<string>} The `wp_rest` nonce.
 */
async function loginAndGetNonce( page ) {
	await loginAsAdmin( page );

	// post-new.php reliably enqueues wp-api-fetch / wp-api-request, which is
	// what prints `wpApiSettings` (including the nonce) into the page.
	await page.goto( '/wp-admin/post-new.php?post_type=page' );
	await page.waitForFunction(
		() => !! ( window.wpApiSettings && window.wpApiSettings.nonce )
	);

	return page.evaluate( () => window.wpApiSettings.nonce );
}

/**
 * Performs an authenticated REST request from inside the logged-in browser
 * context.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string}                          nonce
 * @param {Object}                          options
 * @param {string}                          options.route  REST route.
 * @param {string}                          [options.method] HTTP method.
 * @param {*}                               [options.body]   JSON body.
 * @return {Promise<{status: number, body: *}>} Status code and parsed body.
 */
async function authenticatedRest( page, nonce, { route, method = 'GET', body } ) {
	return page.evaluate(
		async ( { url, method: httpMethod, nonce: restNonce, body: payload } ) => {
			const response = await fetch( url, {
				method: httpMethod,
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': restNonce,
				},
				credentials: 'same-origin',
				body:
					payload === undefined
						? undefined
						: JSON.stringify( payload ),
			} );

			let parsed = null;
			try {
				parsed = await response.json();
			} catch {
				parsed = null;
			}

			return { status: response.status, body: parsed };
		},
		{ url: restUrl( route ), method, nonce, body }
	);
}

module.exports = {
	ADMIN_USER,
	ADMIN_PASSWORD,
	restUrl,
	loginAsAdmin,
	loginAndGetNonce,
	authenticatedRest,
};
