<?php
/**
 * Plugin Name: Mock GitHub releases (e2e fixture)
 * Description: Answers the updater's GitHub API calls locally so the changelog tests run without network. Only mapped into the wp-env tests environment.
 */

add_filter( 'pre_http_request', function ( $pre, $args, $url ) {
	// wp_update_plugins() asks api.wordpress.org first and gives up entirely,
	// without firing pre_set_site_transient_update_plugins, when that call
	// fails. Answer it locally so the updater's own filter always runs.
	if ( false !== strpos( $url, 'api.wordpress.org/plugins/update-check' ) ) {
		return array(
			'headers'  => array(),
			'body'     => wp_json_encode( array( 'plugins' => array(), 'no_update' => array(), 'translations' => array() ) ),
			'response' => array( 'code' => 200, 'message' => 'OK' ),
			'cookies'  => array(),
			'filename' => null,
		);
	}

	if ( false === strpos( $url, 'api.github.com/repos/JoranOut/wp-soli-featured-image-plugin' ) ) {
		return $pre;
	}

	$asset = function ( $tag ) {
		return array( array(
			'name'                 => 'wp-soli-featured-image-plugin.zip',
			'browser_download_url' => "https://github.com/JoranOut/wp-soli-featured-image-plugin/releases/download/{$tag}/wp-soli-featured-image-plugin.zip",
		) );
	};

	if ( false !== strpos( $url, '/releases' ) ) {
		$body = array(
			array( 'tag_name' => 'v9.0.0-nightly.120', 'draft' => false, 'prerelease' => true, 'published_at' => '2026-09-20T02:00:00Z', 'assets' => $asset( 'v9.0.0-nightly.120' ),
				'body' => "Automated nightly build from main branch.\n\n## Changes\n\n- Nightly change one\n- Nightly change two\n" ),
			array( 'tag_name' => 'v9.0.0-nightly.119', 'draft' => false, 'prerelease' => true, 'published_at' => '2026-09-19T02:00:00Z', 'assets' => $asset( 'v9.0.0-nightly.119' ), 'body' => '- Older nightly' ),
			array( 'tag_name' => 'v9.0.0', 'draft' => false, 'prerelease' => false, 'published_at' => '2026-09-18T10:00:00Z', 'assets' => $asset( 'v9.0.0' ),
				'body' => "## Changes\n\n- Stable change **bold**\n- Second stable change\n\n---\n\n**Full Changelog:** https://github.com/JoranOut/wp-soli-featured-image-plugin/compare/v8.9.0...v9.0.0" ),
			array( 'tag_name' => 'v8.9.0', 'draft' => false, 'prerelease' => false, 'published_at' => '2026-09-01T10:00:00Z', 'assets' => $asset( 'v8.9.0' ), 'body' => '- Previous stable <script>alert(1)</script>' ),
			array( 'tag_name' => 'v9.1.0', 'draft' => true, 'prerelease' => false, 'published_at' => null, 'assets' => array(), 'body' => 'Draft must not appear' ),
		);
	} else {
		$body = array( 'description' => 'Mocked repository description', 'updated_at' => '2026-09-20T00:00:00Z' );
	}

	return array(
		'headers'  => array(),
		'body'     => wp_json_encode( $body ),
		'response' => array( 'code' => 200, 'message' => 'OK' ),
		'cookies'  => array(),
		'filename' => null,
	);
}, 10, 3 );
