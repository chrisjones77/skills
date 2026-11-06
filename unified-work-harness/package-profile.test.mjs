import {execFileSync,spawnSync} from 'node:child_process';
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, linkSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { listWorkCapabilities } from "./bundle.mjs";
import { packageInventory, resolvePackageProfile } from "./package.mjs";

test("all inventory entries resolve to inspected package bytes without conferring authority",()=>{
  const inventory=packageInventory();
  const names=inventory.capabilities.map(c=>c.name);
  assert.deepEqual(names.sort(),listWorkCapabilities().map(c=>c.name).sort());
  const all=["read","write","git","dispatch","provider","network"];
  const req={primary:"0xB",companions:["0x3"],sourceSha256:inventory.sourceSha256,requiredCapabilities:names,effectCeiling:all};
  const profile=resolvePackageProfile(req);
  assert.equal(profile.status,"resolved_for_review");
  assert.equal(profile.execution_authorized,false);
  for(const row of profile.capabilities) assert.equal(row.sha256,inventory.files[row.entry]);
  assert.equal(resolvePackageProfile({...req,requiredCapabilities:["sequential_queue"],effectCeiling:["read","write"]}).status,"hold");
  assert.equal(resolvePackageProfile({...req,requiredCapabilities:["missing"]}).status,"hold");
  assert.equal(resolvePackageProfile({...req,requiredCapabilities:["provider_facade"],effectCeiling:["read","network","provider"]}).status,"hold");
  assert.equal(resolvePackageProfile({...req,requiredCapabilities:["sequential_queue","human_hybrid_contracts"],effectCeiling:["read","write","dispatch"]}).status,"resolved_for_review");
  const conflict=resolvePackageProfile({...req,requiredCapabilities:["sequential_queue","readonly_roundtrip"],prohibitedEffects:["provider"]});
  assert.equal(conflict.status,"hold");
  assert.ok(conflict.holds.includes("required effect is prohibited"));
  assert.throws(()=>resolvePackageProfile({...req,primary:"0x0"}));
  assert.throws(()=>resolvePackageProfile({...req,companions:["0xB"]}));
});
test("changed guidance invalidates the accepted package pin", async()=>{
  const temp=mkdtempSync(path.join(tmpdir(),"unified-profile-"));
  try {
    const dir=path.join(temp,"pkg");
    cpSync(fileURLToPath(new URL(".",import.meta.url)),dir,{recursive:true});
    const snapshot=packageInventory();
    const guide=path.join(dir,"methods.md");
    writeFileSync(guide,readFileSync(guide,"utf8")+"\nReviewed change.\n");
    const copied=await import(pathToFileURL(path.join(dir,"package.mjs")));
    assert.equal(copied.resolvePackageProfile({primary:"0xB",effectCeiling:["read"],sourceSha256:snapshot.sourceSha256}).status,"hold");
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

test('manifest-only installation runs the documented offline walkthrough', async t=>{
  const {copyFileSync,mkdirSync} = await import('node:fs');
  const {execFileSync} = await import('node:child_process');
  const root=fileURLToPath(new URL('.',import.meta.url));
  const cwd=mkdtempSync(path.join(tmpdir(),'uwh-install-'));
  t.after(()=>rmSync(cwd,{recursive:true,force:true}));
  const inventory=packageInventory();
  for (const name of ['package-files.json',...Object.keys(inventory.files)]) {
    mkdirSync(path.dirname(path.join(cwd,name)),{recursive:true});
    copyFileSync(path.join(root,name),path.join(cwd,name));
  }
  const invoke=(...args)=>execFileSync(process.execPath,args,{cwd,encoding:'utf8'});
  assert.equal(JSON.parse(invoke('package.mjs','inventory')).sourceSha256,inventory.sourceSha256);
  assert.match(invoke('examples/methods/labels.mjs','r1'),/^B Unobserved$/m);
  assert.match(invoke('examples/methods/labels.mjs','r2'),/^B Empty$/m);
  assert.match(invoke('examples/attended-review.mjs'),/^Work status: complete$/m);
});

for(const label of ['regular install','manifest FIFO','manifest symlink','manifest hard link','manifest at limit','manifest one byte over',
  'member FIFO','member symlink','member hard link','ancestor link','member at limit','member one byte over','aggregate at limit',
  'aggregate one byte over','incorrect case','duplicate member','parent traversal','missing runtime member','missing test member',
  'unexpected test file','profile available','profile held','profile FIFO','profile one byte over','invalid command']) {
  test('package inspection: '+label,t=>{
    const temp=mkdtempSync(path.join(tmpdir(),'uwh-inspection-'));
    t.after(()=>rmSync(temp,{recursive:true,force:true}));
    const dir=path.join(temp,'pkg');
    cpSync(fileURLToPath(new URL('.',import.meta.url)),dir,{recursive:true});
    const manifest=path.join(dir,'package-files.json'), member=path.join(dir,'methods.md'), profile=path.join(temp,'request.json');
    const files=JSON.parse(readFileSync(manifest));
    const rewrite=()=>writeFileSync(manifest,JSON.stringify(files));
    if(label==='duplicate member') {files.push('methods.md');rewrite();}
    if(label==='parent traversal') {files.push('../outside');rewrite();}
    if(label==='incorrect case') {files.push('METHODS.md');rewrite();}
    if(label.startsWith('missing ')) {files.splice(files.indexOf(label==='missing test member'?'queue.test.mjs':'queue.mjs'),1);rewrite();}
    if(label==='unexpected test file') writeFileSync(path.join(dir,'extra.test.mjs'),'');
    if(label==='ancestor link'){
      const parent=path.join(dir,'examples');renameSync(parent,path.join(temp,'outside'));
      symlinkSync(path.join(temp,'outside'),parent);
    }
    for(const [prefix,file] of [['manifest',manifest],['member',member]]){
      if(!label.startsWith(prefix+' '))continue;
      if(label.endsWith('FIFO')){rmSync(file);execFileSync('mkfifo',[file]);}
      if(label.endsWith(' link') || label.endsWith('symlink')){
        const external=path.join(temp,'external');renameSync(file,external);
        if(label.endsWith('hard link'))linkSync(external,file);else symlinkSync(external,file);
      }
      if(label.endsWith('limit') || label.endsWith('over')){
        const size=(prefix==='manifest'?65536:2*1024*1024)+(label.endsWith('over')?1:0);
        const bytes=prefix==='manifest'?JSON.stringify(files):'member';
        writeFileSync(file,bytes.padEnd(size));
      }
    }
    if(label.startsWith('aggregate')){
      let remaining=16*1024*1024+(label.endsWith('over')?1:0)-files.reduce((n,f)=>n+statSync(path.join(dir,f)).size,0);
      while(remaining>0){
        const name='extra-'+files.length+'.bin',size=Math.min(remaining,2*1024*1024);
        writeFileSync(path.join(dir,name),Buffer.alloc(size));files.push(name);remaining-=size;
      }
      rewrite();
    }
    const args=['package.mjs','inventory'];
    if(label.startsWith('profile')){
      args.splice(1,1,'profile',profile);
      if(label==='profile FIFO')execFileSync('mkfifo',[profile]);
      else {
        const input=JSON.stringify({primary:'0xB',sourceSha256:label==='profile held'?'0'.repeat(64):packageInventory().sourceSha256,effectCeiling:['read']});
        writeFileSync(profile,label==='profile one byte over'?input.padEnd(65537):input);
      }
    }
    if(label==='invalid command')args[1]='run';
    const result=spawnSync(process.execPath,args,{cwd:dir,encoding:'utf8',timeout:3000,killSignal:'SIGKILL'});
    assert.equal(result.error,undefined,'package inspection must terminate: '+label);
    const ok=['regular install','manifest at limit','member at limit','aggregate at limit','profile available'].includes(label);
    assert.equal(result.status,ok?0:label==='profile held'?2:1,'unexpected package inspection result: '+label);
    if(ok || label==='profile held') {
      const value=JSON.parse(result.stdout);assert.equal(value.execution_authorized,false);
      if(label==='regular install')assert.equal(value.sourceSha256,packageInventory().sourceSha256);
    }else assert.equal(result.stdout,'');
  });
}

for(const change of ['stable descriptor','truncate member','grow member','replace entry']){
  test('inventory read consistency: '+change,t=>{
    const temp=mkdtempSync(path.join(tmpdir(),'uwh-read-'));
    t.after(()=>rmSync(temp,{recursive:true,force:true}));
    const dir=path.join(temp,'pkg');
    cpSync(fileURLToPath(new URL('.',import.meta.url)),dir,{recursive:true});
    // Change a real disposable entry after its first descriptor read, without
    // depending on scheduler timing or exposing a hook to package callers.
    const probe=`
      import fs from 'node:fs';
      import {syncBuiltinESMExports} from 'node:module';
      import assert from 'node:assert/strict';
      const file='methods.md', ino=fs.statSync(file).ino, mode=process.argv[1];
      let observed=false;
      const read=fs.readSync;
      fs.readSync=function(fd,...args){
        const n=read.call(this,fd,...args);
        if(!observed && fs.fstatSync(fd).ino===ino){
          observed=true;
          if(mode==='truncate member')fs.truncateSync(file,0);
          if(mode==='grow member')fs.appendFileSync(file,'changed');
          if(mode==='replace entry'){fs.renameSync(file,file+'.original');fs.copyFileSync(file+'.original',file);}
        }
        return n;
      };
      syncBuiltinESMExports();
      const {packageInventory}=await import('./package.mjs');
      if(mode==='stable descriptor')assert.equal(packageInventory().execution_authorized,false);
      else assert.throws(packageInventory,/changed during inspection/);
      assert.ok(observed,'the selected file was inspected');
    `;
    execFileSync(process.execPath,['--input-type=module','-e',probe,change],{cwd:dir,timeout:3000});
  });
}
