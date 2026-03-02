// ════════════════════════════════════════════════════════════════
// Code.gs — LedgrX Google Apps Script Backend
//
// DEPLOY INSTRUCTIONS:
//   1. Open your Google Sheet → Extensions → Apps Script
//   2. Paste this entire file, replacing any existing code
//   3. Save (Ctrl+S / Cmd+S)
//   4. Click Deploy → New Deployment → Web App
//   5. Execute as: Me  |  Who has access: Anyone
//   6. Click Deploy → Authorize → Copy the Web App URL
//   7. Paste the URL into LedgrX on first launch
//
// SHEET STRUCTURE (create these tabs manually first):
//   Users        → email | name | createdAt
//   OTPs         → email | otp | expiresAt | used
//   Transactions → id | email | type | amount | category | description | date | note | timestamp
//   Sessions     → token | email | expiresAt
// ════════════════════════════════════════════════════════════════

const SS = SpreadsheetApp.getActiveSpreadsheet();

// ── Sheet helpers ────────────────────────────────────────────────
function sheet(name) {
  const s = SS.getSheetByName(name);
  if (!s) throw new Error('Sheet "' + name + '" not found. Did you create all 4 tabs?');
  return s;
}

function sheetData(name) {
  const s = sheet(name);
  const data = s.getDataRange().getValues();
  if (data.length < 2) return { headers: data[0] || [], rows: [] };
  return { headers: data[0], rows: data.slice(1) };
}

// ── Response helpers ─────────────────────────────────────────────
function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
function ok(extra)  { return respond(Object.assign({ success: true },  extra || {})); }
function err(msg)   { return respond({ success: false, error: msg }); }

// ── Entry points ─────────────────────────────────────────────────
function doGet(e)  { return route(e); }
function doPost(e) {
  try   { e.body = JSON.parse(e.postData.contents); }
  catch { return err('Invalid JSON body'); }
  return route(e);
}

function route(e) {
  const action = (e.parameter && e.parameter.action) ||
                 (e.body      && e.body.action);
  try {
    switch (action) {
      // Auth
      case 'register':        return handleRegister(e.body);
      case 'sendOTP':         return handleSendOTP(e.body);
      case 'verifyOTP':       return handleVerifyOTP(e.body);
      case 'logout':          return handleLogout(e.body);
      case 'validateSession': return handleValidateSession(e.body || e.parameter);
      // Transactions
      case 'addTransaction':   return handleAddTxn(e.body);
      case 'getTransactions':  return handleGetTxns(e.body || e.parameter);
      case 'deleteTransaction': return handleDeleteTxn(e.body);
      case 'bulkSync':         return handleBulkSync(e.body);
      // Health check
      case 'ping': return ok({ message: 'LedgrX backend is live!' });
      default:     return err('Unknown action: ' + action);
    }
  } catch (ex) {
    return err('Server error: ' + ex.message);
  }
}

// ════════════════════════════════════════════════════════════════
// REGISTER
// ════════════════════════════════════════════════════════════════
function handleRegister(body) {
  const { email, name } = body || {};
  if (!email || !name) return err('email and name are required');
  if (!isValidEmail(email)) return err('Invalid email address');

  const { rows } = sheetData('Users');
  if (rows.some(r => r[0] === email)) return err('Account already exists. Please sign in.');

  sheet('Users').appendRow([email, name, new Date().toISOString()]);
  return ok({ message: 'Account created! Check your email for the sign-in code.' });
}

// ════════════════════════════════════════════════════════════════
// SEND OTP
// ════════════════════════════════════════════════════════════════
function handleSendOTP(body) {
  const { email } = body || {};
  if (!email) return err('Email is required');

  const { rows: users } = sheetData('Users');
  const user = users.find(r => r[0] === email);
  if (!user) return err('No account found with this email. Please register first.');

  // Generate 6-digit OTP
  const otp     = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  sheet('OTPs').appendRow([email, otp, expires.toISOString(), false]);

  // Send styled email
  try {
    MailApp.sendEmail({
      to: email,
      subject: '🔐 Your LedgrX login code: ' + otp,
      htmlBody: buildOtpEmail(user[1] || email, otp)
    });
  } catch (e) {
    return err('Could not send email: ' + e.message +
               '. Check Gmail sending limits or verify your account.');
  }

  return ok({ message: 'OTP sent to ' + email });
}

function buildOtpEmail(name, otp) {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',sans-serif">
    <div style="max-width:480px;margin:40px auto;background:#080d1a;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <div style="background:linear-gradient(135deg,#00e5a0,#4f8fff);padding:28px 32px;text-align:center">
        <span style="font-size:36px">💸</span>
        <h1 style="margin:10px 0 0;font-size:26px;color:#000;font-weight:800;letter-spacing:-0.5px">LedgrX</h1>
        <p style="margin:4px 0 0;color:rgba(0,0,0,.6);font-size:14px">Smart Expense Tracker</p>
      </div>
      <div style="padding:32px">
        <p style="color:#7080a0;margin:0 0 6px;font-size:14px">Hi <strong style="color:#e8eeff">${name}</strong>,</p>
        <p style="color:#7080a0;margin:0 0 24px;font-size:15px;line-height:1.6">
          Use the code below to sign in to LedgrX. It expires in <strong style="color:#e8eeff">10 minutes</strong>.
        </p>
        <div style="background:#0f1a2e;border:2px solid #00e5a0;border-radius:14px;padding:28px;text-align:center;margin-bottom:24px">
          <div style="font-size:46px;font-weight:800;letter-spacing:10px;color:#00e5a0;font-family:'Courier New',monospace">${otp}</div>
        </div>
        <p style="color:#334060;font-size:13px;margin:0;line-height:1.6">
          If you didn't request this, you can safely ignore this email.<br/>
          Do not share this code with anyone.
        </p>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #1a2540;text-align:center">
        <p style="color:#334060;font-size:12px;margin:0">LedgrX — Secure expense tracking</p>
      </div>
    </div>
  </body>
  </html>`;
}

// ════════════════════════════════════════════════════════════════
// VERIFY OTP
// ════════════════════════════════════════════════════════════════
function handleVerifyOTP(body) {
  const { email, otp } = body || {};
  if (!email || !otp) return err('email and otp are required');

  const s    = sheet('OTPs');
  const data = s.getDataRange().getValues();
  const now  = new Date();

  let matchRow = -1;
  // Scan from bottom to find the latest matching OTP
  for (let i = data.length - 1; i >= 1; i--) {
    const [rowEmail, rowOtp, rowExpires, rowUsed] = data[i];
    if (rowEmail === email && rowOtp.toString() === otp.toString()) {
      if (rowUsed)                         return err('OTP already used. Request a new one.');
      if (new Date(rowExpires) < now)      return err('OTP has expired. Request a new one.');
      matchRow = i + 1; // 1-indexed for Sheets API
      break;
    }
  }
  if (matchRow === -1) return err('Invalid OTP. Please check and try again.');

  // Mark OTP as used
  s.getRange(matchRow, 4).setValue(true);

  // Create 30-day session token
  const token          = Utilities.getUuid();
  const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  sheet('Sessions').appendRow([token, email, sessionExpires.toISOString()]);

  // Get user info
  const { rows: users } = sheetData('Users');
  const user = users.find(r => r[0] === email);

  return ok({
    token,
    user: { email, name: user ? user[1] : email }
  });
}

// ════════════════════════════════════════════════════════════════
// VALIDATE SESSION
// ════════════════════════════════════════════════════════════════
function handleValidateSession(params) {
  const { token } = params || {};
  if (!token || token === 'ping') {
    // ping = connectivity test from Setup screen, always return ok
    return ok({ message: 'LedgrX backend is live!' });
  }
  const auth = validateToken(token);
  if (!auth.success) return err(auth.error);
  const { rows: users } = sheetData('Users');
  const user = users.find(r => r[0] === auth.email);
  return ok({ user: { email: auth.email, name: user ? user[1] : auth.email } });
}

// ════════════════════════════════════════════════════════════════
// LOGOUT
// ════════════════════════════════════════════════════════════════
function handleLogout(body) {
  const { token } = body || {};
  if (!token) return ok();
  const s    = sheet('Sessions');
  const data = s.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) { s.deleteRow(i + 1); break; }
  }
  return ok({ message: 'Logged out' });
}

// ════════════════════════════════════════════════════════════════
// ADD TRANSACTION
// ════════════════════════════════════════════════════════════════
function handleAddTxn(body) {
  const { token, transaction: t } = body || {};
  const auth = validateToken(token);
  if (!auth.success) return err(auth.error);

  sheet('Transactions').appendRow([
    t.id, auth.email, t.type, t.amount, t.category,
    t.description || '', t.date, t.note || '', new Date().toISOString()
  ]);
  return ok();
}

// ════════════════════════════════════════════════════════════════
// GET TRANSACTIONS (for this user)
// ════════════════════════════════════════════════════════════════
function handleGetTxns(params) {
  const { token } = params || {};
  const auth = validateToken(token);
  if (!auth.success) return err(auth.error);

  const { rows } = sheetData('Transactions');
  const txns = rows
    .filter(r => r[1] === auth.email)
    .map(r => ({
      id:          r[0],
      type:        r[2],
      amount:      r[3],
      category:    r[4],
      description: r[5],
      date:        r[6] instanceof Date ? r[6].toISOString().slice(0, 10) : String(r[6]),
      note:        r[7]
    }));

  return ok({ transactions: txns });
}

// ════════════════════════════════════════════════════════════════
// DELETE TRANSACTION
// ════════════════════════════════════════════════════════════════
function handleDeleteTxn(body) {
  const { token, id } = body || {};
  const auth = validateToken(token);
  if (!auth.success) return err(auth.error);

  const s    = sheet('Transactions');
  const data = s.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id && data[i][1] === auth.email) {
      s.deleteRow(i + 1);
      return ok();
    }
  }
  return err('Transaction not found');
}

// ════════════════════════════════════════════════════════════════
// BULK SYNC — replace all this user's transactions
// ════════════════════════════════════════════════════════════════
function handleBulkSync(body) {
  const { token, transactions } = body || {};
  const auth = validateToken(token);
  if (!auth.success) return err(auth.error);
  if (!Array.isArray(transactions)) return err('transactions must be an array');

  const s    = sheet('Transactions');
  const data = s.getDataRange().getValues();

  // Delete existing rows for this user (bottom-up to preserve indices)
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === auth.email) s.deleteRow(i + 1);
  }

  // Re-insert all
  transactions.forEach(t => {
    s.appendRow([
      t.id, auth.email, t.type, t.amount, t.category,
      t.description || '', t.date, t.note || '', new Date().toISOString()
    ]);
  });

  return ok({ synced: transactions.length });
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function validateToken(token) {
  if (!token) return { success: false, error: 'No token provided' };
  const { rows } = sheetData('Sessions');
  const session  = rows.find(r => r[0] === token);
  if (!session)                        return { success: false, error: 'Invalid session. Please sign in again.' };
  if (new Date(session[2]) < new Date()) return { success: false, error: 'Session expired. Please sign in again.' };
  return { success: true, email: session[1] };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ════════════════════════════════════════════════════════════════
// SCHEDULED CLEANUP (set as daily time-driven trigger)
// Removes expired OTPs and expired sessions automatically
// ════════════════════════════════════════════════════════════════
function cleanupExpired() {
  const now = new Date();

  // Clean expired OTPs
  const otpSheet = sheet('OTPs');
  const otps     = otpSheet.getDataRange().getValues();
  for (let i = otps.length - 1; i >= 1; i--) {
    if (new Date(otps[i][2]) < now) otpSheet.deleteRow(i + 1);
  }

  // Clean expired sessions
  const sessSheet = sheet('Sessions');
  const sessions  = sessSheet.getDataRange().getValues();
  for (let i = sessions.length - 1; i >= 1; i--) {
    if (new Date(sessions[i][2]) < now) sessSheet.deleteRow(i + 1);
  }

  Logger.log('Cleanup complete. Removed expired OTPs and sessions.');
}
