from pathlib import Path
import re, json, subprocess, sys
root=Path(__file__).resolve().parent.parent
checks=[]
def check(name, cond, detail=''):
    checks.append((name,bool(cond),detail))

index=(root/'index.html').read_text()
core=(root/'app-core.js').read_text()
ui=(root/'app-ui.js').read_text()
data=(root/'app-data.js').read_text()
css=(root/'styles.css').read_text()
sw=(root/'service-worker.js').read_text()
check('v3 asset cache-busting', all(x in index for x in ['app-core.js?v=3','app-ui.js?v=3','app-data.js?v=3','styles.css?v=3']))
check('CSV import accepted', 'text/csv' in index and '.csv' in index and 'stateFromCSV' in data and 'openCSVRestore' in data)
check('selected-date symptom editing', 'openSymptomsForDate(di)' in ui and 'editDaySymptoms' in ui)
check('selected-date flow editing', 'openFlowSheet(di=todayISO())' in ui and 'editDayFlow' in ui)
check('custom symptoms', 'openCustomSymptomSheet(di)' in ui and "custom:${name}" in ui)
check('DST-safe day math', 'Date.UTC' in core and 'function dayOrdinal' in core)
check('day rollover refresh', 'refreshForDeviceDate' in core and 'visibilitychange' in core and "setInterval(refreshForDeviceDate,60000)" in core)
check('calendar pain markers', 'pain-dots' in core and 'pain-dots' in css)
check('insight symptom trend', 'renderSymptomTrend' in core and 'symptomTrend' in index and 'trend-line' in css)
check('encrypted backup retained', "PBKDF2" in data and "AES-GCM" in data)
check('local-only no outbound runtime APIs', not re.search(r'\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(', core+ui+data))
check('PWA cache v3', "my-cycle-v3" in sw and "?v=3" in sw)
for js in ['app-core.js','app-ui.js','app-data.js','service-worker.js']:
    p=subprocess.run(['node','--check',str(root/js)],capture_output=True,text=True)
    check(f'JavaScript syntax {js}',p.returncode==0,p.stderr.strip())
failed=[x for x in checks if not x[1]]
for name,ok,detail in checks:
    print(('PASS' if ok else 'FAIL'),'-',name,detail)
print(f'\n{len(checks)-len(failed)}/{len(checks)} checks passed')
sys.exit(1 if failed else 0)
