const fs = require('fs');
const wcard = require('./holdem/wcard');
const SEP = require('path').sep;

function init(){
	const DEFAULT_ROUND = 10;
	let params = process.argv;
	let round = Number(params[2]);
	let cround = Number(fs.readFileSync(`${__dirname}${SEP}config${SEP}holdem.round.wc`, 'utf8'));
	console.log('cround', cround);

	if(isNaN(round)){
		round = cround - DEFAULT_ROUND;
	}else{
		round = cround - round;
	}

	let spents = {};
	for(let i=round;i<cround;i++){
		let path = `${__dirname}${SEP}logs${SEP}round${SEP}holdem.round.${i}.join.wc`;
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
	res.sort((a,b)=>b.gap-a.gap);
	res = res.filter(x=>x.name!='@wcasino.jackpot');
	console.log(res)
}
init();

