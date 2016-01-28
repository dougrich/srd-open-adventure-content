var through     = require('through2'),
    path        = require('path'),
    handlebars  = require('handlebars'),
    File        = require('gulp-util').File;

// heavily inspired by https://github.com/contra/gulp-concat/blob/master/index.js

module.exports = function () {
    
    // aggregate equipment into templated data format
    var articles = {
        articleList: {},
        lookup: {}
    };
    var index = 0;
    
    var latestFile = null;
    
    function bufferContents(file, enc, cb) {
        // ignore empty
        if (file.isNull()) {
            cb();
            return;
        }
        
        // is this a template, or data?
        var extension = path.extname(file.path),
            dictionaryKey = path
            .basename(file.path, extension)
            .replace(file.base, '')
            .replace(/\\/gi, '/');
        articles.articleList[index] = file.contents.toString('utf8');
        articles.lookup[dictionaryKey] = index;
        
        latestFile = file;
        index++;
        cb();
    }
    
    function endStream(cb) {
        if (!latestFile) return cb();
        
        var javascript = "";
        
        javascript += "SRD[key][keys.a] = ";
        javascript += JSON.stringify(articles.articleList);
        javascript += ";";
        
        javascript += "SRD[key][keys.l] = ";
        javascript += JSON.stringify(articles.lookup);
        javascript += ";";
        
        var joinedFile = latestFile.clone({contents: false});
        joinedFile.path = path.join(latestFile.base, 'articles.js');
        joinedFile.contents = new Buffer(javascript);
        this.push(joinedFile);
        cb();
    }
    
    return through.obj(bufferContents, endStream);
}