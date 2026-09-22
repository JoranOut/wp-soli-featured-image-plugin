/**
 * The GitHub updater's plugin-details modal and update-row links.
 *
 * GitHub is mocked by e2e/fixtures/mu-plugins/mock-github-releases.php, which
 * .wp-env.json maps into the tests environment only. The mock advertises
 * v9.0.0 (stable) and v9.0.0-nightly.120 (nightly), both newer than anything
 * this plugin will ever ship, so an update is always offered.
 */

const { test, expect } = require( '@playwright/test' );
const { loginAsAdmin, expectNoPhpDiagnostics } = require( './helpers' );

const REPO = 'https://github.com/JoranOut/wp-soli-featured-image-plugin';
const SLUG = 'wp-soli-featured-image-plugin/soli-featured-image-plugin.php';

test.describe( 'Updater changelog', () => {
	test.beforeEach( async ( { page } ) => {
		await loginAsAdmin( page );
		// Drop any cached check first (see the mu-plugin fixture), then force a
		// fresh one. Only update-core.php honours force-check; plugins.php throttles its
		// own check to once an hour and would show whatever transient a
		// previous request (or a wp-cli run, which has no admin hooks) left.
		await page.goto( '/wp-admin/index.php?soli_reset_updates=1' );
		await page.goto( '/wp-admin/update-core.php?force-check=1' );
		await page.goto( '/wp-admin/plugins.php' );
	} );

	test( 'update row links to the release and the release list on GitHub', async ( { page } ) => {
		const notice = page.locator( `tr.plugin-update-tr[data-plugin="${ SLUG }"]` );
		await expect( notice ).toContainText( '9.0.0' );

		const releaseLink = notice.getByRole( 'link', { name: 'Release notes on GitHub' } );
		await expect( releaseLink ).toHaveAttribute( 'href', `${ REPO }/releases/tag/v9.0.0` );
		await expect( notice.getByRole( 'link', { name: 'All releases' } ) ).toHaveAttribute(
			'href',
			`${ REPO }/releases`
		);
		await expectNoPhpDiagnostics( page );
	} );

	test( 'details modal shows a stable-channel changelog linking each release', async ( { page } ) => {
		// Follow the real "View version details" link rather than a hand-built
		// URL: core builds it from the transient's slug (the folder name), and
		// a hand-built URL once hid that the updater rejected exactly that slug
		// with "Plugin not found".
		const notice = page.locator( `tr.plugin-update-tr[data-plugin="${ SLUG }"]` );
		const detailsHref = await notice
			.getByRole( 'link', { name: /View .*version .* details/ } )
			.getAttribute( 'href' );
		expect( detailsHref ).toContain( 'plugin=wp-soli-featured-image-plugin&' );
		await page.goto( detailsHref.replace( /&TB_iframe=true.*$/, '' ) );
		await expect( page.locator( 'body' ) ).not.toContainText( 'Plugin not found' );
		await expectNoPhpDiagnostics( page );

		// Core reads ->name for the heading; without it the page prints a
		// PHP notice (caught above) and shows no title.
		await expect( page.locator( '#plugin-information-title' ) ).toContainText( 'Soli Featured Image Plugin' );

		const changelog = page.locator( '#section-changelog' );
		await expect( changelog ).toBeVisible();
		await expect( changelog ).toContainText( 'Releases, newest first.' );

		await expect( changelog.getByRole( 'link', { name: 'View all on GitHub' } ) ).toHaveAttribute(
			'href',
			`${ REPO }/releases`
		);
		await expect( changelog.getByRole( 'link', { name: '9.0.0', exact: true } ) ).toHaveAttribute(
			'href',
			`${ REPO }/releases/tag/v9.0.0`
		);
		await expect( changelog.getByRole( 'link', { name: '8.9.0', exact: true } ) ).toHaveAttribute(
			'href',
			`${ REPO }/releases/tag/v8.9.0`
		);

		// Release notes are rendered from Markdown, and stable installs never
		// see nightlies or drafts.
		await expect( changelog.locator( 'li', { hasText: 'Second stable change' } ) ).toBeVisible();
		await expect( changelog.locator( 'strong', { hasText: 'bold' } ) ).toBeVisible();
		await expect( changelog ).not.toContainText( 'nightly' );
		await expect( changelog ).not.toContainText( 'Draft must not appear' );

		// The scaffolding both workflows wrap around the commit list is dropped:
		// it repeats per release and buries the lines that actually differ.
		await expect( changelog ).not.toContainText( 'Automated nightly build' );
		await expect( changelog ).not.toContainText( 'Built from' );
		await expect( changelog ).not.toContainText( 'pre-release build for testing' );
		await expect( changelog ).not.toContainText( 'Full Changelog' );
		await expect( changelog.locator( 'h4' ) ).toHaveCount( 2 );

		// A hostile release body is escaped, not executed.
		await expect( changelog.locator( 'script' ) ).toHaveCount( 0 );
		await expect( changelog ).toContainText( '<script>alert(1)</script>' );

		// With the folder-name slug core recognises the installed copy.
		await expect( page.getByRole( 'button', { name: /Update .* now/ } ) ).toBeVisible();

		// The homepage link in the modal sidebar points at the release list.
		await expect( page.getByRole( 'link', { name: /Plugin Homepage/ } ) ).toHaveAttribute(
			'href',
			`${ REPO }/releases`
		);
	} );
} );
