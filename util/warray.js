let fn = {};

/*
* 배열을 len 만큼 크기로 만든 후 val 로 값을 초기화 시켜준다
* @param len 배열크기
* @param val 초기화 시켜줄 값
*/
fn.init = (len, val)=>{
	// v는 기본적으로 undefined, k는 0부터 1씩 순차증가
	return Array.from({length:len}, (v,k)=>val);
}

module.exports = fn;