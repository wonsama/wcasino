/*
    글쓰기 관련 유틸 

    순환참조 되지 않도록 유의하기 바람.(순환참조 되면 모듈 로딩 시 empty {}로 보여진다. )
    https://stackoverflow.com/questions/23875233/require-returns-an-empty-object/23875299
*/
const steem = require('steem');
const dateformat = require('dateformat');

const wtransfer = require('./wtransfer');
const wcard = require('./wcard');
const wvips = require('./wvips');

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
const WC_HOLDEM_TYPE = process.env.WC_HOLDEM_TYPE;  // STEEM or SBD
const WC_HOLDEM_KEY_POSTING = process.env.WC_HOLDEM_KEY_POSTING;
const WC_HOLDEM_AC = process.env.WC_HOLDEM_AC;
const WC_HOLDEM_NEXT_MIN = Number(process.env.WC_HOLDEM_NEXT_MIN);

const SEP = require('path').sep;
const WC_ROUND_FOLDER = `${PROJECT_ROOT}${SEP}logs${SEP}round`;
const WC_ROUND_FILE = `${PROJECT_ROOT}${SEP}config${SEP}holdem.round.wc`;
const WC_ROUND_NEXT = `${PROJECT_ROOT}${SEP}config${SEP}holdem.round.next.wc`;
const WC_PENDING_FILE = `${PROJECT_ROOT}${SEP}config${SEP}holdem.pending.wc`;

const WC_TRANS_SLEEP = process.env.WC_TRANS_SLEEP;

const PARENT_PERM_LINK = `steemit`; // category
const CARD_MAX_DRAW = 23;
const OTHER_TAGS = [`${PARENT_PERM_LINK}`, 'game', 'games', 'gamble', 'gaming'];

const HOLDEM_GUIDE_LINK = `https://steemit.com/wcasino/@wcasino/holdem-how-to-play-v0-1`;
// const INTRO_IMAGE_LINK = `https://cdn.steemitimages.com/DQmZwxsSEVFWmnayMTxJY6YjGGRcPTv3C4JWbBD1HLXozrn/tholdem.png`;
const INTRO_IMAGE_LINK = `https://steemitimages.com/0x0/https://cdn.steemitimages.com/DQmUGQG4Vhhng76AosT8RxP7raLGJUAWWkUUs8W8vokSGpa/1.gif`;
const END_IMAGE_LINK = `https://steemitimages.com/0x0/https://cdn.steemitimages.com/DQmSUqptessP7hugHahQwu6Wr7RH9ydBbZDZ1uU4m1LzFLa/holdem.gif`;
// https://cdn.steemitimages.com/DQmZdCWjgKT3HPT1S6wim4AeDf6xNCA7kfHBZ5LfYisqWv1/wcasino.jpg
let fn = {};

/*
* 라운드 종료 처리 
*/
fn.roundEnd = async () =>{
    
    let balance = await getBalance(WC_JACKPOT_AC, WC_HOLDEM_TYPE);  // jackpot 계정의 스팀 잔액을 반환한다

    // 라운드+참여 정보 로딩 
    let round = Number(await wfile.read(WC_ROUND_FILE));
    let hashcode = await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.sha256.wc`);
    let deck = await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.deck.wc`);
    let joins = JSON.parse(await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.join.wc`));
    let cards = JSON.parse(await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.cards.wc`));

    let permlink = `holdem-round-${round}`;
    let title = `[HOLDME] ROUND ${round} IS END ! VIEW RESULT.`;
    let jsonMetadata = JSON.stringify({
        "tags":OTHER_TAGS,
        "image":[`${END_IMAGE_LINK}`],
        "links":[`https://steemit.com/${PARENT_PERM_LINK}/@${WC_HOLDEM_AC}/${permlink}`],
        "app":"steemit/0.1",
        "format":"markdown"
    }); // image 는 대문 이미지를 나타냄 프리로딩
    
    let body = [];
    
    body.push(`<center>`);
    body.push(`${END_IMAGE_LINK}`);
    body.push(`</center>`);
    body.push(``);
    body.push(`---`);
    body.push(``);
    body.push(`<center>`);
    body.push(`Blockchain based transparent game`);
    body.push(`\`블록체인 기반 투명한 게임\``);
    body.push(`Current jackpot(@${WC_JACKPOT_AC}) balance is`);
    body.push(`\`현재 젝팟(@${WC_JACKPOT_AC}) 잔액은\``);
    body.push(`<h1>${balance} ${WC_HOLDEM_TYPE}</h1>`);
    body.push(`GET 100% ${WC_HOLDEM_TYPE} with ROYAL_STRAIGHT_FLUSH`);
    body.push(`STRAIGHT_FLUSH : 10%`);
    body.push(`FOUR_CARD : 5%`);
    body.push(`FULL_HOUSE : 1%`);
    body.push(`\`위 카드가 나오면 젝팟 계정에서 해당 금액(%대비)을 추가로 수여합니다.\``);
    body.push(`</center>`);
    body.push(``);
    body.push(`# HOLDEM ROUND ${round}`);
    body.push(``);
    body.push(`---`);
    body.push(``);
    body.push(`* Card hash code : ${hashcode}`);
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
    body.push(`Round ${round} is end, see original deck info ! (if you hashing sha256 below deck info, you will see upper "card hash code" )`);
    body.push(`\`라운드 ${round} 이 종료되었습니다, 실제 댁 정보를 확인하세요 ! (아래 댁 정보를 sha256으로 hashing하면, 위의 카드 해쉬코드(card hash code)를 확인 할 수 있습니다. )\``);
    body.push(``);
    body.push(`\`\`\``);
    body.push(`${deck}`);
    body.push(`\`\`\``);
    body.push(``);
    body.push(`---`);
    body.push(``);

    let rank = [`1st`, `2nd`, `3rd`];
    let idx = 0;
    let rankers = wcard.getRanker(joins, joins.length);
    body.push(`<center>`);
    body.push(`Community card is `);
    body.push(`\`커뮤니티 카드는\``);
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
    let isRSF = rankers[0].jokboe=='ROYAL_STRAIGHT_FLUSH'?true:false;       // 100%
    let isSF = rankers[0].jokboe=='STRAIGHT_FLUSH'?true:false;                  // 10%
    let isFC = rankers[0].jokboe=='FOUR_CARD'?true:false;                           // 5%
    let isFH = rankers[0].jokboe=='FULL_HOUSE'?true:false;                          // 1%
    let prize = [PRIZE_AMT*0.5, PRIZE_AMT*0.3, PRIZE_AMT*0.1];
    let message = ``;
    let bonus = 0;  // jackpot 계정에서 송금해야 되는 금액
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
        let tmsg = `Congratulations @${name} ! you got ${prize[i].toFixed(3)} ${WC_HOLDEM_TYPE} ${rank[i]} prize of holdem round ${round}.see more info at https://steemit.com/@${WC_HOLDEM_AC}\n\n`;
        
        try{
            await wtransfer.sendFromHoldem(name, `${prize[i].toFixed(3)} ${WC_HOLDEM_TYPE}`, tmsg);
            wlog.info(tmsg);
            await sleep(WC_TRANS_SLEEP);    // 송금 후 3초간 쉰다
        }catch(e){
            // 송금 시 오류가 발생하여도 일단 게임은 지속 진행되도록 함
            wlog.error('1~3 prize error : '+e.toString());
            wlog.error(tmsg);
        }

        // 1등 최신글의 (1000블럭 조회) 댓글에 당첨 사실과 당첨금액 참여링크 정보를 포함하여 댓글을 작성한다
        if(i==0){
            let reply = await getRecentComment(name);
            if(reply){
                try{
                    await steem.broadcast.commentAsync(
                        WC_HOLDEM_KEY_POSTING, reply.author, reply.permlink, WC_HOLDEM_AC, 
                        reply.permlink+`-reply-${rank[i]}`, '', tmsg +`[JOIN HOLDEM ( needs ${WC_HOLDEM_PRICE} ${WC_HOLDEM_TYPE} )  ](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${WC_HOLDEM_PRICE}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})`
                        , replyJsonMetadata
                    );  
                }catch(e){
                    // 댓글을 작성했다가 지우면 애러가 발생할 수 있음에 유의 해야 됨
                    wlog.error('1st comment error : '+e.toString());
                }
                wlog.info(`reply :: https://steemit.com/@${WC_HOLDEM_AC}/${reply.permlink}-reply-${rank[i]}`);
                await sleep(WC_TRANS_SLEEP);    // 댓글 후 3초간 쉰다
            }
        }
    }

    // 젝팟 당첨자 : 송금 처리를 수행한다
    if(bonus>0){
        // jackpot 금액 송금
        let name = rankers[0].name.replace('@','');
        let tmsg = `Congratulations ! ${message}`;

        try{
            await wtransfer.sendFromJackpot(name, `${bonus.toFixed(3)} ${WC_HOLDEM_TYPE}`, tmsg);
            wlog.info(tmsg);
            await sleep(WC_TRANS_SLEEP);    // 송금 후 3초간 쉰다  
        }catch(e){
            wlog.error('jackpot winner send error : '+e.toString());
            wlog.error(tmsg);
        }
    }   

    // 5% 젝팟 : 젝팟계정 송금처리
    let jmsg = `Round ${round} jackpot money transfer.`;
    try{
        await wtransfer.sendFromHoldem(WC_JACKPOT_AC, `${(PRIZE_AMT*0.05).toFixed(3)} ${WC_HOLDEM_TYPE}`, jmsg);
        wlog.info(jmsg);
    }catch(e){
        wlog.error('jackpot remain send error : '+e.toString());
        wlog.error(jmsg);
    }
    
    // 시간정보
    let nextmili = new Date().getTime()+1000*60*WC_HOLDEM_NEXT_MIN;
    let ndate = new Date();
    ndate.setTime(nextmili);

    body.push(``);
    body.push(`Next round will open at ${dateformat(ndate,'yy.mm.dd HH:MM:ss')} (utc+9) !`);
    body.push(`\`다음 라운드는 ${dateformat(ndate,'yy.mm.dd HH:MM:ss')} 에 열립니다. !\``);
    body.push(``);
    let ranks = wvips.getPrize();
    body.push(`<center>${ranks}</center>`);
    // body.push(`<h1>JACKPOT : ${balance} ${WC_HOLDEM_TYPE}</h1>`);
    body.push(`<center>`);
    body.push(`<h1>JACKPOT : ${balance} ${WC_HOLDEM_TYPE}<br><br>JOIN HOLDEM NOW</h1>`);
    let joinmsg = [];
    joinmsg.push(`[x5 JOIN GAME](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${(Number(WC_HOLDEM_PRICE)*5).toFixed(3)}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})`);
    joinmsg.push(`[x3 JOIN GAME](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${(Number(WC_HOLDEM_PRICE)*3).toFixed(3)}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})`);
    joinmsg.push(`[x1 JOIN GAME](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${(Number(WC_HOLDEM_PRICE)*1).toFixed(3)}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})`);
    body.push(joinmsg.join(' | '));
    body.push(`[x23 JOIN GAME](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${(Number(WC_HOLDEM_PRICE)*23).toFixed(3)}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})`);
    body.push(`1st : ${prize[0].toFixed(3)} ${WC_HOLDEM_TYPE} / 2nd : ${prize[1].toFixed(3)} ${WC_HOLDEM_TYPE} / 3rd : ${prize[2].toFixed(3)} ${WC_HOLDEM_TYPE}`)
    body.push(`( Join needs ${WC_HOLDEM_PRICE} ${WC_HOLDEM_TYPE} per game )`);
    body.push(`\`게임에 참여하세요 ! 1 게임당 ${WC_HOLDEM_PRICE} ${WC_HOLDEM_TYPE}이 필요합니다.\``);
    body.push(`[Holdem Guide](${HOLDEM_GUIDE_LINK})`);
    body.push(`</center>`);
    body.push(``);
    body.push(`---`);
    body.push(``);

    try{
        let sendMessage = await steem.broadcast.commentAsync(
            WC_HOLDEM_KEY_POSTING, '', PARENT_PERM_LINK, WC_HOLDEM_AC, 
            permlink, title, body.join('\n'), jsonMetadata
        );  
    }catch(e){
        wlog.error('body write error (close game) : '+body);
    }
    
    // 다음 라운드 시간정보 + 라운드 업데이트 처리
    await wfile.write(WC_ROUND_NEXT, ndate.toJSON());
    await wfile.write(WC_ROUND_FILE, round+1);

    // 다음 라운드 글을 미리 작성
    await fn.update();

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

    let balance = await getBalance(WC_JACKPOT_AC, WC_HOLDEM_TYPE);  // jackpot 계정의 스팀 잔액을 반환한다

    // 라운드+참여 정보 로딩 
    let round = Number(await wfile.read(WC_ROUND_FILE));
    let hashcode;
    let joins;

    try{
        hashcode = await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.sha256.wc`);
        joins = JSON.parse(await wfile.read(`${WC_ROUND_FOLDER}/holdem.round.${round}.join.wc`));   
    }catch(e){
        // 초기 0명 진입시에는 파일이 생성되지 않아서 그냥 '' 처리
        // file not found 임
        hashcode = '';
        joins = [];
    }
    
    let permlink = `holdem-round-${round}`;
    let title = `[HOLDEM] (게임진행중) ROUND ${round} IS PLAYING, JOIN NOW !`;
    let jsonMetadata = JSON.stringify({
        "tags": OTHER_TAGS,
        "image":[`${INTRO_IMAGE_LINK}`],
        "links":[`https://steemit.com/${PARENT_PERM_LINK}/@${WC_HOLDEM_AC}/${permlink}`],
        "app":"steemit/0.1",
        "format":"markdown"
    }); // image 는 대문 이미지를 나타냄 프리로딩
    let body = [];

    body.push(`<center>`);
    body.push(`${INTRO_IMAGE_LINK}`);
    body.push(`</center>`);
    body.push(``);
    body.push(`---`);
    body.push(``);
    body.push(`<center>`);
    body.push(`Blockchain based transparent game`);
    body.push(`\`블록체인 기반 투명한 게임\``);
    body.push(`Current jackpot(@${WC_JACKPOT_AC}) balance is`);
    body.push(`\`현재 젝팟(@${WC_JACKPOT_AC}) 잔액은\``);
    body.push(`<h1>${balance} ${WC_HOLDEM_TYPE}</h1>`);
    body.push(`GET 100% ${WC_HOLDEM_TYPE} with ROYAL_STRAIGHT_FLUSH`);
    body.push(`STRAIGHT_FLUSH : 10%`);
    body.push(`FOUR_CARD : 5%`);
    body.push(`FULL_HOUSE : 1%`);
    body.push(`\`위 카드가 나오면 젝팟 계정에서 해당 금액(%대비)을 추가로 수여합니다.\``);
    body.push(`</center>`);
    body.push(``);
    body.push(`# HOLDEM ROUND ${round}`);
    body.push(``);
    body.push(`---`);
    body.push(``);
    if(hashcode!=''){
        body.push(`* Card hash code : ${hashcode}`);    
    }
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
    body.push(`\`현재 참여자는 ${joins.length}/${CARD_MAX_DRAW} 명 입니다.\``);
    body.push(``);
    let ranks = wvips.getPrize();
    body.push(`<center>${ranks}</center>`);
    body.push(`<center>`);
    body.push(`<h1>JACKPOT : ${balance} ${WC_HOLDEM_TYPE}<br><br>JOIN HOLDEM NOW</h1>`);
    let joinmsg = [];
    joinmsg.push(`[x5 JOIN GAME](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${(Number(WC_HOLDEM_PRICE)*5).toFixed(3)}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})`);
    joinmsg.push(`[x3 JOIN GAME](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${(Number(WC_HOLDEM_PRICE)*3).toFixed(3)}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})`);
    joinmsg.push(`[x1 JOIN GAME](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${(Number(WC_HOLDEM_PRICE)*1).toFixed(3)}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})`);
    body.push(joinmsg.join(' | '));
    body.push(`[x23 JOIN GAME](https://steemconnect.com/sign/transfer?to=${WC_HOLDEM_AC}&amount=${(Number(WC_HOLDEM_PRICE)*23).toFixed(3)}%20${WC_HOLDEM_TYPE}&memo=${WC_HOLDEM_MEMO})`);
    body.push(`1st : ${prize[0].toFixed(3)} ${WC_HOLDEM_TYPE} / 2nd : ${prize[1].toFixed(3)} ${WC_HOLDEM_TYPE} / 3rd : ${prize[2].toFixed(3)} ${WC_HOLDEM_TYPE}`)
    body.push(`( Join needs ${WC_HOLDEM_PRICE} ${WC_HOLDEM_TYPE} per game )`);
    body.push(`\`게임에 참여하세요 ! 1 게임당 ${WC_HOLDEM_PRICE} ${WC_HOLDEM_TYPE}이 필요합니다.\``);
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