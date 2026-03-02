'use strict';

let rFrom=null,rTo=null;

const Reports = {
  quickDate(days,el) {
    document.querySelectorAll('.qdbtn').forEach(b=>b.classList.remove('active'));
    el?.classList.add('active');
    if(days===0){ rFrom=null; rTo=null; $('rfrom').value=''; $('rto').value=''; }
    else{ const f=new Date(); f.setDate(f.getDate()-days+1); rFrom=f.toISOString().slice(0,10); rTo=today(); $('rfrom').value=rFrom; $('rto').value=rTo; }
    if(App.activeTab==='reports') Reports.render();
  },
  applyDR() {
    rFrom=$('rfrom').value||null; rTo=$('rto').value||null;
    document.querySelectorAll('.qdbtn').forEach(b=>b.classList.remove('active'));
    Reports.render();
  },
  _filtered() { return transactions.filter(t=>{ if(rFrom&&t.date<rFrom)return false; if(rTo&&t.date>rTo)return false; return true; }); },
  render() {
    const txns=Reports._filtered();
    const inc=txns.filter(t=>t.type==='credit').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const exp=txns.filter(t=>t.type==='debit').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const net=inc-exp;
    $('rInc').textContent=fmt(inc); $('rExp').textContent=fmt(exp);
    $('rNet').textContent=fmt(Math.abs(net)); $('rNet').className='rsc-val '+(net>=0?'acc':'red2');
    if(typeof Chart!=='undefined'){ Charts.buildBar(txns); Charts.buildPie(txns); Charts.buildLine(txns); Charts.buildBreakdown(txns); }
  }
};
