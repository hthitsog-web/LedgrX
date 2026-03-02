'use strict';

let barCI=null,pieCI=null,lineCI=null;

const Charts = {
  _defaults() {
    return {
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#7080a0',font:{family:'DM Sans',size:11},boxWidth:10}}},
      scales:{
        x:{ticks:{color:'#7080a0',font:{size:10}},grid:{color:'rgba(255,255,255,.03)'}},
        y:{ticks:{color:'#7080a0',font:{size:10},callback:v=>'₹'+Number(v).toLocaleString('en-IN')},grid:{color:'rgba(255,255,255,.05)'}}
      }
    };
  },
  _grpMonth(txns,type) {
    const m={};
    txns.filter(t=>t.type===type).forEach(t=>{ const k=(t.date||'').slice(0,7); if(k) m[k]=(m[k]||0)+parseFloat(t.amount||0); });
    return m;
  },
  buildBar(txns) {
    const iM=Charts._grpMonth(txns,'credit'),eM=Charts._grpMonth(txns,'debit');
    const months=[...new Set([...Object.keys(iM),...Object.keys(eM)])].sort();
    const ctx=$('barC').getContext('2d'); if(barCI) barCI.destroy();
    barCI=new Chart(ctx,{type:'bar',data:{
      labels:months.map(m=>{ const[y,mo]=m.split('-'); return new Date(y,mo-1).toLocaleDateString('en-IN',{month:'short',year:'2-digit'}); }),
      datasets:[
        {label:'Income',data:months.map(m=>iM[m]||0),backgroundColor:'rgba(0,229,160,.7)',borderRadius:5},
        {label:'Expense',data:months.map(m=>eM[m]||0),backgroundColor:'rgba(255,77,109,.7)',borderRadius:5}
      ]},options:Charts._defaults()});
  },
  buildPie(txns) {
    const cm={};
    txns.filter(t=>t.type==='debit').forEach(t=>cm[t.category]=(cm[t.category]||0)+parseFloat(t.amount||0));
    const labels=Object.keys(cm); const ctx=$('pieC').getContext('2d'); if(pieCI) pieCI.destroy();
    if(!labels.length){ ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height); ctx.fillStyle='#7080a0'; ctx.font='14px DM Sans'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('No expense data',ctx.canvas.width/2,ctx.canvas.height/2); return; }
    pieCI=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data:labels.map(l=>cm[l]),backgroundColor:labels.map(l=>CAT_COLORS[l]||'#7080a0'),borderWidth:2,borderColor:'#0f1a2e',hoverOffset:10}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#7080a0',font:{family:'DM Sans',size:11},padding:10,boxWidth:10}}}}});
  },
  buildLine(txns) {
    const sorted=[...txns].sort((a,b)=>new Date(a.date)-new Date(b.date));
    let bal=0; const pts=sorted.map(t=>{ bal+=t.type==='credit'?parseFloat(t.amount):-parseFloat(t.amount); return{x:t.date,y:bal}; });
    const ctx=$('lineC').getContext('2d'); if(lineCI) lineCI.destroy();
    lineCI=new Chart(ctx,{type:'line',data:{datasets:[{label:'Balance',data:pts,borderColor:'#00e5a0',backgroundColor:'rgba(0,229,160,.07)',borderWidth:2,fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#00e5a0'}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#7080a0',font:{family:'DM Sans',size:11}}}},
        scales:{x:{type:'time',time:{unit:'day'},ticks:{color:'#7080a0',font:{size:10}},grid:{color:'rgba(255,255,255,.03)'}},
                y:{ticks:{color:'#7080a0',font:{size:10},callback:v=>'₹'+Number(v).toLocaleString('en-IN')},grid:{color:'rgba(255,255,255,.05)'}}}}});
  },
  buildBreakdown(txns) {
    const cm={};
    txns.filter(t=>t.type==='debit').forEach(t=>cm[t.category]=(cm[t.category]||0)+parseFloat(t.amount||0));
    const total=Object.values(cm).reduce((s,v)=>s+v,0);
    $('catList').innerHTML=Object.entries(cm).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>`
      <div class="cat-row">
        <div class="cat-rh">
          <div class="cat-nm"><div class="cat-cdot" style="background:${CAT_COLORS[cat]||'#7080a0'}"></div>${CAT_EMOJI[cat]||''} ${cat}</div>
          <div class="cat-amt" style="color:${CAT_COLORS[cat]||'#7080a0'}">${fmt(amt)}</div>
        </div>
        <div class="cat-track"><div class="cat-fill" style="width:${total?((amt/total)*100).toFixed(1):0}%;background:${CAT_COLORS[cat]||'#7080a0'}"></div></div>
      </div>`).join('')||'<div style="color:var(--txt3);font-size:13px;text-align:center;padding:16px">No expense data</div>';
  }
};
