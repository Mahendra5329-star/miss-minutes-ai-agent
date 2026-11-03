const $ = id => document.getElementById(id);
const messages = $('messages');
let voiceReplies = true;
let recognition = null;
let reminders = JSON.parse(localStorage.getItem('mm_reminders') || '[]');
let settings = JSON.parse(localStorage.getItem('mm_settings') || '{"name":"Miss Minutes","language":"en-IN"}');

function updateClock(){
  const now = new Date();
  $('liveTime').textContent = now.toLocaleTimeString('en-IN',{hour12:true});
  $('liveDate').textContent = now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
updateClock(); setInterval(updateClock,1000);

function addMessage(text, who='assistant'){
  const row=document.createElement('div'); row.className=`message ${who}`;
  if(who==='assistant'){const av=document.createElement('div');av.className='avatar';av.textContent='◷';row.append(av);}
  const bubble=document.createElement('div');bubble.className='bubble';
  const name=document.createElement('b');name.textContent=who==='assistant'?settings.name:'You';
  const p=document.createElement('p');p.textContent=text;
  bubble.append(name,p);row.append(bubble);messages.append(row);messages.scrollTop=messages.scrollHeight;
}
function speak(text){
  if(!voiceReplies || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); const utter=new SpeechSynthesisUtterance(text);
  utter.lang=settings.language; utter.rate=.96; speechSynthesis.speak(utter);
}
function localAnswer(text){
  const t=text.toLowerCase();
  if(t.includes('time')||t.includes('date')) return `It's ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}. Time certainly does fly!`;
  if(t.includes('hello')||t.includes('hi ')||t==='hi') return 'Well, hello there! Lovely to see you. What can I help you with today?';
  if(t.includes('remind')) return 'You can add a reminder in the Reminder Desk. I can help you phrase it, but you need to choose its date and time there.';
  if(t.includes('plan my day')) return 'Let’s make a simple plan: choose your top priority, add two smaller tasks, schedule breaks, and review your progress this evening.';
  return `That's an interesting question! My AI connection isn't configured yet, so I'm using my local demo mode. Add your private API key to the Vercel environment variable OPENAI_API_KEY and deploy the included /api/chat function to enable AI conversations.`;
}
async function ask(text){
  const prompt=text.trim(); if(!prompt)return;
  addMessage(prompt,'user'); $('chatInput').value=''; $('mascotMood').textContent='THINKING…';
  let answer;
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:prompt})});
    if(response.ok){const data=await response.json();answer=data.reply;}
    else answer=localAnswer(prompt);
  }catch{answer=localAnswer(prompt);}
  addMessage(answer); speak(answer); $('mascotMood').textContent='READY TO HELP';
  if($('memoryToggle').checked) saveMemory(prompt,answer);
}
$('sendBtn').addEventListener('click',()=>ask($('chatInput').value));
$('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')ask($('chatInput').value)});
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.prompt)));
$('speakToggle').addEventListener('click',()=>{voiceReplies=!voiceReplies;$('speakToggle').textContent=`🔊 Voice replies: ${voiceReplies?'ON':'OFF'}`;});
$('micBtn').addEventListener('click',()=>{
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){$('voiceStatus').textContent='Speech recognition is not supported in this browser. Try Chrome.';return;}
  if(recognition){recognition.stop();recognition=null;return;}
  recognition=new SR();recognition.lang=settings.language;recognition.interimResults=false;
  $('voiceStatus').textContent='Listening… speak now.';
  recognition.onresult=e=>{const heard=e.results[0][0].transcript;$('chatInput').value=heard;ask(heard);};
  recognition.onerror=()=>{$('voiceStatus').textContent='Microphone unavailable or permission denied.';};
  recognition.onend=()=>{$('voiceStatus').textContent='Voice input ready.';recognition=null;};
  recognition.start();
});

const appUrls={whatsapp:'https://wa.me/',youtube:'https://www.youtube.com/',instagram:'https://www.instagram.com/',gmail:'https://mail.google.com/',maps:'https://maps.google.com/',github:'https://github.com/'};
document.querySelectorAll('[data-app]').forEach(b=>b.addEventListener('click',()=>window.open(appUrls[b.dataset.app],'_blank','noopener')));
$('searchForm').addEventListener('submit',e=>{e.preventDefault();const q=$('searchInput').value.trim();if(q)window.open('https://www.google.com/search?q='+encodeURIComponent(q),'_blank','noopener');});

function saveReminders(){localStorage.setItem('mm_reminders',JSON.stringify(reminders));renderReminders();}
function renderReminders(){
  const list=$('reminderList');list.replaceChildren();
  if(!reminders.length){const p=document.createElement('p');p.className='empty';p.textContent='No reminders yet.';list.append(p);return;}
  reminders.sort((a,b)=>a.time-b.time).forEach(r=>{
    const item=document.createElement('div');item.className='reminder-item';
    const info=document.createElement('div');info.textContent=r.text;
    const small=document.createElement('small');small.textContent=new Date(r.time).toLocaleString();info.append(small);
    const del=document.createElement('button');del.className='remove-reminder';del.textContent='×';del.setAttribute('aria-label','Delete reminder');del.onclick=()=>{reminders=reminders.filter(x=>x.id!==r.id);saveReminders();};
    item.append(info,del);list.append(item);
  });
}
$('reminderForm').addEventListener('submit',e=>{
  e.preventDefault();const text=$('reminderText').value.trim(),time=new Date($('reminderTime').value).getTime();
  if(!text||!Number.isFinite(time)||time<=Date.now()){alert('Choose a future date and time.');return;}
  reminders.push({id:Date.now(),text,time,notified:false});saveReminders();e.target.reset();
});
async function checkReminders(){
  let changed=false;
  for(const r of reminders){
    if(!r.notified && r.time<=Date.now()){
      r.notified=true;changed=true;addMessage(`Reminder: ${r.text}`);speak(`A little reminder: ${r.text}`);
      if('Notification' in window && Notification.permission==='granted') new Notification('Miss Minutes reminder',{body:r.text});
      else alert(`Miss Minutes reminder: ${r.text}`);
    }
  }
  if(changed)saveReminders();
}
renderReminders();setInterval(checkReminders,15000);
if('Notification' in window && Notification.permission==='default'){
  // Ask only after the user interacts with the reminder desk, not on page load.
  $('reminderForm').addEventListener('focusin',()=>Notification.requestPermission(),{once:true});
}

function saveMemory(user,assistant){
  const items=JSON.parse(localStorage.getItem('mm_memory')||'[]');
  items.push({date:new Date().toISOString(),user,assistant});
  localStorage.setItem('mm_memory',JSON.stringify(items.slice(-50)));
}
$('memoryToggle').checked=localStorage.getItem('mm_memory_enabled')==='true';
$('memoryToggle').addEventListener('change',()=>{
  localStorage.setItem('mm_memory_enabled',$('memoryToggle').checked?'true':'false');
  if(!$('memoryToggle').checked)$('memoryArea').textContent='Memory is off. Previously saved items remain until you clear them.';
});
$('viewMemory').addEventListener('click',()=>{
  const area=$('memoryArea');area.hidden=false;
  const data=JSON.parse(localStorage.getItem('mm_memory')||'[]');
  area.textContent=data.length?data.map(x=>`${new Date(x.date).toLocaleString()}\nYou: ${x.user}\n${settings.name}: ${x.assistant}`).join('\n\n'):'No saved memory.';
});
$('clearMemory').addEventListener('click',()=>{
  if(confirm('Permanently clear this browser’s saved Miss Minutes memory?')){localStorage.removeItem('mm_memory');$('memoryArea').textContent='Saved memory cleared.';}
});
$('settingsBtn').addEventListener('click',()=>$('settingsDialog').showModal());
$('assistantName').value=settings.name;$('voiceLanguage').value=settings.language;
$('saveSettings').addEventListener('click',()=>{
  settings={name:$('assistantName').value.trim()||'Miss Minutes',language:$('voiceLanguage').value};
  localStorage.setItem('mm_settings',JSON.stringify(settings));$('settingsDialog').close();
});
