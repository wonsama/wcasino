/*
	steem 통신관련
*/
const steem = require('steem');

const {to} = require('./wutil');

let fn = {};

const WC_HOLDEM_AC = process.env.WC_HOLDEM_AC;
const WC_HOLDEM_KEY_ACTIVE = process.env.WC_HOLDEM_KEY_ACTIVE;


/*
* STEEM 에서 amount 를 구분지을 때 사용
*/
fn.getAmount = (amount) => {
	let am = amount.split(' ');

	// tp : STEEM or SBD
	return { num:Number(am[0]), tp:am[1] }
}

/*
* 단건 환불처리
* @param author 환불 받을 계정명
* @param amount 금액 ex) 0.002 STEEM
* @param memo 메모
*/
fn.refund = async (author, amount, memo) =>{
	return steem.broadcast.transferAsync(WC_HOLDEM_KEY_ACTIVE, WC_HOLDEM_AC, author, amount, memo);
}

module.exports = fn;