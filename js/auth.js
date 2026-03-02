'use strict';

let currentUser  = null;
let pendingEmail = '';
let authMode     = 'login';
let resendTimer  = null;

const Auth = {
  switchMode(mode) {
    authMode = mode;
    document.querySelectorAll('.auth-tab').forEach((t,i) =>
      t.classList.toggle('active',(i===0&&mode==='login')||(i===1&&mode==='register'))
    );
    $('regNameWrap').classList.toggle('hidden', mode==='login');
    $('authMsg').textContent='';
  },

  async sendOTP(isResend=false) {
    const email = $('authEmail').value.trim().toLowerCase();
    const name  = !$('regNameWrap').classList.contains('hidden') ? $('regName').value.trim() : null;
    if(!email||!/^[^@]+@[^@]+\.[^@]+$/.test(email)){ $('authMsg').textContent='Enter a valid email.'; return; }
    if(authMode==='register'&&!name){ $('authMsg').textContent='Enter your full name.'; return; }

    pendingEmail = email;
    const btn=$('sendOtpBtn');
    btn.disabled=true; btn.innerHTML='<span class="spin"></span> Sending…';
    $('authMsg').textContent='';

    try {
      if(authMode==='register') await API.register(email,name);
      await API.sendOTP(email);
      $('authEmailStep').classList.add('hidden');
      $('authOtpStep').classList.remove('hidden');
      $('otpSentTo').textContent=`Code sent to ${email} — check inbox & spam.`;
      document.querySelectorAll('.otp-box').forEach(b=>{b.value='';b.classList.remove('filled');});
      document.querySelectorAll('.otp-box')[0].focus();
      $('otpMsg').textContent='';
      if(!isResend) Auth._startResend();
    } catch(e) { $('authMsg').textContent=e.message; }

    btn.disabled=false; btn.innerHTML='Send OTP →';
  },

  otpNext(el,idx) {
    el.value=el.value.replace(/\D/,'').slice(0,1);
    el.classList.toggle('filled',!!el.value);
    if(el.value&&idx<5) document.querySelectorAll('.otp-box')[idx+1].focus();
    if(idx===5&&el.value) Auth.verifyOTP();
  },

  otpBack(e,el,idx) {
    if(e.key==='Backspace'&&!el.value&&idx>0){
      const b=document.querySelectorAll('.otp-box');
      b[idx-1].value=''; b[idx-1].classList.remove('filled'); b[idx-1].focus();
    }
  },

  async verifyOTP() {
    const otp=Array.from(document.querySelectorAll('.otp-box')).map(b=>b.value).join('');
    if(otp.length!==6){ $('otpMsg').textContent='Enter all 6 digits.'; return; }
    const btn=$('verifyBtn');
    btn.disabled=true; btn.innerHTML='<span class="spin"></span> Verifying…';
    $('otpMsg').textContent='';
    try {
      const res=await API.verifyOTP(pendingEmail,otp);
      currentUser={email:res.user.email,name:res.user.name,token:res.token};
      LS.set('lx_session',currentUser);
      App.loadLocalData();
      Lock.show();
    } catch(e) {
      $('otpMsg').textContent=e.message;
      document.querySelectorAll('.otp-box').forEach(b=>{b.value='';b.classList.remove('filled');});
      document.querySelectorAll('.otp-box')[0].focus();
    }
    btn.disabled=false; btn.innerHTML='Verify &amp; Sign In';
  },

  backToEmail() {
    $('authOtpStep').classList.add('hidden');
    $('authEmailStep').classList.remove('hidden');
    clearInterval(resendTimer);
  },

  _startResend(s=60) {
    $('resendBtn').disabled=true;
    const tick=()=>{
      $('resendTimer').textContent=`Resend in ${s}s`; s--;
      if(s<0){ clearInterval(resendTimer); $('resendTimer').textContent=''; $('resendBtn').disabled=false; }
    };
    tick(); resendTimer=setInterval(tick,1000);
  },

  async fullLogout() {
    if(currentUser?.token){ try{ await API.logout(currentUser.token); }catch{} }
    LS.del('lx_session');
    currentUser=null; transactions=[];
    $('app').classList.remove('active');
    $('authEmailStep').classList.remove('hidden');
    $('authOtpStep').classList.add('hidden');
    $('authMsg').textContent='';
    showScreen('authScreen');
  }
};
