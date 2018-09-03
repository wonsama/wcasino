/*
  로그 관련 유틸리티
*/
const fs = require('fs');
const SEP = require('path').sep;
const dateformat = require('dateformat');

let fn = {};

const WC_ROOT = process.env.WC_ROOT?process.env.WC_ROOT:".";
const FILE_CHARSET = 'utf-8';

const LOG_FILE_PREFIX = 'yyyymmdd';
const LOG_SHOW_PREFIX = ['T','D','I','W','E'];                      
const LOG_FOLDER_PREFIX = ['info','warn','error'];              // 로그레벨 기준으로 폴더를 구분 짓는다.
const LOG_LEVEL = {TRACE:1, DEBUG:2, INFO:3, WARN:4, ERROR:5 }  // INFO 레벨 이상부터 파일에 기록한다

/*
* 폴더가 존재하지 않는 경우, recursive 하게 만들어 준다
* @param path 생성할 폴더
*/
let makeFolder = (path) =>{
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

fn.LOG_LEVEL = LOG_LEVEL;

fn.trace = (msg) =>{
  fn.log(msg, LOG_LEVEL.TRACE);
}
fn.debug = (msg) =>{
  fn.log(msg, LOG_LEVEL.DEBUG);
}
fn.info = (msg) =>{
  fn.log(msg, LOG_LEVEL.INFO);
}
fn.warn = (msg) =>{
  fn.log(msg, LOG_LEVEL.WARN);
}
fn.error = (msg) =>{
  fn.log(msg, LOG_LEVEL.ERROR);
}

/*
* 로그를 기록한다
* @param msg 메시지
* @param level 로그레벨 (기본 DEBUG)
*/
fn.log = (msg, level=LOG_LEVEL.DEBUG) => {

  let message = `[${LOG_SHOW_PREFIX[level]}][${new Date().toISOString()}] ${msg}`;

  // 화면로깅 : DEBUG 이상 
  if(level>=LOG_LEVEL.DEBUG){
    console.log( message );
  }

  // 파일로깅 : INFO 이상
  if(level>=LOG_LEVEL.INFO){
    let tp = LOG_FOLDER_PREFIX[level-LOG_LEVEL.INFO];
    let date = `${dateformat(new Date(),'yyyymmdd')}`;
    let filename = `${date}.${tp}.log`;
    let filefolder = `${WC_ROOT}${SEP}${tp}${SEP}`;
    let filepath = `${filefolder}${filename}`;

    // 폴더 있는지 여부 확인 및 폴더 생성
    makeFolder(filefolder);

    // 파일에 로그를 기록한다 - 누적기록 방식
    try{
      fs.appendFile( filepath, message + '\n', LOG_FILE_CHARSET, (err)=>{
        if(err){
          console.error(new Date().toISOString(), '[wlog] write error : ', err);
        }
      });
    }catch(e){
      console.error(new Date().toISOString(), '[wlog] unknown error : ', e);
    }
  }
}

module.exports = fn;