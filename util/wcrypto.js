const crypto = require('crypto');

const CHARSET_UTF8 = 'utf8';

let fn = {};

/*
* sha 256 hash
* @param msg sha256으로 hashing 할 메시지
* @return sha256으로 hasing 된 메시지
*/
fn.sha256 = (msg) => crypto.createHash('sha256').update(msg, CHARSET_UTF8).digest().toString('hex').toUpperCase();

module.exports = fn;