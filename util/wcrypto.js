const crypto = require('crypto');

const FILE_CHARSET = 'utf8';

let fn = {};

/*
* sha 256 hash
* @param msg sha256으로 hashing 할 메시지
* @return sha256으로 hasing 된 메시지
*/
fn.sha256 = (msg) => crypto.createHash('sha256').update(msg, FILE_CHARSET).digest().toString('hex').toUpperCase();

module.exports = fn;