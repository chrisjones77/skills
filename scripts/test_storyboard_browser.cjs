// Run with a local Chrome installation and the CI-pinned playwright-core driver.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {boards}=require('../docs/skill-storyboards/manifest.json');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-networking']});
  try {
    for(const width of [390,1280]){
      for(const board of boards){
      const p=await browser.newPage({viewport:{width,height:844}});
      const external=[];
      await p.route(/^https?:/,r=>{external.push(r.request().url());return r.abort();});
      const gallery=path.resolve(__dirname,'../docs/skill-storyboards');
      const png=fs.readFileSync(path.join(gallery,board.asset));
      const dimensions=[png.readUInt32BE(16),png.readUInt32BE(20)];
      await p.goto(pathToFileURL(path.join(gallery,'index.html')).href+'#'+board.slug);
      const a=p.locator('#'+board.slug);
      await a.locator('img').evaluate(img=>img.decode());
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const link=a.getByRole('link',{name:'Full PNG'});
      await link.focus();
      await p.keyboard.press('Tab'); // linked preview
      await p.keyboard.press('Tab'); // transcript
      assert.equal(await a.locator('summary').evaluate(el=>document.activeElement===el),true);
      await p.keyboard.press('Enter');
      assert.equal(await a.locator('li').last().isVisible(),true);
      assert.deepEqual(await a.locator('li').allTextContents(),board.transcript.map(x=>x.replace(/^\d{2} /,'')));
      await link.focus();
      await p.keyboard.press('Enter');
      await p.waitForURL(pathToFileURL(path.join(gallery,board.asset)).href);
      assert.deepEqual(await p.locator('img').evaluate(async img=>{await img.decode();return [img.naturalWidth,img.naturalHeight];}),dimensions);
      assert.deepEqual(external,[]);
      await p.close();
      console.log('PASS '+board.slug+' keyboard, six steps and full PNG at '+width+'px');
      }
    }
  }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
