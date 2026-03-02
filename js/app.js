'use strict';

let transactions=[];

const App = {
  activeTab:'home',

  onEnter() {
    $('sName').textContent=currentUser.name||'User';
    $('sEmail').textContent=currentUser.email||'—';
    Settings.refresh();
    Transactions.populateCats();
    App.renderDash();
    Transactions.renderLedger();
    Reports.quickDate(7,$('qd7'));
    Sync.validateSession();
  },

  loadLocalData() { transactions=LS.get('lx_txn_'+hashStr(currentUser.email),[]); },
  saveLocal()     { LS.set('lx_txn_'+hashStr(currentUser.email),transactions); },

  switchTab(tab) {
    App.activeTab=tab;
    document.querySelectorAll('.tpanel').forEach(p=>p.classList.remove('active'));
    $('tp-'+tab).classList.add('active');
    document.querySelectorAll('.nbtn').forEach(b=>b.classList.remove('active'));
    $('nb-'+tab)?.classList.add('active');
    if(tab==='reports') Reports.render();
  },

  renderDash() {
    const inc=transactions.filter(t=>t.type==='credit').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const exp=transactions.filter(t=>t.type==='debit').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const bal=inc-exp;
    $('dBal').textContent=bal.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
    $('dInc').textContent=fmt(inc); $('dExp').textContent=fmt(exp);
    App._renderCats(); App._renderRecent();
  },

  _renderCats() {
    const map={};
    transactions.forEach(t=>map[t.category]=(map[t.category]||0)+1);
    const sorted=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);
    $('qcats').innerHTML=sorted.length
      ?sorted.map(([c])=>`<div class="ccat" onclick="App.filterByCat('${c}')">${CAT_EMOJI[c]||'💳'} ${c}</div>`).join('')
      :'<span class="empty-hint">No data yet</span>';
  },

  _renderRecent() {
    const recent=[...transactions].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
    $('recentList').innerHTML=recent.length
      ?recent.map(Transactions._card).join('')
      :'<div class="empty"><div class="empty-ico">💫</div><p>No transactions yet.<br/>Tap <strong>+</strong> to add your first!</p></div>';
  },

  filterByCat(cat) { App.switchTab('ledger'); $('srch').value=cat; Transactions.renderLedger(); }
};

const UI = { showGuide(){ $('guideModal').classList.add('active'); } };

// ── INIT ────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{

  // Check URL is configured
  if(!API.isConfigured()){
    document.body.innerHTML=`
      <div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
        background:#080d1a;font-family:'DM Sans',sans-serif;padding:24px;text-align:center;">
        <div style="max-width:400px">
          <div style="font-size:48px;margin-bottom:16px">⚙️</div>
          <h2 style="font-family:'Syne',sans-serif;color:#e8eeff;font-size:20px;margin-bottom:12px">Apps Script URL not set</h2>
          <p style="color:#7080a0;font-size:14px;line-height:1.7;margin-bottom:16px">
            Open <code style="background:#0f1a2e;padding:2px 6px;border-radius:4px;color:#00e5a0">js/config.js</code>
            and replace <code style="background:#0f1a2e;padding:2px 6px;border-radius:4px;color:#ff4d6d">PASTE_YOUR_APPS_SCRIPT_URL_HERE</code>
            with your actual Apps Script Web App URL.
          </p>
        </div>
      </div>`;
    return;
  }

  // Restore session
  const sess=LS.get('lx_session',null);
  if(sess&&sess.token&&sess.email){ currentUser=sess; App.loadLocalData(); Lock.show(); }
  else showScreen('authScreen');

  // Key listeners
  $('authEmail').addEventListener('keydown',e=>{ if(e.key==='Enter') Auth.sendOTP(); });

  // OTP paste
  document.querySelectorAll('.otp-box').forEach(box=>{
    box.addEventListener('paste',e=>{
      e.preventDefault();
      const paste=(e.clipboardData||window.clipboardData).getData('text').replace(/\D/g,'').slice(0,6);
      if(paste.length===6){
        document.querySelectorAll('.otp-box').forEach((b,j)=>{ b.value=paste[j]||''; b.classList.toggle('filled',!!paste[j]); });
        document.querySelectorAll('.otp-box')[5].focus();
        setTimeout(()=>Auth.verifyOTP(),200);
      }
    });
  });

  // Escape closes modals
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') ['addOverlay','detOverlay','pinModal','guideModal'].forEach(id=>$(id).classList.remove('active'));
  });
});
