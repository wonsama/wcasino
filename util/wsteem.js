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
const { Client, PrivateKey } = require('dsteem');
const {isItemEmptyMsg} = require('./wstring');

const WC_API_URI = process.env.WC_API_URI;
const WC_ME_ACCOUNT = process.env.WC_ME_ACCOUNT;
const WC_KEY_ACTIVE = process.env.WC_KEY_ACTIVE;

const EXPIRE_TIME = 60 * 1000; // 유효시간 1분 : 1분안에 처리 안되면 무효됨

const steem = require('steem');

const STEEM_NET = {
	addressPrefix: 'STM',
	chainId: '0000000000000000000000000000000000000000000000000000000000000000'
};

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
* 만료시간 정보를 생성한다 
* @return 만료시간 정보 / 현재 1분
*/
let getExpiration = () =>{
    return new Date(Date.now() + EXPIRE_TIME)
        .toISOString()
        .slice(0, -5);
}

/*
* 입력받은 키를 압호화 한다
* @param key 키
* @return 암호화 된 키
*/
let keyEnc = (key)=>{
	return PrivateKey.fromString(key); // PrivateKey: 5KaNM8...V2kAP3
}

/*
* 클라이언트 정보를 반환한다 
* @return 클라이언트 정보
*/
let getClient = ()=>{
	return new Client( WC_API_URI, STEEM_NET );
}

/*
* (async) 설정 정보를 가져온다
* @param 클라이언트 정보
* @return 설정 정보
*/
let getProps = async (client)=>{
	return client.database.getDynamicGlobalProperties();
}



/*
* 작업처리를 위한 명령 목록을 만든다
* @param props 네트워크 설정정보
* @param operations 수행작업 명령 목록
* @param extensions 확장 수행목록 (수익자 설정 등)
* @return operation 정보
*/
let makeOperations = (props, operations, extensions=[])=>{

    let op = {
			ref_block_num: props.head_block_number,
	    ref_block_prefix: Buffer.from(props.head_block_id, 'hex').readUInt32LE(4),
	    expiration: getExpiration(),
	    operations: operations,
	    extensions: extensions,
    }

    return op;
}

/*
* 송금용 오퍼레이션 생성 
* @param from_author 보내는이 
* @param to_author 받는이
* @param memo 메모 / 최대 2048 bytes
* @param amount 송금액 (STEEM/SBD) 
* @return 송금용 정보
*/
let makeOpTransfer = (from_author, to_author, memo="", amount="0.001 SBD")=>{
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
* 다건 송금처리를 수행한다
* @param sendInfo {to_author, amount:"0.001 STEEM",  memo:""}
* @param from_author 보내는 계정명
* @param keyActive 보내는 계정 엑티브키
*/
fn.sendMoney = async (sendInfo, from_author=WC_ME_ACCOUNT, keyActive=WC_KEY_ACTIVE)=>{
	
	let err;

	// 유효성검증 - 입력값
	let itemEmptyMsg = isItemEmptyMsg([
		{name:"sendInfo", value:sendInfo},
		{name:"from_author", value:from_author},
		{name:"keyActive", value:keyActive},
	]);
	if(itemEmptyMsg!=null){
		return Promise.reject(itemEmptyMsg);
	}

	// 유효성검증 - 입력값 상세, sendInfo
	for(let si of sendInfo){
		itemEmptyMsg = isItemEmptyMsg([
			{name:"to_author", value:si.to_author},
			{name:"amount", value:si.amount},
			// {name:"memo", value:memo}, // 메모는 옵션이므로 점검하지 않음
		]);
		if(itemEmptyMsg!=null){
			return Promise.reject('in sendInfo : '+itemEmptyMsg);
		}
	}

	// 글로벌 설정 값 로딩 
	let client = getClient();
	let props;
	[err, props] = await to(getProps(client));

	// 송금처리
	let res;
	if(!err){
		let operations = [];
		for(let si of sendInfo){
			operations.push( makeOpTransfer(from_author, si.to_author, si.memo, si.amount) );	
		}
		
		let wcKeyActiveEnc = keyEnc(keyActive);
		let op = makeOperations(props, operations);
		let stx = client.broadcast.sign(op, wcKeyActiveEnc);	
		[err, res] = await to(client.broadcast.send(stx));
	}
	
	if(err){
		return Promise.reject(err);
	}
	return Promise.resolve(res);
}

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