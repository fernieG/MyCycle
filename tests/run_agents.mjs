import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const index=read('index.html');
const core=read('app-core.js');
const ui=read('app-ui.js');
const data=read('app-data.js');
const css=read('styles.css');
const sw=read('service-worker.js');
const checks=[];
const check=(name,condition,detail='')=>checks.push([name,Boolean(condition),detail]);

check('v4 asset cache-busting',['app-core.js?v=4','app-ui.js?v=4','app-data.js?v=4','styles.css?v=4'].every(x=>index.includes(x)));
check('single-screen shell',index.includes('class="single-screen"')&&!index.includes('class="tabbar"'));
check('collapsible sections',['symptomsPanel','calendarPanel','historyPanel'].every(id=>index.includes('id="'+id+'"')));
check('selected-date inline logging',core.includes('selectedDate=renderedDay')&&core.includes('function selectDate(di)')&&core.includes('makeSymptomButton(selectedDate,id,label)'));
check('calendar selects active day',core.includes('btn.onclick=()=>selectDate(di)'));
check('no cycle deletion control',!ui.includes('deleteCycle(')&&!ui.includes('Delete this cycle'));
check('day-detail undo',ui.includes("setUndo('Day details removed'"));
check('flow-clear undo',ui.includes("setUndo('Flow cleared'"));
check('note-delete undo',ui.includes("setUndo('Note removed'"));
check('CSV import accepted',index.includes('text/csv')&&index.includes('.csv')&&data.includes('stateFromCSV')&&data.includes('openCSVRestore'));
check('custom symptoms',ui.includes('openCustomSymptomSheet(di)')&&ui.includes('custom:'+String.fromCharCode(36)+'{name}'));
check('DST-safe day math',core.includes('Date.UTC')&&core.includes('function dayOrdinal'));
check('day rollover refresh',core.includes('refreshForDeviceDate')&&core.includes('visibilitychange')&&core.includes('setInterval(refreshForDeviceDate,60000)'));
check('calendar pain markers',core.includes('pain-dots')&&css.includes('pain-dots'));
check('insight symptom trend',core.includes('renderSymptomTrend')&&index.includes('symptomTrend')&&css.includes('trend-line'));
check('encrypted backup retained',data.includes('PBKDF2')&&data.includes('AES-GCM'));
check('local-only no outbound runtime APIs',!/(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/.test(core+ui+data));
check('PWA cache v4',sw.includes('my-cycle-v4')&&sw.includes('?v=4'));

for(const js of ['app-core.js','app-ui.js','app-data.js','service-worker.js']){
  const result=spawnSync(process.execPath,['--check',path.join(root,js)],{encoding:'utf8'});
  check('JavaScript syntax '+js,result.status===0,(result.stderr||'').trim());
}
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok,detail] of checks) console.log((ok?'PASS':'FAIL')+' - '+name+(detail?' '+detail:''));
console.log('\n'+(checks.length-failed.length)+'/'+checks.length+' checks passed');
process.exit(failed.length?1:0);
