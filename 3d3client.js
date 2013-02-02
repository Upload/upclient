#!/usr/bin/env node

var http = require('http');
var sjcl = require('./sjcl.js');
var args = require('optimist').argv;

if (args._.length > 0) { // Paste read mode
    var path = '/documents/HtFhc'; // TODO: get path from URL
    var options = {
        host: '3d3.ca',
        port: 80,
        path: path,
        method: 'GET'
    }
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
