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
  const work={id:'w',topic_id:'B',revision:1,activity_snapshot:{id:'B',title:'Esnaf',question:'Mektup ne anlatır?',demo:true,sources:[{title:'Mektup',text:'Kurmaca belge'}]},state:{stage:'chat',messages:[]}};
  let release;
  const context={document:{querySelector:element,querySelectorAll:q=>q==='[data-topic]'?[topicButton]:[askButton]},
    matchMedia:()=>({matches:true}),setInterval(){},clearTimeout,URL,window:{TARIHIZ_CONFIG:{apiBase:'https://test.invalid'}},
    async fetch(url,opts) {
      const input=JSON.parse(opts.body);
      if(url.endsWith('/session')) return Response.json({token:'t',topics:[{title:'Esnaf',id:'B',stage:'chat'}]});
      if(url.endsWith('/works')) {assert.equal(input.topic_id,'B');return Response.json(work);}
      if(input.action==='reply') {work.state.messages.push({role:'student',text:input.text});return Response.json(work);}
      assert.equal(input.action,'ask');
      await new Promise(resolve=>release=resolve);
      work.state.messages.push({role:'assistant',feedback:'Bir fark belirttin.',text:'Hangi kanıt?'});return Response.json(work);
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
  askButton.dataset.action='reply';element('#response').value='Fark var.';
  const follow=askButton.onclick();await new Promise(setImmediate);
  assert.equal(element('#status').textContent,'Yanıtınız hazırlanıyor…');
  release();await follow;
  assert.deepEqual(work.state.messages.map(m=>m.role),['assistant','student','assistant']);
  assert.match(element('#screen').innerHTML,/Bir fark belirttin/);
  assert.equal(element('#activityBody').scrollTop,120);assert.equal(element('#screen').scrollTop,75);
});

test('İki konu kartı farklı kayıt ve kaynak açar; anket tüm mevcut konulara bağlıdır',async()=>{
  const elements=new Map();
  function element(id) {
    if(!elements.has(id)) elements.set(id,{dataset:{},scrollTop:0,classList:{toggle(){},remove(){}},
      querySelectorAll(){return [];},setAttribute(){},removeAttribute(){}});
    return elements.get(id);
  }
  const rows=[{id:'A',title:'Kasabada pazar hayatı',source:'Bir yolcunun günlüğü',stage:'done'},
    {id:'B',title:'Esnafın gündelik yaşamı',source:'Bir esnafın mektubu',stage:'chat'}];
  const buttons=rows.map(row=>({dataset:{topic:row.id}}));
  let mismatch=false;
  const ctx={document:{querySelector:q=>q==="#response"?null:element(q),querySelectorAll:q=>q==='[data-topic]'?buttons:[]},
    matchMedia:()=>({matches:true}),setInterval(){},clearTimeout,URL,window:{TARIHIZ_CONFIG:{apiBase:'https://test.invalid',feedbackFormUrl:'https://forms.gle/example'}},
    fetch:async (url,options)=>{
      if(url.endsWith('/topics')) return Response.json(rows);
      const id=JSON.parse(options.body).topic_id;
      const row=rows.find(r=>r.id===(mismatch?'A':id));
      return Response.json({topic_id:row.id,activity_snapshot:{id:row.id,title:row.title,question:row.title+'?',sources:[{title:row.source}]},
        state:{stage:row.stage,messages:[],initial:{text:'ilk'},final:{text:'son'}}});
    }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),ctx);
  ctx.showTopics(rows);
  await buttons[0].onclick();assert.match(element('#screen').innerHTML,/Bir yolcunun günlüğü/);
  assert.equal(element('#summarySurvey').innerHTML,'');
  await element('#topics').onclick();await buttons[1].onclick();
  assert.match(element('#screen').innerHTML,/Bir esnafın mektubu/);
  assert.equal(element('#researchText').textContent,'Esnafın gündelik yaşamı?');
  assert.match(element('#steps').innerHTML,/class="step active" aria-current="step"/);
  rows[1].stage='done';await element('#topics').onclick();
  assert.match(element('#screen').innerHTML,/Ankete Katıl/);
  await buttons[1].onclick();assert.match(element('#summarySurvey').innerHTML,/Ankete Katıl/);
  rows.push({id:'C',title:'Yeni konu',stage:null});await element('#topics').onclick();
  assert.doesNotMatch(element('#screen').innerHTML,/Ankete Katıl/);
  assert.equal(ctx.survey([]),'');
  mismatch=true;await buttons[1].onclick();assert.match(element('#status').textContent,/eşleşmedi/);
});
