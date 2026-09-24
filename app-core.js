const KEY='myCyclePrototype_v1';
const BACKUP_FORMAT='my-cycle-encrypted-backup';
const BACKUP_ITERATIONS=210000;
const fmtLong=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'});
const fmtA11y=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const fmtMonth=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'});
const fmtShort=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'});
const symptoms=[
  ['bleeding','Bleeding'],['breast','Breast pain'],['pelvic','Pelvic pain'],['right','Right-sided pain'],['left','Left-sided pain'],
  ['back','Lower-back pain'],['thigh','Thigh or leg pain'],['fatigue','Fatigue'],['nausea','Nausea'],['bloating','Bloating'],
  ['constipation','Constipation'],['diarrhoea','Diarrhea'],['urinary','Urinary discomfort'],['headache','Headache'],
  ['hotflash','Hot flashes / night heat'],['other','Other · add manually']
];
const PAIN_IDS=new Set(['breast','pelvic','right','left','back','thigh','headache']);
const FLOW_LEVEL={Spotting:1,Light:1,Medium:2,Heavy:3};
const severity=['Not logged','Mild','Moderate','Severe'];
let state=loadState();
let monthCursor=startOfMonth(new Date());
let undoAction=null,toastTimer=null,pendingRestore=null;
let renderedDay=todayISO(),selectedDate=renderedDay;

function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function parse(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function dayOrdinal(s){const [y,m,d]=String(s).split('-').map(Number);return Math.floor(Date.UTC(y,m-1,d)/86400000)}
function daysBetween(a,b){return dayOrdinal(b)-dayOrdinal(a)}
function startOfMonth(d){return new Date(d.getFullYear(),d.getMonth(),1)}
function todayISO(){return iso(new Date())}
function uid(){return Math.random().toString(36).slice(2,10)}
function median(values){if(!values.length)return null;const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function addMonths(d,n){const x=new Date(d);x.setMonth(x.getMonth()+n);return x}
function clone(v){return JSON.parse(JSON.stringify(v))}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function symptomLabel(id){if(String(id).startsWith('custom:'))return String(id).slice(7);return symptoms.find(([key])=>key===id)?.[1]||id}
function symptomIdFromLabel(label){
  const raw=String(label||'').trim(),lower=raw.toLowerCase();
  const aliases={
    'bleeding':'bleeding','heavy bleeding':'bleeding','breast pain':'breast','pelvic pain':'pelvic','right-sided pain':'right','right sided pain':'right',
    'left-sided pain':'left','left sided pain':'left','lower-back pain':'back','lower back pain':'back','thigh or leg pain':'thigh','fatigue':'fatigue',
    'nausea':'nausea','bloating':'bloating','constipation':'constipation','diarrhoea':'diarrhoea','diarrhea':'diarrhoea','urinary discomfort':'urinary','headache':'headache',
    'hot flashes':'hotflash','hot flash':'hotflash','night heat':'hotflash','night sweats':'hotflash','hot flashes / night heat':'hotflash',
    'pelvic':'pelvic','right':'right','left':'left','back':'back','thigh':'thigh','urinary':'urinary','heavy':'bleeding'
  };
  if(aliases[lower])return aliases[lower];
  if(symptoms.some(([id])=>id===raw))return raw;
  return `custom:${raw || 'Other'}`;
}
function severityFromText(value){const s=String(value||'').trim().toLowerCase();if(/^\d+$/.test(s))return Math.max(0,Math.min(3,Number(s)));const i=severity.findIndex(x=>x.toLowerCase()===s);return i>=0?i:1}
function painLevelForDate(di){const day=state.symptoms[di]||{};return Math.max(0,...Object.entries(day).filter(([id])=>PAIN_IDS.has(id)).map(([,level])=>Number(level)||0))}
function symptomCountForDate(di){return Object.keys(state.symptoms[di]||{}).length}
function customSymptomsForDate(di){return Object.entries(state.symptoms[di]||{}).filter(([id])=>id.startsWith('custom:'))}

function defaultState(){
  const t=todayISO();
  return {version:4,profile:{typicalCycleLength:28,typicalPeriodDuration:5},periods:[{id:uid(),start:t,end:null,endKnown:true,source:'prototype setup'}],symptoms:{[t]:{pelvic:2,right:2,back:2}},flows:{[t]:'Medium'},notes:{},lastBackup:null,created:t};
}
function normalizeState(raw){
  const fallback=defaultState(),input=raw&&typeof raw==='object'?raw:{};
  const profile=input.profile&&typeof input.profile==='object'?input.profile:{};
  const periods=Array.isArray(input.periods)?input.periods.filter(p=>p&&/^\d{4}-\d{2}-\d{2}$/.test(p.start||'')).map(p=>({id:String(p.id||uid()),start:p.start,end:p.end||null,endKnown:p.endKnown!==false,source:p.source||'manual'})):fallback.periods;
  return {
    version:4,
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
function completedPeriods(){return state.periods.filter(p=>p.end&&p.endKnown!==false).sort((a,b)=>a.start.localeCompare(b.start))}
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
function setSymptomLevel(di,id,level){
  state.symptoms[di]=state.symptoms[di]||{};
  if(level<=0)delete state.symptoms[di][id];else state.symptoms[di][id]=level;
  if(!Object.keys(state.symptoms[di]).length)delete state.symptoms[di];
  save();
}
function makeSymptomButton(di,id,label){
  if(id==='bleeding'){
    const current=state.flows[di]||'Not logged',b=document.createElement('button');b.className='symptom'+(state.flows[di]?' active':'');
    b.setAttribute('aria-label',`Bleeding: ${current}. Tap to change flow.`);b.innerHTML=`<strong>${label}</strong><span>${current}${state.flows[di]?' · tap to change':''}</span>`;b.onclick=()=>openFlowSheet(di);return b;
  }
  if(id==='other'){
    const custom=customSymptomsForDate(di),b=document.createElement('button');b.className='symptom'+(custom.length?' active':'');
    b.setAttribute('aria-label',`Other symptoms: ${custom.length} recorded. Tap to add manually.`);b.innerHTML=`<strong>${label}</strong><span>${custom.length?`${custom.length} logged · tap to add`:'Not logged'}</span>`;b.onclick=()=>openCustomSymptomSheet(di);return b;
  }
  const level=(state.symptoms[di]||{})[id]||0,b=document.createElement('button');b.className='symptom'+(level?' active':'');
  b.setAttribute('aria-label',`${label}: ${severity[level]}. Tap to change severity.`);b.innerHTML=`<strong>${label}</strong><span>${severity[level]}${level?' · tap to change':''}</span>`;
  b.onclick=()=>{const old=JSON.stringify(state.symptoms[di]||{});state.symptoms[di]=state.symptoms[di]||{};state.symptoms[di][id]=(level+1)%4;if(state.symptoms[di][id]===0)delete state.symptoms[di][id];setUndo('Symptom updated',()=>{state.symptoms[di]=JSON.parse(old);save()});save();if(backdrop?.classList.contains('open'))openSymptomsForDate(di)};return b;
}
function selectDate(di){
  selectedDate=di;
  renderToday();
  renderCalendar();
  const panel=document.getElementById('symptomsPanel');
  if(panel){panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'start'})}
}
function renderToday(){
  const t=new Date(),tiso=todayISO(),active=activePeriod(),pi=predictionInfo(),next=nextPrediction();
  document.getElementById('heroDate').textContent=fmtLong.format(t);
  if(active){
    const day=daysBetween(active.start,tiso)+1;
    document.getElementById('cycleTitle').textContent=`Period · Day ${Math.max(1,day)}`;
    document.getElementById('cycleSubtitle').textContent=`Started ${fmtShort.format(parse(active.start))} · device date ${fmtShort.format(parse(tiso))}. ${next?`Next estimate around ${fmtShort.format(next)}.`:'Add more history to improve predictions.'}`;
    document.getElementById('periodAction').textContent='My period ended today';
  }else{
    const periods=[...state.periods].sort((a,b)=>a.start.localeCompare(b.start)),cycleDay=periods.length?daysBetween(periods.at(-1).start,tiso)+1:null;
    document.getElementById('cycleTitle').textContent=cycleDay?`Cycle Day ${cycleDay}`:'No cycle recorded';
    const until=next?daysBetween(tiso,iso(next)):null;document.getElementById('cycleSubtitle').textContent=next?`${until<=0?'Predicted period window is now':`Next period estimated in approximately ${until} day${until===1?'':'s'}`}.`:'Record a period start to begin.';
    document.getElementById('periodAction').textContent='My period started today';
  }
  document.getElementById('confidenceBadge').textContent=pi?`${pi.confidence} prediction · ${pi.cycle}-day estimate`:'Prediction unavailable';
  const selectedLabel=selectedDate===tiso?`Today · ${fmtLong.format(parse(selectedDate))}`:fmtLong.format(parse(selectedDate));
  document.getElementById('selectedDateLabel').textContent=selectedLabel;
  document.getElementById('flowBtn').textContent=state.flows[selectedDate]?'Change flow':'Log flow';
  document.getElementById('noteBtn').textContent=state.notes[selectedDate]?'Edit private note':'Add a private note';
  const grid=document.getElementById('symptomGrid');grid.innerHTML='';symptoms.forEach(([id,label])=>grid.appendChild(makeSymptomButton(selectedDate,id,label)));
  const severe=painLevelForDate(selectedDate)===3;document.getElementById('safetyCard').classList.toggle('hidden',!severe);
}
function renderCalendar(){
  document.getElementById('monthTitle').textContent=fmtMonth.format(monthCursor);
  const grid=document.getElementById('calendarGrid');grid.innerHTML='';
  const y=monthCursor.getFullYear(),m=monthCursor.getMonth(),first=new Date(y,m,1),offset=(first.getDay()+6)%7,start=addDays(first,-offset);
  for(let i=0;i<42;i++){
    const d=addDays(start,i),di=iso(d),btn=document.createElement('button'),isPeriod=periodOn(di),isPredicted=!isPeriod&&predictedOn(di),pain=painLevelForDate(di),count=symptomCountForDate(di),hasFlow=Boolean(state.flows[di]);
    btn.className='day';if(d.getMonth()!==m)btn.classList.add('muted');if(di===todayISO())btn.classList.add('today');if(di===selectedDate)btn.classList.add('selected');if(isPeriod)btn.classList.add('period');else if(isPredicted)btn.classList.add('predicted');
    const states=[];if(di===todayISO())states.push('today');if(isPeriod)states.push('confirmed period day');else if(isPredicted)states.push('predicted period day');else states.push('no period recorded');if(pain)states.push(`${severity[pain]} pain`);if(count)states.push(`${count} symptom${count===1?'':'s'} logged`);if(hasFlow)states.push(`${state.flows[di]} bleeding`);
    btn.setAttribute('aria-label',`${fmtA11y.format(d)}, ${states.join(', ')}`);
    const painDots=pain?`<span class="pain-dots" aria-hidden="true">${'<i></i>'.repeat(pain)}</span>`:'';const other=(count&&!pain)?'<i class="other-symptom-dot" aria-hidden="true"></i>':'';
    btn.innerHTML=`<span>${d.getDate()}</span>${painDots}${other}`;btn.onclick=()=>selectDate(di);grid.appendChild(btn);
  }
  const timeline=document.getElementById('timeline');timeline.innerHTML='';const all=[...state.periods].sort((a,b)=>b.start.localeCompare(a.start)).slice(0,6);
  all.forEach(p=>{const b=document.createElement('button');b.className='segment';b.setAttribute('aria-label',`Open cycle starting ${fmtA11y.format(parse(p.start))}`);b.innerHTML=`<strong>${fmtShort.format(parse(p.start))}</strong><span>${p.end?`${daysBetween(p.start,p.end)+1} days`:'Active now'}</span>`;b.onclick=()=>openCycleSheet(p.id);timeline.appendChild(b)});
  const pi=predictionInfo();if(pi)pi.starts.slice(0,3).forEach(s=>{const div=document.createElement('div');div.className='segment';div.innerHTML=`<strong>${fmtShort.format(s)}</strong><span>Predicted</span>`;timeline.appendChild(div)});if(!timeline.children.length)timeline.innerHTML='<div class="empty">Your cycle history will appear here.</div>';
}
function renderInsights(){
  const lengths=cycleLengths(),durs=periodDurations(),pi=predictionInfo(),periods=[...state.periods].sort((a,b)=>a.start.localeCompare(b.start));
  const cards=[[pi?`${pi.cycle} days`:'—','Typical cycle'],[durs.length?`${Math.round(median(durs))} days`:`${state.profile.typicalPeriodDuration} days`,'Typical period'],[periods.length?fmtShort.format(parse(periods.at(-1).start)):'—','Last confirmed start'],[pi?pi.confidence:'—','Prediction confidence']];
  document.getElementById('metrics').innerHTML=cards.map(c=>`<div class="metric"><strong>${c[0]}</strong><span>${c[1]}</span></div>`).join('');
  const chart=document.getElementById('cycleChart');chart.innerHTML='';if(lengths.length){const max=Math.max(35,...lengths);lengths.forEach(n=>{const w=document.createElement('div');w.className='barwrap';w.innerHTML=`<div class="bar" style="height:${Math.max(12,n/max*120)}px" role="img" aria-label="Cycle length ${n} days"></div><small>${n}d</small>`;chart.appendChild(w)})}else chart.innerHTML='<div class="empty">Complete more cycles to see your cycle-length trend. The current estimate uses your Settings value.</div>';
  renderSymptomTrend();
  const counts={};Object.values(state.symptoms).forEach(day=>Object.keys(day).forEach(k=>counts[k]=(counts[k]||0)+1));Object.keys(state.flows).forEach(()=>counts.bleeding=(counts.bleeding||0)+1);
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);document.getElementById('topSymptoms').innerHTML=top.length?top.map(([k,n])=>`<div class="row"><span>${symptomLabel(k)}</span><strong>${n} day${n===1?'':'s'}</strong></div>`).join(''):'<div class="empty">Your symptom patterns will appear here.</div>';
}
function renderSymptomTrend(){
  const box=document.getElementById('symptomTrend');if(!box)return;const periods=[...state.periods].sort((a,b)=>a.start.localeCompare(b.start));if(!periods.length){box.innerHTML='<div class="empty">Record a cycle to see symptoms by cycle day.</div>';return}
  const start=periods.at(-1).start,last=Math.max(1,Math.min(35,daysBetween(start,todayISO())+1)),W=460,H=175,padL=34,padR=12,padT=12,padB=28,plotW=W-padL-padR,plotH=H-padT-padB;
  const x=day=>padL+(Math.max(1,day)-1)/Math.max(1,last-1)*plotW,y=level=>padT+(3-level)/3*plotH;let pts=[],flow='';
  for(let day=1;day<=last;day++){const di=iso(addDays(parse(start),day-1)),pain=painLevelForDate(di),count=symptomCountForDate(di),fl=state.flows[di];pts.push(`${x(day)},${y(pain)}`);if(fl)flow+=`<rect class="trend-flow" x="${x(day)-3}" y="${H-padB+5}" width="6" height="${4+FLOW_LEVEL[fl]*3}" rx="2"><title>Cycle day ${day}: ${fl} bleeding</title></rect>`;}
  const labels=[0,1,2,3].map(v=>`<text class="trend-label" x="2" y="${y(v)+3}">${v===0?'none':severity[v]}</text>`).join(''),grid=[0,1,2,3].map(v=>`<line class="trend-grid" x1="${padL}" x2="${W-padR}" y1="${y(v)}" y2="${y(v)}"/>`).join('');let dots='';
  for(let day=1;day<=last;day++){const di=iso(addDays(parse(start),day-1)),pain=painLevelForDate(di),count=symptomCountForDate(di);if(pain||count)dots+=`<circle class="trend-point" cx="${x(day)}" cy="${y(pain)}" r="${Math.min(6,3+count*.45)}"><title>Cycle day ${day}: ${severity[pain]||'No pain'}, ${count} symptom${count===1?'':'s'}</title></circle>`;}
  const xlabels=[1,Math.ceil(last/2),last].filter((v,i,a)=>a.indexOf(v)===i).map(day=>`<text class="trend-label" text-anchor="middle" x="${x(day)}" y="${H-5}">Day ${day}</text>`).join('');box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pain severity and symptom count across the current cycle">${grid}${labels}<polyline class="trend-line" points="${pts.join(' ')}"/>${dots}${flow}${xlabels}</svg><div class="smallprint">Line = highest pain level recorded that day. Point size = number of symptoms. Small blocks below = bleeding/flow entries.</div>`;
}

function setUndo(text,fn){undoAction=fn;document.getElementById('toastText').textContent=text;document.getElementById('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{document.getElementById('toast').classList.remove('show');undoAction=null},5000)}
document.getElementById('undoBtn').onclick=()=>{if(undoAction)undoAction();undoAction=null;document.getElementById('toast').classList.remove('show')};
document.getElementById('periodAction').onclick=()=>{
  const t=todayISO(),active=activePeriod(),old=JSON.stringify(state.periods);
  if(active){if(t<active.start){alert('The end date cannot be before the start date.');return}active.end=t;setUndo('Period ended',()=>{state.periods=JSON.parse(old);save()})}
  else{const conflict=findOverlap(t,null);if(conflict){alert(`This period would overlap the cycle starting ${conflict.start}. Edit the existing cycle dates first.`);return}state.periods.push({id:uid(),start:t,end:null,endKnown:true,source:'manual'});setUndo('Period started',()=>{state.periods=JSON.parse(old);save()})}
  save();
};
document.getElementById('clearSymptomsBtn').onclick=()=>{const t=selectedDate,old=JSON.stringify(state.symptoms[t]||{});delete state.symptoms[t];setUndo('Symptoms cleared',()=>{state.symptoms[t]=JSON.parse(old);save()});save()};
document.getElementById('changeDatesBtn').onclick=()=>openDateSheet();
document.getElementById('flowBtn').onclick=()=>openFlowSheet(selectedDate);
document.getElementById('noteBtn').onclick=()=>openNoteSheet(selectedDate);
document.getElementById('prevMonth').onclick=()=>{monthCursor=addMonths(monthCursor,-1);renderCalendar()};
document.getElementById('nextMonth').onclick=()=>{monthCursor=addMonths(monthCursor,1);renderCalendar()};
document.getElementById('todayMonth').onclick=()=>{monthCursor=startOfMonth(new Date());renderCalendar()};
function refreshForDeviceDate(){const now=todayISO();if(now!==renderedDay){if(selectedDate===renderedDay)selectedDate=now;renderedDay=now;monthCursor=startOfMonth(new Date());renderAll()}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshForDeviceDate()});
window.addEventListener('focus',refreshForDeviceDate);
setInterval(refreshForDeviceDate,60000);
