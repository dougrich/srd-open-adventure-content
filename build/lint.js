var eventStream = require('event-stream');

function lint(src, fn) {
    var article = src.contents.toString('utf8');
    
    // remove special characters that cause chaos
    article = article
        .replace(/[“”]/gi, '"')
        .replace(/[–]/gi, '-');
        
    // warn about any missing references
    
    src.contents = new Buffer(article);
    return fn(null, src);
}

module.exports = function () {
    return eventStream.map(lint);
}