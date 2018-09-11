# flow

* 참조
    - xxx : 라운드 정보임 1부터 시작 ...

* 신규 라운드 생성
    - 현재 라운드 파일기록(holdem.rd.current.wc) / permlink 정보에 포함 / holdem-r1, r2 ...
    - 카드 댁 목록정보 생성(holedm.rd.xxx.deck.wc)
    - 포스팅(계정명:wcasino) - how to play + sha256카드목록 + 커뮤니티 카드 ??? + 보팅참여
    - 20초 딜레이 후 보팅 검증 시작 (댓글 업데이트 때문)
* 보팅 검증
    - 거래 정보 모니터링(계정명:wcasino.holdem), 유저들은(계정명:wcasino.holdem)로 송금을 해야 된다 
    - 블록 정보 로딩(last.block.wc)~최신블록 / 읽어 들인 후 작업 처리가 성공적으로 이뤄지면 마지막 읽어들인 블록정보(최신블록) 기록 (last.block.wc)
    - transfer에서 유효금액(1.000 STEEM)이 아닌경우 자동환불 (0.001은 제외)
    - 거래정보 기록 append (trans.yyyymmdd.wc) {block_id, trx_id, timestamp, from, game}
    - 작업처리 정보 기록 append (pending.wc) {block_id, trx_id, timestamp, from, game}
    - pending.wc 참조 및 (holdem.rd.xxx.wc) 파일에 갯수 확인 후(최대 23개를 넘을 수 없음) 작업 진행
    - 덱정보 확인(holedm.rd.xxx.deck.wc) 에서 라운드에서 처리된 목록 정보(holdem.rd.xxx.wc) 를 통해 카드정보(card) 확인 
    - 거래확인 송금(0.001 STEEM + memo : block_id, trx_id, card) x N
    - holdem.rd.xxx.wc에 처리 정보 기록 {block_id, trx_id, timestamp, from, card} , block_id, trx_id 는 transfer의 정보임. (0.001 송금 정보 아님)
    - 포스팅 업데이트(wcasino) 작업처리 정보(holdem.rd.xxx.wc) 를 참조하여 포스팅을 업데이트 한다. 
    - 3초 딜레이(포스팅 업데이트 때문)
* 라운드 종료
    - 덱정보 holedm.rd.xxx.deck.wc, 카드정보 holdem.rd.xxx.wc 두개를 크로스 체크하여 1,2,3등을 선정
    - 순위별 정보 확인 후 송금처리(wcasino.holdem 계정) (1,2,3등은 고정)
    - 총상금(23 STEEM의 10% 제외)
    - 23 STEEM의 5%는 wcasino, 5%는 wcasino.jackpot 로 송금
    - 1등 50%, 2등 35%, 3등 15%
    - 1등은 wcasino.jackpot 계정에서 현재 금액 확인 후 10% 추가 전송, 딜러가 1등한 경우 제외
    - 젯팟당첨(로얄스트레이트 플러쉬) 인 경우 wcasino.jackpot 계정의 전액을 전송
    - 이전 라운드의 포스팅 생성 시간을 참조(5분 이상이 되어야 됨)하여 다음 라운드 예상 시간을 기록
    - holdem.rd.current.wc 파일의 수치를 증가시켜준다.
    - 다음 라운드가 진행 될 때까지 sleep 1M을 반복한다.

# 계정

* wcasino : 라운드 기록, 포스팅 O
* wcasino.holdem : 포스팅 X
* wcasino.jackpot : 포스팅 X

# 카드 배분

유저(2장) x 23 + 딜러(2장) + 커뮤니티(3장) + 여분(1장) = 52장

# 거래정보 확인 사이트 제공

* block_id, trx_id 2개를 가지고
