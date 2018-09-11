/*
* 파일관련 유틸리티
*/
const fs = require('fs');

let fn = {}

const FILE_CHARSET = 'utf-8';


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