#!/usr/bin/env nodejs

var sjcl = require('./sjcl.js');
var https = require('https');
var crypto = require('crypto');
var FormData = require('form-data');
var args = require('optimist').argv;

function parametersfrombits(seed) {
    var out = sjcl.hash.sha512.hash(seed)
    return {
        'seed': seed,
        'key': sjcl.bitArray.bitSlice(out, 0, 256),
        'iv': sjcl.bitArray.bitSlice(out, 256, 384),
        'ident': sjcl.bitArray.bitSlice(out, 384, 512)
    }
}

function parameters(seed) {
    if (typeof seed == 'string') {
        seed = sjcl.codec.base64url.toBits(seed)
    } else {
        seed = sjcl.codec.bytes.toBits(seed)
    }
    return parametersfrombits(seed)
}

function encrypt(file, seed, id) {
    var params = parameters(seed)
    var uarr = new Uint8Array(file)
    var before = sjcl.codec.bytes.toBits(uarr)
    var prp = new sjcl.cipher.aes(params.key)
    var after = sjcl.arrayBuffer.ccm.compat_encrypt(prp, before, params.iv)
    var afterarray = new Buffer(sjcl.codec.bytes.fromBits(after))
    return {
        'id': id,
        'seed': sjcl.codec.base64url.fromBits(params.seed),
        'ident': sjcl.codec.base64url.fromBits(params.ident),
        'encrypted': afterarray
    };
}

function decrypt(file, seed, id) {
    var params = parameters(seed)
    var uarr = new Uint8Array(file)
    var before = sjcl.codec.bytes.toBits(uarr);
    var prp = new sjcl.cipher.aes(params.key);
    var after = sjcl.arrayBuffer.ccm.compat_decrypt(prp, before, params.iv);
    var afterarray = new Uint8Array(sjcl.codec.bytes.fromBits(after));

    var header = ''

    var headerview = new DataView(afterarray.buffer)

    var i = 0;
    for (; ; i++) {
        var num = headerview.getUint16(i * 2, false)
        if (num == 0) {
            break;
        }
        header += String.fromCharCode(num);
    }

    console.log(header)

    var header = JSON.parse(header)

    var data = new Blob([afterarray])

    postMessage({
        'id': id,
        'header': header,
        'decrypted': data.slice((i * 2) + 2, data.size, header.mime)
    })
}

function ident(seed, id) {
    var params = parameters(seed)
    postMessage({
        'id': id,
        'ident': sjcl.codec.base64url.fromBits(params.ident)
    })
}


function str2ab(str) {
	var buf = new Buffer(str.length*2);
	for (var i = 0, strLen = str.length; i < strLen; i++) {
		buf.writeUInt16BE(str.charCodeAt(i), i*2);
	}
/*
	var buf = new ArrayBuffer(str.length * 2);
	var bufView = new DataView(buf);
	for (var i = 0, strLen = str.length; i < strLen; i++) {
		bufView.setUint16(i * 2, str.charCodeAt(i), false)
	}
*/
	return buf;
}


eMap = {
    ruby: 'rb', python: 'py', perl: 'pl', php: 'php', scala: 'scala', go: 'go',
    xml: 'xml', html: 'xml', htm: 'xml', css: 'css', javascript: 'js', vbscript: 'vbs',
    lua: 'lua', delphi: 'pas', pascal: 'pas', java: 'java', cpp: 'cpp', cc: 'cpp',
    objectivec: 'm', vala: 'vala', cs: 'cs', csharp: 'cs', sql: 'sql', smalltalk: 'sm',
    lisp: 'lisp', ini: 'ini', diff: 'diff', bash: 'bash', sh: 'bash', tex: 'tex',
    erlang: 'erl', haskell: 'hs', markdown: 'md', txt: 'txt', coffee: 'coffee',
    coffeescript: 'coffee', json: 'json', c: 'cpp', py: 'py', pl: 'pl'
}

{
    var stdin = process.openStdin();
    var data = '';
    var rndbuf = crypto.prng(1024);
    for (var i = 0; i < 256; i++) {
        sjcl.random.addEntropy(rndbuf.readInt32LE(i*4), 32, "prng");
    }

    stdin.on('data', function(chunk) {
        data += chunk;
    });
    stdin.on('end', function() {
	
        var seed = new Uint8Array(16);
	seed.set(crypto.randomBytes(seed.length));

	

        var header = JSON.stringify({
            'mime': "text/plain",
            'name': "Pasted.txt"
        })

        var zero = new Buffer([0,0]);
	zero[0] = 0;
	zero[1] = 0;

        var blob = Buffer.concat([str2ab(header), zero, Buffer(data)])

        result = encrypt(blob, seed, 0);


        var formdata = new FormData()
        formdata.append('privkey', 'c61540b5ceecd05092799f936e27755f')
        formdata.append('ident', result.ident)
        formdata.append('file', result.encrypted, {filename: 'file', contentType: 'text/plain'})

        var req = https.request({
            host: 'e.3d3.ca',
            port: 443,
            path: '/up',
            method: 'POST',
            headers: formdata.getHeaders()
        });


	formdata.pipe(req);

        req.on('error', function(err) {
        });
        
        req.on('response', function(res) {
            res.setEncoding('utf8');
            var data_out = '';
            res.on('data', function(chunk) {
                data_out += chunk;
            });
            res.on('end', function() {
                var res_url = "https://e.3d3.ca/#"+result.seed;
                console.log(res_url);
            });
        });

        req.write(data);
        req.end();
    });
}
