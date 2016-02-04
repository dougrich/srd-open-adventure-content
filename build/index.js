/*

Alright, indexing approach:

1. We want, as final output, a single index file.
2. Index file contains a suffix tree
3. Suffix tree leaves contains an array of:
    - source
    - article/table
    - array of index of positions (either string position or table row)
4. We use a standard suffix tree matching approach

*/

var through     = require('through2'),
    path        = require('path'),
    File        = require('gulp-util').File;

// heavily inspired by https://github.com/contra/gulp-concat/blob/master/index.js

module.exports = function () {
    
    // aggregate equipment into templated data format
    var minQuery = 1;
    var suffixTree = {};
    
    var lookups = {
        source: {
            arr: [],
            dict: {}
        },
        path: {
            arr: [],
            dict: {}
        },
        word: {
            arr: [],
            dict: {}
        }
    }
    
    function fromLookup(lookup, value) {
        if (!lookup.dict[value]) {
            lookup.dict[value] = lookup.arr.length;
            lookup.arr.push(value);
        }
        return lookup.dict[value];
    }
    
    var sourceArray = [], sourceDict = {};
    var pathArray = [], pathDict = {};
    var wordArray = [], wordDict = {};
    var wordsToSkip = [
        'and',
        'the',
        'also',
        'are',
        'how',
        'use',
        'the',
        'at',
        'of',
        'a',
        'i',
        'in'
    ]
    
    function addToSuffixTree(word, tail) {
        if (wordsToSkip.indexOf(word) >= 0) return;
        var w = fromLookup(lookups.word, word);
        for(var i = 0; i < word.length - minQuery; i++) {
            var suffix = word.substring(i), root = suffixTree;
            while(suffix.length - minQuery >= 0) {
                root = (root[suffix[0]] || (root[suffix[0]] = {}));
                suffix = suffix.substring(1);
            }
            if (minQuery > 0) {
                root = (root[suffix] || (root[suffix] = {}));
            }
            var copy = JSON.parse(JSON.stringify(tail));
            copy.j = i - word.length;
            copy.w = w;
            (root.$ || (root.$ = [])).push(copy);
        }
    }

    function compressSuffixTree() {
        var start = '';
        do {
            start = JSON.stringify(suffixTree);
            (function compress(root) {
                Object.keys(root).map(function (key) {
                    if (key === '$') {
                        return;
                    }
                    var children = Object.keys(root[key]);
                    if (children.length === 1 && children[0] !== '$') {
                        var continuation = root[key][children[0]];
                        compress(continuation);
                        delete root[key];
                        root[key + children[0]] = continuation;
                    } else {
                        for (var i = 0; i < children.length; i++) {
                            compress(root[key]);
                        }
                    }
                })
            })(suffixTree);
        } while(JSON.stringify(suffixTree) !== start);
    }
    
    function addRowToSuffixTree(row, tail) {
        var cols = row
            .replace(/[^a-z0-9]/gi, ' ')
            .replace(/\W+/gi, ' ')
            .toLowerCase()
            .split(' ');
        addToSuffixTree(cols[0], tail);
    }
    
    function addHtmlPhraseToSuffixTree(phrase, baseOffset, tail) {
        var cleaned = phrase
            .replace(/<.+?>/gi, function (match) {
                return match.replace(/./gi, ' ');
            })
            .replace(/[^a-z0-9]/gi, ' ')
            .toLowerCase();
        var i = 0, startWord = 0;
        function add() {
            // we've reached a gap; grab the substring and index
            var copy = JSON.parse(JSON.stringify(tail));
            if (baseOffset) {
                copy.i = baseOffset + i;
            }
            addToSuffixTree(cleaned.substring(startWord, i), copy);
        }
        // alright, we now have the markup; construct the suffix tree
        for (; i < cleaned.length; i++) {
            if (cleaned[i] === ' ') {
                if (i - startWord >= minQuery) add();
                startWord = i + 1;
            }
        }
        add();
    }
    
    function addHtmlElementsToSuffixTree(body, tail) {
        [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'th',
            'strong', 'em',
            'keywords'
        ].forEach(function (tagname) {
            var regex = new RegExp('<' + tagname + '.+?>(.+?)</' + tagname + '>');
            body.replace(regex, function (match, phrase, offset) {
                addHtmlPhraseToSuffixTree(phrase, match.indexOf(phrase) + offset, tail);
                return match;
            });
        })
    }
    
    var latestFile = null;
    
    var indexOp = {
        'articles': function indexArticles(body, tail) {
            addHtmlElementsToSuffixTree(body, tail);
        },
        'templated': function indexTemplated(body, tail) {
            var rows = body.split('\n');
            for(var i = 0; i < rows.length; i++) {
                addRowToSuffixTree(rows[i], {
                    s: tail.s,
                    t: tail.p,
                    i: i
                });
            }
        },
        'template': function indexTemplate(body, tail) {
            tail = {
                s: tail.s,
                t: tail.p
            };
            var title = /title:\s*(['"])(.+?)\1/gi.exec(body)[2];
            addHtmlPhraseToSuffixTree(title, null, tail);
            addHtmlElementsToSuffixTree(body, tail);
        }
    }
    
    function bufferContents(file, enc, cb) {
        // ignore empty
        if (file.isNull()) {
            cb();
            return;
        }
        
        // is this a template, or data?
        var extension = path.extname(file.path),
            segments = file.path
            .replace(file.base, '')
            .replace(/\\/gi, '/')
            .replace(extension, '')
            .split('/'),
            source = segments[0],
            type = segments[1],
            dictionaryKey = segments.slice(2).join('/');
            
        // type changes how we index; source and key are critical to identifying where this document came from
        
        var body = file.contents.toString('utf8');
        
        indexOp[type](body, {
            s: fromLookup(lookups.source, source),
            p: fromLookup(lookups.path, dictionaryKey)
        });
        
        console.log('  INDEXER: finished ' + file.path);
        latestFile = file;
        cb();
    }
    
    function endStream(cb) {
        if (!latestFile) return cb();
        console.log('  INDEXER: compressing suffix tree...');
        compressSuffixTree();
        console.log('  INDEXER: suffix tree compressed');
        var joinedFile = latestFile.clone({contents: false});
        joinedFile.path = path.join(latestFile.base, 'index.js');
        
        var INDEX = JSON.stringify({
            w: lookups.word.arr,
            p: lookups.path.arr,
            s: lookups.source.arr,
            t: suffixTree
        });
        joinedFile.contents = new Buffer('var INDEX = ' + INDEX + ';');
        this.push(joinedFile);
        
        var rawFile = latestFile.clone({contents: false});
        rawFile.path = path.join(latestFile.base, 'index.json');
        rawFile.contents = new Buffer(INDEX);
        this.push(rawFile);
        cb();
    }
    
    return through.obj(bufferContents, endStream);
}