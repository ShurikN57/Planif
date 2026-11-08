// Planning fingerprints were recorded under TZ=Europe/Paris, where JSON.stringify writes each
// calendar Date (local midnight) as the UTC instant of Paris midnight. This serializer writes
// every Date that way whatever the runtime zone, so the historical hashes can be checked under
// any TZ: a mismatch then means the plan content changed, not the machine's time zone.
const crypto=require('node:crypto');
const offsetFormat=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',timeZoneName:'longOffset'});
function parisOffsetMinutes(time){
 const label=offsetFormat.formatToParts(new Date(time)).find(p=>p.type==='timeZoneName').value;
 const m=/GMT([+-])(\d{2}):(\d{2})/.exec(label);
 return m?(m[1]==='+'?1:-1)*(Number(m[2])*60+Number(m[3])):0;
}
function parisMidnightIso(date){
 if(date.getHours()||date.getMinutes()||date.getSeconds()||date.getMilliseconds())throw Error('Expected a calendar date at local midnight: '+date.toString());
 const base=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
 let time=base-parisOffsetMinutes(base)*60000;
 time=base-parisOffsetMinutes(time)*60000; // settle on the offset in force at Paris midnight
 return new Date(time).toISOString();
}
const parisJson=value=>JSON.stringify(value,function(key,serialized){const raw=this[key];return raw instanceof Date?parisMidnightIso(raw):serialized;});
const parisHash=value=>crypto.createHash('sha256').update(parisJson(value)).digest('hex');
module.exports={parisMidnightIso,parisJson,parisHash};
