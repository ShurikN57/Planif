const fs=require('node:fs'),vm=require('node:vm');
for(const name of fs.readdirSync('.').filter(n=>/^planif-.*\.js$/.test(n)||n==='sw.js'))new vm.Script(fs.readFileSync(name,'utf8'),{filename:name});
const html=fs.readFileSync('index.html','utf8');
for(const [,attributes,body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/\bsrc\s*=/.test(attributes))new vm.Script(body);
JSON.parse(fs.readFileSync('planif-studies.json','utf8'));
console.log('All application scripts and scientific JSON parse successfully.');
