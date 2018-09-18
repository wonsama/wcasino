// 설정 정보를 읽어들인다 
require('dotenv').config();

const PROJECT_ROOT = process.env.PROJECT_ROOT;
const WC_ROUND_FILE = `${PROJECT_ROOT}/config/holdem.round.wc`;

const wfile = require('./util/wfile');
const wgame = require('./holdem/wgame');

(async ()=>{
	let params = process.argv;	

	await wgame.initFirst();

	await wfile.write(WC_ROUND_FILE, Number(params[2]));
	
	await wgame.newGame();
})();
