#!/usr/bin/env node
"use strict";
var sjcl = require('./sjcl.js');
var https = require('https');
var http = require('http');
var crypto = require('crypto');
var FormData = require('form-data');
var mmm = require('mmmagic');
var mime = require('mime');
var fs = require('fs');
var cli = require('snack-cli');
var path = require('path');
var S = require('string');
S.extendPrototype();
const { URL } = require('url');

const up1_server_default = "https://up1.ca";
const up1_apikey_default = "c61540b5ceecd05092799f936e27755f";

var argv = cli
	.name('up')
	.version('0.1')
	.usage('[options] [files]')
	.description('Upload files and text to an Up1 based pastebin. If no argument is specified, stdin is assumed.')
	.option('-b, --binary', 'force application/octet-stream', false)
	.option('-t, --text', 'force text/plain', false)
	.option('-f, --file <name>', 'force file name for stdin based inputs', false)
	.option('-m, --mime <mime>', 'force given mime type', 'detect')
	.option('-s, --server <https://example.com:443>', 'specify Up1 server', (process.env.UP1_SERVER || up1_server_default) )
	.option('-k, --apikey <key>', 'specify server api key', (process.env.UP1_APIKEY || up1_apikey_default) )
	.option('-d, --delurl', 'print the deletion url', ((process.env.UP1_DELURL == 1) || false) )
	.parse();

const uphost = new URL(argv.server);

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
	return buf;
}

function doUpload(data, name, type) {
	var seed = new Uint8Array(16);
	seed.set(crypto.randomBytes(seed.length));

	var header = JSON.stringify({
	    'mime': type,
	    'name': name
	})

	var zero = new Buffer([0,0]);
	var blob = Buffer.concat([str2ab(header), zero, Buffer(data)])

	var result = encrypt(blob, seed, 0);


	var formdata = new FormData()
	formdata.append('api_key', argv.apikey)
	formdata.append('ident', result.ident)
	formdata.append('file', result.encrypted, {filename: 'file', contentType: 'text/plain'})

    if ( uphost.protocol === "https:" ) {
        var req = https.request({
            host: uphost.hostname,
            port: uphost.port,
            path: '/up',
            method: 'POST',
            headers: formdata.getHeaders()
        });
    } else if ( uphost.protocol === "http:" ) {
        var req = http.request({
            host: uphost.hostname,
            port: uphost.port,
            path: '/up',
            method: 'POST',
            headers: formdata.getHeaders()
        });
    }


	formdata.pipe(req);

	req.on('error', (err) => {
        console.error(err);
	});

	req.on('response', function(res) {
	    res.setEncoding('utf8');
	    var data_out = '';
	    res.on('data', function(chunk) {
		data_out += chunk;
	    });
	    res.on('end', function() {
            data_out = JSON.parse(data_out);
            var res_url = uphost.origin+"/#"+result.seed;
            var del_url = uphost.origin+"/del?delkey="+data_out.delkey+"&ident="+result.ident;
            console.log(res_url);
            argv.delurl && console.log(del_url);
	    });
	});

	req.end();
}

function validateMimeType(type, buf, cb) {
	var guess = null;
	if (argv.binary)
		guess = "application/octet-stream";
  else if (argv.text)
    guess = "text/plain";
  else if (argv.mime != "detect")
		guess = argv.mime;
  else if (type.startsWith("audio") || type.startsWith("video") || type.startsWith("text") || type.startsWith("image"))
		guess = type;

	if (guess != null) {
		cb(guess);
		return;
	}
	var magic = new mmm.Magic(mmm.MAGIC_MIME_ENCODING);
	magic.detect(buf, function(err, result) {
		cb(result == "binary" ? "application/octet-stream" : "text/plain");
	});
}

var rndbuf = crypto.prng(1024);
for (var i = 0; i < 256; i++) {
    sjcl.random.addEntropy(rndbuf.readInt32LE(i*4), 32, "prng");
}

if (argv.args.length > 0) {
	argv.args.forEach(function (val, idx, arr) {
		var buffer = fs.readFileSync(val);
		validateMimeType(mime.lookup(val), buffer, function(mimeType) {
			doUpload(buffer, path.basename(val), mimeType);
		});
	});
} else {
	var buffer = fs.readFileSync('/dev/stdin');
	var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

	magic.detect(buffer, function (err, result) {
		validateMimeType(result, buffer, function(mimeType) {
			var ext = mime.extension(result);
			doUpload(buffer, argv.file ? argv.file : "Pasted." + ext, mimeType);
		});
		
	});
}
