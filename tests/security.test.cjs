const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const html=fs.readFileSync('index.html','utf8'),ui=fs.readFileSync('planif-ui.js','utf8');
const policy=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
const scripts=policy.match(/(?:^|; )script-src ([^;]+)/)[1];
assert(!scripts.includes("'unsafe-inline'")&&!scripts.includes("'unsafe-eval'"));
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
 if(/\bsrc=/.test(m[1]))continue;
 const digest=crypto.createHash('sha256').update(m[2]).digest('base64');assert(scripts.includes(`'sha256-${digest}'`));
}
assert(!/\son(?:submit|click|load|error)=/.test(html));
assert(policy.includes("object-src 'none'")&&policy.includes("base-uri 'self'")&&policy.includes("form-action 'none'"));
for(const host of ['mcpeu.coros.com','mcpus.coros.com','mcpcn.coros.com','strava-mobile-2f93f.web.app'])assert(policy.includes('https://'+host));
const expected={
 'firebase-app-compat':'sha384-ZaR6mWzmJtrRibZ1Vm7SoHFr8OXjyAuGAXalGDKqbxFT18oi/z+oZLIRFkpeNor1',
 'firebase-auth-compat':'sha384-I1LYojsZ5RM1cOda44Z2h42Qa6YfsQ1XkXxREnhp4ueYBR/4d1pG1K+NZM537Vsj'
};
for(const [name,hash] of Object.entries(expected)){
 const tag=html.match(new RegExp('<script[^>]+src="https://www\\.gstatic\\.com/firebasejs/10\\.14\\.1/'+name+'\\.js"[^>]*>'))[0];
 assert(tag.includes(`integrity="${hash}"`)&&tag.includes('crossorigin="anonymous"'));
}
assert(!/catch\([^)]*\)\{\s*\}/.test(ui));
assert(ui.includes('Enregistrement local indisponible.'));
console.log('OK: hashed inline bootstrap, restricted script policy, COROS/Firebase endpoints, pinned SDK integrity and explicit storage failure handling.');
