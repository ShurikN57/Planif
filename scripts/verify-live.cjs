const fs=require('node:fs');
const version=require('../planif-version.js');
const files=['index.html','sw.js','planif-studies.json',...fs.readdirSync('.').filter(n=>/^planif-.*\.js$/.test(n))];
const base='https://shurikn57.github.io/Planif/';
const attempts=Number(process.env.PLANIF_VERIFY_ATTEMPTS||30),interval=Number(process.env.PLANIF_VERIFY_INTERVAL_MS||10000);
async function matches(name,attempt){
 const url=new URL(name,base);url.searchParams.set('v',version);url.searchParams.set('verify',(process.env.GITHUB_SHA||'local')+'-'+attempt+'-'+Date.now());
 try{
  const response=await fetch(url,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(25000)});
  return response.ok&&Buffer.from(await response.arrayBuffer()).equals(fs.readFileSync(name));
 }catch{return false;}
}
(async()=>{
 for(let attempt=1;attempt<=attempts;attempt++){
  if(await matches('index.html',attempt)){
   const results=await Promise.all(files.filter(f=>f!=='index.html').map(async f=>({file:f,ok:await matches(f,attempt)})));
   if(results.every(r=>r.ok)){console.log(`All ${files.length} public application files match main (${version}).`);return;}
   console.log('Waiting for: '+results.filter(r=>!r.ok).map(r=>r.file).join(', '));
  }else console.log(`Waiting for public index (${attempt}/${attempts})…`);
  if(attempt<attempts)await new Promise(resolve=>setTimeout(resolve,interval));
 }
 throw Error('Public application files do not match the checked-out revision.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
