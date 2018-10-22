let fn = {};

const steem = require('steem');
const dateformat = require('dateformat');

const wlog = require('../util/wlog');
const wfile = require('../util/wfile');
const wsteem = require('../util/wsteem');
const {sleep} = require('../util/wutil');

const SEP = require('path').sep;
const PROJECT_ROOT = process.env.PROJECT_ROOT;
const WC_FOLDER = process.env.WC_FOLDER;
const WC_FILE_ROOT = PROJECT_ROOT+WC_FOLDER+SEP;
const WC_HOLDEM_AC = process.env.WC_HOLDEM_AC;
const WC_HOLDEM_KEY_ACTIVE = process.env.WC_HOLDEM_KEY_ACTIVE;
const WC_HOLDEM_KEY_MEMO = process.env.WC_HOLDEM_KEY_MEMO;
const WC_HOLDEM_MEMO = process.env.WC_HOLDEM_MEMO;
const WC_HOLDEM_AUTO = process.env.WC_HOLDEM_AUTO;
const WC_HOLDEM_PRICE = process.env.WC_HOLDEM_PRICE;
const WC_HOLDEM_TYPE = process.env.WC_HOLDEM_TYPE;
const WC_TRANS_SLEEP = Number(process.env.WC_TRANS_SLEEP);

const WC_JACKPOT_AC = process.env.WC_JACKPOT_AC;
const WC_JACKPOT_KEY_ACTIVE = process.env.WC_JACKPOT_KEY_ACTIVE;

const IGNORE_NUM = 0.001;

/*
* 홀덤 계정에서 송금처리
* @param author 계정명 
* @param amount 금액 ex) 0.002 STEEM
* @param memo 메모
*/
fn.sendFromHoldem = async (author, amount, memo) =>{
	return steem.broadcast.transferAsync(WC_HOLDEM_KEY_ACTIVE, WC_HOLDEM_AC, author, amount, memo);
}

/*
* 젝팟 계정에서 송금처리
* @param author 계정명 
* @param amount 금액 ex) 0.002 STEEM
* @param memo 메모
*/
fn.sendFromJackpot = async (author, amount, memo) =>{
	return steem.broadcast.transferAsync(WC_JACKPOT_KEY_ACTIVE, WC_JACKPOT_AC, author, amount, memo);
}

/*
* WC_HOLDEM_AC 계정으로 송금 받은 정보를 파일에 날짜별로 기록하며 필터링 한다.
* @param filtered operations 에서 'transfer' 만 가져온다
* @return WC_HOLDEM_AC으로 입금 받은 거래목록 정보
*/
fn.getTransfers = (filtered) =>{
	try{
		let transfers = filtered.transfer.filter(x=>x.operation&&x.operation.length==2&&x.operation[1].to==WC_HOLDEM_AC);

		// 거래 정보 파일에 기록
		let transMsg = [];
		for(let tr of transfers){
			let msg = JSON.stringify({
				timestamp:tr.timestamp,
				// timestamp: dateformat(new Date(tr.timestamp+'.000Z'), 'yy.mm.dd HH:MM:ss'),
				block_num:tr.block_num,
				transaction_num:tr.transaction_num,
				from:tr.operation[1].from,
				to:tr.operation[1].to,
				amount:tr.operation[1].amount,
				memo:tr.operation[1].memo
			});
			transMsg.push(msg);
			
			// 로깅
			wlog.info(`transfer : ${msg}`);
		}

		// 파일에 기록 
		if(transMsg.length>0){
			wfile.append(
				`${WC_FILE_ROOT}holdem.trans.${dateformat(new Date(),'yyyymmdd')}.wc`,
				transMsg.join('\n')+"\n"
			);	
		}
		
		return transfers;
	}catch(e){
		// 오류를 기록한다
		wlog.error(e.stack);
		return [];
	}
} 

/*
* 환불 대상 목록 정보를 가져온다. 일단은 로깅만 하는 것으로 처리
* @param transfers 거래 목록정보
* @return 환불 대상목록정보
*/
fn.getRefunds = (transfers) =>{
	return transfers.filter(x=>{
		let op = x.operation[1];
		let num = wsteem.getAmount(op.amount).num;
		if(num!=IGNORE_NUM && (num!=Number(WC_HOLDEM_PRICE) || op.memo!=WC_HOLDEM_MEMO)){
			return true;
		}
		return false;
	});
}

/*
* 환불 진행 및 로깅을 수행한다
* @param refunds 환불 대상목록
*/
fn.doRefunds = async (refunds) =>{

	let err, data;	
	for(let refund of refunds){
		let op = refund.operation[1];
		try{
			let tr = await fn.sendFromHoldem(op.from, op.amount, `refund : wcasino holdem needs ${WC_HOLDEM_PRICE} ${WC_HOLDEM_TYPE} and memo : ${WC_HOLDEM_MEMO}`);
			await sleep(WC_TRANS_SLEEP);

			let msg = JSON.stringify({
				block_num:tr.block_num,
				trx_num:tr.trx_num,
				from:tr.operations[0][1].from,
				to:tr.operations[0][1].to,
				amount:tr.operations[0][1].amount,
				memo:tr.operations[0][1].memo
			});

			// 로깅
			wlog.info(`refund : ${msg}`);

			// 파일에 환불 처리 정보 기록
			wfile.append(
				`${WC_FILE_ROOT}holdem.refund.${dateformat(new Date(),'yyyymmdd')}.wc`,
				msg+"\n"
			);
		}catch(e){
			wlog.error(e.stack);
		}			
	}

	// 무조건 정상 처리, 자세한 건 로그를 보도록 한다.
	// 환불 안되면 뭐 수동으로 하지 -0-
	return Promise.resolve();
}

/*
* JOIN 환영 메시지 및 카드 정보 전송
* @param step 몇번째로 들어왔나
* @param pen 대기자 정보
* @param c 카드정보
*/ 
fn.sendJoinInfo = async (step, pen, round, c) =>{
	
	let sendMsg = `# @${pen.from} is joined holdem round ${round} ( ${step} ), your card is ${c[3].value}, ${c[4].value} ::: tranfer info ( block_num : ${pen.block_num}, transaction_num : ${pen.transaction_num} )`;
	try{

		let accs = await steem.api.getAccountsAsync([pen.from]);	// 받는이 계정에서 메모 공개키 정보 확보
		let send_pub_memo = accs[0].memo_key;
		let encoded = steem.memo.encode(WC_HOLDEM_KEY_MEMO, send_pub_memo, sendMsg);

		let tr = await fn.sendFromHoldem(pen.from, `0.001 ${WC_HOLDEM_TYPE}`, encoded);
		wlog.info(sendMsg);
		wlog.info(encoded);
	}catch(e){
		wlog.error(e.stack);
	}
	
	// 무조건 정상 처리, 자세한 건 로그를 보도록 한다.
	return Promise.resolve();
}

/*
* 게임 대상 목록 정보를 가져온다.
* @param transfers 거래 목록정보
* @return 게임 대상목록정보
*/
fn.getGames = (transfers) =>{
	return transfers.filter(x=>{
		let op = x.operation[1];
		let num = wsteem.getAmount(op.amount).num;
		if(num>=Number(WC_HOLDEM_PRICE) && op.memo==WC_HOLDEM_MEMO){
			return true;
		}
		return false;
	})
}

/*
* 자동 참가 정보를 가져온다
* @param transfers 거래 목록정보
* @return 게임 자동참가 목록정보
*/
fn.getAutoJoin = (transfers) =>{
	return transfers.filter(x=>{
		let op = x.operation[1];
		let num = wsteem.getAmount(op.amount).num;
		if(num>=Number(WC_HOLDEM_PRICE) && op.memo==WC_HOLDEM_AUTO){
			return true;
		}
		return false;
	})
}


module.exports = fn;