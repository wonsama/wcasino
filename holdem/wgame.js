/*
	
*/

// 라이브러리 로딩
const wfile = require('../util/wfile');
const wlog = require('../util/wlog');
const {sha256} = require('../util/wcrypto');
const wcard = require('./wcard');
const wtransfer = require('./wtransfer');
const wwrite = require('./wwrite');

// 기타 상수
const PROJECT_ROOT = process.env.PROJECT_ROOT;
const WC_CONFIG_FOLDER = `${PROJECT_ROOT}/config`;
const WC_LOG_FOLDER = `${PROJECT_ROOT}/logs/wc`;
const WC_ROUND_FOLDER = `${PROJECT_ROOT}/logs/round`;
const WC_PENDING_FILE = `${PROJECT_ROOT}/config/holdem.pending.wc`;
const WC_ROUND_FILE = `${PROJECT_ROOT}/config/holdem.round.wc`;
const WC_ROUND_NEXT = `${PROJECT_ROOT}/config/holdem.round.next.wc`;
const {LAST_BLOCK_FILE} = require('../util/wblock');

const CARD_COMMUNITY_DRAW_CNT = 3;
const CARD_DRAW_CNT = 2;
const CARD_MAX_DRAW = 23;

/*
	game 진행
*/
let fn = {};

/*
* 입력받은 카드목록의 값을 출력
* @param cards 카드목록
* @return 카드목록 값 정보
*/
let cardToString = (cards) =>{
	let res = [];
	for(let c of cards){
		res.push(c.value);
	}

	return res.join(', ');
}

/*
* 게임 종료 여부를 판단
* @return 게임 종료여부
*/ 
fn.isGameEnd = async ()=>{
	// 라운드 종료여부 읽기
	// 참조 : 저장 시 new Date().toJSON() 사용, 읽을때는 그냥 문자열로 ! JSON.parse 하면 안됨
	let _next = await wfile.read(WC_ROUND_NEXT);
	let next = new Date(_next).getTime();
	let now = new Date().getTime();
	if(now > next){
		return Promise.resolve(false);
	}

	wlog.info(`game is end next round will start at [ ${new Date(next)} ]`)
	return Promise.resolve(true);
}

/*
* 게임에 조인한다 
* @param pen 대기열 맨 위에 있는 단건
* @param round 현재 라운드 정보
* @return 게임 종료 여부
*/
fn.joinGame = async (pen, round) =>{
	// join 정보를 읽어 최대 수치를 넘었나 확인
	let cards = JSON.parse(await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.cards.wc`));
	let joins = JSON.parse(await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.join.wc`));
	let idx = joins.length;

	let c = cards[idx];
	if(idx<CARD_MAX_DRAW){
		joins.push({
			timestamp : pen.timestamp,
			block_num : pen.block_num,
			transaction_num : pen.transaction_num,
			from : pen.from,
			cards : c
		});
		// 참여 기록정보 추가처리
		await wfile.write(`${WC_ROUND_FOLDER}/holdem.round.${round}.join.wc`, JSON.stringify(joins));

		// 대기 기록정보에서 제거처리
		let pending = JSON.parse(await wfile.read(WC_PENDING_FILE));
		let filtered = pending.filter(x=>!(x.block_num==pen.block_num && x.transaction_num==pen.transaction_num && x.from==pen.from));
		await wfile.write(WC_PENDING_FILE, JSON.stringify(filtered));

		// 송금자에게 게임에 조인되었다고 알려주기 메모 전송
		await wtransfer.sendJoinInfo(`${joins.length}/${CARD_MAX_DRAW}`, pen, round, c);

		// 라운드 종료 여부 반환
		if(joins.length==CARD_MAX_DRAW){

			// 딜러 정보 추가
			joins.push({
				timestamp : new Date().toJSON(),
				block_num : 0,
				transaction_num : 0,
				from : `wcasino.jackpot`,
				cards : cards[CARD_MAX_DRAW]
			});

			// 참여 기록정보 추가처리
			await wfile.write(`${WC_ROUND_FOLDER}/holdem.round.${round}.join.wc`, JSON.stringify(joins));

			// 계정에 종료 메시지 업데이트
			await wwrite.roundEnd();

			// 신규 게임을 생성한다 : 순환 참조가 발생하면 안되므로 wwrite 내부에서 처리하면 안됨에 유의한다.
			await fn.newGame();

			return Promise.resolve(true);
		}else{
			// 계정에 글쓰기 업데이트
			await wwrite.update();
			return Promise.resolve(false);
		}
	}
	// else 구문에서 로깅하면 N 번 출력하므로 하지 않는다.
	// 게잉 종료(CARD_MAX_DRAW) 시 시간 정보(NEXT)를 업데이트 하도록하자 !

	return Promise.resolve(true);
}

/*
* 초기 1회 파일 또는 기본 폴더가 없는 경우에만 수행하면 됨
*/
fn.initFirst = async ()=>{

	// config : 설정 파일 정보 폴더 생성
	wfile.makeFolder(WC_CONFIG_FOLDER);

	// WC_ROUND_FOLDER : 생성
	wfile.makeFolder(WC_ROUND_FOLDER);

	// last.block.wc : 최종 읽어들인 블록정보 
	if(wfile.isNotExist(LAST_BLOCK_FILE)){
		await wfile.write(LAST_BLOCK_FILE, '0');
	}

	// logs/wc : 각종 처리 정보 로깅 폴더
	wfile.makeFolder(WC_LOG_FOLDER);

	// WC_PENDING_FILE : 생성
	if(wfile.isNotExist(WC_PENDING_FILE)){
		await wfile.write(WC_PENDING_FILE, JSON.stringify([]));
	}

	// WC_ROUND_NEXT : 다음게임 시작시간, 지났으면 현재 라운드 진행중이라는 뜻임
	if(wfile.isNotExist(WC_ROUND_NEXT)){
		await wfile.write(WC_ROUND_NEXT, new Date().toJSON());
	}

	// holdem.round.wc : 현재 라운드 정보
	if(wfile.isNotExist(WC_ROUND_FILE)){
		await wfile.write(WC_ROUND_FILE, 1);
		// 신규게임 생성
		await fn.newGame();
	}

	
}

/*
* 대기열 정보를 추가후 반환
* @param games 유효한 게임 참여목록 정보
*/
fn.setPending = async (games) =>{
	let data = [];

	for(let g of games){
		// 필요한 데이터만 추출하여 파일 기록
		data.push({
			timestamp : g.timestamp,
			block_num : g.block_num,
			transaction_num : g.transaction_num,
			from : g.operation[1].from
		});
	}

	try{
		// 이전 파일 읽기
		let pending = JSON.parse(await wfile.read(WC_PENDING_FILE));
		// 누적
		pending = pending.concat(data);

		// 파일 기록
		await wfile.write(WC_PENDING_FILE, JSON.stringify(pending));

		// 누적 정보 리턴
		return Promise.resolve(pending);
	}catch(e){
		return Promise.reject(e);
	}
}

/*
* 대기열 정보를 반환한다
*/
fn.getPending = async () =>{
	try{
		let pending = JSON.parse(await wfile.read(WC_PENDING_FILE));
		return Promise.resolve(pending);	
	}catch(e){
		return Promise.reject(e);
	}
}

/*
* 신규 게임을 생성한다
*/
fn.newGame = async () =>{

	// 라운드 정보 로딩
	let round = Number(await wfile.read(WC_ROUND_FILE));

	// 전체 카드를 가져와서 섞음
	let cards = wcard.makeDeck();
	wcard.shuffleCards(cards);

	// holdem.round.xxx.deck.wc : 섞인 카드 목록
	// holdem.round.xxx.sha256.wc : 위 정보를 sha256으로 변환한 것
	// 앞에 round 및 게임 시작시간을 붙여서 추측 불가 형태로 만들어주도록 함
	let now = new Date().toJSON();
	let cardsStr = `${round}, ${now}, ${cardToString(cards)}`;
	await wfile.write(`${WC_ROUND_FOLDER}/holdem.round.${round}.deck.wc`, cardsStr);
	await wfile.write(`${WC_ROUND_FOLDER}/holdem.round.${round}.sha256.wc`, sha256(cardsStr));
	
	// 카드를 모두 미리 배분
	let community = wcard.drawCards(cards, CARD_COMMUNITY_DRAW_CNT);
	let draws = [];
	for(let i=0;i<=CARD_MAX_DRAW;i++){
		let my = wcard.drawCards(cards, CARD_DRAW_CNT);
		let card5 = community.concat(my);
		draws.push(card5);
	}

	// holdem.round.xxx.cards.wc : 실제 해당 라운드에서 나눠줄 모든 카드 목록정보
	await wfile.write(`${WC_ROUND_FOLDER}/holdem.round.${round}.cards.wc`, JSON.stringify(draws));

	// holdem.round.xxx.join.wc : 해당 라운드 게임 플레이어 join 정보 
	await wfile.write(`${WC_ROUND_FOLDER}/holdem.round.${round}.join.wc`, JSON.stringify([]));	

	wlog.info(`new game created.`);	
}

module.exports = fn;

/*
	pending

	{ timestamp: '2018-09-13T02:32:48',
    block_num: 25911992,
    transaction_num: 70,
    from: 'wonsama' }

  game

	{ timestamp: '2018-09-12T08:10:33',
	  block_num: 25889956,
	  transaction_num: 5,
	  operation:
	   [ 'transfer',
	     { from: 'wonsama',
	       to: 'marvel.hulk',
	       amount: '1.000 STEEM',
	       memo: 'play' } ] }	
*/