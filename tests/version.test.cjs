const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{test}=require('node:test');
const root=path.join(__dirname,'..');
const {check,bump,nextVersion}=require('../scripts/bump-version.cjs');
const FILES=['planif-version.js','index.html','planif-ui.js','sw.js'];

function copy(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'planif-version-'));
 for(const name of FILES)fs.copyFileSync(path.join(root,name),path.join(dir,name));
 return dir;
}

test('every version location in the repository agrees',()=>{
 const {version,problems}=check(root);
 assert.deepEqual(problems,[]);
 assert.equal(version,require('../planif-version.js'));
});

test('next version increments within a day and restarts at 01 on a new day',()=>{
 assert.equal(nextVersion('2026.11.08.03',new Date(2026,10,8,9)),'2026.11.08.04');
 assert.equal(nextVersion('2026.11.07.12',new Date(2026,10,8,9)),'2026.11.08.01');
 assert.equal(nextVersion('2026.11.09.02',new Date(2026,10,8,9)),'2026.11.09.03');
 assert.throws(()=>nextVersion('2026.11.08.99',new Date(2026,10,8,9)),/99/);
});

test('bump updates every location and keeps them consistent',()=>{
 const dir=copy();
 try{
  const current=check(dir).version;
  const {from,to}=bump(dir,{version:'2099.01.02.03',label:'test-label'});
  assert.equal(from,current);assert.equal(to,'2099.01.02.03');
  assert.deepEqual(check(dir).problems,[]);
  for(const name of FILES)assert(!fs.readFileSync(path.join(dir,name),'utf8').includes(current),`${name} still contains ${current}`);
  assert.match(fs.readFileSync(path.join(dir,'sw.js'),'utf8'),/const CACHE = 'planif-v\d+-test-label-20990102-03';/);
  assert.equal(require(path.join(dir,'planif-version.js')),'2099.01.02.03');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('bump keeps the cache label when none is given',()=>{
 const dir=copy();
 try{
  const label=fs.readFileSync(path.join(dir,'sw.js'),'utf8').match(/planif-v\d+-([a-z0-9-]+?)-\d{8}-\d{2}'/)[1];
  bump(dir,{version:'2099.01.02.03'});
  assert(fs.readFileSync(path.join(dir,'sw.js'),'utf8').includes(`-${label}-20990102-03'`));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('bump refuses invalid, older or equal versions and inconsistent sources without writing',()=>{
 const dir=copy();
 try{
  const current=check(dir).version,snapshot=()=>FILES.map(n=>fs.readFileSync(path.join(dir,n),'utf8'));
  const before=snapshot();
  assert.throws(()=>bump(dir,{version:'2026-11-08'}),/invalide/);
  assert.throws(()=>bump(dir,{version:'2099.02.29.01'}),/invalide/);
  assert.throws(()=>bump(dir,{version:'2099.01.01.00'}),/invalide/);
  assert.throws(()=>bump(dir,{version:current}),/postérieure/);
  assert.throws(()=>bump(dir,{version:'2000.01.01.01'}),/postérieure/);
  assert.throws(()=>bump(dir,{version:'2099.01.01.01',label:'Bad Label'}),/label/);
  assert.deepEqual(snapshot(),before);
  const html=path.join(dir,'index.html');
  fs.writeFileSync(html,fs.readFileSync(html,'utf8').replace(`planif-ui.js?v=${current}`,'planif-ui.js?v=2000.01.01.01'));
  assert(check(dir).problems.some(p=>p.includes('planif-ui.js')));
  assert.throws(()=>bump(dir,{version:'2099.01.01.01'}),/incohérentes/);
  assert.equal(require(path.join(dir,'planif-version.js')),current);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
