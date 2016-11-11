/* jshint node: true */
'use strict';

module.exports = function(grunt) {
	// Unified Watch Object
	var watchFiles = {
		serverViews: ['app/views/**/*.*'],
		serverJS: ['gruntfile.js', 'server.js', 'config/**/*.js', 'app/**/*.js'],
		clientViews: ['public/modules/**/views/**/*.html'],
		clientJS: ['public/config.js','public/application.js','public/modules/*/*.js','public/modules/*/*[!tests]*/*.js'],
		// clientCSS: ['public/modules/**/*.css'],
		clientCSS: ['public/dist/application.min.css', 'public/modules/**/*.css'],
		clientLESS:  ['public/less/**/*.less', 'public/modules/**/*.less'],
		mochaTests: ['app/tests/**/*.js']
	};

	grunt.loadNpmTasks('grunt-contrib-less');

	// Project Configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		watch: {
			serverViews: {
				files: watchFiles.serverViews,
				options: {
					livereload: true
				}
			},
			serverJS: {
				files: watchFiles.serverJS,
				tasks: ['jshint'],
				options: {
					livereload: true
				}
			},
			clientViews: {
				files: watchFiles.clientViews,
				options: {
					livereload: true
				}
			},
			clientJS: {
				files: watchFiles.clientJS,
				tasks: ['jshint'],
				options: {
					livereload: true
				}
			},
			clientCSS: {
				files: watchFiles.clientCSS,
				tasks: ['csslint'],
				options: {
					livereload: true
				}
			},
			clientLESS: {
				files: watchFiles.clientLESS,
				tasks: ['less'],
				options: {
					livereload: true
				}
			}
		},
		jshint: {
			all: {
				src: watchFiles.clientJS.concat(watchFiles.serverJS),
				options: {
                    node: true,
                    strict: true, // allows use of 'use strict'; string at beginning of file
					laxbreak: true, // true: Tolerate possibly unsafe line breakings
                    multistr: true, // allows use of \ literal to delimit newlines (new as of ES5)
                    globals: {
                        angular: false,
                        after: false,
                        afterEach: false,
                        before: false,
                        beforeEach: false,
                        browser: false,
                        describe: false,
                        document: true,
                        expect: false,
						_: true,
						jQuery: true,
                        inject: false,
                        it: false,
                        jasmine: false,
                        spyOn: false,
                        window: false,
						moment: true,
                        $: true,
                        ApplicationConfiguration: true
                    }
				}
			}
		},
		less: {
			production: {
				options: {
					paths: ['public/less'],
					cleancss: true,
                    ieCompat:true,
					compress: true
				},
				files: {
					'public/dist/application.min.css': 'public/less/application.less'
				}
			},
			dev: {
				options: {
					sourceMap: true,
					ieCompat:true,
					dumpLineNumbers:true
				},
				files: {
					'public/dist/application.min.css': 'public/less/application.less'
				}
			}
		},
		csslint: {
			options: {
				csslintrc: '.csslintrc'
			},
			all: {
				src: watchFiles.clientCSS
			}
		},
        copy: {
            default: {
                files: [
                    // includes files within path
                    // TODO: Can't get vendorImageFiles config var to read properly here, FIX THIS
                    {expand: true, src: 'public/lib/datatables/media/images/*', dest: 'public/images/', flatten: true, filter: 'isFile'},
					{expand: true, src: 'public/lib/intl-tel-input/build/img/*', dest: 'public/img/', flatten: true, filter: 'isFile'}
                ]
            }
        },
        concat: {
            options: {
                // define a string to put between each file in the concatenated output
                separator: '; \n'
            },
            dist: {
                // the files to concatenate
                src: '<%= vendorJavaScriptFiles %>',
                // the location of the resulting JS file
                dest: 'public/dist/vendor.js'
            }
        },
		uglify: {
            default:{
                options: {
                    mangle: false
                },
                files: {
                    'public/dist/application.min.js': 'public/dist/application.js',
                    'public/dist/vendor.min.js': 'public/dist/vendor.js'
                }
            }
		},
        sass: {
            options: {
                sourceMap: true
            },
            dist: {
                files: {
                    'public/dist/common.css': 'public/lib/datatables-buttons/css/common.scss',
                    'public/dist/mixins.css': 'public/lib/datatables-buttons/css/mixins.scss',
                    'public/dist/buttons.foundation.css': 'public/lib/datatables-buttons/css/buttons.foundation.scss',
                    'public/dist/buttons.dataTables.css': 'public/lib/datatables-buttons/css/buttons.dataTables.scss',
                    'public/dist/buttons.bootstrap.css': 'public/lib/datatables-buttons/css/buttons.bootstrap.scss',
                    'public/dist/buttons.jqueryui.css': 'public/lib/datatables-buttons/css/buttons.jqueryui.scss'
                }
            }
        },

		cssmin: {
			combine: {
				files: {
					'public/dist/vendor.min.css': '<%= vendorCSSFiles %>'
				}
			}
		},
		nodemon: {
			default: {
				script: 'server.js',
				options: {
					nodeArgs: ['--debug'],
					ext: 'js,html',
					watch: watchFiles.serverViews.concat(watchFiles.serverJS)
				}
			}
		},
		'node-inspector': {
			custom: {
				options: {
					'web-port': 1337,
					'web-host': 'localhost',
					'debug-port': 5858,
					'save-live-edit': true,
					'no-preload': true,
					'stack-trace-limit': 50,
					'hidden': []
				}
			}
		},
		ngAnnotate: {
            default:{
                files: {
                    'public/dist/application.js': watchFiles.clientJS
                }
            }
		},
		concurrent: {
			default: ['nodemon', 'watch'],
            dev: ['nodemon', 'watch'],
			debug: ['nodemon', 'watch', 'node-inspector'],
			options: {
				logConcurrentOutput: true,
				limit: 10
			}
		},
		env: {
            // Only added dev environment to add dev env step to build task as a hack
            dev: {
                NODE_ENV: 'dev'
            },
			"local-test": {
				NODE_ENV: 'local-test'
			},
			secure: {
				NODE_ENV: 'secure'
            },
            production: {
                NODE_ENV: 'production'
            }
		},
		mochaTest: {
			src: watchFiles.mochaTests,
			options: {
				reporter: 'spec',
				require: 'server.js'
			}
		},
		karma: {
			unit: {
				configFile: 'karma.conf.js'
			}
		}
	});

	// Load NPM tasks
	require('load-grunt-tasks')(grunt);

	// Making grunt default to force in order not to break the project.
	grunt.option('force', true);

	// A Task for loading the configuration object
	grunt.task.registerTask('loadConfig', 'Task that loads the config into a grunt option.', function() {
		var init = require('./config/init')();
		var config = require('./config/config');

		grunt.config.set('vendorJavaScriptFiles', config.vendor.js);
        grunt.config.set('vendorSassFiles', config.vendor.sass);
		grunt.config.set('vendorCSSFiles', config.vendor.css);
        grunt.config.set('vendorImageFiles', config.vendor.image);
    });

	// Default task(s).
    // Only really should be run locally, hence the local-test env
	grunt.registerTask('default', ['env:local-test','less:dev','lint', 'concurrent:default']);

    // Dev task(s).
    grunt.registerTask('default-dev', ['env:dev','less:dev','lint', 'concurrent:dev']);

	// Debug task.
	grunt.registerTask('debug', ['lint', 'concurrent:debug']);

	// Secure task(s).
	grunt.registerTask('secure', ['env:secure', 'lint', 'concurrent:default']);

	// Lint task(s).
	grunt.registerTask('lint', ['jshint', 'csslint']);

	// Build task(s).
	grunt.registerTask('build-dev', ['env:dev','copy','loadConfig', 'ngAnnotate','concat','uglify','less:dev','sass','cssmin']);

    // Build task(s).
    grunt.registerTask('build-production', ['env:production','copy','loadConfig', 'ngAnnotate','concat','uglify','less:production','sass','cssmin']);

	// Test task.
	grunt.registerTask('test', ['env:test', 'mochaTest', 'karma:unit']);
};