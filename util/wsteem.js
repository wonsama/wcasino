/*
	steem api 와 rpc20 통신한다

rpc 2.0 구조
{
	id : xxx, (송신한 id 와 일치)
	result : 정상처리 된 경우 설정 
	error : 오류를 발생시킨 경우 설정 
	{ 
		code: -32000,
		message: 'Bad Cast:Invalid cast from string_type to Array',
		data:
		{ 
			code: 7,
			name: 'bad_cast_exception',
			message: 'Bad Cast',
			stack: [ [Object] ] 
		} 
	}
}

작업목록

X getTransaction : 거래 정보를 가져온다 

O getAccount : 단일 계정 정보를 가져온다
O getAccounts : 복수 계정의 정보를 가져온다
O getDynamicGlobalProperties : 전역 설정 정보를 반환한다

ISSUE

Beem: Blockchain.get_transaction / get_transaction_hex issues on appbase nodes
https://steemit.com/utopian-io/@stmdev/beem-blockchain-gettransaction-gettransactionhex-issues-on-appbase-nodes

*/
const request = require('request');

const {to} = require('./wutil');

const WC_API_URI = process.env.WC_API_URI;
const WC_ME_ACCOUNT = process.env.WC_ME_ACCOUNT;
const WC_KEY_ACTIVE = process.env.WC_KEY_ACTIVE;

const steem = require('steem');

let fn = {};

/*
* RPC 2.0 통신 모델
*/
let rpc20 = (method, params, id)=>{
	let json = {};
	json.jsonrpc = '2.0';
	json.method = method;
	if(params){
		json.params = params;	
	}
	json.id = id;

	return json;
}

/*
* 서버로 RPC2.0 데이터를 전송한다.
*/
let send = async (method, params, id=1) =>{

	return new Promise((resolve, reject)=>{

		let options = {
		  method: "POST",
		  url: WC_API_URI,
		  json: rpc20(method,params,id)
		};

		request(options, function (error, response, body) {
		  if (error){
		  	// 통신오류 
		  	reject(error);
		  }else{
		  	if(body.result){
		  		// 정상 처리 된 경우임 
		  		resolve(body.result);	
		  	}else{
		  		// 응답은 받았으나 업무처리 오류
		  		reject(body.error);
		  	}
		  }
		});

	});
}

/*
* 키를 복제한다 (배열이 아닌경우 동작)
* @param key 키 또는 키 배열
* @param len 복제길이
* @return 키목록
*/
let dupKeys = (key, len) =>{
	let keys = [];
	if(!Array.isArray(key)){
		keys = [];
		for(let i=0;i<len;i++){
			keys.push(key);
		}
		// 단건인 경우, len 만큼 복제 후 반환 
		return keys;
	}else{
		// 입력받은 값이 배열인 경우 
		return key;	
	}
}

/*
* 송금용 오퍼레이션 생성 
* @param from_author 보내는이 
* @param to_author 받는이
* @param memo 메모 / 최대 2048 bytes
* @param amount 송금액 (STEEM/SBD) 
*/
fn.makeOpTransfer = (from_author, to_author, memo="", amount="0.001 SBD")=>{
	return [
		"transfer",
		{
			from : from_author,
			to : to_author,
			amount : amount,
			memo : memo
		}
	];
}

/*
* 나에게 메모를 작성한다
* @param memo 작성할 메모 목록 / 메모당 최대 2018 bytes
* @param amount 송금액 (STEEM/SBD) 
*/
fn.sendMemo = (memo, amount="0.001 SBD")=>{

	// 배열로 보내는 경우 송신자와 내용과 시간이 변동이 없어 
	// duplicate signature included 형태로 나올 수 있음
	// 그런 경우에는 1개씩 보내서 sign이 정상적으로 이뤄지도록 해야 됨에 유의
	let t = fn.makeOpTransfer(WC_ME_ACCOUNT, WC_ME_ACCOUNT, memo, amount);

	return steem.broadcast.sendAsync(
		{
	  	extensions: [],
	  	operations: [t]
		}, [WC_KEY_ACTIVE]
	);
}

/*
* 단건 송금
* @param keyActive 엑티브키
* @param from_author 엑티브키
* @param to_author 엑티브키
* @param memo 메모 
* @param amount 금액 (0.001 STEEM 이런 형태로 자릿수를 맞춰야 한다 .toFixed(3))
*/ 
fn.sendTransfer = (keyActive, from_author, to_author, memo="", amount="0.001 STEEM")=>{
	return steem.broadcast.sendAsync(
		{
	  	extensions: [],
	  	operations: [
		    makeOpTransfer(from_author, to_author, memo, amount)
		  ]
		}, [keyActive]
	);
}

fn.sendTransfers = (keyActives, OpTransfers)=>{

	// 입력받은 키가 하나라면 복제하여 넣어준다. (키 권한을 상속받았다고 가정하기 위함)
	let keys = dupKeys(keyActives, keyActives.length);

	return steem.broadcast.sendAsync(
		{
	  	extensions: [],
	  	operations: OpTransfers
		}, keys
	);
}

/*
* 만료시간 정보를 생성한다 
*/
// let getExpiration = () => {
//     return new Date(Date.now() + expireTime)
//         .toISOString()
//         .slice(0, -5);
// }

// let broadcast = async (operations, extensions=[]) =>{
// 	let props = await to(getDynamicGlobalProperties());
// 	let op = makeOperations(prop, operations, extensions);

// // 	[
// //   "transfer",
// //   {
// //     "from": "steemit",
// //     "to": "alice",
// //     "amount": {
// //       "amount": "10",
// //       "precision": 3,
// //       "nai": "@@000000021"
// //     },
// //     "memo": "Thanks for all the fish."
// //   }
// // ]

// 	return send('condenser_api.broadcast_transaction', [op]);
// }

/*
* 작업처리를 위한 명령 목록을 만든다
* @param props 네트워크 설정정보
* @param operations 수행작업 명령 목록
* @param extensions 확장 수행목록 (수익자 설정 등)
*/
// let makeOperations = (props, operations, extensions=[])=>{

//     let op = {
//         ref_block_num: props.head_block_number,
//     		ref_block_prefix: Buffer.from(props.head_block_id, 'hex').readUInt32LE(4),
//     		expiration: getExpiration(),
//     		operations: operations,
//     		extensions: extensions,
//     }

//     return op;
// }

/*
* (오류) : Assert Exception:api_itr != _registered_apis.end(): Could not find API account_history_api
* 거래 정보를 가져온다 
* @param trx_id 거래 아이디
*/
// fn.getTransaction = (trx_id) =>{
// 	return send('account_history_api.get_transaction', {id:trx_id});
// }

/*
* (오류) : Assert Exception:_account_history_api: account_history_api_plugin not enabled
* 거래 정보를 가져온다 
* @param trx_id 거래 아이디
*/
// fn.getTransaction = (trx_id) =>{
// 	return send('condenser_api.get_transaction', [trx_id]);
// }

/*
* 단일 계정 정보를 가져온다
* @param account 계정명
* @return 단일 계정 정보
*/
fn.getAccount = (account) =>{
	return send('condenser_api.get_accounts', [[account]]);
}

/*
* 복수 계정의 정보를 가져온다
* @param accounts 계정명 배열 
* @return 복수 계정의 정보
*/
fn.getAccounts = (accounts) =>{
	return send('condenser_api.get_accounts', [accounts]);
}

/*
* 전역 설정 정보를 반환한다
* @return 전역 설정 정보
*/ 
fn.getDynamicGlobalProperties = () =>{
	return send('database_api.get_dynamic_global_properties');
}

/*
* 전역 설정 정보를 반환한다
* @return 전역 설정 정보
*/ 
fn.getBlock = (block_num) =>{
	return send('block_api.get_block', {block_num:block_num});
}

module.exports = fn;