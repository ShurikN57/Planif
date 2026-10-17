const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
async function run({status=200,offline=false,cached=200,cacheFail=false,nav=true,method='GET',origin='https://shurikn57.github.io'}={}){
 const handlers={},writes=[];let answer;
 const context={URL,Response,self:{location:{origin:'https://shurikn57.github.io'},addEventListener:(key,fn)=>handlers[key]=fn},
 fetch:async()=>{if(offline)throw Error('offline');return new Response('network',{status});},
 caches:{match:async()=>cached?new Response('saved',{status:cached}):undefined,open:async()=>({put:async(key,response)=>{if(cacheFail)throw Error('quota');writes.push({key,status:response.status});}})}};
 vm.createContext(context);vm.runInContext(source,context);
 handlers.fetch({request:{url:origin+'/Planif/'+(nav?'index.html':'asset.js'),mode:nav?'navigate':'cors',destination:nav?'document':'script',method},respondWith:p=>answer=p});
 const result=answer?await answer:null;return{result,writes};
}
(async()=>{
 for(const nav of [true,false]){
  for(const status of [404,500]){const {result,writes}=await run({nav,status});assert.equal(await result.text(),'saved');assert.equal(writes.length,0);}
  const success=await run({nav});assert.equal(await success.result.text(),'network');assert(success.writes.every(w=>w.status===200));
  assert.equal(await (await run({nav,cacheFail:true})).result.text(),'network');
  assert.equal(await (await run({nav,offline:true})).result.text(),'saved');
  assert.equal((await run({nav,offline:true,cached:null})).result.status,503);
  assert.equal((await run({nav,offline:true,cached:500})).result.status,503);
  assert.equal((await run({nav,status:404,cached:null})).result.status,404);
 }
 assert.equal((await run({method:'POST'})).result,null);
 assert.equal((await run({origin:'https://other.test'})).result,null);
 console.log('OK: HTTP errors never cached, offline fallbacks, bad cached responses ignored, cache quota failures and external/write requests excluded.');
})().catch(e=>{console.error(e);process.exitCode=1;});
