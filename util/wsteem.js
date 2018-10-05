/*
	steem 통신관련
*/
const steem = require('steem');

const {to} = require('./wutil');
const wlog = require('./wlog');

let fn = {};

/*
* 계정의 스팀 잔액을 알려준다
* @param 계정명
* @return 스팀잔액(balance)
*/
fn.getSteem = async (author)=>{
	try{
		let acc = await steem.api.getAccountsAsync([author]);
		return Promise.resolve(fn.getAmount(acc[0].balance).num);
	}catch(e){
		// 오류 발생시 0원을 리턴한다.
		wlog.error(`wwrite.getSteem() : 잔액정보를 확인할 때 문제가 있음`);
		wlog.error(e.stack);
		return Promise.resolve(0);
	}	
}

/*
* 계정의 스달 잔액을 알려준다
* @param 계정명
* @return 스달잔액(balance)
*/
fn.getSbd = async (author)=>{
	try{
		let acc = await steem.api.getAccountsAsync([author]);
		return Promise.resolve(fn.getAmount(acc[0].sbd_balance).num);
	}catch(e){
		// 오류 발생시 0원을 리턴한다.
		wlog.error(`wwrite.getSbd() : 잔액정보를 확인할 때 문제가 있음`);
		wlog.error(e.stack);
		return Promise.resolve(0);
	}	
}

/*
* 입력받은 타입 기준으로 잔액 정보를 반환한다
*/
fn.getBalance = async (author, type)=>{
	if(type && type.toLowerCase()=='steem'){
		return fn.getSbd(author);
	}
	else if(type && type.toLowerCase()=='sbd'){
		return fn.getSbd(author);
	}
	wlog.error(`check type [ ${type} ]  !! type is steem or sbd.`);
	return -1;
}

/*
* STEEM 에서 amount 를 구분지을 때 사용
*/
fn.getAmount = (amount) => {
	let am = amount.split(' ');

	// tp : STEEM or SBD
	return { num:Number(am[0]), tp:am[1] }
}

module.exports = fn;