'use strict';

var $        = require('gulp-load-plugins')();
var argv     = require('yargs').argv;
var browser  = require('browser-sync');
var gulp     = require('gulp');
var panini   = require('panini');
var rimraf   = require('rimraf');
var sequence = require('run-sequence');
var fs       = require('fs');

var markdown  = require('gulp-markdown');
markdown.marked.setOptions({
  renderer: new markdown.marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
});

// turn md files into html partials
gulp.task('blogPosts', function () {
  return gulp.src('./src/blog/blogOne.md')
    .pipe(markdown())
    .pipe(gulp.dest('./src/partials/'));
});

// Check for --production flag
var isProduction = !!(argv.production);

// Port to use for the development server.
var PORT = 8000;

// Browsers to target when prefixing CSS.
var COMPATIBILITY = ['last 2 versions', 'ie >= 9'];

// File paths to various assets are defined here.
var PATHS = {
  assets: [
    'src/assets/**/*',
    '!src/assets/{img,js,scss}/**/*'
  ],
  sass: [
    'bower_components/foundation-sites/scss',
    'bower_components/motion-ui/src/'
  ],
  javascript: [
    'bower_components/jquery/dist/jquery.js',
    'bower_components/what-input/what-input.js',
    'bower_components/foundation-sites/js/foundation.core.js',
    'bower_components/foundation-sites/js/foundation.util.*.js',
    // Paths to individual JS components defined below
    'bower_components/foundation-sites/js/foundation.abide.js',
    'bower_components/foundation-sites/js/foundation.accordion.js',
    'bower_components/foundation-sites/js/foundation.accordionMenu.js',
    'bower_components/foundation-sites/js/foundation.drilldown.js',
    'bower_components/foundation-sites/js/foundation.dropdown.js',
    'bower_components/foundation-sites/js/foundation.dropdownMenu.js',
    'bower_components/foundation-sites/js/foundation.equalizer.js',
    'bower_components/foundation-sites/js/foundation.interchange.js',
    'bower_components/foundation-sites/js/foundation.magellan.js',
    'bower_components/foundation-sites/js/foundation.offcanvas.js',
    'bower_components/foundation-sites/js/foundation.orbit.js',
    'bower_components/foundation-sites/js/foundation.responsiveMenu.js',
    'bower_components/foundation-sites/js/foundation.responsiveToggle.js',
    'bower_components/foundation-sites/js/foundation.reveal.js',
    'bower_components/foundation-sites/js/foundation.slider.js',
    'bower_components/foundation-sites/js/foundation.sticky.js',
    'bower_components/foundation-sites/js/foundation.tabs.js',
    'bower_components/foundation-sites/js/foundation.toggler.js',
    'bower_components/foundation-sites/js/foundation.tooltip.js',
    'src/assets/js/**/!(app).js',
    'src/assets/js/app.js'
  ]
};

// Delete the "dist" folder
// This happens every time a build starts
gulp.task('clean', function(done) {
  rimraf('dist', done);
});

// Browser Sync wrapper task
// allows for proper injection of css files
gulp.task('reload', function(cb) {
  browser.reload();
  cb();
});

// Copy files out of the assets folder
// This task skips over the "img", "js", and "scss" folders, which are parsed separately
gulp.task('copy', function() {
  return gulp.src(PATHS.assets)
    .pipe(gulp.dest('dist/assets'));
});

// Copy page templates into finished HTML files
gulp.task('pages', function() {
  return gulp.src('src/pages/**/*.{html,hbs,handlebars}')
    .pipe(panini({
      root: 'src/pages/',
      layouts: 'src/layouts/',
      partials: 'src/partials/',
      data: 'src/data/',
      helpers: 'src/helpers/'
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('pages:reset', function(cb) {
  panini.refresh();
  gulp.run('pages', cb);
});

// Compile Sass into CSS
// In production, the CSS is compressed
gulp.task('sass', function() {
  var uncss = $.if(isProduction, $.uncss({
    html: ['src/**/*.html'],
    ignore: [
      new RegExp('^meta\..*'),
      new RegExp('^\.is-.*')
    ]
  }));

  var minifycss = $.if(isProduction, $.minifyCss());

  return gulp.src('src/assets/scss/app.scss')
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      includePaths: PATHS.sass
    })
      .on('error', $.sass.logError))
    .pipe($.autoprefixer({
      browsers: COMPATIBILITY
    }))
    .pipe(uncss)
    .pipe(minifycss)
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .pipe(gulp.dest('dist/assets/css'))
    .pipe(browser.reload({stream: true}));
});

// Combine JavaScript into one file
// In production, the file is minified
gulp.task('javascript', function() {
  var uglify = $.if(isProduction, $.uglify()
    .on('error', function (e) {
      console.log(e);
    }));

  return gulp.src(PATHS.javascript)
    .pipe($.sourcemaps.init())
    .pipe($.concat('app.js'))
    .pipe(uglify)
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .pipe(gulp.dest('dist/assets/js'));
});

// Copy images to the "dist" folder
// In production, the images are compressed
gulp.task('images', function() {
  var imagemin = $.if(isProduction, $.imagemin({
    progressive: true
  }));

  return gulp.src('src/assets/img/**/*')
    .pipe(imagemin)
    .pipe(gulp.dest('dist/assets/img'));
});

// Build the "dist" folder by running all of the above tasks
gulp.task('build', function(done) {
  sequence('clean', ['pages', 'sass', 'javascript', 'images', 'copy'], done);
});

// Start a server with LiveReload to preview the site in
gulp.task('server', ['build'], function() {
  browser.init({
    server: 'dist', port: PORT, notify: false
  });
});

function postProcess() {
  console.log("postProcess-ing");
  let blogPost = fs.readFileSync("dist/blog/dealing-with-http-responses-in-an-angularjs-service.html",'utf8');
  let fixedBlogPost = blogPost.replace(/(\n.*)<pre>[^]*?<\/pre>/gm, (matchedBlock, p1) => {
    return matchedBlock.replace(new RegExp(p1, 'g'),'\n');
  });
  fs.writeFileSync("dist/blog/dealing-with-http-responses-in-an-angularjs-service.html", fixedBlogPost)
}

// Build the site, run the server, and watch for file changes
gulp.task('default', ['blogPosts','build', 'server'], function() {
  postProcess();
  gulp.watch(PATHS.assets, ['copy', 'reload']);
  gulp.watch(['src/pages/**/*.html'], ['pages', 'reload']);
  gulp.watch(['src/{layouts,partials}/**/*.html'], ['pages:reset', 'reload']);
  gulp.watch(['src/assets/scss/**/*.scss'], ['sass']);
  gulp.watch(['src/assets/js/**/*.js'], ['javascript', 'reload']);
  gulp.watch(['src/assets/img/**/*'], ['images', 'reload']);
});
