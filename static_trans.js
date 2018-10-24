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
	let oe = Object.entries(joins);
	for(let j of oe){
		out.push({name:j[0], num:j[1]});
		sum=sum+Number(j[1]);
	}
	out.sort((a,b)=>b.num-a.num);
	console.log(out);
	console.log(`sum : ${Number(sum.toFixed(2))}`);
	console.log(`joins : ${oe.length}`);

	// 20명 (총 800%) : 1~3 (100%*3=300%), 5~10(50%*5=250), 11~20 (25%*10=250)

	/*

홀뎀 VIPS 시스템

매일 가장 많이 참가한 20명 에게 보팅 수행 (총 800%)
: 현재 약 6900 스파 이며(대주주님 은총), 홀댐 수익으로 지속적 스파업 예정

1~3   ::: ( 100% * 3  = 300% )
5~10  ::: (  50% * 5  = 250% )
11~20 ::: (  25% * 10 = 250% )

보팅조건 : 

* 최근 1000블럭 이내에 신규 포스팅이 존재 해야 됨
* 페이아웃(6일)이 지난 글은 제외 (원래는 7일인데 6일넘겨서 보팅하면 다운봇 프로그램 붙기 때문)
* 최신글이 이미 홀덤으로 보팅 받은 글이면 제외 됨

나머지 200%는 대주주님(최우선)과 개발자와 기타 홍보요원에게 쓰일 예정

	*/

	// 홀댐
	/*
		(날짜 : 참가인원 / 매출)
		17 : 14 ( 17.3 )
		18 : 28 ( 57.9 )
		19 : 46 ( 54.3 )
		20 : 31 ( 35.5 )
		21 : 17 ( 22.9 )
		22 : 31 ( 149 )
		23 : 42 ( 133.7 )
		24 : 32 ( 129 )
	*/ 
}
init();
