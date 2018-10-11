/*
  로그 관련 유틸리티
*/
const fs = require('fs');
const SEP = require('path').sep;
const dateformat = require('dateformat');
const wfile = require('./wfile');

let fn = {};

const PROJECT_ROOT = process.env.PROJECT_ROOT?process.env.PROJECT_ROOT:".";
const LOG_ROOT = `${PROJECT_ROOT}${SEP}logs${SEP}`;
const FILE_CHARSET = 'utf-8';

const LOG_FILE_PREFIX = 'yyyymmdd';
const LOG_SHOW_PREFIX = ['T','D','I','W','E'];                      
const LOG_FOLDER_PREFIX = ['info','warn','error'];              // 로그레벨 기준으로 폴더를 구분 짓는다.
const LOG_LEVEL = {TRACE:0, DEBUG:1, INFO:2, WARN:3, ERROR:4 }  // INFO 레벨 이상부터 파일에 기록한다

/*
* 로그를 기록한다
* @param msg 메시지
* @param level 로그레벨 (기본 DEBUG)
*/
let log = (msg, level=LOG_LEVEL.DEBUG) => {

  // let message = `[${LOG_SHOW_PREFIX[level]}][${new Date().toISOString()}] ${JSON.stringify(msg)}`;
  let message = `[${LOG_SHOW_PREFIX[level]}][${dateformat(new Date(), 'yy.mm.dd HH:MM:ss')}] ${JSON.stringify(msg)}`;

  // 화면로깅 : DEBUG 이상 
  if(level>=LOG_LEVEL.DEBUG){
    console.log( message );
  }

  // 파일로깅 : INFO 이상
  if(level>=LOG_LEVEL.INFO){
    let tp = LOG_FOLDER_PREFIX[level-LOG_LEVEL.INFO];
    let date = `${dateformat(new Date(),'yyyymmdd')}`;
    let filename = `${date}.${tp}.log`;
    let filefolder = `${LOG_ROOT}${SEP}${tp}${SEP}`;
    let filepath = `${filefolder}${filename}`;

    // 폴더 있는지 여부 확인 및 폴더 생성 : sync
    wfile.makeFolder(filefolder);

    // 파일에 로그를 기록한다 - 누적기록 방식 : async
    wfile.append(filepath, message + '\n').catch(()=>{});
  }
}

fn.trace = (msg) =>{
  log(msg, LOG_LEVEL.TRACE);
}
fn.debug = (msg) =>{
  log(msg, LOG_LEVEL.DEBUG);
}
fn.info = (msg) =>{
  log(msg, LOG_LEVEL.INFO);
}
fn.warn = (msg) =>{
  log(msg, LOG_LEVEL.WARN);
}
fn.error = (msg) =>{
  // error 같은 경우 msg를 남길 때
  // e.toString() 보단 e.stack 을 통해 남기는 권장
  // e 로 남기는 경우 {} 가 기록됨에 유의
  log(msg, LOG_LEVEL.ERROR);
}

module.exports = fn;