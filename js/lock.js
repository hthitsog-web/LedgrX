'use strict';

let pinBuf='';

const Lock = {
  show() {
    if(!currentUser){ showScreen('authScreen'); return; }
    $('lockName').textContent=currentUser.name||'Welcome back!';
    $('lockEmail').textContent=currentUser.email;
    pinBuf=''; Lock._dots(); $('lockMsg').textContent='';
    const meta=LS.get('lx_meta_'+hashStr(currentUser.email),{});
    const bioOk=window.PublicKeyCredential&&meta.bioEnabled&&meta.credId;
    $('bioBtn').classList.toggle('hidden',!bioOk);
    $('bioKey').textContent=bioOk?'🔐':'';
    showScreen('lockScreen');
  },

  key(n){ if(pinBuf.length>=4)return; pinBuf+=n; Lock._dots(); if(pinBuf.length===4)setTimeout(Lock._check,130); },
  del(){ pinBuf=pinBuf.slice(0,-1); Lock._dots(); },
  _dots(){ for(let i=0;i<4;i++) $('pd'+i).classList.toggle('filled',i<pinBuf.length); },

  _check() {
    const meta=LS.get('lx_meta_'+hashStr(currentUser.email),{});
    if(!meta.pin){ Lock._enter(); return; }
    if(meta.pin===pinBuf){ Lock._enter(); }
    else {
      $('lockMsg').textContent='Incorrect PIN';
      document.querySelectorAll('.pin-dot').forEach(d=>d.classList.add('shake'));
      setTimeout(()=>{ pinBuf=''; Lock._dots(); $('lockMsg').textContent=''; document.querySelectorAll('.pin-dot').forEach(d=>d.classList.remove('shake')); },800);
    }
  },

  async tryBio() {
    const meta=LS.get('lx_meta_'+hashStr(currentUser.email),{});
    if(!meta.bioEnabled||!meta.credId){ showToast('Biometric not set up','bad'); return; }
    try {
      const credId=Uint8Array.from(atob(meta.credId),c=>c.charCodeAt(0));
      const a=await navigator.credentials.get({publicKey:{
        challenge:crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials:[{id:credId,type:'public-key'}],
        timeout:60000,userVerification:'required'
      }});
      if(a) Lock._enter();
    } catch{ $('lockMsg').textContent='Biometric failed — use PIN'; }
  },

  _enter() {
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    $('app').classList.add('active');
    App.onEnter();
  },

  lockApp() { $('app').classList.remove('active'); Lock.show(); },

  forgotPin() {
    if(!confirm('Reset PIN? You will be signed out and must log in again via OTP.')) return;
    const meta=LS.get('lx_meta_'+hashStr(currentUser.email),{});
    meta.pin=null; meta.bioEnabled=false; meta.credId=null;
    LS.set('lx_meta_'+hashStr(currentUser.email),meta);
    Auth.fullLogout();
  }
};
