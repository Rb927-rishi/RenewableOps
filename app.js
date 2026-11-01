// Stage 2: live Open-Meteo forecast, threshold-based weather advisories and a small educational energy scheduler.
const SITE={latitude:15.12,longitude:78.28,name:"Pinnapuram area, Andhra Pradesh"};
const $=id=>document.getElementById(id);let forecast=null, forecastFetched=0, forecastAvailable=false;
$("date").textContent=new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date());
function status(t,k=""){ $("weather-status").textContent=t;$("weather-chip").textContent=k==="ok"?"● Live forecast":k==="err"?"● Feed unavailable":"● Connecting";$("weather-chip").style.color=k==="ok"?"#168765":k==="err"?"#b45438":"";}
function msg(t,k=""){ $("weather-message").textContent=t;$("weather-message").className="weather-message "+(k==="ok"?"success":k==="err"?"error":"");}
function f(n,d=1){return Number.isFinite(Number(n))?Number(n).toFixed(d):"—";}
function hourIndex(times){const key=new Date(Date.now()+19800000).toISOString().slice(0,13);const i=times.findIndex(t=>t.slice(0,13)>=key);return i<0?times.length-1:i;}
function desc(c){if(c===0)return"Clear sky";if([1,2].includes(c))return"Partly cloudy";if(c===3)return"Overcast";if([45,48].includes(c))return"Fog";if([51,53,55,56,57].includes(c))return"Drizzle";if([61,63,65,66,67,80,81,82].includes(c))return"Rain";if([95,96,99].includes(c))return"Thunderstorm";return"Variable conditions";}
async function loadWeather(){
 const b=$("weather-refresh");b.disabled=true;b.textContent="↻ Loading…";status("Connecting");msg("Requesting hourly forecast for the Pinnapuram area from Open-Meteo…");
 const url="https://api.open-meteo.com/v1/forecast?latitude="+SITE.latitude+"&longitude="+SITE.longitude+"&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,cloud_cover,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_speed_100m,wind_gusts_10m,shortwave_radiation,direct_radiation,diffuse_radiation&wind_speed_unit=ms&forecast_days=3&timezone=Asia%2FKolkata";
 try{let r=await fetch(url);if(!r.ok)throw Error("HTTP "+r.status);forecast=await r.json();forecastFetched=Date.now();forecastAvailable=true;window.dispatchEvent(new CustomEvent("weather:update",{detail:forecast}));renderWeather();renderAlerts();renderGeneration();status("Connected","ok");msg("Live forecast loaded from Open-Meteo for "+SITE.name+". Fetched "+new Date().toLocaleTimeString("en-IN")+". Generation figures are estimates, not plant telemetry.","ok");}
 catch(e){forecastAvailable=false;status("Unavailable","err");msg("Could not load live forecast. Check internet access and retry. "+e.message,"err");renderAlerts(true);}
 finally{b.disabled=false;b.textContent="↻ Refresh weather";}
}
function renderWeather(){
 if(!forecast)return;const c=forecast.current,h=forecast.hourly,i=hourIndex(h.time);
 document.querySelector(".weather-main h3").textContent=SITE.name;
 document.querySelector(".temp").innerHTML=f(c.temperature_2m,0)+'° <span>'+desc(c.weather_code)+'<br><small>Current forecast conditions</small></span> ☀';
 const s=document.querySelectorAll(".stats div");s[0].innerHTML="Humidity<b>"+f(c.relative_humidity_2m,0)+"%</b>";s[1].innerHTML="Cloud cover<b>"+f(c.cloud_cover,0)+"%</b>";s[2].innerHTML="Precipitation<b>"+f(c.precipitation,1)+" mm</b>";
 document.querySelectorAll(".metric h2")[0].innerHTML=f(h.shortwave_radiation[i],0)+' <i>W/m²</i>';
 document.querySelectorAll(".metric h2")[1].innerHTML=f(h.wind_speed_100m[i],1)+' <i>m/s</i>';
 document.querySelectorAll(".metric h2")[2].innerHTML=f(h.precipitation[i],1)+' <i>mm</i>';
 const spans=document.querySelectorAll(".forecast span");for(let k=0;k<spans.length;k++){let j=i+k;if(j>=h.time.length)break;spans[k].innerHTML=h.time[j].slice(11,16)+"　"+(h.weather_code[j]===0?"☀":h.precipitation_probability[j]>=50?"☂":"☁")+" <b>"+f(h.temperature_2m[j],0)+"°</b> "+desc(h.weather_code[j]);}
}
function inputs(){return{solar:Math.max(0,+$("solar-capacity").value||0),wind:Math.max(0,+$("wind-capacity").value||0),demand:Math.max(1,+$("daily-demand").value||600),battery:Math.max(0,+$("battery-capacity").value||0),soc:Math.min(100,Math.max(0,+$("battery-soc").value||0)),price:Math.max(0,+$("grid-price").value||0)};}
function solarMW(cap,irr,temp){return Math.min(cap,Math.max(0,cap*Math.max(0,irr)/1000*Math.max(.75,1-Math.max(0,temp-25)*.004)));}
function windCF(v){if(v<3||v>=25)return 0;if(v<12)return Math.pow((v-3)/9,3);return 1;}
function renderGeneration(){if(!forecast)return;let p=inputs(),h=forecast.hourly,i=hourIndex(h.time),s=solarMW(p.solar,h.shortwave_radiation[i]||0,h.temperature_2m[i]||25),w=p.wind*windCF(h.wind_speed_100m[i]||0);$("solar-output").innerHTML=f(s,1)+' <i>MW</i>';$("wind-output").innerHTML=f(w,1)+' <i>MW</i>';let bars=document.querySelectorAll(".plant .bar span");if(bars[0])bars[0].style.width=(p.solar?s/p.solar*100:0)+"%";if(bars[1])bars[1].style.width=(p.wind?w/p.wind*100:0)+"%";}
function renderAlerts(failed=false){
 const list=$("alert-list"),count=$("alert-count"),navCount=$("nav-alert-count");
 list.replaceChildren();
 function setCount(n,label){count.textContent=label||(`${n} active`);count.className="chip"+(n?" amber":"");navCount.textContent=String(n);}
 function add(level,title,detail,action){
  const a=document.createElement("article");a.className="card alert dynamic-alert";
  a.style.borderLeft="3px solid "+(level==="danger"?"#d85454":"#dba345");
  const mark=document.createElement("span");mark.className="alert-mark";mark.textContent=level==="danger"?"!":"↗";
  const body=document.createElement("div"),heading=document.createElement("b"),severity=document.createElement("span"),para=document.createElement("p"),small=document.createElement("small");
  heading.textContent=title;severity.className="severity";severity.textContent=level==="danger"?"High priority":"Advisory";
  para.textContent=detail+" "+action;small.textContent="Live weather-forecast advisory · Not an official emergency warning";
  body.append(heading,severity,para,small);a.append(mark,body);list.append(a);
 }
 if(failed||!forecast){setCount(0,"Unavailable");const a=document.createElement("article");a.className="card alert";a.innerHTML="<div><b>Alerts unavailable</b><p>Unable to check the weather forecast. Check your internet connection and refresh.</p><small>No conclusion about weather safety can be made.</small></div>";list.append(a);return;}
 const h=forecast.hourly,i=hourIndex(h.time);let maxG=0,maxRain=0,maxPop=0,storm=false;
 for(let j=i;j<Math.min(i+24,h.time.length);j++){
  maxG=Math.max(maxG,(h.wind_gusts_10m[j]||0)*3.6);maxRain=Math.max(maxRain,h.precipitation[j]||0);maxPop=Math.max(maxPop,h.precipitation_probability[j]||0);
  if([95,96,99].includes(h.weather_code[j]))storm=true;
 }
 // These are configurable demo thresholds applied to the live forecast, not official warning criteria.
 if(maxG>=75)add("danger","Very high wind gusts in forecast","Maximum forecast gust in the next 24 hours: "+f(maxG,0)+" km/h.","Review site safety procedures and official warnings before authorizing outdoor work.");
 else if(maxG>=50)add("warning","Elevated wind gusts forecast","Maximum forecast gust in the next 24 hours: "+f(maxG,0)+" km/h.","Check site-specific turbine and outdoor-work limits.");
 if(maxRain>=20||maxPop>=80)add("warning","Heavy rain potential","Next-24-hour hourly precipitation peak: "+f(maxRain,1)+" mm; maximum hourly rain probability: "+f(maxPop,0)+"%.","Review drainage, access and weather-sensitive maintenance plans.");
 if(storm)add("danger","Thunderstorm indicated in forecast","A thunderstorm weather code appears in the next 24 hours.","Check official alerts and follow site lightning-safety procedures.");
 const n=list.querySelectorAll(".dynamic-alert").length;setCount(n);
 if(n===0){const a=document.createElement("article");a.className="card alert no-alerts";a.innerHTML='<span class="alert-mark" style="background:#e5f6ef;color:#168765">✓</span><div><b>No active weather alerts</b><p>No configured alert thresholds were triggered by the available forecast for the next 24 hours.</p><small>Forecast-based check only · Not confirmation of safety or absence of official warnings</small></div>';list.append(a);}
}
function advise(){
 const response=$("response");response.hidden=false;response.replaceChildren();
 function text(tag,value){const el=document.createElement(tag);el.textContent=value;response.append(el);return el;}
 function section(title,items){text("h4",title);const list=document.createElement("ul");items.forEach(value=>{const li=document.createElement("li");li.textContent=value;list.append(li);});response.append(list);}
 if(!forecast||!forecastAvailable||Date.now()-forecastFetched>3600000){text("p","Refresh the weather before preparing a recommendation. Current forecast availability could not be confirmed.");return;}
 const prompt=$("prompt").value.trim();
 if(!prompt){text("p","Describe your goal: reduce grid cost, preserve backup energy, assess weather risks, or plan maintenance.");return;}
 const raw=inputs();
 if(["solar-capacity","wind-capacity","daily-demand","battery-capacity","battery-soc","grid-price"].some(id=>!$(id).value.trim()||!$(id).validity.valid||!Number.isFinite(+$(id).value))){text("p","Enter valid non-negative plant values, positive demand and a battery charge between 0% and 100%.");return;}
 const engine=OperationsAdvisor,p=engine.request(prompt,raw);
 if(p.reserve>100||p.reserve<0||p.demand<=0){text("p","Use a reserve between 0% and 100% and demand greater than zero.");return;}
 let rows,plan,low,high;try{rows=engine.horizon(forecast,p);if(!p.riskOnly){plan=engine.solve(rows,p);low=engine.solve(rows,p,.8);high=engine.solve(rows,p,1.2);}}catch(e){text("p",e.message);return;}
 const stamp=t=>t.slice(8,10)+"/"+t.slice(5,7)+" "+t.slice(11,16)+" IST";
 text("h4",p.riskOnly?"Weather risk assessment":"Recommended operating plan");
 text("p",stamp(rows[0].time)+" – "+stamp(rows[23].time)+" (24 hourly intervals). "+(p.riskOnly?"Priorities reflect the forecast for this period.":"Priority: "+({cost:"reduce grid energy cost",renewables:"maximize renewable use",reliability:"preserve backup energy"}[p.goal])+"; reserve target "+p.reserve+"%."));
 if(plan){
  const stats=document.createElement("div");stats.className="result-stats";
  [["Estimated grid energy",f(plan.grid,1)+" MWh"],["Estimated grid cost","₹"+Math.round(plan.cost).toLocaleString("en-IN")],["End-of-period battery",f(p.battery?plan.soc/p.battery*100:0,1)+"%"],["Unused renewable potential",f(plan.curtail,1)+" MWh"]].forEach(([label,value])=>{const item=document.createElement("span"),b=document.createElement("b");item.textContent=label;b.textContent=value;item.append(b);stats.append(item);});response.append(stats);
  const actions=[];
  if(plan.initial<plan.reserve)actions.push("Battery starts below the requested reserve. Preserve existing charge and restore the reserve from available renewable surplus; grid charging is not included.");
  const active=plan.path.filter(x=>x.ch>.01||x.dis>.01);
  active.slice(0,8).forEach(x=>actions.push(stamp(x.time)+": "+(x.ch>.01?"Charge from renewable surplus by "+f(x.ch,1):"Supply demand from storage by "+f(x.dis,1))+" MWh; battery ends at "+f(x.soc,1)+" MWh."));
  if(active.length>8)actions.push("A further "+(active.length-8)+" hourly storage actions are listed in the full schedule below.");
  if(!active.length)actions.push("Hold battery charge; serve demand from available renewables and cover the shortfall with the grid.");
  const peak=plan.path.reduce((a,b)=>a.grid>b.grid?a:b);if(peak.grid>.01)actions.push("Confirm at least "+f(peak.grid,1)+" MW of grid import capability for the highest import hour, "+stamp(peak.time)+". Import limits are not connected.");
  if(plan.soc+.01<plan.target)actions.push("The end-of-period reserve target is not met. Reduce discretionary load or arrange additional supply before approving this plan.");
  section("Priority actions",actions);
  const details=document.createElement("details"),summary=document.createElement("summary");summary.textContent="View all 24 hourly recommendations";details.append(summary);const list=document.createElement("ul");plan.path.forEach(x=>{const li=document.createElement("li");li.textContent=stamp(x.time)+": grid "+f(x.grid,1)+" MW; charge "+f(x.ch,1)+" MW; discharge "+f(x.dis,1)+" MW; stored energy "+f(x.soc,1)+" MWh.";list.append(li);});details.append(list);response.append(details);
 }
 const precautions=[],storms=rows.filter(r=>r.storm),gusts=rows.filter(r=>r.gust>=50),rain=rows.filter(r=>r.rain>=20||r.pop>=80),heat=rows.filter(r=>r.heat>=40);
 if(storms.length)precautions.push("Thunderstorm signal at "+stamp(storms[0].time)+". Defer exposed and elevated work during affected periods; use site lightning procedures and official alerts for clearance.");
 if(gusts.length)precautions.push("Gusts reach "+f(Math.max(...gusts.map(r=>r.gust)),0)+" km/h. Secure loose equipment and check lifting, access and turbine manufacturer limits before work.");
 if(rain.length)precautions.push("Rain risk increases at "+stamp(rain[0].time)+". Check drainage, slippery access and electrical enclosure protection; defer weather-sensitive work if site limits are exceeded.");
 if(heat.length)precautions.push("Forecast temperature reaches "+f(Math.max(...heat.map(r=>r.heat)),0)+"°C. Arrange water, rest breaks and local heat-stress checks for outdoor teams.");
 if(!precautions.length)precautions.push("No configured weather threshold is exceeded in this period. Check official alerts and on-site measurements before clearing work.");
 if(p.maintenance)precautions.push("Maintenance clearance needs the affected asset, outage start/end, unavailable capacity and isolation requirements. This forecast review does not include an outage-adjusted dispatch plan. Follow lockout and permit-to-work procedures.");
 precautions.push("Confirm battery power limits, state of health, grid availability and equipment alarms with the control room. Recommendations do not operate plant controls.");
 section("Precautions",precautions);
 text("h4","Uncertainty & review");
 if(plan)text("p","Sensitivity check: with renewable output 20% below or above the forecast estimate and the same demand, planned grid energy ranges from "+f(Math.min(low.grid,high.grid),1)+" to "+f(Math.max(low.grid,high.grid),1)+" MWh and grid cost from ₹"+Math.round(Math.min(low.cost,high.cost)).toLocaleString("en-IN")+" to ₹"+Math.round(Math.max(low.cost,high.cost)).toLocaleString("en-IN")+". Each scenario is replanned; this is an illustrative range, not a confidence interval or a guaranteed bound.");
 text("p","Weather is a forecast for the surrounding area, not site telemetry. Timing, gusts and renewable output can change. Review hourly and after material forecast or equipment changes. Use official warnings and measured site conditions for safety decisions.");
 if(plan)text("p","Assumptions: evenly distributed demand; flat configured tariff; 90% efficiency in each charging/discharging direction; maximum battery transfer of 25% of capacity per hour. No grid charging, hydro dispatch, export revenue, network limits or equipment outages are included. Verify these assumptions and approve with the site operator before execution.");
 if(!p.riskOnly&&!/cost|demand|mwh|battery|storage|reserve|renewable|grid|plan|operat|schedul|reliab|backup|outage|maintenan|resilien/i.test(prompt))text("p","This request is outside the supported operating goals. The figures above use the configured cost-planning defaults; add a demand, reserve or operating objective for a more relevant assessment.");
}
$("weather-refresh").addEventListener("click",loadWeather);$("send").addEventListener("click",advise);document.querySelectorAll(".suggestions button").forEach(b=>b.addEventListener("click",()=>{$("prompt").value=b.textContent;$("prompt").focus();}));["solar-capacity","wind-capacity","daily-demand","battery-capacity","battery-soc","grid-price"].forEach(id=>$(id).addEventListener("change",renderGeneration));loadWeather();
