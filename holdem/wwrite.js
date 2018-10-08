/*
	글쓰기 관련 유틸 

	순환참조 되지 않도록 유의하기 바람.(순환참조 되면 모듈 로딩 시 empty {}로 보여진다. )
	https://stackoverflow.com/questions/23875233/require-returns-an-empty-object/23875299
*/
const steem = require('steem');
const dateformat = require('dateformat');

const wtransfer = require('./wtransfer');
const wcard = require('./wcard');

const wlog = require('../util/wlog');
const wfile = require('../util/wfile');
const {sleep} = require('../util/wutil');
const {getBalance} = require('../util/wsteem');
const {getAmount} = require('../util/wsteem');
const {getRecentComment} = require('../util/wsteem');

const PROJECT_ROOT = process.env.PROJECT_ROOT;
const WC_JACKPOT_AC = process.env.WC_JACKPOT_AC;

const WC_HOLDEM_MEMO = process.env.WC_HOLDEM_MEMO;
const WC_HOLDEM_PRICE = process.env.WC_HOLDEM_PRICE;
const WC_HOLDEM_TYPE = process.env.WC_HOLDEM_TYPE;	// STEEM or SBD
const WC_HOLDEM_KEY_POSTING = process.env.WC_HOLDEM_KEY_POSTING;
const WC_HOLDEM_AC = process.env.WC_HOLDEM_AC;
const WC_HOLDEM_NEXT_MIN = Number(process.env.WC_HOLDEM_NEXT_MIN);

const WC_PAY_AC = process.env.WC_PAY_AC;

const SEP = require('path').sep;
const WC_ROUND_FOLDER = `${PROJECT_ROOT}${SEP}logs${SEP}round`;
const WC_ROUND_FILE = `${PROJECT_ROOT}${SEP}config${SEP}holdem.round.wc`;
const WC_ROUND_NEXT = `${PROJECT_ROOT}${SEP}config${SEP}holdem.round.next.wc`;
const WC_PENDING_FILE = `${PROJECT_ROOT}${SEP}config${SEP}holdem.pending.wc`;

const WC_TRANS_SLEEP = process.env.WC_TRANS_SLEEP;

const PARENT_PERM_LINK = `wcasino`;	// category
const CARD_MAX_DRAW = 23;
const OTHER_TAGS = [`${PARENT_PERM_LINK}`, 'game', 'games', 'gamble', 'gaming', 'steemit'];

const HOLDEM_GUIDE_LINK = `https://steemit.com/wcasino/@wcasino/holdem-how-to-play-v0-1`;
const INTRO_IMAGE_LINK = `https://cdn.steemitimages.com/DQmZwxsSEVFWmnayMTxJY6YjGGRcPTv3C4JWbBD1HLXozrn/tholdem.png`;

// https://cdn.steemitimages.com/DQmZdCWjgKT3HPT1S6wim4AeDf6xNCA7kfHBZ5LfYisqWv1/wcasino.jpg
let fn = {};

/*
* 라운드 종료 처리 
*/
fn.roundEnd = async () =>{
	
	let balance = await getBalance(WC_JACKPOT_AC, WC_HOLDEM_TYPE);	// jackpot 계정의 스팀 잔액을 반환한다

	// 라운드+참여 정보 로딩	
	let round = Number(await wfile.read(WC_ROUND_FILE));
	let hashcode = await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.sha256.wc`);
	let deck = await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.deck.wc`);
	let joins = JSON.parse(await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.join.wc`));
	let cards = JSON.parse(await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.cards.wc`));

	let permlink = `holdem-round-${round}`;
	let title = `[holdem] round ${round} game is done ! view results.`;
	let jsonMetadata = JSON.stringify({
		"tags":OTHER_TAGS,
		"image":[`${INTRO_IMAGE_LINK}`],
		"links":[`https://steemit.com/${PARENT_PERM_LINK}/@${WC_HOLDEM_AC}/${permlink}`],
		"app":"steemit/0.1",
		"format":"markdown"
	});	// image 는 대문 이미지를 나타냄 프리로딩
	
	let body = [];
	
	body.push(`<center>`);
	body.push(`${INTRO_IMAGE_LINK}`);
	body.push(`</center>`);
	body.push(``);
	body.push(`---`);
	body.push(``);
	body.push(`<center>`);
	body.push(`blockchain based transparent game`);
	body.push(`current jackpot(${WC_JACKPOT_AC}) balance is`);
	body.push(`<h1>${balance} ${WC_HOLDEM_TYPE}</h1>`);
	body.push(`GET 100% ${WC_HOLDEM_TYPE} with ROYAL_STRAIGHT_FLASH`);
	body.push(`STRAIGHT_FLASH : 10%`);
	body.push(`FOUR_CARD : 5%`);
	body.push(`FULL_HOUSE : 1%`);
	body.push(`</center>`);
	body.push(``);
	body.push(`# holdem ${round} th round `);
	body.push(``);
	body.push(`---`);
	body.push(``);
	body.push(`* card hash code : ${hashcode}`);
	body.push(``);
	body.push(`---`);
	body.push(``);
	body.push(`|no |author |c1 |c2 |time (utc+9) |`);
	body.push(`|---|---|---|---|---|`);

	let no = 1;
	for(let j of joins){
		let time =  j.timestamp.indexOf("Z")>0?j.timestamp:j.timestamp+".000Z";
		let t = new Date(time);		
		body.push(`|${no}|${j.from}|${j.cards[3].value}|${j.cards[4].value}|${dateformat(t, 'yy.mm.dd HH:MM:ss')}|`);
		no++;
	}

	body.push(``);
	body.push(`---`);
	body.push(``);
	body.push(`round ${round} is end, see original deck info ! (if you hashing below deck info, you will see upper "card hash code" )`);
	body.push(``);
	body.push(`\`\`\``);
	body.push(`${deck}`);
	body.push(`\`\`\``);
	body.push(``);
	// body.push(`<center>`);
	// body.push(`<h1>[JOIN HOLDEM NOW](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${WC_HOLDEM_PRICE}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})</h1>`);
	// body.push(`<h1>[( needs ${WC_HOLDEM_PRICE} ${WC_HOLDEM_TYPE} )](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${WC_HOLDEM_PRICE}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})</h1>`);
	// body.push(`</center>`);
	// body.push(``);
	body.push(`---`);
	body.push(``);

	let rank = [`1st`, `2nd`, `3rd`];
	let idx = 0;
	let rankers = wcard.getRanker(joins, joins.length);
	
	// 1등 : 50 - 11.5
	// 2등 : 30 - 6.9
	// 3등 : 10 - 2.3
	// 1등에 7이 포함된 경우 젝팟 계정에서 7%를 추가로 지급
	// 딜러가 1~3등에 포함되면 해당 상금을 wcasino.jackpot 계정으로 전송
	// 젝팟 5 - 1.15 ( wcasino.jackpot , wcasino, wcasino.holdem, wcasino.pay )
	// 나머지 잔여금액은 모두 wcasino.pay 계정으로 송금

	// TODO : jackpot 계정 잔액확인 

	body.push(`<center>`);
	body.push(`community card is `);
	body.push(`<h1>${cards[0][0].value}, ${cards[0][1].value}, ${cards[0][2].value}</h1>`);
	body.push(`</center>`);
	body.push(``);
	body.push('---');
	body.push(``);
	body.push('<h1>Congratulations !</h1>');
	body.push(``);
	body.push('---');
	for(let r of rankers){
		body.push(`${idx>=3?(idx+1)+'th':rank[idx]} : [${r.idx}] ${r.name} ${r.jokboe} ${wcard.getNums(r)} ${r.valuec} `);
		idx++;
		if(idx == 3){
			body.push('---');
		}
	}
	body.push(``);
	body.push('---');

	const PRIZE_AMT = Number(WC_HOLDEM_PRICE) * CARD_MAX_DRAW;
	wlog.info(`Current remain jackpot( ${WC_JACKPOT_AC} ) balance is ${balance} ${WC_HOLDEM_TYPE}`);
	let isRSF = rankers[0].jokboe=='ROYAL_STRAIGHT_FLASH'?true:false;		// 100%
	let isSF = rankers[0].jokboe=='STRAIGHT_FLASH'?true:false;					// 10%
	let isFC = rankers[0].jokboe=='FOUR_CARD'?true:false;							// 5%
	let isFH = rankers[0].jokboe=='FULL_HOUSE'?true:false;							// 1%
	// let isSeven = rankers[0].value.indexOf('7')>=0?true:false;
	let prize = [PRIZE_AMT*0.5, PRIZE_AMT*0.3, PRIZE_AMT*0.1];

	// JACKPOT BOUNS
	// STRAIGHT_FLASH : 10%
	// FOUR_CARD : 5%
	// FULL_HOUSE : 1%

	let message = ``;
	let bonus = 0;	// jackpot 계정에서 송금해야 되는 금액
	// if(isSeven){
	// 	bonus = balance*0.07;
	// 	message = `+ you got bonus 7% of jackpot (${bonus})`
	// }
	if(isRSF){
		bonus = balance;
		message = `+ you got bonus 100% of jackpot (${bonus})`
	}
	else if(isSF){
		bonus = Number((balance * 0.10).toFixed(3));
		message = `+ you got bonus 10% of jackpot (${bonus})`
	}
	else if(isFC){
		bonus = Number((balance * 0.05).toFixed(3));
		message = `+ you got bonus 5% of jackpot (${bonus})`
	}
	else if(isFH){
		bonus = Number((balance * 0.01).toFixed(3));
		message = `+ you got bonus 1% of jackpot (${bonus})`
	}
	body.push(`1 st ${rankers[0].name} : ${prize[0].toFixed(3)} ${WC_HOLDEM_TYPE}  ${message}`);
	body.push(`2 nd ${rankers[1].name} : ${prize[1].toFixed(3)} ${WC_HOLDEM_TYPE}`);
	body.push(`3 rd ${rankers[2].name} : ${prize[2].toFixed(3)} ${WC_HOLDEM_TYPE}`);
	body.push('---');

	// 1~3 등 : 송금 처리를 수행한다
	let replyJsonMetadata = JSON.stringify({
		"tags":[`${PARENT_PERM_LINK}`],
		"links":[`https://steemit.com/@${WC_HOLDEM_AC}/`],
		"app":"steemit/0.1",
		"format":"markdown"
	});
	for(let i=0;i<3;i++){
		let name = rankers[i].name.replace('@','');
		let tmsg = `Congratulations @${name} ! you got ${prize[i].toFixed(3)} ${WC_HOLDEM_TYPE} ${rank[i]} prize of holdem round ${round}.see more info at https://steemit.com/@wcasino.holdem\n\n`;
		await wtransfer.sendFromHoldem(name, `${prize[i].toFixed(3)} ${WC_HOLDEM_TYPE}`, tmsg);
		wlog.info(tmsg);
		await sleep(WC_TRANS_SLEEP);	// 송금 후 3초간 쉰다

		// 1~3등 최신글의 (1000블럭 조회) 댓글에 당첨 사실과 당첨금액 참여링크 정보를 포함하여 댓글을 작성한다
		let reply = await getRecentComment(name);
		if(reply){
			await steem.broadcast.commentAsync(
				WC_HOLDEM_KEY_POSTING, reply.author, reply.permlink, WC_HOLDEM_AC, 
				reply.permlink+`-reply-${rank[i]}`, '', tmsg +`[JOIN HOLDEM ( needs ${WC_HOLDEM_PRICE} ${WC_HOLDEM_TYPE} )  ](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${WC_HOLDEM_PRICE}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})`
				, replyJsonMetadata
			);
			wlog.info(`reply :: https://steemit.com/@${WC_HOLDEM_AC}/${reply.permlink}-reply-${rank[i]}`);
			await sleep(WC_TRANS_SLEEP);	// 댓글 후 3초간 쉰다
		}
	}

	// { parent_author: 'hyokhyok',
 //  parent_permlink: 're-wonsama-tt20181006t193901581z-20181007t080251111z',
 //  author: 'wonsama',
 //  permlink:
 //   're-hyokhyok-re-wonsama-tt20181006t193901581z-20181007t122538167z',
 //  title: '',
 //  body: '넵 :) 오랜만에 가족 나들이를 다녀와 넘 즐거운 하루 였네요 ㅎㅎ',
 //  json_metadata: '{"tags":["tripsteem"],"app":"steemit/0.1"}' }

	// 젝팟 당첨자 : 송금 처리를 수행한다
	if(bonus>0){
		// jackpot 금액 송금
		let name = rankers[0].name.replace('@','');
		let tmsg = `Congratulations ! ${message}`;
		await wtransfer.sendFromJackpot(name, `${bonus.toFixed(3)} ${WC_HOLDEM_TYPE}`, tmsg);
		wlog.info(tmsg);
		await sleep(WC_TRANS_SLEEP);	// 송금 후 3초간 쉰다
	}	

	// 5% 젝팟 : 젝팟계정 송금처리
	let jmsg = `Round ${round} jackpot money transfer.`;
	await wtransfer.sendFromHoldem(WC_JACKPOT_AC, `${(PRIZE_AMT*0.05).toFixed(3)} ${WC_HOLDEM_TYPE}`, jmsg);
	wlog.info(jmsg);
	
	// 나머지 : Holdem 계정의 잔금을 조회한 후 pay 계정으로 보낸다
	// let hbalance = await getBalance(WC_HOLDEM_AC, WC_HOLDEM_TYPE);	// holdem 계정의 스팀 잔액을 반환한다
	// 팬딩된 계정 수 x 금액 부분은 제외 한 상태에서 보낸다
	// let pendings = await fn.getPending();
	// hbalance = hbalance - (pendings.length * Number(WC_HOLDEM_PRICE));

	// if(hbalance>0){
	// 	let pmsg = `Round ${round} remain money transfer.`;
	// 	wlog.info('hbalance send ::: '+ hbalance);
	// 	await wtransfer.sendFromHoldem(WC_PAY_AC, `${hbalance.toFixed(3)} ${WC_HOLDEM_TYPE}`, pmsg);
	// 	wlog.info(pmsg);
	// }else{
	// 	wlog.error(`reamin hbalance is ${hbalance} !!! `);
	// }
	
	// 시간정보
	let nextmili = new Date().getTime()+1000*60*WC_HOLDEM_NEXT_MIN;
	let ndate = new Date();
	ndate.setTime(nextmili);

	body.push(``);
	body.push(`next round will open at ${dateformat(ndate,'yy.mm.dd HH:MM:ss')} !`);
	body.push(``);
	body.push(`<center>`);
	body.push(`<h1>[JOIN HOLDEM NOW](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${WC_HOLDEM_PRICE}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})</h1>`);
	body.push(`( needs ${WC_HOLDEM_PRICE} ${WC_HOLDEM_TYPE} )`);
	body.push(`[Holdem Guide](${HOLDEM_GUIDE_LINK})`);
	body.push(`</center>`);
	body.push(``);
	body.push(`---`);
	body.push(``);

	let sendMessage = await steem.broadcast.commentAsync(
		WC_HOLDEM_KEY_POSTING, '', PARENT_PERM_LINK, WC_HOLDEM_AC, 
		permlink, title, body.join('\n'), jsonMetadata
	);

	// 다음 라운드 시간정보 + 라운드 업데이트 처리
	await wfile.write(WC_ROUND_NEXT, ndate.toJSON());
	await wfile.write(WC_ROUND_FILE, round+1);

	let completeMessage = `Round ${round} is end and contents is update : see at https://steemit.com/${PARENT_PERM_LINK}/@${WC_HOLDEM_AC}/${permlink}`;
	wlog.info(completeMessage);

	return Promise.resolve(completeMessage);
};

/*
* 대기열 정보를 반환한다
* wgame에도 존재하나 그럼 순환참조가 발생하므로 반드시 따로 사용
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
* 계정에 글쓰기 업데이트
*/
fn.update = async ()=>{

	let balance = await getBalance(WC_JACKPOT_AC, WC_HOLDEM_TYPE);	// jackpot 계정의 스팀 잔액을 반환한다

	// 라운드+참여 정보 로딩	
	let round = Number(await wfile.read(WC_ROUND_FILE));
	let hashcode = await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.sha256.wc`);
	let joins = JSON.parse(await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.join.wc`));

	let permlink = `holdem-round-${round}`;
	let title = `[holdem] round ${round} game is playing, join now !`;
	let jsonMetadata = JSON.stringify({
		"tags": OTHER_TAGS,
		"image":[`${INTRO_IMAGE_LINK}`],
		"links":[`https://steemit.com/${PARENT_PERM_LINK}/@${WC_HOLDEM_AC}/${permlink}`],
		"app":"steemit/0.1",
		"format":"markdown"
	});	// image 는 대문 이미지를 나타냄 프리로딩
	let body = [];

	body.push(`<center>`);
	body.push(`${INTRO_IMAGE_LINK}`);
	body.push(`</center>`);
	body.push(``);
	body.push(`---`);
	body.push(``);
	body.push(`<center>`);
	body.push(`blockchain based transparent game`);
	body.push(`current jackpot(${WC_JACKPOT_AC}) balance is`);
	body.push(`<h1>${balance} ${WC_HOLDEM_TYPE}</h1>`);
	body.push(`GET 100% ${WC_HOLDEM_TYPE} with ROYAL_STRAIGHT_FLASH`);
	body.push(`STRAIGHT_FLASH : 10%`);
	body.push(`FOUR_CARD : 5%`);
	body.push(`FULL_HOUSE : 1%`);
	body.push(`</center>`);
	body.push(``);
	body.push(`# holdem ${round} th round `);
	body.push(``);
	body.push(`---`);
	body.push(``);
	body.push(`* card hash code : ${hashcode}`);
	body.push(``);
	body.push(`---`);
	body.push(``);
	body.push(`|no |author |c1 |c2 |time (utc+9) |`);
	body.push(`|---|---|---|---|---|`);

	const PRIZE_AMT = Number(WC_HOLDEM_PRICE) * CARD_MAX_DRAW;
	let prize = [PRIZE_AMT*0.5, PRIZE_AMT*0.3, PRIZE_AMT*0.1];

	let no = 1;
	for(let j of joins){
		let time =  j.timestamp.indexOf("Z")>0?j.timestamp:j.timestamp+".000Z";
		let t = new Date(time);
		body.push(`|${no}|${j.from}|${j.cards[3].value}|???|${dateformat(t, 'yy.mm.dd HH:MM:ss')}|`);
		no++;
	}
	body.push(``);
	body.push(`---`);
	body.push(``);
	body.push(`Current joined ${joins.length}/${CARD_MAX_DRAW} users.`);
	body.push(``);
	body.push(`<center>`);
	body.push(`<h1>[JOIN HOLDEM NOW](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${WC_HOLDEM_PRICE}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})</h1>`);
	body.push(`1st : ${prize[0].toFixed(3)} ${WC_HOLDEM_TYPE} / 2nd : ${prize[1].toFixed(3)} ${WC_HOLDEM_TYPE} / 3rd : ${prize[2].toFixed(3)} ${WC_HOLDEM_TYPE}`)
	body.push(`( needs ${WC_HOLDEM_PRICE} ${WC_HOLDEM_TYPE} )`);
	body.push(`[Holdem Guide](${HOLDEM_GUIDE_LINK})`);
	body.push(`</center>`);
	
	let sendMessage = await steem.broadcast.commentAsync(
		WC_HOLDEM_KEY_POSTING, '', PARENT_PERM_LINK, WC_HOLDEM_AC, 
		permlink, title, body.join('\n'), jsonMetadata
	);

	let completeMessage = `Round ${round} ( ${joins.length}/${CARD_MAX_DRAW} ) contents is update : see at https://steemit.com/${PARENT_PERM_LINK}/@${WC_HOLDEM_AC}/${permlink}`;
	wlog.info(completeMessage);

	return Promise.resolve(completeMessage);
};

module.exports = fn;