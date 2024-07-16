<?php

/*
  Description: Block which shows featured image
*/

class SoliFeaturedImageBlock {
  function __construct() {
    add_action('init', array($this, 'adminAssets'));
  }

  function adminAssets() {
    wp_register_style('block-featured-image-css', plugin_dir_url(__FILE__) . 'build/index.css');
    wp_register_script('block-featured-image-js', plugin_dir_url(__FILE__) . 'build/index.js', array('wp-blocks', 'wp-element', 'wp-editor', 'wp-api-fetch'));
    register_block_type('soli/featured-image', array(
      'editor_script' => 'block-featured-image-js',
      'editor_style' => 'block-featured-image-css',
      'render_callback' => array($this, 'theHTML'),
      'attributes' => array(
        'selectedGroups' => array(
          'type' => 'array',
          'default' => array(),
        ),
      ),
    ));
  }

  function theHTML($attributes){
    wp_enqueue_script('block-featured-image-frontend',  plugin_dir_url(__FILE__) . 'build/frontend.js', array('wp-element'), '1.1', true);
    wp_enqueue_style('block-featured-image-frontend-styles',  plugin_dir_url(__FILE__) . 'build/frontend.css');

    ob_start();?>
    <div class="block-featured-image" data-attributes="<?php echo htmlspecialchars(json_encode($attributes['selectedGroups']), ENT_QUOTES, 'UTF-8'); ?>"></div>
    <?php return ob_get_clean();
  }
}

$soliBlockIssueTracker = new SoliFeaturedImageBlock();

function modify_post_type_args( $args, $post_type ) {
  if ( 'post' === $post_type || 'page' === $post_type) {
    $args['template'] = array(
      array( 'soli/featured-image', array(
        'lock' => array(
          'move' => true,
          'remove' => true
        )
      ) ),
      // You can add more blocks to the template here if needed
    );
//    $args['template_lock'] = 'all'; // Optional: Lock the template to prevent users from removing default blocks
  }
  return $args;
}
add_filter( 'register_post_type_args', 'modify_post_type_args', 10, 2 );

function register_soli_groups_meta() {
  $post_types = array('post', 'page', 'soli_event');

  foreach ($post_types as $post_type) {
    register_post_meta($post_type, 'soli_groups', array(
      'show_in_rest' => array(
        'schema' => array(
          'type' => 'array',
          'items' => array(
            'type' => 'string',
          ),
        ),
      ),
      'single' => true,
      'type' => 'array',
      'auth_callback' => function() use ($post_type) {
        return ($post_type === 'post') ? current_user_can('edit_posts') : current_user_can('edit_pages');
      },
    ));
  }
}
add_action('init', 'register_soli_groups_meta');

