const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

// Exercise the click handlers and rendered content independently of network access.
test('Konu seçimi, kaynak, bekleme göstergesi ve sohbet konumunun korunması',async()=>{
  const elements=new Map();
  function element(key) {
    if(!elements.has(key)) elements.set(key,{dataset:{},scrollTop:0,classList:{toggle(){},remove(){}},
      focus(){},querySelectorAll(){return [];},setAttribute(){},removeAttribute(){}});
    return elements.get(key);
  }
  const topicButton=element('topic');topicButton.dataset.topic='B';
  const askButton=element('ask');askButton.dataset.action='ask';
  const work={id:'w',revision:1,activity_snapshot:{title:'Esnaf',question:'Mektup ne anlatır?',demo:true,sources:[{title:'Mektup',text:'Kurmaca belge'}]},state:{stage:'chat',messages:[]}};
  let release;
  const context={document:{querySelector:element,querySelectorAll:q=>q==='[data-topic]'?[topicButton]:[askButton]},
    matchMedia:()=>({matches:true}),setInterval(){},clearTimeout,URL,window:{TARIHIZ_CONFIG:{apiBase:'https://test.invalid'}},
    async fetch(url,opts) {
      const input=JSON.parse(opts.body);
      if(url.endsWith('/session')) return Response.json({token:'t',topics:[{title:'Esnaf',id:'B',stage:'chat'}]});
      if(url.endsWith('/works')) {assert.equal(input.topic_id,'B');return Response.json(work);}
      assert.equal(input.action,'ask');
      await new Promise(resolve=>release=resolve);
      return Response.json({...work,state:{stage:'chat',messages:[{role:'assistant',text:'Hangi kanıt?'}]}});
    }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);
  element('#start').onclick();element('#code').value='test-code';
  element('#screen form').onsubmit({preventDefault(){}});
  await new Promise(setImmediate);
  assert.match(element('#screen').innerHTML,/Konu Başlıkları.*Devam Ediyor/s);
  await topicButton.onclick();
  assert.match(element('#screen').innerHTML,/Kurmaca belge/);
  assert.equal(element('#researchText').textContent,'Mektup ne anlatır?');
  element('#activityBody').dataset.stage='chat';element('#activityBody').scrollTop=120;element('#screen').scrollTop=75;
  const pending=askButton.onclick();await new Promise(setImmediate);
  assert.equal(element('#status').textContent,'Yanıtınız hazırlanıyor…');
  release();await pending;
  assert.match(element('#screen').innerHTML,/Hangi kanıt/);
  assert.equal(element('#activityBody').scrollTop,120);assert.equal(element('#screen').scrollTop,75);
});
