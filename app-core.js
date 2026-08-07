const KEY='myCyclePrototype_v1';
const BACKUP_FORMAT='my-cycle-encrypted-backup';
const BACKUP_ITERATIONS=210000;
const fmtLong=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'});
const fmtA11y=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const fmtMonth=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'});
const fmtShort=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'});
const symptoms=[
  ['pelvic','Pelvic pain'],['right','Right-sided pain'],['back','Lower-back pain'],['thigh','Thigh or leg pain'],
  ['headache','Headache'],['bloating','Bloating'],['fatigue','Fatigue'],['nausea','Nausea'],
  ['diarrhoea','Diarrhoea'],['constipation','Constipation'],['urinary','Urinary discomfort'],['heavy','Heavy bleeding']
];
const severity=['Not logged','Mild','Moderate','Severe'];
let state=loadState();
let monthCursor=startOfMonth(new Date());
let undoAction=null,toastTimer=null,pendingRestore=null;

function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function parse(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function daysBetween(a,b){return Math.round((parse(b)-parse(a))/86400000)}
function startOfMonth(d){return new Date(d.getFullYear(),d.getMonth(),1)}
function todayISO(){return iso(new Date())}
function uid(){return Math.random().toString(36).slice(2,10)}
function median(values){if(!values.length)return null;const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function addMonths(d,n){const x=new Date(d);x.setMonth(x.getMonth()+n);return x}
function clone(v){return JSON.parse(JSON.stringify(v))}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function symptomLabel(id){return symptoms.find(([key])=>key===id)?.[1]||id}

function defaultState(){
  const t=todayISO();
  return {version:2,profile:{typicalCycleLength:28,typicalPeriodDuration:5},periods:[{id:uid(),start:t,end:null,source:'prototype setup'}],symptoms:{[t]:{pelvic:2,right:2,back:2}},flows:{[t]:'Medium'},notes:{},lastBackup:null,created:t};
}
function normalizeState(raw){
  const fallback=defaultState(),input=raw&&typeof raw==='object'?raw:{};
  const profile=input.profile&&typeof input.profile==='object'?input.profile:{};
  const periods=Array.isArray(input.periods)?input.periods.filter(p=>p&&/^\d{4}-\d{2}-\d{2}$/.test(p.start||'')).map(p=>({id:String(p.id||uid()),start:p.start,end:p.end||null,source:p.source||'manual'})):fallback.periods;
  return {
    version:2,
    profile:{typicalCycleLength:Number(profile.typicalCycleLength)||28,typicalPeriodDuration:Number(profile.typicalPeriodDuration)||5},
    periods,
    symptoms:input.symptoms&&typeof input.symptoms==='object'?input.symptoms:{},
    flows:input.flows&&typeof input.flows==='object'?input.flows:{},
    notes:input.notes&&typeof input.notes==='object'?input.notes:{},
    lastBackup:input.lastBackup||null,
    created:input.created||todayISO()
  };
}
function loadState(){try{const raw=localStorage.getItem(KEY);return raw?normalizeState(JSON.parse(raw)):defaultState()}catch(e){return defaultState()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
function activePeriod(){return state.periods.find(p=>!p.end)}
function completedPeriods(){return state.periods.filter(p=>p.end).sort((a,b)=>a.start.localeCompare(b.start))}
function cycleLengths(){const ps=[...state.periods].sort((a,b)=>a.start.localeCompare(b.start));let r=[];for(let i=1;i<ps.length;i++){const n=daysBetween(ps[i-1].start,ps[i].start);if(n>=15&&n<=60)r.push(n)}return r.slice(-6)}
function periodDurations(){return completedPeriods().map(p=>daysBetween(p.start,p.end)+1).filter(n=>n>0&&n<15).slice(-6)}
function predictionInfo(){
  const periods=[...state.periods].sort((a,b)=>a.start.localeCompare(b.start));
  if(!periods.length)return null;
  const lengths=cycleLengths();
  const cycle=Math.round(lengths.length>=3?median(lengths):state.profile.typicalCycleLength);
  const duration=Math.round(periodDurations().length?median(periodDurations()):state.profile.typicalPeriodDuration);
  const variation=lengths.length?Math.max(...lengths)-Math.min(...lengths):4;
  const window=Math.max(2,Math.ceil(variation/2));
  const last=parse(periods.at(-1).start),starts=[];let d=addDays(last,cycle);
  while(d<addMonths(new Date(),7)){starts.push(new Date(d));d=addDays(d,cycle)}
  return {cycle,duration,window,starts,confidence:lengths.length>=3?(variation<=4?'High':variation<=8?'Medium':'Limited'):'Limited',cyclesUsed:lengths.length};
}
function serializablePrediction(){const p=predictionInfo();return p?{...p,starts:p.starts.map(iso),generatedAt:new Date().toISOString()}:null}
function periodOn(dateISO){return state.periods.some(p=>dateISO>=p.start&&dateISO<=(p.end||todayISO()))}
function predictedOn(dateISO){const pi=predictionInfo();if(!pi)return false;return pi.starts.some(s=>{const start=iso(s),end=iso(addDays(s,pi.duration-1));return dateISO>=start&&dateISO<=end})}
function nextPrediction(){const pi=predictionInfo();if(!pi)return null;const t=parse(todayISO());return pi.starts.find(s=>s>=t)||pi.starts[0]}
function periodRangeEnd(p){return p.end||'9999-12-31'}
function rangesOverlap(aStart,aEnd,bStart,bEnd){return aStart<=periodRangeEnd({end:bEnd})&&bStart<=periodRangeEnd({end:aEnd})}
function findOverlap(start,end,excludeId=null,periods=state.periods){return periods.find(p=>p.id!==excludeId&&rangesOverlap(start,end,p.start,p.end))||null}
function validatePeriodCollection(periods){
  const sorted=[...periods].sort((a,b)=>a.start.localeCompare(b.start));
  for(let i=0;i<sorted.length;i++){
    const p=sorted[i];
    if(p.end&&p.end<p.start)throw new Error('A period end date is before its start date.');
    if(i>0&&rangesOverlap(sorted[i-1].start,sorted[i-1].end,p.start,p.end))throw new Error('The backup contains overlapping period records.');
  }
  return true;
}

function renderAll(){renderToday();renderCalendar();renderInsights()}
function renderToday(){
  const t=new Date(),tiso=todayISO(),active=activePeriod(),pi=predictionInfo(),next=nextPrediction();
  document.getElementById('heroDate').textContent=fmtLong.format(t);
  if(active){
    const day=daysBetween(active.start,tiso)+1;
    document.getElementById('cycleTitle').textContent=`Period · Day ${Math.max(1,day)}`;
    document.getElementById('cycleSubtitle').textContent=next?`Next estimated period around ${fmtShort.format(next)}. Predictions remain estimates.`:'Add more history to see a prediction.';
    document.getElementById('periodAction').textContent='My period ended today';
  }else{
    const periods=[...state.periods].sort((a,b)=>a.start.localeCompare(b.start));
    const cycleDay=periods.length?daysBetween(periods.at(-1).start,tiso)+1:null;
    document.getElementById('cycleTitle').textContent=cycleDay?`Cycle Day ${cycleDay}`:'No cycle recorded';
    const until=next?daysBetween(tiso,iso(next)):null;
    document.getElementById('cycleSubtitle').textContent=next?`${until<=0?'Predicted period window is now':`Next period estimated in approximately ${until} day${until===1?'':'s'}`}.`:'Record a period start to begin.';
    document.getElementById('periodAction').textContent='My period started today';
  }
  document.getElementById('confidenceBadge').textContent=pi?`${pi.confidence} prediction · ${pi.cycle}-day estimate`:'Prediction unavailable';
  const grid=document.getElementById('symptomGrid');grid.innerHTML='';
  symptoms.forEach(([id,label])=>{
    const level=(state.symptoms[tiso]||{})[id]||0;
    const b=document.createElement('button');b.className='symptom'+(level?' active':'');
    b.setAttribute('aria-label',`${label}: ${severity[level]}. Tap to change severity.`);
    b.innerHTML=`<strong>${label}</strong><span>${severity[level]}${level?' · tap to change':''}</span>`;
    b.onclick=()=>{const old=JSON.stringify(state.symptoms[tiso]||{});state.symptoms[tiso]=state.symptoms[tiso]||{};state.symptoms[tiso][id]=(level+1)%4;if(state.symptoms[tiso][id]===0)delete state.symptoms[tiso][id];setUndo('Symptom updated',()=>{state.symptoms[tiso]=JSON.parse(old);save()});save()};
    grid.appendChild(b);
  });
  const severe=Object.values(state.symptoms[tiso]||{}).some(v=>v===3);document.getElementById('safetyCard').classList.toggle('hidden',!severe);
}
function renderCalendar(){
  document.getElementById('monthTitle').textContent=fmtMonth.format(monthCursor);
  const grid=document.getElementById('calendarGrid');grid.innerHTML='';
  const y=monthCursor.getFullYear(),m=monthCursor.getMonth(),first=new Date(y,m,1),offset=(first.getDay()+6)%7,start=addDays(first,-offset);
  for(let i=0;i<42;i++){
    const d=addDays(start,i),di=iso(d),btn=document.createElement('button'),isPeriod=periodOn(di),isPredicted=!isPeriod&&predictedOn(di),hasSymptoms=Boolean(state.symptoms[di]&&Object.keys(state.symptoms[di]).length);
    btn.className='day';
    if(d.getMonth()!==m)btn.classList.add('muted');
    if(di===todayISO())btn.classList.add('today');
    if(isPeriod)btn.classList.add('period');else if(isPredicted)btn.classList.add('predicted');
    const states=[];if(di===todayISO())states.push('today');if(isPeriod)states.push('confirmed period day');else if(isPredicted)states.push('predicted period day');else states.push('no period recorded');if(hasSymptoms)states.push('symptoms logged');
    btn.setAttribute('aria-label',`${fmtA11y.format(d)}, ${states.join(', ')}`);
    btn.innerHTML=`<span>${d.getDate()}</span>${hasSymptoms?'<i class="symdot" aria-hidden="true"></i>':''}`;
    btn.onclick=()=>openDaySheet(di);grid.appendChild(btn);
  }
  const timeline=document.getElementById('timeline');timeline.innerHTML='';
  const all=[...state.periods].sort((a,b)=>b.start.localeCompare(a.start)).slice(0,6);
  all.forEach(p=>{const b=document.createElement('button');b.className='segment';b.setAttribute('aria-label',`Open cycle starting ${fmtA11y.format(parse(p.start))}`);b.innerHTML=`<strong>${fmtShort.format(parse(p.start))}</strong><span>${p.end?`${daysBetween(p.start,p.end)+1} days`:'Active now'}</span>`;b.onclick=()=>openCycleSheet(p.id);timeline.appendChild(b)});
  const pi=predictionInfo();if(pi)pi.starts.slice(0,3).forEach(s=>{const div=document.createElement('div');div.className='segment';div.innerHTML=`<strong>${fmtShort.format(s)}</strong><span>Predicted</span>`;timeline.appendChild(div)});
  if(!timeline.children.length)timeline.innerHTML='<div class="empty">Your cycle history will appear here.</div>';
}
function renderInsights(){
  const lengths=cycleLengths(),durs=periodDurations(),pi=predictionInfo(),periods=[...state.periods].sort((a,b)=>a.start.localeCompare(b.start));
  const cards=[[pi?`${pi.cycle} days`:'—','Typical cycle'],[durs.length?`${Math.round(median(durs))} days`:`${state.profile.typicalPeriodDuration} days`,'Typical period'],[periods.length?fmtShort.format(parse(periods.at(-1).start)):'—','Last confirmed start'],[pi?pi.confidence:'—','Prediction confidence']];
  document.getElementById('metrics').innerHTML=cards.map(c=>`<div class="metric"><strong>${c[0]}</strong><span>${c[1]}</span></div>`).join('');
  const chart=document.getElementById('cycleChart');chart.innerHTML='';
  if(lengths.length){const max=Math.max(35,...lengths);lengths.forEach(n=>{const w=document.createElement('div');w.className='barwrap';w.innerHTML=`<div class="bar" style="height:${Math.max(12,n/max*120)}px" role="img" aria-label="Cycle length ${n} days"></div><small>${n}d</small>`;chart.appendChild(w)})}
  else chart.innerHTML='<div class="empty">Complete three cycles to see your trend. The current estimate uses your Settings value.</div>';
  const counts={};Object.values(state.symptoms).forEach(day=>Object.keys(day).forEach(k=>counts[k]=(counts[k]||0)+1));
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4);
  document.getElementById('topSymptoms').innerHTML=top.length?top.map(([k,n])=>`<div class="row"><span>${symptomLabel(k)}</span><strong>${n} day${n===1?'':'s'}</strong></div>`).join(''):'<div class="empty">Your symptom patterns will appear here.</div>';
}

function setUndo(text,fn){undoAction=fn;document.getElementById('toastText').textContent=text;document.getElementById('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{document.getElementById('toast').classList.remove('show');undoAction=null},5000)}
document.getElementById('undoBtn').onclick=()=>{if(undoAction)undoAction();undoAction=null;document.getElementById('toast').classList.remove('show')};
document.getElementById('periodAction').onclick=()=>{
  const t=todayISO(),active=activePeriod(),old=JSON.stringify(state.periods);
  if(active){if(t<active.start){alert('The end date cannot be before the start date.');return}active.end=t;setUndo('Period ended',()=>{state.periods=JSON.parse(old);save()})}
  else{const conflict=findOverlap(t,null);if(conflict){alert(`This period would overlap the cycle starting ${conflict.start}. Edit or delete the existing cycle first.`);return}state.periods.push({id:uid(),start:t,end:null,source:'manual'});setUndo('Period started',()=>{state.periods=JSON.parse(old);save()})}
  save();
};
document.getElementById('clearSymptomsBtn').onclick=()=>{const t=todayISO(),old=JSON.stringify(state.symptoms[t]||{});state.symptoms[t]={};setUndo('Today’s symptoms cleared',()=>{state.symptoms[t]=JSON.parse(old);save()});save()};
document.getElementById('changeDatesBtn').onclick=openDateSheet;
document.getElementById('flowBtn').onclick=openFlowSheet;
document.getElementById('noteBtn').onclick=()=>openNoteSheet(todayISO());
document.getElementById('prevMonth').onclick=()=>{monthCursor=addMonths(monthCursor,-1);renderCalendar()};
document.getElementById('nextMonth').onclick=()=>{monthCursor=addMonths(monthCursor,1);renderCalendar()};
document.getElementById('todayMonth').onclick=()=>{monthCursor=startOfMonth(new Date());renderCalendar()};
document.querySelectorAll('.tabbar button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabbar button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(`${b.dataset.tab}View`).classList.add('active')});
