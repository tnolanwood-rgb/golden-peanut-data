// A purchased item must remain sellable independently of recommendation filters.
const assert=require('node:assert/strict'),{fixture}=require('./helpers/hub-fixture.cjs');
(async()=>{
 const f=await fixture(),{page,origin}=f;
 f.mapping[0].name='Maple logs';
 try{
  await page.goto(origin+'/?game=osrs');
  await page.waitForFunction(()=>GoldenDualHub?.diagnostics().ideas===2&&!GoldenDualHub.diagnostics().loading);
  await page.locator('#gh-market-search').fill('Maple logs');
  await page.locator('#gh-add-fill').click();
  await page.locator('#gh-fill-qty').fill('100');
  await page.locator('#gh-fill-price').fill('1000000');
  await page.locator('#gh-fill-form button[type=submit]').click();
  await page.locator('#gh-refresh').click();
  await page.waitForFunction(()=>!GoldenDualHub.diagnostics().loading&&GoldenDualHub.diagnostics().ideas===0);
  assert.notEqual(await page.locator('#gh-item-name').innerText(),'Maple logs','GE limit removes the purchased item from recommendations');
  await page.locator('#gh-market-search').fill('no matching recommendations');
  assert.equal(await page.locator('#gh-add-fill').isDisabled(),true);
  const sell=page.getByRole('button',{name:'Record sale of Maple logs',exact:true});
  await sell.click();
  assert.equal(await page.locator('#gh-fill-side').inputValue(),'sell');
  assert.equal(await page.locator('#gh-fill-item').inputValue(),'Maple logs');
  assert.equal(await page.locator('#gh-fill-price').inputValue(),'','actual sale price must be entered, not invented');
  await page.locator('#gh-fill-qty').fill('10');
  await page.locator('#gh-fill-price').fill('1100000');
  await page.locator('#gh-fill-tax').fill('0');
  await page.locator('#gh-fill-form button[type=submit]').click();
  assert.match(await page.locator('#gh-holdings-list').innerText(),/90 remaining/);
  await page.reload();await page.waitForFunction(()=>window.GoldenDualHub&&!GoldenDualHub.diagnostics().loading);
  await sell.click();
  assert.equal(await page.locator('#gh-fill-qty').inputValue(),'90');
  await page.locator('#gh-fill-price').fill('1100000');await page.locator('#gh-fill-tax').fill('0');
  await page.locator('#gh-fill-form button[type=submit]').click();
  assert.equal(await page.locator('#gh-holdings').isHidden(),true);
  const rows=await page.evaluate(()=>JSON.parse(localStorage.getItem('gh-osrs-v1-ledger')));
  assert.equal(rows.length,3);assert.equal(rows[0].qty,100);assert.equal(rows[1].gain,1000000);assert.equal(rows[2].gain,9000000);
  assert.deepEqual(f.errors,[]);
  console.log('PASS owned-sale entry: excluded recommendation, empty search, partial sale, reload, FIFO and completed position');
 }finally{await f.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
