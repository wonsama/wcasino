const {to} = require ('./wutil');					// async
const {getnumber} = require ('./wnumber');	// change to number
const {debug, info, error} = require('./wlog');						// log

const steem = require('steem');
const fs = require('fs');				// Experimental promise, support over v10.

const FILE_CHARSET = 'utf-8';

const WC_ROOT = process.env.WC_ROOT?process.env.WC_ROOT:".";
const LAST_BLOCK_FILE = `${WC_ROOT}/last_block.txt`;

let fn = {};

/*
* 최종 블록 번호를 기록한다 
*/
fn.saveBlockNumber = async (blockNumber) =>{
	return new Promise((resolve,reject)=>{
		fs.writeFile( LAST_BLOCK_FILE, blockNumber.toString(), FILE_CHARSET_UTF8, (err)=>{
			if(err){
				reject(err);
			}else{
				resolve();	
			}
		});
	});
}

/*
* 최종 블록 번호를 읽어들인다
*/
fn.readBlockNumber = async () =>{
	return new Promise((resolve,reject)=>{
		fs.readFile(LAST_BLOCK_FILE, FILE_CHARSET_UTF8, (err,data)=>{
			if(err){
				reject(err);
			}else{
				resolve(data);
			}
		});
	});
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