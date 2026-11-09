'use strict';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);
const stages = {source:'Kaynağı İncele', initial:'İlk Değerlendirme', chat:'Yapay Zekâ ile Sorgulama', final:'Son Değerlendirme'};
let token = '', work = null, busy = false;

let mobilePane='source';
let draftTimer;
let draftWrites=Promise.resolve();
function queueDraft(field) {
  clearTimeout(draftTimer);
  const id=work.id, stage=work.state.stage, text=field.value;
  draftWrites=draftWrites.catch(()=>{}).then(async ()=>{
    if (work?.id!==id || work.state.stage!==stage || text===(work.state.draft || '')) return;
    work=await request('/works/'+id,{action:'draft',revision:work.revision,text});
  });
  return draftWrites;
}
async function request(path, body) {
  const base = window.TARIHIZ_CONFIG.apiBase;
  if (!base) throw Error('Test ortamının API adresi henüz ayarlanmadı.');
  const response = await fetch(base.replace(/\/$/,'') + path, {
    method:body ? 'POST' : 'GET',
    headers:{'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token} : {})},
    ...(body ? {body:JSON.stringify(body)} : {})
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.detail || 'İstek tamamlanamadı.');
  return result;
}
async function run(fn, thinking=false) {
  if (busy) return;
  busy = true;
  const status = $('#status');
  if (thinking) $('#screen').setAttribute('data-thinking','true');
  status.textContent = thinking ? 'Yanıtınız hazırlanıyor…' : 'Yükleniyor…';
  $('#screen').setAttribute('aria-busy','true');
  $('#screen').querySelectorAll('textarea').forEach(field => field.readOnly=true);
  try {
    clearTimeout(draftTimer);
    await draftWrites.catch(()=>{});
    await fn();
    status.textContent='';
  } catch (error) {
    status.textContent=error.message;
  } finally {
    $('#screen').removeAttribute('data-thinking');
    $('#screen').removeAttribute('aria-busy');
    $('#screen').querySelectorAll('textarea').forEach(field => field.readOnly=false);
    busy=false;
  }
}
function frame(active=false) {
  $('.app').classList.toggle('working',active);
  $('#research').hidden=!active;
  $('#researchText').textContent=active ? work.activity_snapshot.question : '';
  $('#sectionTitle').textContent=active ? work.activity_snapshot.title : 'TARİHSEL KAYNAK DEĞERLENDİRME';
  const stageLabel = active && (stages[work.state.stage] || 'Çalışma tamamlandı');
  if (active) $('#sectionTitle').textContent += ' · '+stageLabel;
  $('#steps').innerHTML=active ? Object.entries(stages).map(([id,name],i)=>
    `<div class="step ${work.state.stage===id?'active':''}" ${work.state.stage===id?'aria-current="step"':''}><span class="num">${i+1}</span>${name}</div>`).join('') : '';
}
function home() {
  frame();
  $('#screen').innerHTML='<section class="welcome"><h1>Tarihteki her iz bir şey anlatır.<br>Peki, neyi kanıtlar?</h1><p class="lead">Tarihsel kaynakları sorgula, yorumla, yapay zekâ rehberliğinde yeniden değerlendir.</p><button class="primary" id="start">Sorgulamaya Başla</button></section>';
  $('#start').onclick=login;
}
function login() {
  $('#screen').innerHTML='<form class="center-card"><label for="code">Katılım kodun</label><input id="code" autocomplete="off" required maxlength="80"><button class="primary">Giriş Yap</button></form>';
  $('#code').focus();
  $('#screen form').onsubmit=event=>{
    event.preventDefault();
    run(async ()=>{
      const result=await request('/session',{code:$('#code').value});
      token=result.token;
      showTopics(result.topics);
    });
  };
}
function showTopics(topics) {
  work=null;
  frame();
  $('#screen').innerHTML=`<section class="full-panel"><div class="pane-header"><h1>Konu Başlıkları</h1></div><div class="pane-body topic-list">${topics.map(t=>
    `<button data-topic="${esc(t.id)}"><strong>${esc(t.title)}</strong><small>${t.demo?'Demo · ':''}${!t.stage?'Başlanmadı':t.stage==='done'?'Tamamlandı':'Devam Ediyor'}</small></button>`).join('') || '<p>Henüz konu eklenmedi.</p>'}${survey(topics)}</div></section>`;
  document.querySelectorAll('[data-topic]').forEach(button=>button.onclick=()=>run(async ()=>{
    const selected=button.dataset.topic;
    const opened=await request('/works',{topic_id:selected});
    if (opened.topic_id!==selected || opened.activity_snapshot?.id!==selected) {
      throw Error('Seçilen konu ile çalışma eşleşmedi. Konu listesini yeniden aç.');
    }
    work=opened;
    mobilePane=work.state.stage==='source'?'source':'evaluation';
    draw();
    await updateSummarySurvey();
  }));
}
function sourceHTML(source) {
  // Only teacher-supplied local files are eligible to appear in the pilot.
  const available=source.image_ready===true && /^pilot-gorseller\/[a-z0-9-]+\/kaynak\.jpg$/.test(source.image);
  const image=available
    ? `<figure><img hidden class="source-image" src="${esc(source.image)}" alt="${esc(source.title)}" onload="this.hidden=false;this.nextElementSibling.hidden=false" onerror="this.hidden=true;this.nextElementSibling.hidden=true;this.parentElement.lastElementChild.hidden=false"><button hidden data-enlarge>Görseli büyüt</button><p hidden>Görsel yüklenemedi.</p></figure>`
    : '<p class="notice">Kaynak görseli henüz yüklenmedi.</p>';
  const metadata=Object.entries(source.metadata || {}).map(([key,value])=>`<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join('');
  const legend=source.legend?.length ? `<h3>Haritadaki İşaretler</h3><ul>${source.legend.map(line=>`<li>${esc(line)}</li>`).join('')}</ul>` : '';
  let reference='';
  try {
    const url=new URL(source.reference_url);
    if(url.protocol==='https:') reference=`<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">Kurum kaydı</a>`;
  } catch {}
  if (source.image_credit_url?.startsWith('https://commons.wikimedia.org/wiki/')) {
    reference+=` · <a href="${esc(source.image_credit_url)}" target="_blank" rel="noopener noreferrer">Fotoğraf kaydı</a>`;
  }
  return `<article><h3>${esc(source.title)}</h3>${image}<dl class="metadata">${metadata}</dl>${reference}<h3>Kaynak Hakkında</h3><p>${esc(source.description || source.text)}</p>${legend}</article>`;
}
function setPane(pane) {
  mobilePane=pane;
  $('.topic-work').dataset.pane=pane;
  document.querySelectorAll('[data-pane-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.paneChoice===pane)));
}
function openImage(button) {
  const img=button.previousElementSibling;
  const dialog=$('#imageViewer');
  $('#largeSource').src=img.src;
  $('#largeSource').alt=img.alt;
  $('#imageScale').value='100';
  $('#largeSource').style.width='100%';
  dialog.showModal();
}

function transcript() {
  return work.state.messages.map(m=>`<div class="bubble ${m.role==='student'?'student':''}"><small>${m.role==='student'?'Sen':'Tarihİz'}</small>${m.feedback ? `<p class="turn-feedback">${esc(m.feedback)}</p>` : ''}<p>${esc(m.text)}</p></div>`).join('');
}
function button(action,label) {
  return `<button class="primary" data-action="${action}">${label}</button>`;
}
function editor(label) {
  return `<label for="response">${label}</label><textarea id="response" rows="5" maxlength="12000">${esc(work.state.draft)}</textarea>`;
}
async function updateSummarySurvey() {
  if (work?.state.stage!=='done') return;
  const topics=await request('/topics');
  $('#summarySurvey').innerHTML=survey(topics);
}
function survey(topics) {
  if (!topics.length || !topics.every(t=>t.stage==='done')) return '';

  try {
    const url=new URL(window.TARIHIZ_CONFIG.feedbackFormUrl);
    if(url.protocol==='https:' && ['docs.google.com','forms.gle'].includes(url.hostname))
      return `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">Ankete Katıl</a>`;
  } catch {}
  return '<button type="button" disabled>Ankete Katıl</button><small>Anket bağlantısı henüz eklenmedi.</small>';
}
function activityBody() {
  const s=work.state;
  if(s.stage==='source') return button('examine','İlk Değerlendirmeye Geç');
  if(s.stage==='initial' || s.stage==='final') return editor(work.activity_snapshot.question)+button(s.stage,s.stage==='initial'?'İlk Yanıtımı Gönder':'Çalışmayı Tamamla');
  if(s.stage==='done') return `<h3>İlk değerlendirmem</h3><p>${esc(s.initial.text)}</p><details><summary>Sorgulama konuşması</summary>${transcript()}</details><h3>Son değerlendirmem</h3><p>${esc(s.final.text)}</p><p>Araştırmamıza destek olduğunuz için teşekkür ederiz.</p><div id="summarySurvey"></div>`;
  const waiting=s.messages.at(-1)?.role==='assistant';
  return transcript()+(waiting?editor('Soruya yanıtın')+button('reply','Yanıtımı Gönder'):button('ask',s.messages.length?'Yanıtıma Geri Bildirim Al':'Sorgulamaya Başla'))+
    (s.suggestFinish?'<p>Son değerlendirmene geçebilirsin.</p>':'')+
    (s.messages.some(m=>m.role==='student')?button('finishChat','Sorgulamayı Bitir'):'');
}
function draw() {
  const sameChat=$('#activityBody')?.dataset.stage==='chat' && work.state.stage==='chat';
  const top=$('#activityBody')?.scrollTop || 0;
  const screenTop=$('#screen').scrollTop;
  const sourceTop=$('.source-pane .pane-body')?.scrollTop || 0;
  frame(true);
  const a=work.activity_snapshot;
  $('#screen').innerHTML=`<div class="mobile-tabs"><button data-pane-choice="source" aria-pressed="${mobilePane==='source'}">Kaynağı İncele</button><button data-pane-choice="evaluation" aria-pressed="${mobilePane==='evaluation'}">Değerlendirmem</button></div><div class="topic-work" data-pane="${mobilePane}"><section class="pane source-pane"><div class="pane-header"><h2>${esc(a.title)}</h2></div><div class="pane-body">${a.demo?'<p class="notice">Demo · Bu etkinlikteki kaynaklar kurmacadır.</p>':''}${a.sources.map(sourceHTML).join('')}</div></section>
  <section class="pane evaluation-pane"><div class="pane-header"><h2>${stages[work.state.stage] || 'Çalışma özeti'}</h2></div><div class="pane-body" id="activityBody" data-stage="${work.state.stage}">${['source','chat'].includes(work.state.stage)?`<p class="main-question">${esc(a.question)}</p>`: ''}${activityBody()}</div><div class="ai-pending" role="status"><span aria-hidden="true">✦</span> Yanıtınız hazırlanıyor…</div><div class="pane-nav"><button id="topics">Konu Başlıklarına Dön</button></div></section></div>`;
  document.querySelectorAll('[data-pane-choice]').forEach(b=>b.onclick=()=>setPane(b.dataset.paneChoice));
  document.querySelectorAll('[data-enlarge]').forEach(b=>b.onclick=()=>openImage(b));
  if(sameChat) {
    $('#activityBody').scrollTop=top;
    $('#screen').scrollTop=screenTop;
    $('.source-pane .pane-body').scrollTop=sourceTop;
  }
  const field=$('#response');
  if (field) field.oninput=()=>{
    clearTimeout(draftTimer);
    draftTimer=setTimeout(()=>queueDraft(field).catch(error=>$('#status').textContent=error.message),500);
  };
  $('#topics').onclick=()=>run(async ()=>{
    if (field) await queueDraft(field);
    showTopics(await request('/topics'));
  });
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>run(async ()=>{
    const action=b.dataset.action;
    if(action==='finishChat' && field?.value.trim()) {
      work=await request('/works/'+work.id,{action:'reply',text:field.value,revision:work.revision});
      draw();
    }
    const body={revision:work.revision,action};
    if(['reply','initial','final'].includes(action)) body.text=field.value;
    work=await request('/works/'+work.id,body);
    draw();
    if (action==='final') await updateSummarySurvey();
    if (action==='reply') {
      work=await request('/works/'+work.id,{action:'ask',revision:work.revision});
      draw();
    }
  },['reply','ask'].includes(b.dataset.action)));
}
const bannerFiles=['banner-01-genel.png','banner-02-orta-asya.png','banner-03-selcuklu.png','banner-04-osmanli.png','banner-05-cumhuriyet.png'];
const bannerNames=['Tarihsel dönemler','Orta Asya','Selçuklu','Osmanlı','Cumhuriyet'];let slide=1,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#slides').innerHTML=bannerFiles.map((f,i)=>`<div class="slide ${i===slide?'active':''}" aria-hidden="${i!==slide}"><img src="../assets/${f}" alt="${bannerNames[i]}" ${i?'loading="eager"':''}></div>`).join('');
setInterval(() => {
  if (paused || document.hidden) return;
  const slides = document.querySelectorAll('.slide');
  slides[slide].classList.remove('active');
  slides[slide].setAttribute('aria-hidden','true');
  slide = (slide + 1) % slides.length;
  slides[slide].classList.add('active');
  slides[slide].setAttribute('aria-hidden','false');
}, 8000);
$('#about').onclick=()=>$('#aboutDialog').showModal();
$('#closeViewer').onclick=()=>$('#imageViewer').close();
$('#imageScale').oninput=e=>$('#largeSource').style.width=e.target.value+'%';
$('#closeAbout').onclick=()=>$('#aboutDialog').close();
home();
