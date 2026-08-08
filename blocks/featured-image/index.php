<?php

/*
  Description: Block which shows featured image
*/

class SoliFeaturedImageBlock {
  function __construct() {
    add_action('init', array($this, 'adminAssets'));
  }

  function adminAssets() {
    wp_register_style('block-featured-image-css', plugin_dir_url(__FILE__) . 'build/index.css', array(), SOLI_FEATURED_IMAGE__PLUGIN_VERSION);
    wp_register_script('block-featured-image-js', plugin_dir_url(__FILE__) . 'build/index.js', array('wp-blocks', 'wp-element', 'wp-editor', 'wp-api-fetch'));
    register_block_type('soli/featured-image', array(
      'editor_script' => 'block-featured-image-js',
      'editor_style' => 'block-featured-image-css',
      'render_callback' => array($this, 'theHTML'),
    ));
  }

  function theHTML($attributes, $content, $block) {
    wp_enqueue_script('block-featured-image-frontend', plugin_dir_url(__FILE__) . 'build/frontend.js', array('wp-element'), SOLI_FEATURED_IMAGE__PLUGIN_VERSION, true);
    wp_enqueue_style('block-featured-image-frontend-styles', plugin_dir_url(__FILE__) . 'build/frontend.css');

    $post_id = get_the_ID();
    $category_names = array();

    if ($post_id) {
      $post_categories = wp_get_post_categories($post_id, array('fields' => 'all'));

      if (!is_wp_error($post_categories)) {
        foreach ($post_categories as $category) {
          $enabled = get_term_meta($category->term_id, 'soli_featured_image_enabled', true);
          if ($enabled) {
            $category_names[] = $category->name;
          }
        }
      }
    }

    ob_start(); ?>
      <div class="block-featured-image"
           data-attributes="<?php echo htmlspecialchars(json_encode($category_names), ENT_QUOTES, 'UTF-8'); ?>"></div>
    <?php return ob_get_clean();
  }
}

$soliBlockIssueTracker = new SoliFeaturedImageBlock();

function modify_post_type_args($args, $post_type) {
  if ('post' === $post_type || 'page' === $post_type) {
    $args['template'] = array(
      array('soli/featured-image', array(
        'lock' => array(
          'move' => true,
          'remove' => true
        )
      )),
    );
  }
  return $args;
}

add_filter('register_post_type_args', 'modify_post_type_args', 10, 2);
