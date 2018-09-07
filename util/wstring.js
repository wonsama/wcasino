/*
	문자열 관련 유틸리티
*/
let fn = {};

/*
* 개별 아이템 구조가 아래와 같은 경우 사용가능
* {name:"name", value:value}
* @param items 검증할 항목 목록
* @return 값이 없는 항목 목록
*/
fn.isItemEmptyArr = (items)=>{
	let res = [];
	for(let item of items){
		if(!item.value){
			res.push(item);
		}
	}
	return res;
}

/*
* 파라미터 검증용 값 없음 메시지 출력
* @param items 검증할 항목 목록 : isItemEmptyArr 참조
* @return 오류 메시지 (없으면 null 반환)
*/
fn.isItemEmptyMsg = (items)=>{
	let itemEmptyArr = fn.isItemEmptyArr(items);
	if(itemEmptyArr.length>0){
		let msgErr = [];
		for(let item of itemEmptyArr){
			msgErr.push(`${item.name}`);
		}
		return `( ${msgErr.join(', ')} ) is empty !`;
	}
	return null;
}

module.exports = fn;