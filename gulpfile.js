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
    argv    = require('yargs').argv,
    exec    = require('child_process').execSync,
    markdown= require('gulp-markdown');
    
// custom build steps
var lint            = require('./build/lint'),
    templatedData   = require('./build/templated-data'),
    indexer         = require('./build/index'),
    articles        = require('./build/articles');

gulp.task('lint', function () {
    return gulp.src('sources/**/*.md')
        .pipe(lint())
        .pipe(gulp.dest('sources'));
});

gulp.task('make:temp', function () {
    try {
        fs.mkdirSync('temp');
    } catch (ex) {
        console.log('Temp directory already exists');
    }
})

var sources = fs.readdirSync('sources');

var build = [], watch = [], srcJson = [];

sources.forEach(function (src) {
    
    var keys = {
        buildTemplated: 'build:' + src + ':templated',
        buildTemplatedSrc: 'sources/' + src + '/templated/*',
        buildArticles: 'build:' + src + ':articles',
        buildArticlesSrc: 'sources/' + src + '/articles/**/*.md',
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
    
    gulp.task(keys.buildArticles, ['lint'], function () {
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
                header: 'SOURCE["' + src + '"] = function () { (function (SRD, CreateClass, CreateElement, key, keys) { SRD[key] = SRD[key] || {};',
                footer: '})(SRD, React.createClass, React.createElement,"' + src + '", KEYS) };'
            }))
            .pipe(uglify())
            .pipe(gulp.dest('temp/packs'));
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
    
    gulp.task('build:universal:index', function () {
        return gulp.src('sources/**/*.md')
            .pipe(markdown())
            .pipe(addsrc('sources/**/*.dat'))
            .pipe(indexer())
            .pipe(gulp.dest('temp'));
    });
    
    gulp.task('watch:universal:index', ['build:universal:index'], function () {
        gulp.watch(['sources/**/*.md', 'sources/**/*.dat'], ['build:universal:index']);
    })
    
    build.push('build:universal:index');
    watch.push('watch:universal:index');
})();

(function () {
    gulp.task('build:universal:package-list', ['make:temp'], function () {
        var packages = srcJson.map(function (kv) {
            var manifest = JSON.stringify(JSON.parse(fs.readFileSync(kv.value, 'utf8')));
            return '"' + kv.key + '":' + manifest;
        }).join(',');
        fs.writeFileSync('temp/manifest.js', 'var MANIFEST = {' + packages + '}');
    });
    gulp.task('watch:universal:package-list', ['build:universal:package-list'], function () {
        gulp.watch(srcJson.map(function (kv) { return kv.value }), ['build:universal:package-list']);
    });
    build.push('build:universal:package-list');
    watch.push('watch:universal:package-list');
})();

(function () {
    gulp.task('build:universal:legal', ['make:temp'], function (cb) {
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
            fs.writeFileSync('temp/legal.js', js);
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

var src = [
    'temp/legal.js',
    'temp/manifest.js',
    'temp/index.js'
];
var packs = [];
srcJson.forEach(function(kv) {
    var sourceJson = JSON.parse(fs.readFileSync(kv.value, 'utf8'));
    if (sourceJson.required) {
        src.push('temp/packs/' + kv.key + '.js');
    } else {
        packs.push('temp/packs/' + kv.key + '.js');
    }
});

gulp.task('pack:core', ['build'], function () {
    
    return gulp.src(src)
        .pipe(debug())
        .pipe(concat('core.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist/srd'));
});

gulp.task('pack:supplements', ['build'], function () {
    
    return gulp.src(packs)
        .pipe(debug())
        .pipe(uglify())
        .pipe(gulp.dest('dist/srd'));
});

gulp.task('pack', ['pack:core', 'pack:supplements']);

gulp.task('default', ['pack'], function () {
    gulp.watch([
        'sources/**/*',
        'legal/**/*'
    ],[
        'pack'
    ])
})

gulp.task('deploy', ['pack'], function () {
    exec('gcloud compute copy-files --zone ' + argv.zone + ' ./dist/* ' + argv.server + ':/var/www/srd');
})