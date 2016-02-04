/*

Gives you an opportunity to test the index

The version on the site only varies in that it is selective on sources

*/

var fs = require('fs');

var rawIndex = fs.readFileSync('temp/index.json', 'utf8');

var index = JSON.parse(rawIndex);

function autocomplete(word) {
    var root = index.t,
        size = 1,
        originalWord = word;
    while(root && word.length && size <= word.length) {
        var key = word.substr(0, size);
        if (root[key]) {
            root = root[key];
            word = word.substring(size);
            size = 0;
        }
        size++;
    }
    
    if (!root) {
        // nothing found
        return [];
    }
    
    if (size === word.length + 1 && word) {
        // possible partial match
        var continues = Object.keys(root), found = false;
        for (var i = 0; i < continues.length && !found; i++) {
            if (continues[i].indexOf(word) === 0) {
                root = root[continues[i]];
                originalWord += continues[i].replace(word, '');
                found = true;
            }
        }
        if (!found) {
            return [];
        }
    }
    
    var searchable = [],
        found = {};
        
    searchable.push({
        node: root,
        word: originalWord
    });
    while (searchable.length && Object.keys(found).length < 5) {
        var next = searchable.pop();
        if (next.node.$) {
            // add to found
            next.node.$.forEach(function (i) {
                if (Object.keys(found) === 5) return;
                var word = index.w[i.w];
                console.log(i);
                (found[word] || (found[word] = [])).push({
                    source: index.s[i.s],
                    path: index.p[i.p],
                    template: index.p[i.t],
                    i: i.i,
                    j: i.j
                })
            });
        }
        var children = Object.keys(next.node);
        for (var i = 0; i < children.length; i++) {
            if (children[i] === '$') continue;
            searchable.push({
                word: next.word + children[i],
                node: next.node[children[i]]
            });
        }
    }
    
    return found;
}

console.log(autocomplete('melee'));