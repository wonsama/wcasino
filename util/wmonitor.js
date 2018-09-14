/*
	모니터링 관련 유틸
*/
let wblock = require('./wblock');
let wlog = require('./wlog');
const {to} = require('./wutil');

let fn = {};

// 리젝트 사유 e 가 아닌 경우임
let MSG_REJECT = {same:0};

const BLOCK_MAX_READ = Number(process.env.BLOCK_MAX_READ);

/*
* 외부용 : 리젝트 사유
*/
fn.MSG_REJECT = {...MSG_REJECT};

/*
* 모니터링을 수행한다
* @param types 모니터링할 타입
*/
fn.monitor = async (types=['transfer']) =>{

	let err, read;
	let filtered = {};

	let blockStart,blockEnd;
	let blockArr;

	try{
		// 1. 기존에 읽어들인 블록정보 로딩
		// 2. 최신 블록 정보 로딩
		[err, read] = await to(Promise.all([
			wblock.readBlockNumber(),	// 초기 블록넘버를 저장하지 않은 경우 오류 발생
			wblock.getLastBlockNumer()
		]));

		if(!err){

			blockStart=Number(read[0])+1;	// 기존 읽어들인 다음 블록부터 시작
			blockEnd=Number(read[1]);

			// 이미 읽어들인 블록인 경우는 후처리를 하지 않는다
			if(blockStart>blockEnd){
				return Promise.reject(MSG_REJECT.same);
			}

			// blockEnd 와 blockStart 차이가 너무 크면 읽다가 오류가 발생함.
			// MAX_GAP은 약 1000 블록 이상을 넘으면 안됨에 유의 - 네트워크 사정에 따라 다를 수 있음
			if(blockEnd-blockStart>BLOCK_MAX_READ){
				wlog.warn(`current block gap is [${blockEnd-blockStart}] block will read ${BLOCK_MAX_READ} blocks.`);
				blockEnd =	blockStart + BLOCK_MAX_READ;
			}

			// 블록 정보 로딩
			[err,blockArr] = await to(wblock.getBlocks(blockStart, blockEnd));
			wlog.info(`block : ${blockStart}~${blockEnd}`);

			// 블록 정보에서 트렌젝션 정보를 로드
			let trans = wblock.getTransFromBlock(blockArr);

			for(let type of types){
				filtered[type] = wblock.filterTransByName(trans, type);
			}

			// 가끔 블록 정보를 읽지 못하는 오류 발생 이런 경우는 다시 읽기 위해 블록 정보를 기록하지 않음
			if(trans.length>0){
				// 마지막으로 읽어들인 블록 정보를 갱신한다
				wblock.saveBlockNumber(blockEnd);		
			}
			
		}

	}catch(e){
		return Promise.reject(e);
	}

	return filtered;
};

module.exports = fn;