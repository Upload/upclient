#!/usr/bin/env node

var sjcl = require('./sjcl.js');
var http = require('http');
var args = require('optimist').argv;

eMap = {
    ruby: 'rb', python: 'py', perl: 'pl', php: 'php', scala: 'scala', go: 'go',
    xml: 'xml', html: 'xml', htm: 'xml', css: 'css', javascript: 'js', vbscript: 'vbs',
    lua: 'lua', delphi: 'pas', pascal: 'pas', java: 'java', cpp: 'cpp', cc: 'cpp',
    objectivec: 'm', vala: 'vala', cs: 'cs', csharp: 'cs', sql: 'sql', smalltalk: 'sm',
    lisp: 'lisp', ini: 'ini', diff: 'diff', bash: 'bash', sh: 'bash', tex: 'tex',
    erlang: 'erl', haskell: 'hs', markdown: 'md', txt: 'txt', coffee: 'coffee',
    coffeescript: 'coffee', json: 'json', c: 'cpp', py: 'py', pl: 'pl'
}

if (args._.length > 0) { // Paste read mode
    var url_in = args._[0].split('/').pop(); // Only get the end of the string
    if (url_in.indexOf("#") != -1) { // Passworded
        var pathpw = url_in.split('#');
        var path = pathpw[0];
        var password = pathpw[1];
    }
    else {
        var path = url_in;
        var password = null;
    }
    // Make sure there's no filetype
    if (path.indexOf('.') != -1) {
        path = path.split('.')[0]; // Assuming a . is not in paste keyspace
    }
    path = '/documents/' + path;
    var options = {
        host: '3d3.ca',
        port: 80,
        path: path,
        method: 'GET'
    }
    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        var data_out = '';
        res.on('data', function(chunk) {
            data_out += chunk;
        });
        res.on('end', function() {
            data_out = JSON.parse(data_out)['data'];
            if (password) {
                data_out = sjcl.decrypt(password, data_out);
            }
            process.stdout.write(data_out);
        });
    });
    req.end();
}
else { // Paste mode
    var stdin = process.openStdin();
    var data = '';
    stdin.on('data', function(chunk) {
        data += chunk;
    });
    stdin.on('end', function() {
        if ('p' in args) {
            data = sjcl.encrypt(args['p'], data, {iter:2000,ks:256});
        }
        var options = {
            host: '3d3.ca',
            port: 80,
            path: '/documents',
            method: 'POST',
            headers: {
                'Content-Length': data.length
            }
        }
        
        var req = http.request(options, function(res) {
            res.setEncoding('utf8');
            var data_out = '';
            res.on('data', function(chunk) {
                data_out += chunk;
            });
            res.on('end', function() {
                data_out = JSON.parse(data_out);
                var res_url = "http://3d3.ca/"+data_out['key'];
                if ('h' in args) {
                    if (args['h'] in eMap) {
                        res_url += "."+eMap[args['h']];
                    }
                    else {
                        res_url += ".txt";
                    }
                }
                if ('p' in args) {
                    res_url += "#"+args['p'];
                }
                console.log(res_url);
            });
        });

        req.write(data);
        req.end();
    });
}
