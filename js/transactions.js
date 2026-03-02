'use strict';

let txnFilter='all', txnType='credit';

const Transactions = {
  populateCats() {
    const sel=$('mCat'); sel.innerHTML='';
    [...CATS.credit,...CATS.debit].forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
    Transactions._filterCats();
  },
  _filterCats() {
    const cats=CATS[txnType];
    Array.from($('mCat').options).forEach(o=>o.style.display=cats.includes(o.value)?'':'none');
    const first=cats.find(c=>Array.from($('mCat').options).find(o=>o.value===c));
    if(first) $('mCat').value=first;
  },
  openAdd() {
    $('mDate').value=today(); $('mAmt').value=''; $('mDesc').value=''; $('mNote').value='';
    Transactions.setType('credit'); $('addOverlay').classList.add('active');
  },
  maybeClose(e){ if(e.target===$('addOverlay')) $('addOverlay').classList.remove('active'); },
  setType(t) {
    txnType=t;
    $('tCredit').classList.toggle('active',t==='credit');
    $('tDebit').classList.toggle('active',t==='debit');
    Transactions._filterCats();
  },
  async save() {
    const amt=parseFloat($('mAmt').value);
    const desc=$('mDesc').value.trim();
    if(!amt||amt<=0){ showToast('Enter a valid amount','bad'); return; }
    if(!desc){ showToast('Enter a description','bad'); return; }
    const txn={id:genId(),type:txnType,amount:amt,description:desc,category:$('mCat').value,date:$('mDate').value||today(),note:$('mNote').value.trim(),email:currentUser.email};
    transactions.unshift(txn); App.saveLocal();
    $('addOverlay').classList.remove('active');
    App.renderDash(); Transactions.renderLedger();
    showToast(txnType==='credit'?'Income added! 🎉':'Expense added! 🎉');
    Sync.pushOne(txn);
  },
  openDetail(id) {
    const t=transactions.find(x=>x.id===id); if(!t) return;
    $('detContent').innerHTML=`
      <div class="det-amt">
        <div style="font-size:11px;color:var(--txt2);margin-bottom:4px;font-weight:600;text-transform:uppercase">${t.type==='credit'?'Income':'Expense'}</div>
        <div class="det-amt-val ${t.type==='credit'?'acc':'red2'}">${t.type==='credit'?'+':'-'}${fmt(t.amount)}</div>
      </div>
      <div>
        <div class="det-row"><div class="det-lbl">Description</div><div class="det-val">${t.description||'—'}</div></div>
        <div class="det-row"><div class="det-lbl">Category</div><div class="det-val">${CAT_EMOJI[t.category]||''} ${t.category}</div></div>
        <div class="det-row"><div class="det-lbl">Date</div><div class="det-val">${formatDate(t.date)}</div></div>
        <div class="det-row"><div class="det-lbl">Note</div><div class="det-val">${t.note||'—'}</div></div>
      </div>
      <button class="del-btn" onclick="Transactions.delete('${t.id}')">🗑️ Delete Transaction</button>`;
    $('detOverlay').classList.add('active');
  },
  maybeCloseDet(e){ if(e.target===$('detOverlay')) $('detOverlay').classList.remove('active'); },
  async delete(id) {
    if(!confirm('Delete this transaction?')) return;
    transactions=transactions.filter(x=>x.id!==id);
    App.saveLocal(); $('detOverlay').classList.remove('active');
    App.renderDash(); Transactions.renderLedger();
    showToast('Transaction deleted'); Sync.deleteOne(id);
  },
  setFilter(el,type) {
    txnFilter=type;
    document.querySelectorAll('.fchip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active'); Transactions.renderLedger();
  },
  renderLedger() {
    const q=($('srch').value||'').toLowerCase().trim();
    let txns=[...transactions];
    if(txnFilter!=='all') txns=txns.filter(t=>t.type===txnFilter);
    if(q) txns=txns.filter(t=>(t.description||'').toLowerCase().includes(q)||(t.category||'').toLowerCase().includes(q)||(t.note||'').toLowerCase().includes(q));
    txns.sort((a,b)=>new Date(b.date)-new Date(a.date));
    if(!txns.length){ $('ldgList').innerHTML='<div class="empty"><div class="empty-ico">🔍</div><p>No transactions found.</p></div>'; return; }
    const grouped={};
    txns.forEach(t=>{ if(!grouped[t.date]) grouped[t.date]=[]; grouped[t.date].push(t); });
    $('ldgList').innerHTML=Object.entries(grouped).sort((a,b)=>new Date(b[0])-new Date(a[0])).map(([d,ts])=>`<div class="ldg-grp"><div class="ldg-date">${formatDate(d)}</div><div class="txnl">${ts.map(Transactions._card).join('')}</div></div>`).join('');
  },
  _card(t) {
    return `<div class="txni" onclick="Transactions.openDetail('${t.id}')">
      <div class="txni-icon ${t.type}">${CAT_EMOJI[t.category]||'💳'}</div>
      <div class="txni-info">
        <div class="txni-desc">${t.description||t.category}</div>
        <div class="txni-meta"><span>${t.category}</span><div class="txni-dot"></div><span>${formatDate(t.date)}</span>${t.note?`<div class="txni-dot"></div><span>${t.note}</span>`:''}</div>
      </div>
      <div class="txni-amt ${t.type}">${t.type==='credit'?'+':'-'}${fmt(t.amount)}</div>
    </div>`;
  }
};
