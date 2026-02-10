/* Keirin win-pattern tracker - single device storage */
const LS_KEY="keirin_race_app_v1", LS_DAILY="keirin_daily_check_v1";
const CHECKS_DEF=[
{key:"wake",label:"今朝の目覚め",a:"スッと",b:"普通",c:"重い"},
{key:"body",label:"体の重さ",a:"軽い",b:"普通",c:"重い"},
{key:"meal",label:"食後の感じ",a:"良好",b:"少し重い",c:"違和感"},
{key:"core",label:"脚・体幹の反応",a:"良い",b:"普通",c:"鈍い"},
{key:"mind",label:"頭の中",a:"クリア",b:"少し雑念",c:"まとまらない"},
{key:"img",label:"レースイメージ",a:"明確",b:"ぼんやり",c:"描けない"},
{key:"prep",label:"準備の流れ",a:"いつも通り",b:"少しズレ",c:"崩れた"},
{key:"feel",label:"スタート前の気持ち",a:"落ち着き",b:"少し緊張",c:"力み"},
];
const $=id=>document.getElementById(id);
function toast(msg="保存しました"){const t=$("toast"); if(!t) return; t.textContent=msg; t.style.display="block"; clearTimeout(toast._t); toast._t=setTimeout(()=>t.style.display="none",1200);}
function uid(){return "R"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function loadState(){try{const raw=localStorage.getItem(LS_KEY);const races=raw?JSON.parse(raw):[];return {races:Array.isArray(races)?races:[]};}catch(e){return {races:[]};}}
function saveState(races){localStorage.setItem(LS_KEY,JSON.stringify(races)); refreshAll();}
function loadDaily(){try{const raw=localStorage.getItem(LS_DAILY);return raw?JSON.parse(raw):null;}catch(e){return null;}}
function saveDaily(obj){localStorage.setItem(LS_DAILY,JSON.stringify(obj));}
function calcScore(checks){let s=0; for(const c of CHECKS_DEF){const v=Number(checks?.[c.key]??0); if([0,1,2].includes(v)) s+=v;} return s;}
function judgeFromScore(score){if(score>=13) return "攻めてOK"; if(score>=9) return "普通"; return "無理しない";}
function esc(str){return String(str??"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s]));}
function setVal(id,v){const el=$(id); if(el) el.value=(v??"");}
function getVal(id){const el=$(id); return el?el.value:"";}
let state=loadState(); let editId=null;
const tabs=document.querySelectorAll(".tab");
tabs.forEach(t=>t.addEventListener("click",()=>switchTab(t.dataset.tab)));
function switchTab(name){
  tabs.forEach(t=>t.classList.toggle("active",t.dataset.tab===name));
  document.querySelectorAll("main > section").forEach(s=>s.classList.add("hide"));
  $("printSheet").classList.add("hide");
  const el=$("tab-"+name); if(el) el.classList.remove("hide");
  if(name==="new") loadEditor(null);
  if(name==="list") renderList();
  if(name==="pattern") renderPattern();
  if(name==="coach") renderCoach();
  if(name==="data") renderData();
  if(name==="home") renderHome();
}
function buildCheckGrid(container,model){
  container.innerHTML="";
  for(const c of CHECKS_DEF){
    const wrap=document.createElement("div");
    wrap.className="checkItem";
    wrap.innerHTML=`<div class="q">${c.label}</div>
    <div class="choice">
      <div class="chip" data-k="${c.key}" data-v="2">◎ ${c.a}</div>
      <div class="chip" data-k="${c.key}" data-v="1">○ ${c.b}</div>
      <div class="chip" data-k="${c.key}" data-v="0">△ ${c.c}</div>
    </div>`;
    container.appendChild(wrap);
  }
  const update=()=>container.querySelectorAll(".chip").forEach(ch=>{
    const k=ch.dataset.k, v=Number(ch.dataset.v);
    ch.classList.toggle("active", Number(model.checks?.[k]??0)===v);
  });
  container.onclick=(e)=>{
    const chip=e.target.closest(".chip"); if(!chip) return;
    const k=chip.dataset.k, v=Number(chip.dataset.v);
    model.checks=model.checks||{}; model.checks[k]=v; update();
    model.score=calcScore(model.checks); model.judge=judgeFromScore(model.score);
    model.onChange && model.onChange(model);
  };
  update();
}
const homeModel={checks:{},score:0,judge:"—",onChange:()=>{
  $("homeScore").textContent=homeModel.score; $("homeJudge").textContent=homeModel.judge;
}};
function renderHome(){
  const d=loadDaily();
  homeModel.checks=d?.checks||homeModel.checks||{};
  homeModel.score=calcScore(homeModel.checks); homeModel.judge=judgeFromScore(homeModel.score);
  buildCheckGrid($("homeChecks"),homeModel); homeModel.onChange();
  $("btnSaveDaily").onclick=()=>{saveDaily({checks:homeModel.checks,score:homeModel.score,judge:homeModel.judge,savedAt:new Date().toISOString()}); toast("保存しました");};
  $("btnResetDaily").onclick=()=>{homeModel.checks={}; homeModel.score=0; homeModel.judge="—"; saveDaily({checks:{},score:0,judge:"—"}); renderHome(); toast("リセットしました");};
  $("goNew").onclick=()=>switchTab("new");
  $("goPattern").onclick=()=>switchTab("pattern");
  $("goCoach").onclick=()=>switchTab("coach");
  renderRecent();
  setupInstallButton();
}
function renderRecent(){
  const body=$("recentBody");
  const races=[...state.races].sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0)).slice(0,5);
  body.innerHTML="";
  if(!races.length){body.innerHTML=`<tr><td colspan="7" class="muted">まだデータがありません。「＋新規レース」から登録してください。</td></tr>`; return;}
  for(const r of races){
    body.insertAdjacentHTML("beforeend",`<tr data-id="${r.id}" style="cursor:pointer">
      <td>${esc(r.date||"")}</td><td>${esc(r.place||"")}</td><td>${esc(r.level||"")}</td>
      <td class="right">${r.score??0}</td><td>${esc(r.attack||"")}</td>
      <td class="right">${esc(String(r.pos?.pfb??""))}</td><td class="right">${esc(String(r.rank??""))}</td>
    </tr>`);
  }
  body.onclick=(e)=>{const tr=e.target.closest("tr"); if(!tr?.dataset?.id) return; loadEditor(tr.dataset.id); switchTab("new");};
}
const raceModel={checks:{},score:0,judge:"—",onChange:()=>{}};
function loadEditor(id){
  editId=id;
  const isNew=!id;
  $("editTitle").textContent=isNew?"新規レース登録":"レース編集";
  $("btnDeleteRace").style.display=isNew?"none":"inline-block";
  let r=isNew?null:state.races.find(x=>x.id===id);
  if(!r){
    r={id:uid(),date:new Date().toISOString().slice(0,10),place:"",bank:"",level:"",weather:"",wind:"",temp:"",field:"",
       checks:{},score:0,judge:"—",pos:{p3:"",p2:"",p15:"",p1:"",pfb:""},attack:"",lead:"",plan:"",hes:"",waste:"",
       rank:"",line:"",self:"",next:"",note:"",createdAt:Date.now(),updatedAt:Date.now()};
  }
  raceModel._race=r;
  raceModel.checks=r.checks||{};
  raceModel.score=calcScore(raceModel.checks); raceModel.judge=judgeFromScore(raceModel.score);
  raceModel.onChange=()=>{$("raceScore").textContent=raceModel.score; $("raceJudge").textContent=raceModel.judge;};
  setVal("r_date",r.date); setVal("r_place",r.place); setVal("r_bank",r.bank); setVal("r_level",r.level);
  setVal("r_weather",r.weather); setVal("r_wind",r.wind); setVal("r_temp",r.temp); setVal("r_field",r.field);
  setVal("p_3",r.pos?.p3??""); setVal("p_2",r.pos?.p2??""); setVal("p_15",r.pos?.p15??""); setVal("p_1",r.pos?.p1??""); setVal("p_fb",r.pos?.pfb??"");
  setVal("r_attack",r.attack); setVal("r_lead",r.lead); setVal("r_plan",r.plan); setVal("r_hes",r.hes); setVal("r_waste",r.waste);
  setVal("r_rank",r.rank); setVal("r_line",r.line); setVal("r_self",r.self); setVal("r_next",r.next); setVal("r_note",r.note);
  buildCheckGrid($("raceChecks"),raceModel); raceModel.onChange();
  $("btnUseDaily").onclick=()=>{const d=loadDaily(); if(!d?.checks){alert("今日の整いチェックがありません。ホームでチェックして保存してください（任意）。"); return;}
    raceModel.checks={...d.checks}; raceModel.score=calcScore(raceModel.checks); raceModel.judge=judgeFromScore(raceModel.score);
    buildCheckGrid($("raceChecks"),raceModel); raceModel.onChange();
  };
  $("btnSaveRace").onclick=()=>{const saved=collectRaceFromForm(raceModel._race); upsertRace(saved,isNew,id); toast("保存しました"); switchTab("home");};
  $("btnDeleteRace").onclick=()=>{if(!confirm("このレースを削除しますか？")) return; state.races=state.races.filter(x=>x.id!==id); saveState(state.races); toast("削除しました"); switchTab("home");};
  $("btnDupRace").onclick=()=>{const base=collectRaceFromForm(raceModel._race); const copy={...base,id:uid(),createdAt:Date.now(),updatedAt:Date.now()}; state.races.push(copy); saveState(state.races); toast("複製して保存しました"); switchTab("home");};
  $("btnPrintOne").onclick=()=>{const rnow=collectRaceFromForm(raceModel._race); renderPrintSheet(rnow); document.querySelectorAll("main > section").forEach(s=>s.classList.add("hide"));
    $("printSheet").classList.remove("hide"); window.print(); $("printSheet").classList.add("hide"); $("tab-new").classList.remove("hide");
  };
}
function collectRaceFromForm(target){
  const r=JSON.parse(JSON.stringify(target));
  r.date=getVal("r_date"); r.place=getVal("r_place"); r.bank=getVal("r_bank"); r.level=getVal("r_level");
  r.weather=getVal("r_weather"); r.wind=getVal("r_wind"); r.temp=getVal("r_temp"); r.field=getVal("r_field");
  r.checks={...raceModel.checks}; r.score=calcScore(r.checks); r.judge=judgeFromScore(r.score);
  r.pos={p3:getVal("p_3"),p2:getVal("p_2"),p15:getVal("p_15"),p1:getVal("p_1"),pfb:getVal("p_fb")};
  r.attack=getVal("r_attack"); r.lead=getVal("r_lead"); r.plan=getVal("r_plan"); r.hes=getVal("r_hes"); r.waste=getVal("r_waste");
  r.rank=getVal("r_rank"); r.line=getVal("r_line"); r.self=getVal("r_self"); r.next=getVal("r_next"); r.note=getVal("r_note");
  r.updatedAt=Date.now(); if(!r.createdAt) r.createdAt=Date.now();
  return r;
}
function upsertRace(race,isNew,oldId){
  if(isNew) state.races.push(race);
  else{const idx=state.races.findIndex(x=>x.id===oldId); if(idx>=0) state.races[idx]=race; else state.races.push(race);}
  saveState(state.races);
}
function renderList(){
  const body=$("listBody");
  const q=(($("q").value||"").trim().toLowerCase());
  const rows=[...state.races].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const filtered=q?rows.filter(r=>(r.place||"").toLowerCase().includes(q)||(r.level||"").toLowerCase().includes(q)||(r.note||"").toLowerCase().includes(q)):rows;
  body.innerHTML="";
  if(!filtered.length){body.innerHTML=`<tr><td colspan="9" class="muted">該当なし</td></tr>`; return;}
  for(const r of filtered){
    body.insertAdjacentHTML("beforeend",`<tr data-id="${r.id}" style="cursor:pointer">
      <td>${esc(r.date||"")}</td><td>${esc(r.place||"")}</td><td>${esc(r.bank||"")}</td><td>${esc(r.level||"")}</td>
      <td class="right"><b>${r.score??0}</b></td><td>${esc(r.attack||"")}</td><td class="right">${esc(String(r.pos?.pfb??""))}</td>
      <td class="right">${esc(String(r.rank??""))}</td><td>${esc((r.note||"").slice(0,40))}</td>
    </tr>`);
  }
  body.onclick=(e)=>{const tr=e.target.closest("tr"); if(!tr?.dataset?.id) return; loadEditor(tr.dataset.id); switchTab("new");};
  $("btnClearQ").onclick=()=>{$("q").value=""; renderList();};
  $("q").oninput=()=>renderList();
}
function isWinByRule(r,rule){const rank=Number(r.rank); return Number.isFinite(rank) && rank<=Number(rule);}
function renderPattern(){
  const rule=Number($("winRule").value);
  const wins=state.races.filter(r=>isWinByRule(r,rule));
  const total=state.races.length, winCount=wins.length;
  const winRate=total?Math.round(winCount/total*100):0;
  const avgScoreWin=winCount?Math.round(wins.reduce((s,r)=>s+(Number(r.score)||0),0)/winCount):0;
  $("patternKPI").innerHTML=`
    <div class="box"><div class="muted">レース数</div><div class="big">${total}</div></div>
    <div class="box"><div class="muted">勝ちレース数</div><div class="big">${winCount}</div></div>
    <div class="box"><div class="muted">勝ち率（目安）</div><div class="big">${winRate}<span class="muted">%</span></div></div>
    <div class="box"><div class="muted">勝ちの平均整い</div><div class="big">${avgScoreWin}<span class="muted"> /16</span></div></div>`;
  const top=(arr,getter)=>{const m=new Map(); for(const r of arr){const k=getter(r); if(!k) continue; m.set(k,(m.get(k)||0)+1);} return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);};
  const items=[
    {title:"整い点（勝ち）", list: top(wins, r=>{const s=Number(r.score||0); return s>=13?"13-16（攻めOK）":s>=9?"9-12（普通）":"0-8（注意）";})},
    {title:"開催場所（勝ち）", list: top(wins, r=>r.place)},
    {title:"バンク（勝ち）", list: top(wins, r=>r.bank)},
    {title:"仕掛け（勝ち）", list: top(wins, r=>r.attack)},
    {title:"最終バック番手（勝ち）", list: top(wins, r=>String(r.pos?.pfb??""))},
    {title:"レベル（勝ち）", list: top(wins, r=>r.level)},
  ];
  const cards=$("patternCards"); cards.innerHTML="";
  for(const it of items){
    const div=document.createElement("div"); div.className="card";
    const rows=(it.list.length?`<table><tbody>${it.list.map(([k,n])=>`<tr><td>${esc(String(k))}</td><td class="right">${n}</td></tr>`).join("")}</tbody></table>`:`<div class="muted">データ不足</div>`);
    div.innerHTML=`<h2>${it.title}</h2><div class="muted">上位5</div><div class="hr"></div>${rows}`;
    cards.appendChild(div);
  }
  const winsBody=$("winsBody"); winsBody.innerHTML="";
  if(!wins.length) winsBody.innerHTML=`<tr><td colspan="8" class="muted">勝ちレースがありません（勝ち判定ルールを変更してみてください）。</td></tr>`;
  else{
    const sorted=[...wins].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    for(const r of sorted){
      winsBody.insertAdjacentHTML("beforeend",`<tr data-id="${r.id}" style="cursor:pointer">
        <td>${esc(r.date||"")}</td><td>${esc(r.place||"")}</td><td>${esc(r.level||"")}</td><td class="right">${r.score??0}</td>
        <td>${esc(r.attack||"")}</td><td class="right">${esc(String(r.pos?.pfb??""))}</td><td class="right">${esc(String(r.rank??""))}</td>
        <td>${esc(r.next||"")}</td></tr>`);
    }
    winsBody.onclick=(e)=>{const tr=e.target.closest("tr"); if(!tr?.dataset?.id) return; loadEditor(tr.dataset.id); switchTab("new");};
  }
  $("btnRecalc").onclick=()=>renderPattern();
}
function renderCoach(){
  const place=(($("f_place").value||"").trim().toLowerCase());
  const level=$("f_level").value;
  const bank=$("f_bank").value;
  const filtered=state.races.filter(r=>{
    if(place && !(r.place||"").toLowerCase().includes(place)) return false;
    if(level && r.level!==level) return false;
    if(bank && r.bank!==bank) return false;
    return true;
  });
  const total=filtered.length;
  const avgScore=total?Math.round(filtered.reduce((s,r)=>s+(Number(r.score)||0),0)/total):0;
  const avgRank=total?(filtered.reduce((s,r)=>s+(Number(r.rank)||0),0)/total).toFixed(2):"—";
  const top3=total?Math.round(filtered.filter(r=>Number(r.rank)<=3).length/total*100):0;
  $("coachKPI").innerHTML=`
    <div class="box"><div class="muted">対象レース</div><div class="big">${total}</div></div>
    <div class="box"><div class="muted">平均整い</div><div class="big">${avgScore}<span class="muted"> /16</span></div></div>
    <div class="box"><div class="muted">平均着順</div><div class="big">${avgRank}</div></div>
    <div class="box"><div class="muted">3着以内率</div><div class="big">${top3}<span class="muted">%</span></div></div>`;
  const bands=[{name:"13-16（攻めOK）",min:13,max:16},{name:"9-12（普通）",min:9,max:12},{name:"0-8（注意）",min:0,max:8}];
  const bandBody=$("bandBody"); bandBody.innerHTML="";
  for(const b of bands){
    const arr=filtered.filter(r=>{const s=Number(r.score||0); return s>=b.min && s<=b.max;});
    const n=arr.length;
    const avgR=n?(arr.reduce((s,r)=>s+(Number(r.rank)||0),0)/n).toFixed(2):"—";
    const top3r=n?Math.round(arr.filter(r=>Number(r.rank)<=3).length/n*100):0;
    bandBody.insertAdjacentHTML("beforeend",`<tr><td>${b.name}</td><td class="right">${n}</td><td class="right">${avgR}</td><td class="right">${top3r}%</td></tr>`);
  }
  const bad=filtered.filter(r=>Number(r.score||0)<=8).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const badBody=$("badBody"); badBody.innerHTML="";
  if(!bad.length) badBody.innerHTML=`<tr><td colspan="6" class="muted">整い≤8のデータがありません。</td></tr>`;
  else{
    for(const r of bad){
      badBody.insertAdjacentHTML("beforeend",`<tr data-id="${r.id}" style="cursor:pointer"><td>${esc(r.date||"")}</td><td>${esc(r.place||"")}</td><td>${esc(r.level||"")}</td><td class="right">${r.score??0}</td><td class="right">${esc(String(r.rank??""))}</td><td>${esc(r.next||"")}</td></tr>`);
    }
    badBody.onclick=(e)=>{const tr=e.target.closest("tr"); if(!tr?.dataset?.id) return; loadEditor(tr.dataset.id); switchTab("new");};
  }
  $("btnApplyFilter").onclick=()=>renderCoach();
  $("btnResetFilter").onclick=()=>{$("f_place").value=""; $("f_level").value=""; $("f_bank").value=""; renderCoach();};
}
function renderData(){
  const box=$("jsonBox");
  box.value=JSON.stringify({races:state.races,daily:loadDaily()},null,2);
  $("btnCopyJSON").onclick=async()=>{try{await navigator.clipboard.writeText(box.value); toast("コピーしました");}catch(e){alert("コピーできませんでした。");}};
  $("btnLoadJSON").onclick=()=>{try{const obj=JSON.parse(box.value); if(obj?.races && Array.isArray(obj.races)){state.races=obj.races; if(obj.daily) saveDaily(obj.daily); saveState(state.races); toast("読み込みました");} else alert("JSON形式が違います（races配列が必要）。");}catch(e){alert("JSONの解析に失敗しました。");}};
  $("btnExport").onclick=exportCSV;
  $("fileImport").onchange=importCSV;
  $("btnWipe").onclick=()=>{if(!confirm("全データを削除します。よろしいですか？")) return; state.races=[]; localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_DAILY); toast("削除しました"); location.reload();};
}
function csvEscape(v){const s=String(v??""); return /[,"\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
function parseCSVLine(line){const out=[]; let cur="", inQ=false; for(let i=0;i<line.length;i++){const ch=line[i]; if(inQ){if(ch=== '"' && line[i+1]==='"'){cur+='"'; i++;} else if(ch==='"'){inQ=false;} else cur+=ch;} else {if(ch==='"') inQ=true; else if(ch===','){out.push(cur); cur="";} else cur+=ch;}} out.push(cur); return out;}
function exportCSV(){
  const rows=[];
  rows.push(["id","date","place","bank","level","weather","wind","temp","field","score","judge",...CHECKS_DEF.map(c=>"check_"+c.key),"p3","p2","p15","p1","pfb","attack","lead","plan","hes","waste","rank","line","self","next","note","createdAt","updatedAt"]);
  for(const r of state.races){
    const c=r.checks||{}, p=r.pos||{};
    rows.push([r.id,r.date,r.place,r.bank,r.level,r.weather,r.wind,r.temp,r.field,r.score,r.judge,...CHECKS_DEF.map(x=>c[x.key]??0),p.p3,p.p2,p.p15,p.p1,p.pfb,r.attack,r.lead,r.plan,r.hes,r.waste,r.rank,r.line,r.self,r.next,r.note,r.createdAt,r.updatedAt]);
  }
  const csv=rows.map(r=>r.map(csvEscape).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="keirin_races.csv"; a.click(); URL.revokeObjectURL(url);
}
function importCSV(e){
  const file=e.target.files?.[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const text=String(reader.result||"");
      const lines=text.split(/\r?\n/).filter(Boolean);
      const header=parseCSVLine(lines[0]||"");
      const idx=(name)=>header.indexOf(name);
      const races=[];
      for(let i=1;i<lines.length;i++){
        const cols=parseCSVLine(lines[i]); if(cols.length<5) continue;
        const r={id:cols[idx("id")]||uid(),date:cols[idx("date")]||"",place:cols[idx("place")]||"",bank:cols[idx("bank")]||"",level:cols[idx("level")]||"",
          weather:cols[idx("weather")]||"",wind:cols[idx("wind")]||"",temp:cols[idx("temp")]||"",field:cols[idx("field")]||"",
          checks:{},pos:{},attack:cols[idx("attack")]||"",lead:cols[idx("lead")]||"",plan:cols[idx("plan")]||"",hes:cols[idx("hes")]||"",waste:cols[idx("waste")]||"",
          rank:cols[idx("rank")]||"",line:cols[idx("line")]||"",self:cols[idx("self")]||"",next:cols[idx("next")]||"",note:cols[idx("note")]||"",
          createdAt:Number(cols[idx("createdAt")]||Date.now()),updatedAt:Number(cols[idx("updatedAt")]||Date.now())};
        for(const c of CHECKS_DEF){const v=cols[idx("check_"+c.key)]; r.checks[c.key]=(v===""?0:Number(v));}
        r.score=Number(cols[idx("score")]||calcScore(r.checks)); r.judge=cols[idx("judge")]||judgeFromScore(r.score);
        r.pos={p3:cols[idx("p3")]||"",p2:cols[idx("p2")]||"",p15:cols[idx("p15")]||"",p1:cols[idx("p1")]||"",pfb:cols[idx("pfb")]||""};
        races.push(r);
      }
      if(!confirm(`CSVから ${races.length} 件を読み込みます。現在のデータに追加しますか？`)) return;
      state.races=[...state.races,...races]; saveState(state.races); toast("インポートしました"); switchTab("home");
    }catch(err){alert("CSVの読み込みに失敗しました。");}
    finally{e.target.value="";}
  };
  reader.readAsText(file,"utf-8");
}
function renderPrintSheet(r){
  const s=r.score??0; const j=judgeFromScore(Number(s));
  const rows=CHECKS_DEF.map(c=>{const v=Number(r.checks?.[c.key]??0); const mark=v===2?"◎":v===1?"○":"△"; return `<tr><td>${esc(c.label)}</td><td>${mark}</td></tr>`;}).join("");
  $("printContent").innerHTML=`
    <div class="grid cols2">
      <div class="card">
        <h2>レース条件</h2><div class="hr"></div>
        <table><tbody>
          <tr><th>開催日</th><td>${esc(r.date||"")}</td></tr>
          <tr><th>開催場所</th><td>${esc(r.place||"")}</td></tr>
          <tr><th>バンク</th><td>${esc(r.bank||"")}</td></tr>
          <tr><th>レベル</th><td>${esc(r.level||"")}</td></tr>
          <tr><th>天候</th><td>${esc(r.weather||"")}</td></tr>
          <tr><th>風</th><td>${esc(r.wind||"")}</td></tr>
          <tr><th>気温</th><td>${esc(String(r.temp||""))}</td></tr>
        </tbody></table>
      </div>
      <div class="card">
        <h2>整っているかチェック</h2><div class="hr"></div>
        <table><thead><tr><th>項目</th><th>評価</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="hr"></div><div><b>整いスコア：</b>${s}/16　<b>判断：</b>${j}</div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h2>レース後30秒</h2><div class="hr"></div>
      <table><tbody>
        <tr><th>仕掛け周回</th><td>${esc(r.attack||"")}</td><th>最終バック番手</th><td>${esc(String(r.pos?.pfb??""))}</td></tr>
        <tr><th>着順</th><td>${esc(String(r.rank??""))}</td><th>ライン</th><td>${esc(r.line||"")}</td></tr>
        <tr><th>次の一手</th><td colspan="3">${esc(r.next||"")}</td></tr>
        <tr><th>一言</th><td colspan="3">${esc(r.note||"")}</td></tr>
      </tbody></table>
    </div>`;
}
let deferredPrompt=null;
function setupInstallButton(){
  const btn=$("btnInstall"); if(!btn) return;
  const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone=window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if(isStandalone){btn.textContent="✅ 追加済み"; btn.disabled=true; return;}
  if(isiOS){btn.onclick=()=>alert("iPhoneは Safari で開いて、共有ボタン →「ホーム画面に追加」でアプリ化できます。"); return;}
  btn.onclick=async()=>{if(!deferredPrompt){alert("ブラウザのメニューから「ホーム画面に追加」を選んでください。"); return;} deferredPrompt.prompt(); deferredPrompt=null;};
}
window.addEventListener("beforeinstallprompt",(e)=>{e.preventDefault(); deferredPrompt=e;});
function refreshAll(){
  state=loadState();
  const active=document.querySelector(".tab.active")?.dataset?.tab || "home";
  if(active==="home") renderHome();
  if(active==="list") renderList();
  if(active==="pattern") renderPattern();
  if(active==="coach") renderCoach();
  if(active==="data") renderData();
}
(function init(){renderHome(); switchTab("home");})();