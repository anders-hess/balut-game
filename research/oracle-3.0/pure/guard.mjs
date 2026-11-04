// Architecture contract: follow imports recursively from ALL active mathematical
// Oracle3 modules, fail closed on production-advisor imports and banned dependencies.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const safeMath=[
 'research/oracle-3.0/phase1/simulator.mjs',
 'research/oracle-3.0/oracle2/adapter.mjs',
 'research/oracle-3.0/oracle2/features.mjs',
 'research/oracle-3.0/oracle2/model.mjs',
 'research/oracle-3.0/oracle2/train-supervised.mjs'
];
const pureDir='research/oracle-3.0/pure';
const entries=readdirSync(pureDir).filter(f=>f.endsWith('.mjs')&&f!=='guard.mjs')
 .map(f=>pureDir+'/'+f);
entries.push(...safeMath);
const stressDir='research/oracle-3.0/stress';
entries.push(...readdirSync(stressDir).filter(f=>f.endsWith('.mjs')).map(f=>stressDir+'/'+f));
const visited=new Set(),errors=[];
const forbiddenNames=['cache'+'dPolicy','production'+'Policy','bp'+'iv','oracle1'+'Policy'];
const importPattern=/(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
for(const entry of entries){
 const stack=[entry];
 while(stack.length){
  const rel=stack.pop();
  if(visited.has(rel))continue;
  visited.add(rel);
  if(!rel.endsWith('.mjs')){errors.push('unapproved non-ESM dependency '+rel);continue;}
  if(!(rel.startsWith(pureDir+'/')||rel.startsWith(stressDir+'/')||safeMath.includes(rel))){
   errors.push('unapproved dependency '+rel);continue;
  }
  let source;try{source=readFileSync(path.join(ROOT,rel),'utf8');}
  catch(e){errors.push('unreadable dependency '+rel+': '+e.message);continue;}
  if(rel!==pureDir+'/guard.mjs')for(const name of forbiddenNames){
   if(new RegExp('\\b'+name+'\\b','i').test(source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'')))
    errors.push('forbidden policy term in executable source '+rel+': '+name);
  }
  for(const match of source.matchAll(importPattern)){
   const spec=match[1];
   if(spec.startsWith('node:'))continue;
   if(!spec.startsWith('.')){errors.push('unapproved external import '+rel+' -> '+spec);continue;}
   const target=path.posix.normalize(path.posix.join(path.posix.dirname(rel),spec));
   if(target.startsWith('src/logic/oracle/')||target.startsWith('research/oracle-3.0/phase2/')||
      target.startsWith('research/oracle-3.0/phase3/')||target.includes('/cached-oracle')||
      target.includes('/production-'))
    errors.push('forbidden production/previous-policy import '+rel+' -> '+target);
   stack.push(target);
  }
 }
}
assert.ok(entries.length>=6,'expected mathematical active entrypoints');
assert.deepEqual(errors,[],'clean maths oracle import boundary');
console.log('ORACLE3_PURE_ARCHITECTURE_GUARD='+JSON.stringify({
 status:'PASS',checkedModules:visited.size,activePureFiles:entries.length-safeMath.length,
 permittedMathDependencies:safeMath,productionOracleImports:0
}));
