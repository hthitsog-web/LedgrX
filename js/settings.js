'use strict';

const Settings = {
  refresh() {
    $('sName').textContent=currentUser?.name||'—';
    $('sEmail').textContent=currentUser?.email||'—';
    Settings._refreshBioUI();
  },
  openPinModal() { $('cpOld').value=''; $('cpNew').value=''; $('cpConf').value=''; $('cpMsg').textContent=''; $('pinModal').classList.add('active'); },
  closePinModal() { $('pinModal').classList.remove('active'); },
  doChangePin() {
    const old=$('cpOld').value,nw=$('cpNew').value,cf=$('cpConf').value;
    const meta=LS.get('lx_meta_'+hashStr(currentUser.email),{});
    if(meta.pin&&meta.pin!==old){ $('cpMsg').textContent='Current PIN is incorrect.'; return; }
    if(!/^\d{4}$/.test(nw)){ $('cpMsg').textContent='PIN must be 4 digits.'; return; }
    if(nw!==cf){ $('cpMsg').textContent='PINs do not match.'; return; }
    meta.pin=nw; LS.set('lx_meta_'+hashStr(currentUser.email),meta);
    Settings.closePinModal(); showToast('PIN updated! 🔑');
  },
  async toggleBio() {
    const meta=LS.get('lx_meta_'+hashStr(currentUser.email),{});
    if(meta.bioEnabled){ meta.bioEnabled=false; meta.credId=null; LS.set('lx_meta_'+hashStr(currentUser.email),meta); Settings._refreshBioUI(); showToast('Biometric disabled'); return; }
    if(!window.PublicKeyCredential){ showToast('Not supported on this device','bad'); return; }
    try {
      const cred=await navigator.credentials.create({publicKey:{
        challenge:crypto.getRandomValues(new Uint8Array(32)),
        rp:{name:'LedgrX',id:location.hostname||'localhost'},
        user:{id:Uint8Array.from(currentUser.email,c=>c.charCodeAt(0)),name:currentUser.email,displayName:currentUser.name||currentUser.email},
        pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
        authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required'},
        timeout:60000
      }});
      meta.bioEnabled=true; meta.credId=btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
      LS.set('lx_meta_'+hashStr(currentUser.email),meta);
      Settings._refreshBioUI(); showToast('Biometric enabled! 🔐');
    } catch{ showToast('Biometric registration failed','bad'); }
  },
  _refreshBioUI() {
    const meta=LS.get('lx_meta_'+hashStr(currentUser.email),{});
    $('bioTog').classList.toggle('on',!!meta.bioEnabled);
    $('bioSetDesc').textContent=meta.bioEnabled?'Biometric unlock active ✓':'Enable fingerprint / Face ID';
  },
  exportCSV() {
    if(!transactions.length){ showToast('No data to export','bad'); return; }
    const hdr=['ID','Type','Amount','Category','Description','Date','Note'];
    const rows=transactions.map(t=>[t.id,t.type,t.amount,t.category,t.description||'',t.date,t.note||'']);
    const csv=[hdr,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`ledgrx_${currentUser.email.split('@')[0]}_${today()}.csv`;
    a.click(); URL.revokeObjectURL(a.href); showToast('CSV exported 📤');
  },
  clearLocal() {
    if(!confirm('Clear locally cached transactions?')) return;
    transactions=[]; App.saveLocal(); App.renderDash(); Transactions.renderLedger(); showToast('Cache cleared');
  }
};
