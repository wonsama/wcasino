var https = require('https');
var fs = require('fs');

const DESK_TOP = '/Users/wonsama/Desktop';

var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
}

// let name = 'Air%20Elemental.png';
// download(
// 	`https://s3.amazonaws.com/steemmonsters/cards_v2.2/${name}`,
// 	`${DESK_TOP}/cards/${name.replace('%20','')}`,
// 	console.log
// );


let json = JSON.parse(fs.readFileSync('./sm.json', 'utf-8'));

let alphas = [];
let anames = [];
let betas = [];
let bnames = [];

for(let j of json){
	let name = j.name.replace(/\s/gi,'%20')+'.png';

	if(j.editions.includes('0')){
		anames.push(`<td>${j.name}</td>`);
		alphas.push(`<td>https://s3.amazonaws.com/steemmonsters/cards_v2.2/${name}</td>`)
	}

	if(j.editions.includes('1')){
		bnames.push(`<td>${j.name}</td>`);
		betas.push(`<td>https://s3.amazonaws.com/steemmonsters/cards_beta/${name}</td>`)
	}
}

// console.log('|C1|C2|C3|C4|');
// console.log('| --- | --- | --- | --- |');
// console.log('| col 3 is      | right-aligned | $1600 |');
// console.log('| col 2 is      | centered      |   $12 |');
// console.log('| zebra stripes | are neat      |    $1 |');


console.log();
console.log('# ALPHA CARDS');
console.log();
let items = [], names =[];
console.log(`<table>`);
alphas.forEach((el,idx,arr)=>{
	if(idx>0&&idx%4==0){
		console.log(`<tr>${items.join('')}</tr>`);
		console.log(`<tr>${names.join('')}</tr>`);
		items = [];
		names = [];
	}
	items.push(el);
	names.push(anames[idx]);
});
console.log(`<tr>${items.join('')}</tr>`);
console.log(`<tr>${names.join('')}</tr>`);
console.log(`</table>`);

console.log();
console.log('# BETA CARDS');
console.log();
items = [];names = [];
console.log(`<table>`);
betas.forEach((el,idx,arr)=>{
	if(idx>0&&idx%4==0){
		console.log(`<tr>${items.join('')}</tr>`);
		console.log(`<tr>${names.join('')}</tr>`);
		items = [];
		names = [];
	}
	items.push(el);
	names.push(bnames[idx]);
});
console.log(`<tr>${items.join('')}</tr>`);
console.log(`<tr>${names.join('')}</tr>`);
console.log(`</table>`);

// for(let j of json){
// 	let name = j.name.replace(' ','%20')+'.png';

// 	if(j.editions.includes('0')){
// 		alphas.push(`https://s3.amazonaws.com/steemmonsters/cards_v2.2/${name}`)
// 	}

// 	if(j.editions.includes('1')){
// 		betas.push(`https://s3.amazonaws.com/steemmonsters/cards_beta/${name}`)
// 	}
// 	if(j.editions.includes('0')){
// 		// download(
// 		// 	`https://s3.amazonaws.com/steemmonsters/cards_v2.2/${name}`,
// 		// 	`${DESK_TOP}/cards/alpha/${name.replace('%20','')}`,
// 		// 	console.log
// 		// );
// 	}

// 	if(j.editions.includes('1')){
// 		// download(
// 		// 	`https://s3.amazonaws.com/steemmonsters/cards_beta/${name}`,
// 		// 	`${DESK_TOP}/cards/beta/${name.replace('%20','')}`,
// 		// 	console.log
// 		// );
// 	}
	
// }