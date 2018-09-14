/*
* 파일관련 유틸리티
*/
const fs = require('fs');
const SEP = require('path').sep;
const FILE_CHARSET = 'utf-8';

let fn = {}

/*
* 폴더가 없는 경우 폴더를 생성한다.(있음 물론 하지 않음)
* @param path 폴더경로
*/
fn.makeFolder = (path) =>{
	const folders = path.split(SEP);

  // check path is exist
  if(!fs.existsSync(path)){
    let paths = [];
    try{
      // make folder with recursivly
      for(let f of folders){
        paths.push(f);
        let p = paths.join(SEP);
        if(p!='' && !fs.existsSync(p)){
          fs.mkdirSync(p);
        }
      }
    }catch(e){
      console.error(new Date().toISOString(), 'make folder is fail : ', e);  
    }
  }
}

/*
* 파일 또는 폴더가 존재하는지 여부를 판단한다.
* @param path 경로
* @return 존재여부
*/
fn.isExist = (path) =>{
	return fs.existsSync(path);
}
fn.isNotExist = (path) =>{
	return !fn.isExist(path);
}

/*
* @param path 파일 경로
* @param msg 기록할 메시지
* @return 파일 정보
*/
fn.write = async (path, msg) =>{
	return new Promise((resolve,reject)=>{
		fs.writeFile( path, msg, FILE_CHARSET, (err)=>{
			if(err){
				reject(err);
			}else{
				resolve(`write to : ${path}`);	
			}
		});
	});
}

/*
* @param path 파일 경로
* @param msg 기록할 메시지
* @return 파일 정보
*/
fn.append = async (path, msg) =>{
	return new Promise((resolve,reject)=>{
		fs.appendFile( path, msg, FILE_CHARSET, (err)=>{
			if(err){
				reject(err);
			}else{
				resolve(`write to : ${path}`);	
			}
		});
	});
}

/*
* 파일 읽기
* @param path 파일 경로
* @return 파일 정보
*/
fn.read = async (path) =>{
	return new Promise((resolve,reject)=>{
		fs.readFile(path, FILE_CHARSET, (err,data)=>{
			if(err){
				reject(err);
			}else{
				resolve(data);	
			}
		});
	});
}

module.exports = fn;