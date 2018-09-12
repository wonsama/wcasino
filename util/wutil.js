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

module.exports = fn;