const {init:arrInit} = require('../util/warray');

let fn = {};

// 프랑스식(한국) 스>다>하>클, 미국은 스>하>다>클
// see : http://koreabettingnews.com/casino/%ED%8F%AC%EC%BB%A4-%EC%A1%B1%EB%B3%B4%EC%99%80-%EC%9A%A9%EC%96%B4-%EC%97%90-%EB%8C%80%ED%95%B4-%EC%95%8C%EC%95%84%EB%B3%B4%EC%9E%90/
// 족보 룰
// https://m.blog.naver.com/PostView.nhn?blogId=josoblue&logNo=220817060229&proxyReferer=https%3A%2F%2Fwww.google.co.kr%2F

/*

가장 특이한 점은 텍사스홀덤은 어떠한 경우라도 무늬로 승자를 판별하는 경우가 없다.
텍사스홀덤에서는 빽스트레이트플러쉬(빽스티플), 마운틴, 빽스트레이트라는 족보가 없다.

텍사스홀덤의 경우 같은 족보일 때 나머지 숫자(킥커)가 높은 플레이어가 승자가 된다.
그러므로 킥커가 매우 중요한 역할을 하게 되고 킥커 싸움도 치열하다.

세븐 포커 경우 숫자까지 모두 같은 경우 무늬 스,다,하,크 순으로 판별하지만
홀덤의 경우 어떤 경우라도 무늬로 승자를 판별하는 경우는 없다.
*/

/*
* 카드 타입 정보
*/
fn.CARD_TYPE = {
	CLOVER : 0,
	HEART : 1,
	DIAMOND : 2,
	SPADE : 3
};

/*
* 카드 족보
*/
fn.JOKBO = {
	NO_PAIR : 0,
	ONE_PAIR : 1,
	TWO_PAIR : 2,
	TRIPPLE : 3,
	STRAIGHT : 4,
	BACK_STRAIGHT : 5,
	MOUNTAIN : 6,
	FLUSH : 7,
	FULL_HOUSE : 8,
	FOUR_CARD : 9,
	STRAIGHT_FLUSH : 10,
	BACK_STRAIGHT_FLUSH : 11,
	ROYAL_STRAIGHT_FLUSH : 12,
}

const CARD_TYPE = {... fn.CARD_TYPE};
const JOKBO = {... fn.JOKBO};
const JOKBO_ENG = [
	'NO_PAIR',
	'ONE_PAIR',
	'TWO_PAIR',
	'TRIPPLE',
	'STRAIGHT',
	'BACK_STRAIGHT',
	'MOUNTAIN',
	'FLUSH',
	'FULL_HOUSE',
	'FOUR_CARD',
	'STRAIGHT_FLUSH',
	'BACK_STRAIGHT_FLUSH',
	'ROYAL_STRAIGHT_FLUSH',
];
const CARD_T = ['♣️','♥️','♦️','♠️'];
const CARD_N = [2,3,4,5,6,7,8,9,10,'J','Q','K','A'];
const BLACKJACK = 21;
const CARD_NUM_START = 2;
const CARD_NUM_A = 14;

/*
* 해당 숫자에 매칭되는 카드정보를 반환한다
* @param num 숫자정보 
* @return 마크
*/
let numToMark = (num)=>{
	return CARD_N[num-2];
}

/*
* 해당 댁 족보의 숫자 매칭 정보를 반환한다
* @param el 댁
* @return 숫자 매칭정보
*/
fn.getNums = (el) =>{
	if(['NO_PAIR','STRAIGHT','FLUSH','STRAIGHT_FLUSH'].includes(el.jokboe)){
		// 1 - high card
		return `( HIGH ${numToMark(el.groupNumbers[0].num)} )`;
	}	
	else if(['ONE_PAIR','TRIPPLE','FOUR_CARD','TRIPPLE'].includes(el.jokboe)){
		// 1
		return `( ${numToMark(el.groupNumbers[0].num)} )`;
	}
	else if(['TWO_PAIR','FULL_HOUSE'].includes(el.jokboe)){
		// 2
		return `( ${numToMark(el.groupNumbers[0].num)}, ${numToMark(el.groupNumbers[1].num)} )`;
	}
	return '';	// ROYAL_STRAIGHT_FLUSH 
}

/*
* [sortfilter]
* 댁을 족보 기준으로 정렬한다
*/
let sortByJokbo = (a, b) =>{
	if(b.jokbo==a.jokbo){
		// 족보가 같으면 groupNumbers의 길이도 동일
		for(let i=0;i<b.groupNumbers.length;i++){
			if(b.groupNumbers[i].num!=a.groupNumbers[i].num){
				return b.groupNumbers[i].num - a.groupNumbers[i].num;	
			}
		}
		// 동일한 경우임 idx 가 낮은 것을 우선시 함
		return a.idx - b.idx;
	}
	return b.jokbo-a.jokbo;
}

/*
* 덱이 백스트레이트인지 여부를 판단한다
* @param clone 복제된 카드(5) 정보
* @return 여부
*/
let fnIsBackStraight = (clone)=>{

	// 계산을 손쉽게 하기 위하여 복제카드는 정렬 한다(숫자기준으로)
	fn.sortCards(clone, false);

	for(let i=0;i<clone.length;i++){
		if(i<4){
			if(clone[i]._number != i+CARD_NUM_START){
				return false;
			}
		}else{
			if(clone[i]._number != CARD_NUM_A){
				return false;
			}
		}
	}
	return true;
}

/*
* 덱이 스트레이트인지 여부를 판단한다
* @param clone 복제된 카드(5) 정보
* @return 여부
*/
let fnIsStraight = (clone)=>{	

	// 계산을 손쉽게 하기 위하여 복제카드는 정렬 한다(숫자기준으로)
	fn.sortCards(clone, false);

	// 스트레이트 
	return clone.every((el,idx,arr)=>{
		if(idx>0){
			// 숫자기준 정렬 후 작업이 이뤄져야 됨
			if(el._number==arr[idx-1]._number+1){
				return true;
			}else{
				return false;
			}
		}
		return true;
	});
}

/*
* 카드 정보에서 결합 정보를 추가
* @param ori 원본 카드
* @param lastAt 마지막 카드 인덱스 
* @return 문자열로 변환된 카드 정보
*/
let fnToString = (ori, lastAt) =>{
	let cards = [];
	if(!lastAt){
		lastAt = ori.length; 
	}
	for(let i=ori.length-lastAt;i<ori.length;i++){
		cards.push(`${ori[i].type}${ori[i].number}`);
	}
	return cards.join(',');
}

let fnNumbers = (clone) =>{
	let nums = arrInit(13, 0);
	for(let c of clone){
		let now = nums[c._number-2] + 1;
		nums[c._number-2]=now;
	}

	let notempty = [];
	for(let n of nums){
		if(n!=0){
			notempty.push(n);
		}
	}

	return notempty;
}

let fnMaxSameNumber = (clone) =>{
	let nums = arrInit(13, 0);
	let max = 0;
	for(let c of clone){
		let now = nums[c._number-2] + 1;
		nums[c._number-2]=now;
		max = Math.max(now, max);
	}
	return max;
}

let fnMaxSameType = (clone) =>{
	let types = arrInit(4, 0);
	let max = 0;
	for(let c of clone){
		let now = types[c._type] + 1;
		types[c._type]=now;
		max = Math.max(now, max);
	}
	return max;
}

let fnMaxNum = (clone) =>{
	let max = 0;
	for(let c of clone){
		max = Math.max(c._number, max);
	}
	return max;
}

let fnMaxType = (clone) =>{
	let max = 0;
	for(let c of clone){
		max = Math.max(c._type, max);
	}
	return max;
}

/*
* 참여자 정보에서 랭커 정보를 반환한다
* @param joins 참여자 정보
* @param count 추출할 순위
* @return 랭커정보 (count 개)
*/
fn.getRanker = (joins, count=3) =>{
	let idx = 0;
	let players = [];
	for(let card5 of joins){
		let {from, cards} = card5;
		let jb = fn.jokboCards(cards, `@${from}`, idx+1 );	
		players.push(jb);
		idx++;
	}
	// players.sort((a,b)=>{
	// 	if(a.jokbo==b.jokbo){
	// 		return fn.sortFilterWhenSame(a, b);
	// 	}else{
	// 		return b.jokbo - a.jokbo;		
	// 	}
	// });

	players.sort(sortByJokbo);

	return players.slice(0,count);
}

/*
* 족보가 같은 경우 숫자 => 스다하클 순서로 필터링 처리한다
*/
fn.sortFilterWhenSame = (a, b)=>{
	
	// 족보가 동일한 항목에 대해 확인
	let gn1 = a.groupNumbers;
	let gn2 = b.groupNumbers;

	// 예외상황
	if(!gn1 || !gn2 || gn1.length!=gn2.length){
		// 말도 안되는 경우임
		throw Error(`is not same length ( ${gn1.length}, ${gn2.length} )`);
	}

	// 숫자 쌍으로 먼저 검증 
	if([JOKBO.TWO_PAIR,JOKBO.FULL_HOUSE].includes(a.jokbo)){
		for(let i=0;i<gn1.length;i++){
			if(gn1[i].num!=gn2[i].num){
				// 숫자
				return gn2[i].num - gn1[i].num;
			}
		}
	}

	// 숫자 > 타입
	// 카운트는 항시 동일
	for(let i=0;i<gn1.length;i++){
		if(gn1[i].num!=gn2[i].num){
			// 숫자
			return gn2[i].num - gn1[i].num;
		}else{
			// 타입, 카드는 4장이 최고임, 4장 비교는 무의미
			let t0 = gn2[i].types[0] - gn1[i].types[0];
			if(t0!=0){
				return t0;
			}
			if(gn1[i].length>1){
				let t1 = gn2[i].types[1] - gn1[i].types[1];
				if(t1!=0){
					return t1;
				}
			}
			if(gn1[i].length>2){
				let t2 = gn2[i].types[2] - gn1[i].types[2];
				if(t2!=0){
					return t2;
				}
			}
		}
	}

	// 완전 동일한 카드 목록임, idx가 낮은걸로 구분하자 -_-; 먼저 카드 뽑은 사람임
	return 0;
}


let fnGroupNumbers = (clone) =>{

	let ocByNum = [];
	let nums = arrInit(13, 0);

	for(let c of clone){
		nums[c._number-2] = nums[c._number-2] + 1;
	}
	
	for(let i=0;i<nums.length;i++){
		if(nums[i]!=0){
			ocByNum.push({num:i+2, cnt:nums[i]});
		}
	}

	// 나온횟수, 큰숫자 순서로 정렬
	ocByNum.sort((a,b)=>{
		if(b.cnt==a.cnt){
			return b.num-a.num;
		}else{
			return b.cnt-a.cnt;
		}
	});

	// 카드무늬 정보 추가
	for(let oc of ocByNum){
		oc.types = [];
		for(let c of clone){
			if(c._number==oc.num){
				oc.types.push(c._type);
			}
		}
		// 타입이 큰 숫자가 앞으로 오도록 처리
		oc.types.sort((a,b)=>b-a);
	}
	
	return ocByNum;
}

/*
* 카드 족보를 기록하여 반환한다
* @param cards 카드목록
* @param name 참여자 이름
* @param idx 참여자 인덱스
* @return 족보가 포함된 참여정보
*/
fn.jokboCards = (cards, name, idx) =>{

	/*
	[ '0', { type: '♣️', _type: 0, number: 10, _number: 10 } ]
	[ '1', { type: '♦️', _type: 2, number: 10, _number: 10 } ]
	[ '2', { type: '♥️', _type: 1, number: 'J', _number: 11 } ]
	[ '3', { type: '♥️', _type: 1, number: 7, _number: 7 } ]
	[ '4', { type: '♣️', _type: 0, number: 'Q', _number: 12 } ]
	*/

	// 로얄스트레이트 플러쉬 : 5장이 같은 무늬 10, J, Q, K, A 무늬는 상관없이 통일된 무늬만 있으면 된다. 숫자는 10,J,Q,K,A가 고정으로 있어여 한다.
	// 백 스트레이트 플러쉬 : 5장이 같은 무늬 A,2,3,4,5 무늬는 상관없이 통일된 무늬만 있으면 된다. 숫자는 A,2,3,4,5 고정이어야 한다.
	// 스트레이트 플러쉬 : 5장이 같은 무늬 연속되는 숫자 5장이 되야 한다. 무늬는 상관없이 통일된 무늬만 있으면 되고 시작하는 숫자 상관없이 연달아 있으면 된다.
	// 포카드 : 같은 숫자 4개 – 숫자 4개가 필요한대 각 무늬별로 1개씩 같은 숫자를 얻어야 한다. 로플티 같은 경우는 뽑을 일이 희박하지만 포카드는 확률이 있어 실질적인 가장 강력한 패라고 볼수 있다.
	// 풀하우스 : 같은숫자 3개 + 2개 – 트리플 (같은숫자3개) +원페어 (같은숫자 2개)
	// 플러쉬 : 5장 같은 무늬 – 5장 무늬만 같으면 나온다 이상태에서 스트레이트가 나오면 스티플, 로티플, 백스트가 나오는 축이라고 볼수 있다. 스트레이트가 없으면 일반적인 플러쉬라고 보면 된다.
	// 마운틴 : 10, J,Q,K,A – 무늬가 같으면 상위 족보로 간다
	// 백스트레이트 : A,2,3,4,5 – 무늬가 같으면 상위 족보로 간다
	// 스트레이트 : 연속 되는 숫자 5장 – 무늬가 같으면 상위 족보로 간다
	// 트리플 : 같은 숫자 3개
	// 투페어 : 같은숫자 2개 +2개
	// 원페어 : 같은 숫자 2개
	// 노페어 : 5장 모두 어디에도 해당 되지 않는 패

	// 일부가 .. some
	// 모두가 .. every

	// let clone = cards.slice(0);
	let clone = JSON.parse( JSON.stringify( cards ) );

	let isFlush = fnMaxSameType(clone)==5;
	// let isBackStraight = fnIsBackStraight(clone);
	let isStraight = fnIsStraight(clone);

	let maxSameNumber = fnMaxSameNumber(clone);
	let maxSameType = fnMaxSameType(clone);
	let maxNum = fnMaxNum(clone);
	let maxType = fnMaxType(clone);
	let groupNumbers = fnGroupNumbers(clone);

	let isMountain = isStraight && maxNum==14;
	let isRoyalStraightFlash = isMountain && isFlush;
	// let isBackStraightFlash = isBackStraight && isFlush;
	let isStraightFlash = isStraight && isFlush;

	let numbers = fnNumbers(clone);

	let isFourCard = numbers.includes(4);	// 4,1
	let isTripple = numbers.includes(3);	// 3,2 or 3,1,1
	let isFullHouse = isTripple && numbers.length==2;	// 3,2
	let isTwoPair = numbers.length==3;	// 2,2,1
	let isOnePair = numbers.length==4;		// 2,1,1,1
	// let isNoPair = !isStraight&&!isBackStraight&&numbers.length==5;		// 1,1,1,1,1
	let isNoPair = !isStraight&&numbers.length==5;		// 1,1,1,1,1

	let jokbo = JOKBO.NO_PAIR;
	jokbo = Math.max(isRoyalStraightFlash?JOKBO.ROYAL_STRAIGHT_FLUSH:0,jokbo);
	// jokbo = Math.max(isBackStraightFlash?JOKBO.BACK_STRAIGHT_FLUSH:0,jokbo);
	jokbo = Math.max(isStraightFlash?JOKBO.STRAIGHT_FLUSH:0,jokbo);
	jokbo = Math.max(isFourCard?JOKBO.FOUR_CARD:0,jokbo);
	jokbo = Math.max(isFullHouse?JOKBO.FULL_HOUSE:0,jokbo);
	jokbo = Math.max(isFlush?JOKBO.FLUSH:0,jokbo);
	// jokbo = Math.max(isMountain?JOKBO.MOUNTAIN:0,jokbo);
	// jokbo = Math.max(isBackStraight?JOKBO.BACK_STRAIGHT:0,jokbo);
	jokbo = Math.max(isStraight?JOKBO.STRAIGHT:0,jokbo);
	jokbo = Math.max(isTripple?JOKBO.TRIPPLE:0,jokbo);
	jokbo = Math.max(isTwoPair?JOKBO.TWO_PAIR:0,jokbo);
	jokbo = Math.max(isOnePair?JOKBO.ONE_PAIR:0,jokbo);	

	let output = {
		maxSameNumber:maxSameNumber,
		maxSameType:maxSameType,
		maxNum:maxNum,
		maxType:maxType,
		groupNumbers:groupNumbers,
		jokbo:jokbo,
		jokboe:JOKBO_ENG[jokbo],
		ori : cards,
		valuec : fnToString(clone),
		value : fnToString(cards),
		value2 : fnToString(cards, 2),
		name : name,
		idx : idx,
	};

	// 동률 비교하는 방법
	// 카드 랭크, 동일카드 제거(홀덤이기 때문에) 후 => maxType, maxNum 비교
	return output;
}

/*
* 카드에서 num 만큼의 카드를 뽑아낸다
* 입력 받은 카드는 자동적으로 num 만큼 숫자가 감소 
* @param cards 카드목록
* @param num 넘겨줄 카드 수
* @return 넘겨진 카드 목록
*/
fn.drawCards = (cards, num) => {
	let out = [];
	for(let i=0;i<num;i++){
		out.push(cards.shift());
	}
	return out;
};

/*
* 신규 카드 댁을(52장) 생성한다
* @return 52장의 카드
*/
fn.makeDeck = () =>{
	let cards = [];
	for(var i=0;i<CARD_T.length;i++){
    for(var j=0;j<CARD_N.length;j++){
      cards.push({
      	type : CARD_T[i],
      	_type : i,
      	number : CARD_N[j],
      	_number : j+2,
      	// value : `${CARD_T[i]} ${CARD_N[j]}`,
      	value : `${CARD_T[i]}${CARD_N[j]}`,
      });
    }
  }
  return cards;
}

/*
* 입력받은 카드를 섞어준다
* @param cards 카드 목록
*/
fn.shuffleCards = (cards) =>{

	// 
	const SHUFFLE_TIMES = 10;
	for(let i=0;i<cards.length*SHUFFLE_TIMES;i++){
		let rnd = Math.floor(Math.random()*cards.length);
		cards.splice(rnd, 0, cards.shift());
	}
}

/*
* 카드 댁의 정보 기준으로 정렬한다
* @param cards 카드 목록
* @param isType 타입 우선으로 정렬할지 여부 (아니라면 숫자로 정렬)
* @param isAsc 오름차순 여부
* @return 정렬된 카드 목록
*/
fn.sortCards = (cards, isType=true, isAsc=true) =>{

	return cards.sort((c1,c2)=>{

		let s1 = isAsc?c1._type-c2._type:c2._type-c1._type;
		let s2 = isAsc?c1._number-c2._number:c2._number-c1._number;

		if(isType){
			if(s1==0){
				return s2;
			}else{
				return s1;
			}
		}else{
			if(s2==0){
				return s1;
			}else{
				return s2;
			}
		}
		
	});
}

/*
* 입력받은 카트 타입으로 카드 덱을 필터링 한다
* @param cards 카드 목록
* @param cardTypes 카드 타입 배열(CARD_TYPE.SPADE ...)
* @return 필터링된 카드목록
*/
fn.filterCardsByType = (cards, cardTypes=[]) =>{
	return cards.filter(c=>cardTypes.includes(c._type));
}

module.exports = fn;