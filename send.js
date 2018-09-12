
const steem = require('steem');

// 설정 정보를 읽어들인다 
require('dotenv').config();

let from = 'wonsama';
let WC_HOLDEM_AC = process.env.WC_HOLDEM_AC;

// let from = process.env.WC_HOLDEM_AC;
// let WC_HOLDEM_AC = 'wonsama';

let fromKey = process.env.WC_WCASINO_KEY_ACTIVE;
let amount = '0.002 STEEM';
let memo = 'play';
steem.broadcast.transfer(fromKey, from, WC_HOLDEM_AC, amount, memo, function(err, result) {
  console.log(err, result);
});