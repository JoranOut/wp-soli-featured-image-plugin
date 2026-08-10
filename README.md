[![version](https://img.shields.io/github/package-json/v/JoranOut/wp-soli-featured-image-plugin?label=version&color=3858e9)](https://github.com/JoranOut/wp-soli-featured-image-plugin/releases)
[![nightly](https://img.shields.io/github/v/release/JoranOut/wp-soli-featured-image-plugin?include_prereleases&label=nightly&color=fb8817)](https://github.com/JoranOut/wp-soli-featured-image-plugin/releases)
[![tested up to](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.wordpress.org%2Fcore%2Fversion-check%2F1.7%2F&query=%24.offers%5B0%5D.current&label=tested%20up%20to&prefix=WP%20&color=40a8af)](https://wordpress.org/download/releases/)
[![requires](https://img.shields.io/badge/requires-WP%206.0%2B-40a8af)](https://wordpress.org/download/releases/)
[![wp-env](https://img.shields.io/github/package-json/dependency-version/JoranOut/wp-soli-featured-image-plugin/dev/@wordpress/env?label=wp-env&color=40a8af)](https://www.npmjs.com/package/@wordpress/env)
[![node](https://img.shields.io/github/package-json/engines.node/JoranOut/wp-soli-featured-image-plugin?label=node&color=43853d)](https://nodejs.org)
[![license](https://img.shields.io/github/license/JoranOut/wp-soli-featured-image-plugin?color=blue)](LICENSE)

# WP Soli featured image
Plugin for wordpress dedicated to displaying an automated featured image block on [soli.nl](https://www.soli.nl)

<!-- Machine-readable markers. publish.js reads the plugin name to name the zip,
     and the release workflows rewrite the version here when packaging a build.
     Kept in a comment because a single tilde renders as strikethrough on GitHub;
     the badges above are the human-readable version. Do not reformat.
~Plugin Name: wp-soli-featured-image-plugin~
~Current Version: 2.0.3~
-->

Contains:
- A featured image block by default on all posts/pages/events
- Global image categories

# Development

## WP-ENV
### Install
```cmd
 npm -g install @wordpress/env 
```

### Start
```cmd
 wp-env start [--debug] 
``` 

### Stop
```cmd 
wp-env stop 
```

## Mysql container
### Login 
```cmd 
mariadb -U -ppassword wordpress 
```

## Localhost
### Front-end
[front-end]( http://localhost:8888/)
### Back-end
[back-end]( http://localhost:8888/wp-admin/) \
username: admin \
password: password

## Configuration
```json
 {
    "env": {
        "site": {
            "plugins": [
                "./wp-soli-admin-plugin",
                "./wp-soli-menu-plugin"
            ]
        },
        "winkel": {
            "plugins": [
                "./event-tickets",
                "./woocommerce",
                "./wp-soli-wc-events",
                "./wp-soli-wc-kindermuziekweek",
                "./mollie-payments-for-woocommerce"
            ]
        }
    }
}
```

