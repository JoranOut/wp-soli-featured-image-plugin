<?php

/**
 * Register category taxonomy for page and soli_event post types,
 * register term metas, and REST API endpoints for category-image mapping.
 */

add_action( 'init', 'soli_featured_image_register_category_for_post_types' );
function soli_featured_image_register_category_for_post_types() {
	register_taxonomy_for_object_type( 'category', 'page' );
	register_taxonomy_for_object_type( 'category', 'soli_event' );
}

add_action( 'init', 'soli_featured_image_register_term_meta' );
function soli_featured_image_register_term_meta() {
	register_term_meta( 'category', 'soli_featured_image_id', array(
		'type'              => 'integer',
		'single'            => true,
		'default'           => 0,
		'show_in_rest'      => true,
		'sanitize_callback' => 'absint',
	) );

	register_term_meta( 'category', 'soli_featured_image_enabled', array(
		'type'              => 'boolean',
		'single'            => true,
		'default'           => false,
		'show_in_rest'      => true,
		'sanitize_callback' => 'rest_sanitize_boolean',
	) );
}

add_action( 'rest_api_init', 'soli_featured_image_register_endpoints' );
function soli_featured_image_register_endpoints() {
	// GET enabled categories with their image IDs (for the block editor)
	register_rest_route( 'soli_featured_image/v1', '/category-images', array(
		array(
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => 'soli_featured_image_get_category_images',
		),
		array(
			'methods'             => 'POST',
			'permission_callback' => function () {
				return current_user_can( 'manage_categories' );
			},
			'callback'            => 'soli_featured_image_save_category_images',
		),
	) );

	// GET all categories with enabled/image state (for the settings modal)
	register_rest_route( 'soli_featured_image/v1', '/all-categories', array(
		'methods'             => 'GET',
		'permission_callback' => function () {
			return current_user_can( 'edit_posts' );
		},
		'callback'            => 'soli_featured_image_get_all_categories',
	) );
}

function soli_featured_image_get_category_images() {
	$categories = get_terms( array(
		'taxonomy'   => 'category',
		'hide_empty' => false,
		'meta_query' => array(
			array(
				'key'   => 'soli_featured_image_enabled',
				'value' => '1',
			),
		),
	) );

	if ( is_wp_error( $categories ) ) {
		return rest_ensure_response( array() );
	}

	$result = array();
	foreach ( $categories as $category ) {
		$result[] = array(
			'category_id' => $category->term_id,
			'name'        => $category->name,
			'image_id'    => (int) get_term_meta( $category->term_id, 'soli_featured_image_id', true ),
		);
	}

	return rest_ensure_response( $result );
}

function soli_featured_image_save_category_images( $request ) {
	$items = $request->get_json_params();

	if ( ! is_array( $items ) ) {
		return new WP_Error( 'invalid_data', 'Invalid data provided', array( 'status' => 400 ) );
	}

	foreach ( $items as $item ) {
		if ( ! isset( $item['category_id'] ) ) {
			return new WP_Error( 'invalid_data', 'Each item must have a category_id', array( 'status' => 400 ) );
		}

		$category_id = absint( $item['category_id'] );
		$term         = get_term( $category_id, 'category' );

		if ( ! $term || is_wp_error( $term ) ) {
			continue;
		}

		if ( isset( $item['enabled'] ) ) {
			update_term_meta( $category_id, 'soli_featured_image_enabled', rest_sanitize_boolean( $item['enabled'] ) );
		}

		if ( isset( $item['image_id'] ) ) {
			update_term_meta( $category_id, 'soli_featured_image_id', absint( $item['image_id'] ) );
		}
	}

	// Return updated state of all categories
	return soli_featured_image_get_all_categories();
}

function soli_featured_image_get_all_categories() {
	$categories = get_terms( array(
		'taxonomy'   => 'category',
		'hide_empty' => false,
	) );

	if ( is_wp_error( $categories ) ) {
		return rest_ensure_response( array() );
	}

	$result = array();
	foreach ( $categories as $category ) {
		$result[] = array(
			'category_id' => $category->term_id,
			'name'        => $category->name,
			'enabled'     => (bool) get_term_meta( $category->term_id, 'soli_featured_image_enabled', true ),
			'image_id'    => (int) get_term_meta( $category->term_id, 'soli_featured_image_id', true ),
		);
	}

	return rest_ensure_response( $result );
}
