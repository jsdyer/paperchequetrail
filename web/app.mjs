import {labels, metric, format, monthsUntil, csvCell} from './model.mjs';
const get = id => document.getElementById(id);
const controls = ['first','second','period','measure','window'];
const historic = new Map();
let index, revision = 0, csv = '';
const periodLabel = value => new Intl.DateTimeFormat('en-CA',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T12:00:00Z'));
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
async function load(name) {
  const response = await fetch('./data/'+name+'.json');
  if (!response.ok) throw new Error('Missing data');
  return response.json();
}
function option(id, value, label) { get(id).add(new Option(label,value)); }
function svg(tag, attrs, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
  for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
  if (text !== undefined) node.textContent = text;
  return node;
}
function trend(months, entries, measure) {
  const plot = svg('svg',{viewBox:'0 0 760 205',role:'img','aria-label':labels[measure]+' by month. Values and source rows appear in the following table.'});
  const values = entries.flatMap(([,rows]) => months.map(m => metric(rows[m],measure))).filter(v => v !== null);
  const ceiling = Math.max(1,...values), left=63, right=747, top=12, bottom=171;
  const x = i => left+(right-left)*i/Math.max(1,months.length-1);
  const y = v => bottom-(bottom-top)*v/ceiling;
  for (const v of [0,ceiling/2,ceiling]) {
    const suffix = measure.includes('hare') ? '%' : '';
    const tick = (measure === 'amount' ? '$' : '')+Intl.NumberFormat('en-CA',{notation:'compact',maximumFractionDigits:1}).format(v)+suffix;
    plot.append(svg('line',{x1:left,y1:y(v),x2:right,y2:y(v),stroke:'#dce1d5'}),svg('text',{x:left-6,y:y(v)+4,'text-anchor':'end',fill:'#46574e','font-size':13},tick));
  }
  entries.forEach(([,rows],seriesIndex) => {
    const colour = seriesIndex ? '#9d452c' : '#246454';
    let path='', connected=false;
    months.forEach((month,i) => {
      const v=metric(rows[month],measure);
      if (v===null) { connected=false; return; }
      path+=(connected?'L':'M')+x(i)+' '+y(v)+' ';
      connected=true;
      const point=svg('circle',{cx:x(i),cy:y(v),r:2.1,fill:colour});
      point.append(svg('title',{},month+' · '+format(v,measure)));
      plot.append(point);
    });
    plot.append(svg('path',{d:path,fill:'none',stroke:colour,'stroke-width':2.25,'stroke-dasharray':seriesIndex?'6 3':'none'}));
  });
  plot.append(svg('text',{x:left,y:198,fill:'#46574e','font-size':14},months[0]),svg('text',{x:right,y:198,'text-anchor':'end',fill:'#46574e','font-size':14},months.at(-1)));
  get('chart').replaceChildren(plot);
}
function sourceLink(row) {
  const link=element('a','CSV row '+row[0]);
  link.href=index.source+'#row='+row[0]; return link;
}
function card(id, rows, period, measure) {
  const row=rows[period], card=element('article',undefined,'card');
  const [dept,code]=id.split('-');
  card.append(element('h3',index.programs[id]),element('p','Dept '+dept+' · Product '+code,'code'),element('p',format(metric(row,measure),measure),'big'),element('p',labels[measure]+' · '+periodLabel(period)));
  if (!row) {card.append(element('p','No record for this department and product this month.'));return card;}
  const prior=String(Number(period.slice(0,4))-1)+period.slice(4), priorValue=metric(rows[prior],measure);
  card.append(element('p',format(row[11],'count')+' cheques out of '+format(row[3],'count')+' total payments.'),
              element('p',periodLabel(prior)+' · '+format(priorValue,measure)), sourceLink(row));
  return card;
}
async function render() {
  const ticket=++revision;
  const [first,second,period,measure,window]=controls.map(id=>get(id).value);
  const ids=[...new Set([first,second].filter(Boolean))];
  const entries=await Promise.all(ids.map(async id=>{
    if (!historic.has(id)) historic.set(id,await load(id));
    return [id,historic.get(id)];
  }));
  if (ticket!==revision) return;
  const months=monthsUntil(index.months,period,window);
  get('status').textContent=index.row_count.toLocaleString('en-CA')+' published rows · '+periodLabel(index.start)+' – '+periodLabel(index.through);
  get('cards').replaceChildren(...entries.map(([id,data])=>card(id,data,period,measure)));
  get('legend').replaceChildren(...ids.map(id=>element('span',index.programs[id]+' · '+id.split('-')[0])));
  trend(months,entries,measure);
  const head=element('tr');head.append(element('th','Month'),...ids.map(id=>element('th',index.programs[id]+' · '+id.split('-')[0])));
  get('theads').replaceChildren(head);
  const lines=[['Calendar month','Department','Product code','Program','Fiscal year','Fiscal month','Source CSV row','Total payments','Total cents CAD','Cheque count','Cheque cents CAD',labels[measure]]];
  const records=[...months].reverse().map(month=>{
    const tr=element('tr');tr.append(element('th',month));
    for (const [id,history] of entries) {
      const row=history[month], v=metric(row,measure), td=element('td',format(v,measure));
      if (row) td.append(' · ',sourceLink(row));
      tr.append(td);
      lines.push([month,...id.split('-'),index.programs[id],row?.[1],row?.[2],row?.[0],row?.[3],row?.[4],row?.[11],row?.[12],v]);
    }
    return tr;
  });
  csv=lines.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
  get('rows').replaceChildren(...records);
  get('results').hidden=false;
  const url=new URL(location.href);
  for (const key of controls) url.searchParams.set(key,get(key).value);
  history.replaceState(null,'',url);
}
function reportError(){ get('results').hidden=true; get('status').textContent='This edition could not be loaded. Reload to try again or use the federal CSV linked in the guide.'; }
async function start() {
  index=await load('index');
  option('second','','No comparison');
  const programs=Object.entries(index.programs).sort((a,b)=>a[1].localeCompare(b[1])||a[0].localeCompare(b[0]));
  for (const [key,name] of programs) for (const id of ['first','second']) option(id,key,name+' · '+key);
  for (const month of [...index.months].reverse()) option('period',month,periodLabel(month));
  const defaults={first:'014-3020000000',second:'014-3030000000',period:index.through,measure:'count',window:'24'};
  const requested=new URLSearchParams(location.search);
  for (const id of controls) {
    const input=get(id), value=requested.get(id);
    input.value=[...input.options].some(o=>o.value===value)?value:defaults[id];
    input.addEventListener('change',()=>render().catch(reportError));
  }
  get('edition').textContent='Retrieved '+index.retrieved+' · '+index.program_count+' department and product combinations. The CSV row numbers refer to this source edition.';
  get('csvsource').href=index.source; get('guide').href=index.definitions;
  await render();
}
get('download').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=element('a'); a.href=url;a.download='paper-cheques-'+get('period').value+'.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
start().catch(reportError);
