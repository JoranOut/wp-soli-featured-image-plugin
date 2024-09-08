<?php

/*
  Description: Featured image block
*/

add_filter( 'block_categories_all' , function( $categories ) {

  // Adding a new category.
  $categories[] = array(
    'slug'  => 'development',
    'title' => 'development'
  );

  return $categories;
} );

require_once 'featured-image/index.php';
require_once 'settings.php';
