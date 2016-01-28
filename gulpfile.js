// common packages
var gulp    = require('gulp'),
    jsx     = require('gulp-jsx'),
    concat  = require('gulp-concat'),
    wrapper = require('gulp-wrapper'),
    debug   = require('gulp-debug'),
    uglify  = require('gulp-uglify'),
    addsrc  = require('gulp-add-src'),
    fs      = require('fs'),
    glob    = require('glob'),
    path    = require('path'),
    markdown= require('gulp-markdown');
    
// custom build steps
var lint            = require('./build/lint'),
    templatedData   = require('./build/templated-data'),
    articles        = require('./build/articles');

gulp.task('lint', function () {
    return gulp.src('articles/**/*.md')
        .pipe(lint())
        .pipe(gulp.dest('articles'));
});

var sources = fs.readdirSync('sources');

var build = [], watch = [], srcJson = [];

sources.forEach(function (src) {
    
    var keys = {
        buildTemplated: 'build:' + src + ':templated',
        buildTemplatedSrc: 'sources/' + src + '/templated/*',
        buildArticles: 'build:' + src + ':articles',
        buildArticlesSrc: 'sources/' + src + '/articles/*.md',
        buildPack: 'build:' + src + ':pack',
        watch: 'watch:' + src
    };
    
    gulp.task(keys.buildTemplated, function () {
        return gulp.src(keys.buildTemplatedSrc + '.jsx')
            .pipe(jsx({
                factory: 'CreateElement'
            }))
            .pipe(addsrc(keys.buildTemplatedSrc + '*.dat'))
            .pipe(templatedData())
            .pipe(gulp.dest('temp/' + src));
    });
    
    gulp.task(keys.buildArticles, function () {
        var pathLookup = {}, index = 0;
        return gulp.src(keys.buildArticlesSrc)
            .pipe(markdown())
            .pipe(articles())
            .pipe(gulp.dest('temp/' + src));
    });
    
    gulp.task(keys.buildPack, [keys.buildTemplated, keys.buildArticles], function () {
        return gulp.src('temp/' + src + '/**/*.js')
            .pipe(concat(src + '.js'))
            .pipe(wrapper({
                header: '(function (SRD, CreateClass, CreateElement, key, keys) { SRD[key] = SRD[key] || {};',
                footer: '})(window.SRD || (window.SRD = {}), React.createClass, React.createElement,"' + src + '", KEYS)'
            }))
            .pipe(uglify())
            .pipe(gulp.dest('dist'));
    });
    
    srcJson.push({
        key: src,
        value: 'sources/' + src + '/source.json'
    });
    
    gulp.task(keys.watch, [keys.buildPack], function () {
        gulp.watch([
            keys.buildTemplatedSrc + '.jsx',
            keys.buildTemplatedSrc + '.dat',
            keys.buildArticlesSrc
        ], [
            keys.buildPack
        ]);
    });
    
    build.push(keys.buildTemplated);
    build.push(keys.buildPack);
    watch.push(keys.watch);
});

(function () {
    gulp.task('build:universal:package-list', function () {
        var packages = srcJson.map(function (kv) {
            var manifest = JSON.stringify(JSON.parse(fs.readFileSync(kv.value, 'utf8')));
            return '"' + kv.key + '":' + manifest;
        }).join(',');
        
        fs.writeFileSync('dist/manifest.js', 'var MANIFEST = {' + packages + '}');
    });
    gulp.task('watch:universal:package-list', ['build:universal:package-list'], function () {
        gulp.watch(srcJson.map(function (kv) { return kv.value }), ['build:universal:package-list']);
    });
    build.push('build:universal:package-list');
    watch.push('watch:universal:package-list');
})();

(function () {
    gulp.task('build:universal:legal', function (cb) {
        var copyright = fs.readFileSync('legal/copyright.json', 'utf8'),
            licenses = {};
        
        glob('legal/licenses/*.txt', function (err, files) {
            for (var i = 0; i < files.length; i++) {
                var licenseName = path.basename(files[i], '.txt'),
                    license = fs.readFileSync(files[i] , 'utf8');
                licenses[licenseName] = license;
            }
            
            var js = "var LEGAL = " + JSON.stringify({
                copyright: JSON.parse(copyright),
                license: licenses
            }) + ';';
            fs.writeFileSync('dist/legal.js', js);
            cb();
        });
    });
    gulp.task('watch:universal:legal', ['build:universal:legal'], function () {
        gulp.watch([
            'legal/licenses/*.txt',
            'legal/copyright.json'
        ], ['build:universal:legal']);
    });
    build.push('build:universal:legal');
    watch.push('watch:universal:legal');
})();

gulp.task('build', build);
gulp.task('watch', watch);

