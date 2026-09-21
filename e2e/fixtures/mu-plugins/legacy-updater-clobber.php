<?php
/**
 * Plugin Name: Legacy updater clobber (e2e fixture)
 * Description: Mimics a sibling Soli plugin still on updater 1.7, whose plugins_api filter returns a literal false for any other slug and so discards whatever an earlier filter built. Registered after this plugin's own filter to match the load order of a folder that sorts later alphabetically.
 */

add_action( 'init', function () {
	add_filter( 'plugins_api', function ( $false, $action, $response ) {
		if ( ! isset( $response->slug ) || 'some-other-plugin' !== $response->slug ) {
			return false;
		}
		return $false;
	}, 10, 3 );
}, 11 );
