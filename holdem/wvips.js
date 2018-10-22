const fs = require('fs');
const wcard = require('./wcard');

const PROJECT_ROOT = process.env.PROJECT_ROOT;
const WC_JACKPOT_AC = process.env.WC_JACKPOT_AC;
const WC_HOLDEM_TYPE = process.env.WC_HOLDEM_TYPE;	// STEEM or SBD

let fn = {};

fn.getPrize = () =>{

	const PRIZE_IMAGES = [
		'https://steemitimages.com/20x0/https://cdn.steemitimages.com/DQmZ9RbHM5hWoaQmVi636BPx92RkamBzdzYGPH24mFgQvZX/league_9.png',
		'https://steemitimages.com/20x0/https://cdn.steemitimages.com/DQmQ4YP4UBtYTXjyJDqFyTodhy5C3YLqkAqEpaZUn29n5c2/league_6.png',
		'https://steemitimages.com/20x0/https://cdn.steemitimages.com/DQmW7cw4wLxasbvCabmLXvmq7vkQekCpB4iAsNwvxH3yijL/league_3.png'
	];

	let rnumber = 10;
	let ranks = fn.getRecent(rnumber);
	ranks.sort((a,b)=>b.earn-a.earn);

	let template = [];
	template.push(`<center>`);
	template.push(`Best player in recent ${rnumber} rounds`);
	template.push(`(최근 ${rnumber} 게임 최고의 플레이어 : 당첨금기준)`);
	let r0 = `${ranks[0].name.replace('@','')} ${ranks[0].earn} ${WC_HOLDEM_TYPE}`;
	let r1 = `${ranks[1].name.replace('@','')} ${ranks[1].earn} ${WC_HOLDEM_TYPE}`;
	let r2 = `${ranks[2].name.replace('@','')} ${ranks[2].earn} ${WC_HOLDEM_TYPE}`;
	template.push(`${PRIZE_IMAGES[0]} ${r0}<br/>${PRIZE_IMAGES[1]}<br/>${r1} ${PRIZE_IMAGES[2]} ${r2}`);
	template.push(`</center>`);

	return template.join('\n');
}

/*
* 최근 3라운드 기준 수익 정보를 반환
* [ { name: '@ioioioioi', spent: 0.6, earn: 1.84, gap: 1.24 } ... ]
* @param round 최근 기준 라운드 / 기본 값 10
* @return 지출/수익/갭/참여자 목록정보
*/
fn.getRecent = (round=3) =>{
	let cround = Number(fs.readFileSync(`${PROJECT_ROOT}/config/holdem.round.wc`, 'utf8'));
	round = cround - round;

	let spents = {};
	for(let i=round;i<cround;i++){
		let path = `${PROJECT_ROOT}/logs/round/holdem.round.${i}.join.wc`;
		let joins = JSON.parse(fs.readFileSync(path, 'utf8'));
		let ranker = wcard.getRanker(joins, joins.length);
		
		for(let r of ranker){
			let v1 = isNaN(spents[r.name]&&spents[r.name][0])?0:spents[r.name][0];
			let v2 = isNaN(spents[r.name]&&spents[r.name][1])?0:spents[r.name][1];
			spents[r.name] = [Number(Number(v1+0.1).toFixed(3)), v2 ];
		}

		let v21 = spents[ranker[0].name];
		spents[ranker[0].name]=[v21[0],Number((v21[1]+1.15).toFixed(3))];
		
		let v22 = spents[ranker[1].name];
		spents[ranker[1].name]=[v22[0],Number((v22[1]+0.69).toFixed(3))];
		
		let v23 = spents[ranker[2].name];
		spents[ranker[2].name]=[v23[0],Number((v23[1]+0.23).toFixed(3))];
	}
	
	let res = [];
	for(let o of Object.entries(spents)){
		res.push({name:o[0], spent:o[1][0], earn:o[1][1], gap:Number((o[1][1]-o[1][0]).toFixed(3)) });
	}
	res = res.filter(x=>x.name!=`@${WC_JACKPOT_AC}`);

	return res;
}

module.exports = fn;