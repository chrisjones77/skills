// Run with a local Chrome installation and the CI-pinned playwright-core driver.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {boards}=require('../docs/skill-storyboards/manifest.json');
const board=boards.find(b=>b.slug==='unified-work-harness');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-networking']});
  try {
    for(const width of [390,1280]){
      const p=await browser.newPage({viewport:{width,height:844}});
      const external=[];
      await p.route(/^https?:/,r=>{external.push(r.request().url());return r.abort();});
      const gallery=path.resolve(__dirname,'../docs/skill-storyboards');
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
      assert.deepEqual(await p.locator('img').evaluate(async img=>{await img.decode();return [img.naturalWidth,img.naturalHeight];}),[1536,1024]);
      assert.deepEqual(external,[]);
      await p.close();
      console.log('PASS gallery keyboard, six steps and full PNG at '+width+'px');
    }
  }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
