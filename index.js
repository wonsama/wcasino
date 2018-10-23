// 설정 정보를 읽어들인다
require('dotenv').config();

const steem = require('steem');
const dateformat = require('dateformat');

// 라이브러리 로딩
const wfile = require('./util/wfile');
const wlog = require('./util/wlog');
const wtransfer = require('./holdem/wtransfer');
const wgame = require('./holdem/wgame');

const {monitor} = require('./util/wmonitor');
const {MSG_REJECT} = require('./util/wmonitor');
const {sleep} = require('./util/wutil');

// 상수 설정
const WC_BLOCK_SLEEP = Number(process.env.WC_BLOCK_SLEEP);

const PROJECT_ROOT = process.env.PROJECT_ROOT;
const WC_ROUND_FILE = `${PROJECT_ROOT}/config/holdem.round.wc`;

// 게임 초기화
wgame.initFirst();

// 진입점
function init(){

        const MON_TRANSFER = 'transfer';
        const MON_COMMENT = 'comment';

        // 모니터링 수행
        monitor([MON_TRANSFER])
        .then(async filtered=>{

                // 송금 받은 정보 확인 및 ID 기준 필터링
                let transfers = wtransfer.getTransfers(filtered);

                // 환불대상 확인 및 환불처리
                let refunds = wtransfer.getRefunds(transfers);
                // await wtransfer.doRefunds(refunds);

                // 자동 참여 정보 확인
                let auto = wtransfer.getAutoJoin(transfers);

                // TODO : 파일에 자동 참가정보 기록(금액추가)
                // TODO : (게임 종료 시점에서) 자동 참가 정보에서 대기열 (pending) 정보를 추가한다 

                // 실제 게임 대상 확인
                let games = wtransfer.getGames(transfers);

                // 대기열 추가 이후, 대기정보를 가져온다
                let pendings = games.length>0?(await wgame.setPending(games)):(await wgame.getPending());

                // 게임 종료 여부를 판단 - 라운드 종료 후 일정 시간 휴식
                if(pendings.length>0 && !(await wgame.isGameEnd())){
                        // 게임 join 처리
                        // 라운드 정보 로딩
                        let round = Number(await wfile.read(WC_ROUND_FILE));
                        for(let pen of pendings){
                                // 게임 정보를 읽어들인다
                                let isRoundEnd = await wgame.joinGame(pen, round, pendings);
                                if(isRoundEnd){
                                        break;
                                }
                        }
                }

                // 휴식
                await sleep(WC_BLOCK_SLEEP);

                // 재진입
                init();
        })
        .catch(async e=>{

                // 오류 출력
                if(e==MSG_REJECT.same){
                        wlog.debug('same');
                }else{
                        wlog.error(e.stack);
                }

                // 휴식
                await sleep(WC_BLOCK_SLEEP);

                // 재진입
                init();
        })
}
init();
