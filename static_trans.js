const fs = require('fs');
const SEP = require('path').sep;

function init(){
	let params = process.argv;
	let yyyymmdd = Number(params[2]);
	if(isNaN(yyyymmdd)){
		console.error('must enter yyyymmdd params');
		return;
	}

	let path = `${__dirname}${SEP}wc${SEP}holdem.trans.${yyyymmdd}.wc`;
	let reads = fs.readFileSync(path, 'utf8');
	
	let joins = {};
	for(let r of reads.split('\n')){
		try{
			let j = JSON.parse(r);
			let name = j.from;
			let num = Number(j.amount.split(' ')[0]);
			if(j.memo=='join'){
				let x = Number((isNaN(joins[name])?0:joins[name] + num).toFixed(3));
				joins[name] = x==0?num:x;
			}
		}catch(e){}
	}
	
	let out = [];
	let sum = 0;
	for(let j of Object.entries(joins)){
		out.push({name:j[0], num:j[1]});
		sum=sum+Number(j[1]);
	}
	out.sort((a,b)=>b.num-a.num);
	console.log(out);
	console.log(`sum : ${Number(sum.toFixed(2))}`);
	console.log(`joins : ${joins.length}`);
}
init();
