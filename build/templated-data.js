var through     = require('through2'),
    path        = require('path'),
    handlebars  = require('handlebars'),
    File        = require('gulp-util').File;

// heavily inspired by https://github.com/contra/gulp-concat/blob/master/index.js

module.exports = function () {
    
    // aggregate equipment into templated data format
    var templatedData = {
        templates: {},
        data: {}
    };
    
    var latestFile = null;
    
    function bufferContents(file, enc, cb) {
        // ignore empty
        if (file.isNull()) {
            cb();
            return;
        }
        
        // is this a template, or data?
        var extension = path.extname(file.path),
            dictionaryKey = path.basename(file.path, extension);
        if (extension === '.jsx') {
            // template; handlebars compile it into js and store the string in templates
            templatedData.templates[dictionaryKey]
                = file.contents.toString('utf8');
        } else {
            // put data into aggregate
            templatedData.data[dictionaryKey]
                = file.contents.toString('utf8')
                .split('\n')
                .filter(function (row) {
                    // remove commenting
                    return row[0] !== '#';
                })
                .map(function (row) {
                    return row.split('|')
                        .map(function (column) {
                            return column.trim();
                        })
                });
        }
        
        latestFile = file;
        
        cb();
    }
    
    function endStream(cb) {
        if (!latestFile) return cb();
        
        var javascript = "SRD[key][keys.t] = {";
        
        // serialize all functions
        javascript += 
            Object.keys(templatedData.templates)
                .map(function (key) {
                    return '"' + key + '": ' + templatedData.templates[key];
                })
                .join(',');
        
        javascript += "}; SRD[key][keys.d] = {";
        
        // serialize all data
        javascript += 
            Object.keys(templatedData.data)
                .map(function (key) {
                    return '"' + key + '": ' + JSON.stringify(templatedData.data[key]);
                })
                .join(',');
        
        javascript += "};";
        
        var joinedFile = latestFile.clone({contents: false});
        joinedFile.path = path.join(latestFile.base, 'templated.js');
        joinedFile.contents = new Buffer(javascript);
        this.push(joinedFile);
        cb();
    }
    
    return through.obj(bufferContents, endStream);
}