'use strict';

const $ = id => document.getElementById(id);

function fmt(n) {
  return '₹' + parseFloat(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function today() { return new Date().toISOString().slice(0,10); }

function formatDate(d) {
  if(!d) return '';
  const dt=new Date(d+'T00:00:00');
  const now=new Date();
  const td=new Date(now.toDateString());
  const yd=new Date(td); yd.setDate(yd.getDate()-1);
  if(dt.toDateString()===td.toDateString()) return 'Today';
  if(dt.toDateString()===yd.toDateString()) return 'Yesterday';
  return dt.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}

function genId() { return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

function hashStr(str) {
  let h=0;
  for(let i=0;i<str.length;i++) h=(Math.imul(31,h)+str.charCodeAt(i))|0;
  return h.toString(36);
}

const LS = {
  get(k,d=null){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch{return d;} },
  set(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch{} },
  del(k){ localStorage.removeItem(k); }
};

let _toastTimer;
function showToast(msg, type='ok') {
  const t=$('toast'); clearTimeout(_toastTimer);
  t.textContent=msg; t.className=`toast ${type} show`;
  _toastTimer=setTimeout(()=>t.className='toast',3000);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
}
