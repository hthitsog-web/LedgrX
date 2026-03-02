'use strict';

const Sync = {
  setStatus(state) {
    const dot=$('chipDot');
    dot.className='chip-dot '+state;
    $('chipLbl').textContent={synced:'Synced',syncing:'Syncing…',offline:'Local',error:'Error'}[state]||'Local';
  },
  async pushOne(txn) {
    if(!currentUser?.token) return;
    try{ await API.addTransaction(currentUser.token,txn); Sync.setStatus('synced'); }
    catch{ Sync.setStatus('error'); }
  },
  async deleteOne(id) {
    if(!currentUser?.token) return;
    try{ await API.deleteTransaction(currentUser.token,id); }catch{}
  },
  async now() {
    if(!currentUser?.token){ showToast('Not signed in','bad'); return; }
    Sync.setStatus('syncing');
    try{ await API.bulkSync(currentUser.token,transactions); Sync.setStatus('synced'); showToast('Synced to Google Sheet ✅'); }
    catch(e){ Sync.setStatus('error'); showToast('Sync failed: '+e.message,'bad'); }
  },
  async fetchAll() {
    if(!currentUser?.token){ showToast('Not signed in','bad'); return; }
    Sync.setStatus('syncing'); showToast('Fetching…','info');
    try{
      const res=await API.getTransactions(currentUser.token);
      if(res.transactions?.length){
        const remoteIds=new Set(res.transactions.map(t=>t.id));
        const localOnly=transactions.filter(t=>!remoteIds.has(t.id));
        transactions=[...res.transactions,...localOnly];
        App.saveLocal(); App.renderDash(); Transactions.renderLedger();
        showToast(`Fetched ${res.transactions.length} transactions ✅`);
      } else showToast('No data in Sheet','info');
      Sync.setStatus('synced');
    } catch(e){ Sync.setStatus('error'); showToast('Fetch failed: '+e.message,'bad'); }
  },
  async validateSession() {
    if(!currentUser?.token) return;
    try{ await API.validateSession(currentUser.token); Sync.setStatus('synced'); }
    catch(e){ if(e.message.includes('Session')||e.message.includes('expired')){ showToast('Session expired — please sign in again','bad'); setTimeout(()=>Auth.fullLogout(),2500); } }
  }
};
