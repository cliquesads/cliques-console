/**=========================================================
 * Module: constants.js
 * Define constants to inject across the application
 =========================================================*/
angular.module('core')
  .constant('APP_COLORS', {
    'primary':                '#5d9cec',
    'success':                '#27c24c',
    'info':                   '#23b7e5',
    'warning':                '#ff902b',
    'danger':                 '#f05050',
    'inverse':                '#131e26',
    'green':                  '#37bc9b',
    'pink':                   '#f532e5',
    'purple':                 '#7266ba',
    'dark':                   '#3a3f51',
    'yellow':                 '#fad732',
    'gray-darker':            '#232735',
    'gray-dark':              '#3a3f51',
    'gray':                   '#dde6e9',
    'gray-light':             '#e4eaec',
    'gray-lighter':           '#edf1f2'
  })
  .constant('APP_MEDIAQUERY', {
    'desktopLG':             1200,
    'desktop':                992,
    'tablet':                 768,
    'mobile':                 480
  })
  .constant('APP_REQUIRES', {
    // jQuery based and standalone scripts
    scripts: {
      'modernizr':          ['/lib/modernizr/modernizr.js'],
      'icons':              ['/lib/fontawesome/css/font-awesome.min.css',
                             '/lib/simple-line-icons/css/simple-line-icons.css']
    },
    // Angular based script (use the right module name)
    modules: [
      // { name: 'toaster', files: ['/lib/angularjs-toaster/toaster.js','/lib/angularjs-toaster/toaster.css'] }
    ]
  })
    .constant('CREATIVE_SIZES', {
        supported_dimensions: ['300x250','300x600','160x600','728x90','320x50','468x460','120x600','300x100','468x60','970x90']
    })
    .constant('REGEXES', {
        domain: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z\-]{2,})+$/,
        domainPattern: '[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z\-]{2,})+',
        date: /^(?:(0[1-9]|1[012])[\/.](0[1-9]|[12][0-9]|3[01])[\/.](19|20)[0-9]{2})$/,
        datePattern: '/^(?:(0[1-9]|1[012])[/.](0[1-9]|[12][0-9]|3[01])[/.](19|20)[0-9]{2})$/'
    })
    .constant('OPENRTB', {
        positions: [
            {name: "Header", code: 4},
            {name: "Footer", code: 5},
            {name: "Sidebar", code: 6},
            {name: "Above the Fold", code: 1},
            {name: "Below the Fold", code: 3}
        ]
    })
    .constant('LOGO', {
        max_size_kb: 20,
        max_width: 200,
        max_height: 200,
        default_url: 'http://storage.googleapis.com/cliquesads-console-logos-us/default-logo.png',
        default_secure_url: 'https://storage.googleapis.com/cliquesads-console-logos-us/default-logo.png'
    })
;