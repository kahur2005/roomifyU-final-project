/**
 * RoomifyU backend — Google Apps Script Web App
 * Deploy: Execute as Me, Access: Anyone
 * Script Properties: SPREADSHEET_ID = your sheet ID
 * Run initializeRoomifySpreadsheetOnce() once from the editor after deploying.
 */

// ── Sheet names ───────────────────────────────────────────────────────────────
var SHEET_USERS            = 'user_data';
var SHEET_LOGIN_EVENTS     = 'login_attempt';
var SHEET_SESSIONS         = 'Sessions';
var SHEET_BOOKING_ROOM     = 'booking_room';
var SHEET_APPROVED_BOOKING = 'approved_booking';
var ROOM_SHEETS            = ['19f20','19f01','19f02','19f03','19f04','manuf_lab'];
var ROOM_SHEET_MAP         = {'19f20':'19f20','19f01':'19f01','19f02':'19f02','19f03':'19f03','19f04':'19f04','manuf_lab':'manuf_lab'};

// ── Column headers ────────────────────────────────────────────────────────────
var HEADERS_USERS             = ['timestamp','email','password','name'];
var HEADERS_LOGIN             = ['timestamp','email','status','role','name'];
var HEADERS_SESSIONS          = ['token','userId','expiresAt','createdAt'];
var HEADERS_BOOKING_ROOM      = ['timestamp','name','room','date','time_start','time_end','purpose','num_attend','equipments','notes','status','reject_reason'];
var HEADERS_APPROVED_BOOKING  = ['timestamp','name','room','date','time_start','time_end'];
var HEADERS_ROOM_AVAILABILITY = ['time','status'];

// Map used by sheet_() to auto-create missing sheets
var SHEET_HEADERS_MAP = (function() {
  var m = {};
  m[SHEET_USERS]            = HEADERS_USERS;
  m[SHEET_LOGIN_EVENTS]     = HEADERS_LOGIN;
  m[SHEET_SESSIONS]         = HEADERS_SESSIONS;
  m[SHEET_BOOKING_ROOM]     = HEADERS_BOOKING_ROOM;
  m[SHEET_APPROVED_BOOKING] = HEADERS_APPROVED_BOOKING;
  for (var i = 0; i < ROOM_SHEETS.length; i++) m[ROOM_SHEETS[i]] = HEADERS_ROOM_AVAILABILITY;
  return m;
})();

// ── Time slots 08:00 – 18:00 ─────────────────────────────────────────────────
var TIME_SLOTS = (function() {
  var slots = [];
  for (var h = 8; h <= 18; h++) {
    slots.push(('0'+h).slice(-2)+':00');
    if (h < 18) slots.push(('0'+h).slice(-2)+':30');
  }
  return slots;
})();

// ── Constants ─────────────────────────────────────────────────────────────────
var PROP_SPREADSHEET_ID = 'SPREADSHEET_ID';
var SESSION_MS          = 7 * 24 * 60 * 60 * 1000; // 7 days

// Hardcoded HMAC key — consistent across all executions (no script property needed).
// Change this string if you ever need to invalidate all existing passwords.
var AUTH_HMAC_KEY = 'RoomifyU-2026-PasswordKey-v2';

// Emails that always get the 'admin' role regardless of login_attempt history.
var ADMIN_EMAILS = ['arry@university.edu'];

// ─────────────────────────────────────────────────────────────────────────────
// HTTP entry points
// ─────────────────────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut_(envelope_(false, 'EMPTY_BODY'));
    }
    var body = JSON.parse(e.postData.contents);
    return jsonOut_(dispatch_(body));
  } catch (err) {
    return jsonOut_(envelope_(false, 'SERVER_ERROR', {
      message: String(err && err.message ? err.message : err)
    }));
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.health === '1') {
    return jsonOut_(envelope_(true, null, {
      ok: true,
      service: 'roomify-gas',
      spreadsheetConfigured: !!(getSpreadsheetId_() && getSs_()),
    }));
  }
  return jsonOut_(envelope_(true, null, {ok: true, hint: 'POST JSON to interact'}));
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

function dispatch_(body) {
  var a = body.action;
  if (a === 'login')                  return handleLogin_(body);
  if (a === 'userRegister')           return handleUserRegister_(body);
  if (a === 'logout')                 return handleLogout_(body);
  if (a === 'session')                return handleSession_(body);
  if (a === 'bookingsList')           return handleBookingsList_(body);
  if (a === 'bookingCreate')          return handleBookingCreate_(body);
  if (a === 'bookingApprove')         return handleBookingApprove_(body);
  if (a === 'bookingReject')          return handleBookingReject_(body);
  if (a === 'getRoomAvailability')    return handleGetRoomAvailability_(body);
  if (a === 'updateRoomAvailability') return handleUpdateRoomAvailability_(body);
  return envelope_(false, 'BAD_ACTION');
}

// ─────────────────────────────────────────────────────────────────────────────
// Core helpers
// ─────────────────────────────────────────────────────────────────────────────

function jsonOut_(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function envelope_(success, code, payload) {
  var o = success ? {ok: true} : {ok: false, error: code || 'UNKNOWN'};
  if (payload && typeof payload === 'object') {
    Object.keys(payload).forEach(function(k) { o[k] = payload[k]; });
  }
  return o;
}

function getSpreadsheetId_() {
  return PropertiesService.getScriptProperties().getProperty(PROP_SPREADSHEET_ID);
}

function getSs_() {
  var id = getSpreadsheetId_();
  if (!id) return null;
  try { return SpreadsheetApp.openById(id); } catch(e) { return null; }
}

/**
 * Returns the named sheet, auto-creating it with headers if it doesn't exist.
 * This makes all handlers resilient to missing sheets.
 */
function sheet_(name) {
  var ss = getSs_();
  if (!ss) throw new Error('SPREADSHEET_ID not configured or invalid.');
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    var headers = SHEET_HEADERS_MAP[name];
    if (headers && headers.length) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    if (ROOM_SHEETS.indexOf(name) !== -1) {
      seedRoomAvailabilitySheet_(sh);
    }
  }
  return sh;
}

function normalizeEmail_(e) {
  return String(e || '').trim().toLowerCase();
}

function hashPassword_(plain) {
  var bytes = Utilities.computeHmacSha256Signature(
    String(plain),
    AUTH_HMAC_KEY,
    Utilities.Charset.UTF_8
  );
  return hex_(bytes);
}

function hex_(bytes) {
  return bytes.map(function(b) {
    var v = (b & 0xff).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/**
 * Role resolution: ADMIN_EMAILS list takes priority over login_attempt history.
 */
function getUserRole_(email) {
  var norm = normalizeEmail_(email);
  for (var i = 0; i < ADMIN_EMAILS.length; i++) {
    if (normalizeEmail_(ADMIN_EMAILS[i]) === norm) return 'admin';
  }
  try {
    var data = sheet_(SHEET_LOGIN_EVENTS).getDataRange().getValues();
    for (var r = data.length - 1; r >= 1; r--) {
      if (normalizeEmail_(String(data[r][1])) === norm) {
        return String(data[r][3] || 'student');
      }
    }
  } catch(e) {}
  return 'student';
}

function publicUser_(u, role) {
  return {
    id: u.id, name: u.name, email: u.email,
    role: role || u.role || 'student',
    department: u.department || 'General',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// User helpers
// ─────────────────────────────────────────────────────────────────────────────

function findUserByEmail_(email) {
  var sh   = sheet_(SHEET_USERS);
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return null;
  var norm = normalizeEmail_(email);
  for (var r = 1; r < data.length; r++) {
    if (!data[r][1]) continue;
    if (normalizeEmail_(String(data[r][1])) === norm) return userRowParse_(data[r], r + 1);
  }
  return null;
}

function findUserById_(id) {
  var sh   = sheet_(SHEET_USERS);
  var data = sh.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (normalizeEmail_(String(data[r][1])) === normalizeEmail_(String(id))) {
      return userRowParse_(data[r], r + 1);
    }
  }
  return null;
}

function userRowParse_(row, rowNum) {
  return {
    id:           String(row[1]),
    name:         String(row[3] || String(row[1]).split('@')[0]),
    email:        String(row[1]),
    passwordHash: String(row[2]),
    role:         'student',
    department:   'General',
    rowNum:       rowNum || 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Session helpers
// ─────────────────────────────────────────────────────────────────────────────

function upsertSession_(token, userId, expires) {
  sheet_(SHEET_SESSIONS).appendRow([
    token, userId, expires.toISOString(), new Date().toISOString()
  ]);
}

function findActiveSession_(token) {
  if (!token) return null;
  var data = sheet_(SHEET_SESSIONS).getDataRange().getValues();
  var now  = Date.now();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] !== token) continue;
    var expire = Date.parse(String(data[i][2] || ''));
    if (!expire || expire < now) continue;
    return {userId: String(data[i][1]), expiresAtMs: expire};
  }
  return null;
}

function clearSessionToken_(token) {
  var sh   = sheet_(SHEET_SESSIONS);
  var data = sh.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === token) { sh.deleteRow(i + 1); break; }
  }
}

function requireSessionUser_(body) {
  if (!getSs_()) return {err: envelope_(false, 'BACKEND_DISABLED')};
  var sess = findActiveSession_(body && body.token);
  if (!sess) return {err: envelope_(false, 'INVALID_SESSION')};
  var user = findUserById_(sess.userId);
  if (!user) return {err: envelope_(false, 'USER_NOT_FOUND')};
  return {user: user};
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleLogin_(body) {
  if (!getSs_()) return envelope_(false, 'BACKEND_DISABLED');

  var email    = String(body.email    || '').trim();
  var password = String(body.password || '');

  function fail(code) {
    try {
      sheet_(SHEET_LOGIN_EVENTS).appendRow([new Date(), normalizeEmail_(email), 'failed', 'unknown', '']);
    } catch(e) {}
    return envelope_(false, code);
  }

  if (!email || !password) return fail('BAD_CREDENTIALS');

  var user = findUserByEmail_(email);
  if (!user) return fail('BAD_CREDENTIALS');

  if (hashPassword_(password) !== user.passwordHash) return fail('BAD_CREDENTIALS');

  var token      = Utilities.getUuid() + Utilities.getUuid();
  var expires    = new Date(Date.now() + SESSION_MS);
  upsertSession_(token, user.id, expires);

  var resolvedRole = getUserRole_(user.email);
  try {
    sheet_(SHEET_LOGIN_EVENTS).appendRow([new Date(), user.email, 'success', resolvedRole, user.name]);
  } catch(e) {}

  return envelope_(true, null, {
    token:     token,
    user:      publicUser_(user, resolvedRole),
    expiresAt: expires.toISOString(),
  });
}

function handleUserRegister_(body) {
  if (!getSs_()) return envelope_(false, 'BACKEND_DISABLED');

  var email    = String(body.email    || '').trim().toLowerCase();
  var password = String(body.password || '');
  var name     = String(body.name     || '').trim();

  if (!email || !password || !name) return envelope_(false, 'MISSING_FIELDS');
  if (password.length < 8)         return envelope_(false, 'PASSWORD_TOO_SHORT');
  if (findUserByEmail_(email))     return envelope_(false, 'EMAIL_EXISTS');

  sheet_(SHEET_USERS).appendRow([new Date(), email, hashPassword_(password), name]);
  return envelope_(true, null, {message: 'User registered successfully'});
}

function handleLogout_(body) {
  try { if (body.token && getSs_()) clearSessionToken_(body.token); } catch(e) {}
  return envelope_(true, null, {loggedOut: true});
}

function handleSession_(body) {
  if (!getSs_()) return envelope_(false, 'BACKEND_DISABLED');
  var sess = findActiveSession_(body.token);
  if (!sess) return envelope_(false, 'INVALID_SESSION');
  var user = findUserById_(sess.userId);
  if (!user) return envelope_(false, 'USER_NOT_FOUND');
  var role = getUserRole_(user.email);
  return envelope_(true, null, {
    token:     body.token,
    user:      publicUser_(user, role),
    expiresAt: new Date(sess.expiresAtMs).toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleBookingCreate_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;

  var timestamp  = new Date();
  var name       = String(body.name       || auth.user.name || auth.user.email);
  var room       = String(body.room       || '');
  var date       = String(body.date       || '');
  var time_start = String(body.time_start || '');
  var time_end   = String(body.time_end   || '');
  var purpose    = String(body.purpose    || '');
  var num_attend = Number(body.num_attend) || 0;
  var equipments = body.equipments
    ? (Array.isArray(body.equipments) ? body.equipments.join(',') : String(body.equipments))
    : '';
  var notes = String(body.notes || '');

  var sh = sheet_(SHEET_BOOKING_ROOM);
  sh.appendRow([timestamp, name, room, date, time_start, time_end, purpose, num_attend, equipments, notes, 'pending', '']);
  var rowNum = sh.getLastRow();

  return envelope_(true, null, {booking: rowToBooking_(
    [timestamp, name, room, date, time_start, time_end, purpose, num_attend, equipments, notes, 'pending', ''],
    rowNum
  )});
}

function handleBookingsList_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;

  var role = getUserRole_(auth.user.email);
  var data = sheet_(SHEET_BOOKING_ROOM).getDataRange().getValues();
  var list = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row || !row[0]) continue;
    var booking = rowToBooking_(row, r + 1);
    if (role === 'admin' || booking.name === auth.user.name || booking.name === auth.user.email) {
      list.push(booking);
    }
  }
  return envelope_(true, null, {bookings: list});
}

function handleBookingApprove_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  if (getUserRole_(auth.user.email) !== 'admin') return envelope_(false, 'FORBIDDEN');

  var rowNum = Number(body.rowNum) || 0;
  if (rowNum < 2) return envelope_(false, 'BAD_REQUEST');

  var sh   = sheet_(SHEET_BOOKING_ROOM);
  var data = sh.getDataRange().getValues();
  if (rowNum > data.length) return envelope_(false, 'NOT_FOUND');

  var row = data[rowNum - 1];
  if (!row || !row[0]) return envelope_(false, 'NOT_FOUND');
  if (String(row[10]).trim().toLowerCase() !== 'pending') return envelope_(false, 'BAD_BOOKING_STATE');

  row[10] = 'confirmed';
  sh.getRange(rowNum, 1, 1, row.length).setValues([row]);
  sheet_(SHEET_APPROVED_BOOKING).appendRow([new Date(), row[1], row[2], row[3], row[4], row[5]]);

  return envelope_(true, null, {success: true, message: 'Booking approved', booking: rowToBooking_(row, rowNum)});
}

function handleBookingReject_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  if (getUserRole_(auth.user.email) !== 'admin') return envelope_(false, 'FORBIDDEN');

  var rowNum = Number(body.rowNum) || 0;
  if (rowNum < 2) return envelope_(false, 'BAD_REQUEST');

  var sh   = sheet_(SHEET_BOOKING_ROOM);
  var data = sh.getDataRange().getValues();
  if (rowNum > data.length) return envelope_(false, 'NOT_FOUND');

  var row = data[rowNum - 1];
  if (!row || !row[0]) return envelope_(false, 'NOT_FOUND');
  if (String(row[10]).trim().toLowerCase() !== 'pending') return envelope_(false, 'BAD_BOOKING_STATE');

  row[10] = 'rejected';
  row[11] = String(body.rejectReason || '');
  sh.getRange(rowNum, 1, 1, row.length).setValues([row]);

  return envelope_(true, null, {success: true, message: 'Booking rejected', booking: rowToBooking_(row, rowNum)});
}

// Google Sheets returns Date objects for date/time cells; format them to plain strings.
function formatCellDate_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val);
}

function formatCellTime_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(val);
}

function rowToBooking_(row, rowNum) {
  return {
    id:           String(rowNum),
    rowNum:       rowNum,
    timestamp:    row[0] ? new Date(row[0]).toISOString() : '',
    name:         String(row[1]  || ''),
    room:         String(row[2]  || ''),
    roomName:     String(row[2]  || ''),
    date:         formatCellDate_(row[3]),
    time_start:   formatCellTime_(row[4]),
    time_end:     formatCellTime_(row[5]),
    purpose:      String(row[6]  || ''),
    num_attend:   Number(row[7]) || 0,
    equipments:   String(row[8]  || ''),
    notes:        String(row[9]  || ''),
    status:       String(row[10] || 'pending'),
    rejectReason: String(row[11] || ''),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Room availability handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleGetRoomAvailability_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;

  var roomId = String(body.roomId || '');
  var date   = String(body.date   || '');
  if (!roomId || !ROOM_SHEET_MAP[roomId]) return envelope_(false, 'INVALID_ROOM');
  if (!date) return envelope_(false, 'MISSING_DATE');

  var data         = sheet_(ROOM_SHEET_MAP[roomId]).getDataRange().getValues();
  var availability = [];
  for (var r = 1; r < data.length; r++) {
    availability.push({time: String(data[r][0] || ''), status: String(data[r][1] || 'available')});
  }
  return envelope_(true, null, {availability: availability, roomId: roomId, date: date});
}

function handleUpdateRoomAvailability_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  if (getUserRole_(auth.user.email) !== 'admin') return envelope_(false, 'FORBIDDEN');

  var roomId = String(body.roomId || '');
  var time   = String(body.time   || '');
  var status = String(body.status || 'available');
  if (!roomId || !ROOM_SHEET_MAP[roomId]) return envelope_(false, 'INVALID_ROOM');
  if (!time) return envelope_(false, 'MISSING_TIME');

  var sh   = sheet_(ROOM_SHEET_MAP[roomId]);
  var data = sh.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === time) {
      data[r][1] = status;
      sh.getRange(r + 1, 1, 1, 2).setValues([data[r]]);
      return envelope_(true, null, {success: true});
    }
  }
  return envelope_(false, 'TIME_SLOT_NOT_FOUND');
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialization — run once from the Apps Script editor
// ─────────────────────────────────────────────────────────────────────────────

function initializeRoomifySpreadsheetOnce() {
  var id = PropertiesService.getScriptProperties().getProperty(PROP_SPREADSHEET_ID);
  if (!id) throw new Error('Set Script Property SPREADSHEET_ID first.');
  var ss = SpreadsheetApp.openById(id);

  upsertSheetWithHeaders_(ss, SHEET_USERS,            HEADERS_USERS);
  upsertSheetWithHeaders_(ss, SHEET_LOGIN_EVENTS,     HEADERS_LOGIN);
  upsertSheetWithHeaders_(ss, SHEET_SESSIONS,         HEADERS_SESSIONS);
  upsertSheetWithHeaders_(ss, SHEET_BOOKING_ROOM,     HEADERS_BOOKING_ROOM);
  upsertSheetWithHeaders_(ss, SHEET_APPROVED_BOOKING, HEADERS_APPROVED_BOOKING);

  for (var i = 0; i < ROOM_SHEETS.length; i++) {
    upsertSheetWithHeaders_(ss, ROOM_SHEETS[i], HEADERS_ROOM_AVAILABILITY);
    seedRoomAvailabilitySheet_(ss.getSheetByName(ROOM_SHEETS[i]));
  }

  // Always re-seed demo users so their hashes match the current AUTH_HMAC_KEY.
  forceSeedDemoUsers_(ss.getSheetByName(SHEET_USERS));
  SpreadsheetApp.flush();
  return 'OK — all sheets ready, demo users re-seeded with current hash.';
}

function upsertSheetWithHeaders_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function seedRoomAvailabilitySheet_(sheet) {
  if (sheet.getLastRow() > 1) return;
  var rows = TIME_SLOTS.map(function(t) { return [t, 'available']; });
  if (rows.length) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

/**
 * Removes existing demo-user rows and re-inserts them with the current hash.
 * Safe to call repeatedly.
 */
function forceSeedDemoUsers_(sh) {
  var demoEmails = {
    'arry@university.edu':  'Arry Admin',
    'jesse@university.edu': 'Jesse Pinkman',
    'panji@university.edu': 'Prof. Panji',
  };
  var data = sh.getDataRange().getValues();
  // Delete existing demo rows bottom-to-top to keep indices valid.
  for (var r = data.length - 1; r >= 1; r--) {
    if (demoEmails[normalizeEmail_(String(data[r][1]))] !== undefined) {
      sh.deleteRow(r + 1);
    }
  }
  var hash = hashPassword_('12345678');
  var emails = Object.keys(demoEmails);
  for (var i = 0; i < emails.length; i++) {
    sh.appendRow([new Date(), emails[i], hash, demoEmails[emails[i]]]);
  }
}
