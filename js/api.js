'use strict';

const API = (() => {

  function getUrl() {
    return CONFIG.SCRIPT_URL;
  }

  function isConfigured() {
    const url = getUrl();
    return url && url !== 'PASTE_YOUR_APPS_SCRIPT_URL_HERE' && url.startsWith('https://');
  }

  async function call(payload, method='POST') {
    const url = getUrl();
    if(!url) throw new Error('No Apps Script URL configured.');

    let fetchUrl = url;
    let fetchOpts = {};

    if(method==='GET') {
      fetchUrl += '?' + new URLSearchParams(payload).toString();
      fetchOpts = { method:'GET' };
    } else {
      fetchOpts = { method:'POST', body:JSON.stringify(payload) };
    }

    const res  = await fetch(fetchUrl, fetchOpts);
    const json = await res.json();
    if(json.success===false) throw new Error(json.error||'Server error');
    return json;
  }

  return {
    isConfigured,
    getUrl,
    register:          (email,name)        => call({action:'register',email,name}),
    sendOTP:           (email)             => call({action:'sendOTP',email}),
    verifyOTP:         (email,otp)         => call({action:'verifyOTP',email,otp}),
    logout:            (token)             => call({action:'logout',token}),
    validateSession:   (token)             => call({action:'validateSession',token},'GET'),
    addTransaction:    (token,transaction) => call({action:'addTransaction',token,transaction}),
    getTransactions:   (token)             => call({action:'getTransactions',token},'GET'),
    deleteTransaction: (token,id)          => call({action:'deleteTransaction',token,id}),
    bulkSync:          (token,transactions)=> call({action:'bulkSync',token,transactions}),
  };
})();
