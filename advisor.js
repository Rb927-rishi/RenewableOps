/* Bounded heuristic state-space planning with rule-based intent and safety constraints.
   Beam pruning and discrete storage actions deliberately trade optimality for responsiveness.
   Kept separate from presentation so alternative algorithms can be evaluated offline. */
(function (root) {
 const num = x => typeof x === 'number' && Number.isFinite(x);
 const solar = (p, h, j) => Math.min(p.solar, Math.max(0, p.solar * h.shortwave_radiation[j] / 1000 * Math.max(.75, 1 - Math.max(0, h.temperature_2m[j] - 25) * .004)));
 const wind = v => v < 3 || v >= 25 ? 0 : v < 12 ? ((v - 3) / 9) ** 3 : 1;
 function request(text, p) {
  const t = text.toLowerCase(), settings = {...p};
  const demand = t.match(/(\d+(?:\.\d+)?)\s*mwh/), reserve = t.match(/(?:preserve|reserve|retain|keep)(?:\s+(?:at least|a|battery|storage|reserve|of|target))*\s*(\d+(?:\.\d+)?)\s*%/ ) || t.match(/(\d+(?:\.\d+)?)\s*%\s*(?:battery |storage )?reserve/);
  if (demand) settings.demand = +demand[1];
  const price = t.match(/(?:grid|electricity)\s*(?:price|cost)\s*(?:of|is|=|:)?\s*₹?\s*(\d+(?:\.\d+)?)/);
  if (price) settings.price = +price[1];
  settings.reserve = reserve ? +reserve[1] : 20;
  settings.goal = /reliab|backup|resilien|outage/.test(t) ? 'reliability' : /renewable|clean energy|grid import/.test(t) ? 'renewables' : 'cost';
  settings.riskOnly = /weather|risk|precaution|safe/.test(t) && !/cost|schedule|demand|mwh/.test(t);
  settings.maintenance = /maintenance|outage/.test(t);
  settings.tomorrow = /tomorrow/.test(t);
  return settings;
 }
 function horizon(f, p, now = Date.now()) {
  // Open-Meteo timestamps are site-local; never use the browser's timezone.
  const siteNow = new Date(now + 19800000).toISOString();
  const day = new Date(now + 19800000 + (p.tomorrow ? 86400000 : 0)).toISOString().slice(0,10);
  const start = f.hourly.time.findIndex(t => p.tomorrow ? t.slice(0,10) === day : t.slice(0,13) >= siteNow.slice(0,13));
  if (start < 0 || start + 24 > f.hourly.time.length) throw Error('A complete 24-hour forecast is unavailable for this period. Refresh the weather and try again.');
  const fields = ['shortwave_radiation','temperature_2m','wind_speed_100m','wind_gusts_10m','precipitation','precipitation_probability','weather_code'];
  for (const key of fields) if (!f.hourly[key] || f.hourly[key].slice(start,start+24).length !== 24 || f.hourly[key].slice(start,start+24).some(v => !num(v))) throw Error('Required forecast readings are missing. Refresh the weather before preparing an operating plan.');
  return Array.from({length:24}, (_, k) => {
   const j = start+k, h=f.hourly;
   return {time:h.time[j], solar:solar(p,h,j), wind:p.wind*wind(h.wind_speed_100m[j]), gust:h.wind_gusts_10m[j]*3.6, rain:h.precipitation[j], pop:h.precipitation_probability[j], storm:[95,96,99].includes(h.weather_code[j]), heat:h.temperature_2m[j]};
  });
 }
 function solve(rows,p,factor=1) {
  const efficiency=.9, reserve=p.battery*p.reserve/100, initial=p.battery*p.soc/100, rate=p.battery*.25, load=p.demand/24;
  const floor=Math.min(initial,reserve), target=p.goal==='reliability'?Math.max(reserve,initial):reserve;
  // Admissible lower bound ignores battery losses and power limits for remaining deficit.
  const remaining=Array(25).fill(0);
  for(let k=23;k>=0;k--) remaining[k]=remaining[k+1]+Math.max(0,load-(rows[k].solar+rows[k].wind)*factor);
  let states=[{soc:initial,score:0,grid:0,cost:0,curtail:0,path:[]}];
  for(let k=0;k<24;k++) {
   const r=rows[k], generation=(r.solar+r.wind)*factor, surplus=Math.max(0,generation-load), deficit=Math.max(0,load-generation), next=new Map();
   for(const s of states) {
    const maxCharge=Math.min(surplus,rate,(p.battery-s.soc)/efficiency), maxDischarge=Math.min(deficit,rate,Math.max(0,s.soc-floor)*efficiency);
    const options=[{ch:0,dis:0},...(.000001<maxCharge?[{ch:maxCharge/2,dis:0},{ch:maxCharge,dis:0}]:[]),...(.000001<maxDischarge?[{ch:0,dis:maxDischarge/2},{ch:0,dis:maxDischarge}]:[])];
    for(const o of options) {
     const soc=s.soc+o.ch*efficiency-o.dis/efficiency, grid=deficit-o.dis, cost=grid*p.price*1000, cycle=(o.ch+o.dis)*250;
     const score=s.score+(p.goal==='renewables'?grid*10000:cost)+cycle;
     const candidate={soc,score,grid:s.grid+grid,cost:s.cost+cost,curtail:s.curtail+surplus-o.ch,path:s.path.concat({...r,...o,grid,soc})};
     const key=Math.round(soc*10), old=next.get(key);if(!old||score<old.score)next.set(key,candidate);
    }
   }
   states=[...next.values()].sort((a,b)=>{
    const rank=s=>s.score+Math.max(0,remaining[k+1]-Math.max(0,s.soc-target)*efficiency)*(p.goal==='renewables'?10000:p.price*1000)+Math.max(0,target-s.soc)*100000;
    return rank(a)-rank(b);
   }).slice(0,120);
  }
  states.sort((a,b)=>(a.score+Math.max(0,target-a.soc)*100000)-(b.score+Math.max(0,target-b.soc)*100000));
  return {...states[0],target,reserve,initial};
 }
 root.OperationsAdvisor={request,horizon,solve};
})(typeof window!=='undefined'?window:globalThis);
