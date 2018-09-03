/*
* 숫자 관련 유틸 
*/

let fn = {};

fn.getnumber = (source) =>{  
  if(!source || isNaN(source)){
    return null;
  }
  return Number(source);
}

module.exports = fn;