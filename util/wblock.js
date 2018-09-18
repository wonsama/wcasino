const steem = require('steem');

const {to} = require ('./wutil');					// async
const {getnumber} = require ('./wnumber');	// change to number
const {debug, info, error} = require('./wlog');						// log
const {write, read} = require ('./wfile');	// change to number
const {isIterable} = require('./wutil');

const wlog = require('./wlog');

const FILE_CHARSET = 'utf-8';

const PROJECT_ROOT = process.env.PROJECT_ROOT?process.env.PROJECT_ROOT:".";
const LAST_BLOCK_FILE = `${PROJECT_ROOT}/config/last.block.wc`;

let fn = {};

fn.LAST_BLOCK_FILE = LAST_BLOCK_FILE;

/*
* 최종 블록 번호를 기록한다 
*/
fn.saveBlockNumber = async (blockNumber) =>{
	return write(LAST_BLOCK_FILE, blockNumber.toString());
}

/*
* 최종 블록 번호를 읽어들인다
*/
fn.readBlockNumber = async () =>{
	return read(LAST_BLOCK_FILE);
}

/*
* 최신 블록 번호를 STEEM 노드에서 가져온다
*/
fn.getLastBlockNumer = async (isHead=true) => {
	let err, data;
	[err,data] = await to(steem.api.getDynamicGlobalPropertiesAsync());

	if(!err){
		// 2가지 블록 정보가 있음 
		// head_block_number : 최신 블록 
		// last_irreversible_block_num : 변경 불가 블록정보
		if(isHead){
			return Promise.resolve(data.head_block_number);
		}else{
			return Promise.resolve(data.last_irreversible_block_num);
		}
	}else{
		return Promise.reject(err);
	}
}

/*
* 블록 번호, 거래 인덱스 번호 기준으로 operation 정보를 가져온다
* @param blockNumber 블록번호 
* @param trxNum 거래번호
* @return operation 정보
*/
fn.getTransaction = async (blockNumber, trxNum) =>{

	let err;

	let block;
	[err, block] = await to(fn.getBlocks(blockNumber));

	if(!err){

		let b = block[0];
		let res = {};
		res.timestamp = b.timestamp;
		res.operations = b.transactions[trxNum].operations;
		res.transaction_id = b.transactions[trxNum].transaction_id;

		return Promise.resolve(res);
	}

	if(err){
		return Promise.reject(err);
	}
}

/*
* 해당 블록 목록에서 거래 정보를 추출한다
* @param blocks 블록목록 정보
* @return 거래정보
*/
fn.getTransFromBlock = (blocks) => {
	let items = [];

	// isIterable 을 검증 
	if(!isIterable(blocks)){
		wlog.error(blocks?JSON.parse(blocks):'blocks is empty');
		return items;
	}

	let idx = 1;
	let previous = null;	// 이전 블록의 아이디 값
	let block_id = null;	// 이전 블록의 아이디
	for(let block of blocks){
		if(block==null){
			// 블록이 null 정보가 설정되어 내려오는 경우 어떻게 처리할 방법이 딱히 없음
			// 일단 이전 블록의 참조 정보를 설정함.
			// 그리고 로깅을 남겨 향후 필요시 참조하여 설정하도록 처리
			wlog.error(`block (${idx}/${blocks.length}) is null (getTransFromBlock) : previous[ ${previous} ], block_id[ ${block_id} ]`);
		}else{
			for(let trans of block.transactions){
				for(let operation of trans.operations){
					let item = {};
					item.timestamp = block.timestamp;
					item.block_num = trans.block_num;
					item.transaction_num = trans.transaction_num;
					item.operation = 	operation;
					items.push(item);
				}
			}
		}
		previous = block==null?null:block.previous;
		block_id = block==null?null:block.block_id;
		idx++;
	}

	return items;
}

/*
* 거래 목록 정보를 operation의 type 으로 필터링 처리
* @param transactions 거래목록정보
* @param type operations 타입 (처음것만 가지고 필터링함에 유의)
*/
fn.filterTransByName = (transactions, type) => {
	return transactions.filter(x=>{
		let op = x.operation;
		let tp = op[0];
		let data = op[1];
		if(tp==type){
			return true;
		}
		return false;
	});
}

/*
* 범위 내의 블록 정보를 반환한다
* @param sblocknum 시작 블록번호
* @param eblocknum 종료 블록번호, 미기입 가능 이땐 시작 블록번호 1개만 가져온다
*/
fn.getBlocks = async (sblocknum, eblocknum) => {

	let err, data;

	if(getnumber(sblocknum)!==null && getnumber(eblocknum)!==null){

		let start = Math.min(sblocknum, eblocknum);
		let end = Math.max(sblocknum, eblocknum);

		// validation check
		if(start<=0){
			return Promise.reject(`start number(${start}) is must over then zero(0).`);
		}

		// push block infomation list
		let slist = [];
		for(let i=start;i<=end;i++){
			slist.push(steem.api.getBlockAsync(i));
		}

		// search items
		[err,data] = await to(Promise.all(slist));

	}else if(getnumber(sblocknum)!==null){
		// search single item
		[err,data] = await to(steem.api.getBlockAsync(sblocknum));
	}else{
		// not matched
		return Promise.reject(`check : paramters [ ${sblocknum}, ${eblocknum} ] is null`);
	}

	// return values
	if(!err){
		if(!data){
			return Promise.reject(`data is empty but success -_-;`);
		}
		// single item to array
		if(!Array.isArray(data)){
			data = [data];
		}
		return Promise.resolve(data);
	}else{
		return Promise.reject(err);
	}
}

module.exports = fn;