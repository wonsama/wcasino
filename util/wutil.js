let fn = {};

/*
* for .. of 에 활용하기 위함 Iterable 여부를 검증한다
* @param obj 입력값
* @return Iterable 여부
*/
fn.isIterable = (obj) =>{
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

/*
* Promise를 활용하여 잠시 sleep 처리
* @param ms sleep 하고자 하는 시간 (밀리섹컨)
*/
fn.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/*
* 범위내에서 랜덤한 정수값(Integer)을 반환한다
* end 미지정 시 1 ~ start 값에 해당하는 수를 반환
* @param start 시작 값 
* @param end 종료 값
*/ 
fn.rndInt = (start, end) => {	
	if(start==end){
		start = 1;
	}
	if(!end){
		return Math.ceil(Math.random() * start);
	}else{
		let gap = end - start;
		return Math.round(Math.random() * gap + start);
	}	
}

/*
* Promise 개체에 대해 [err, data] 정보를 반환한다
* @param promise Promise 개체
* @return results [err, data]
*/
fn.to = (promise) =>{
  return promise
  .then(data=>[null,data])
  .catch(err=>[err]);
}

fn.question = (msg)=>{
  return new Promise((resolve, reject)=>{
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try{
      rl.question(msg, answer=>{
          rl.close();
          resolve(answer);
      });
    }catch(e){
      reject(e);
    }
  });
}

fn.getInfoFromLink = (link)=>{

  // https:// 부분은 cut
  // 이후 구성 [ 도메인 - 태그 - 저자 - 펌링크 ]
  let infos = link.substr(8).split('/');

  if(!infos || infos.length!=4){

    let msg = [];
    msg.push(`입력받은 ${link} 는 올바른 주소 형식이 아닙니다.`);
    msg.push('sample link : https://steemit.com/kr/@wonsama/kr-dev-krob');

    return {
      data:{
        domain: '',
        category: '',
        author: '',
        permlink: ''
      },
      ok:false,
      cd:999,
      msg:msg.join('\n')
    }
  }

  return {
    data:{
      domain: infos[0],
      category: infos[1],
      author: infos[2].substr(1),
      permlink: infos[3]
    },
    ok:true,
    cd:0, /* 0 : 정상, 양수 : 비정상, 추후 코드별 분기(로컬라이징, 코드메시지) 필요 */
    msg:'success'
  }
}

module.exports = fn;