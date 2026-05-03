/**
 * RoomifyU backend: 10-table spreadsheet architecture.
 *
 * Tables:
 *   1. user_data - User registration (timestamp, email, password, name)
 *   2. login_attempt - Login tracking (timestamp, email, status, role, name)
 *   3. booking_room - Pending bookings (timestamp, name, room, date, time_start, time_end, purpose, num_attend, equipments, notes, status)
 *   4. approved_booking - Approved bookings (timestamp, name, room, date, time_start, time_end)
 *   5-10. Room availability (19f20, 19f01, 19f02, 19f03, 19f04, manuf_lab) - Each has time & status
 *
 * Deploy as Web App: Execute as you, access Anyone.
 * Set Script Property SPREADSHEET_ID to your Sheet ID.
 * Run initializeRoomifySpreadsheetOnce() once from the editor.
 */

// Sheet names
var SHEET_USERS = 'user_data';
var SHEET_LOGIN_EVENTS = 'login_attempt';
var SHEET_SESSIONS = 'Sessions';
var SHEET_BOOKING_ROOM = 'booking_room';
var SHEET_APPROVED_BOOKING = 'approved_booking';

// Room availability sheets
var ROOM_SHEETS = ['19f20', '19f01', '19f02', '19f03', '19f04', 'manuf_lab'];
var ROOM_SHEET_MAP = {
  '19f20': '19f20',
  '19f01': '19f01',
  '19f02': '19f02',
  '19f03': '19f03',
  '19f04': '19f04',
  'manuf_lab': 'manuf_lab',
};

// Headers for each table
var HEADERS_USERS = ['timestamp', 'email', 'password', 'name'];
var HEADERS_LOGIN = ['timestamp', 'email', 'status', 'role', 'name'];
var HEADERS_BOOKING_ROOM = ['timestamp', 'name', 'room', 'date', 'time_start', 'time_end', 'purpose', 'num_attend', 'equipments', 'notes', 'status', 'reject_reason'];
var HEADERS_APPROVED_BOOKING = ['timestamp', 'name', 'room', 'date', 'time_start', 'time_end'];
var HEADERS_ROOM_AVAILABILITY = ['time', 'status'];

// Time slots: 8:00, 8:30, 9:00, ..., 18:00
var TIME_SLOTS = [];
(function() {
  for (var h = 8; h <= 18; h++) {
    TIME_SLOTS.push(('0' + h).slice(-2) + ':00');
    if (h < 18) TIME_SLOTS.push(('0' + h).slice(-2) + ':30');
  }
})();

var PROP_SPREADSHEET_ID = 'SPREADSHEET_ID';
var PROP_AUTH_SALT = 'AUTH_PASSWORD_SALT';

var SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function jsonOut_(obj) {
  var payload = ContentService.createTextOutput(JSON.stringify(obj));
  payload.setMimeType(ContentService.MimeType.JSON);
  return payload;
}

function doPost(e) {
  var cors = {};
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut_(envelope_(false, 'EMPTY_BODY'));
    }
    var body = JSON.parse(e.postData.contents);
    var result = dispatch_(body, e);
    return jsonOut_(result);
  } catch (err) {
    return jsonOut_(envelope_(false, 'SERVER_ERROR', { message: String(err && err.message ? err.message : err) }));
  }
}

/** GET /exec?health=1 */
function doGet(e) {
  if (e && e.parameter && e.parameter.health === '1') {
    return jsonOut_(envelope_(true, null, {
      ok: true,
      service: 'roomify-gas',
      spreadsheetConfigured: !!(getSpreadsheetId_() && getSs_()),
    }));
  }
  return jsonOut_(envelope_(true, null, { ok: true, hint: 'POST JSON for login|logout|session' }));
}

function envelope_(success, code, payload) {
  var o = success ? { ok: true } : { ok: false, error: code || 'UNKNOWN' };
  if (payload && typeof payload === 'object') {
    Object.keys(payload).forEach(function (k) {
      o[k] = payload[k];
    });
  }
  return o;
}

function dispatch_(body, e) {
  var action = body.action;
  if (action === 'login') return handleLogin_(body, e);
  if (action === 'userRegister') return handleUserRegister_(body);
  if (action === 'logout') return handleLogout_(body);
  if (action === 'session') return handleSession_(body);
  if (action === 'bookingsList') return handleBookingsList_(body);
  if (action === 'bookingCreate') return handleBookingCreate_(body);
  if (action === 'bookingApprove') return handleBookingApprove_(body);
  if (action === 'bookingReject') return handleBookingReject_(body);
  if (action === 'getRoomAvailability') return handleGetRoomAvailability_(body);
  if (action === 'updateRoomAvailability') return handleUpdateRoomAvailability_(body);
  return envelope_(false, 'BAD_ACTION');
}

function getSpreadsheetId_() {
  return PropertiesService.getScriptProperties().getProperty(PROP_SPREADSHEET_ID);
}

function getSs_() {
  var id = getSpreadsheetId_();
  if (!id) return null;
  return SpreadsheetApp.openById(id);
}

function sheet_(name) {
  var ss = getSs_();
  if (!ss) throw new Error('SPREADSHEET_ID Script Property missing or invalid.');
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Missing sheet tab: ' + name);
  return sh;
}

function ensureAuthSalt_() {
  var props = PropertiesService.getScriptProperties();
  var salt = props.getProperty(PROP_AUTH_SALT);
  if (!salt) {
    salt = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(PROP_AUTH_SALT, salt);
  }
  return salt;
}

function hashPassword_(plain) {
  var salt = ensureAuthSalt_();
  var bytes = Utilities.computeHmacSha256Signature(plain, salt, Utilities.Charset.UTF_8);
  return hex_(bytes);
}

function hex_(bytes) {
  return bytes.map(function (b) {
    var v = (b & 0xff).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function uaFrom_(body) {
  return (body && body.client && body.client.userAgent) || '';
}

/**
 * Manual run from editor once: ensures all 10 tabs are initialized.
 */
function initializeRoomifySpreadsheetOnce() {
  ensureAuthSalt_();
  var id = PropertiesService.getScriptProperties().getProperty(PROP_SPREADSHEET_ID);
  if (!id) throw new Error('Set Script Property SPREADSHEET_ID to your Sheet ID first.');
  var ss = SpreadsheetApp.openById(id);
  
  // Create main tables
  upsertSheetWithHeaders_(ss, SHEET_USERS, HEADERS_USERS);
  upsertSheetWithHeaders_(ss, SHEET_LOGIN_EVENTS, HEADERS_LOGIN);
  upsertSheetWithHeaders_(ss, SHEET_SESSIONS, ['token', 'userId', 'expiresAt', 'createdAt']);
  upsertSheetWithHeaders_(ss, SHEET_BOOKING_ROOM, HEADERS_BOOKING_ROOM);
  upsertSheetWithHeaders_(ss, SHEET_APPROVED_BOOKING, HEADERS_APPROVED_BOOKING);
  
  // Create room availability tables
  for (var i = 0; i < ROOM_SHEETS.length; i++) {
    upsertSheetWithHeaders_(ss, ROOM_SHEETS[i], HEADERS_ROOM_AVAILABILITY);
    seedRoomAvailabilitySheet_(ss.getSheetByName(ROOM_SHEETS[i]));
  }
  
  // Seed demo users
  seedDemoUsers_(ss.getSheetByName(SHEET_USERS));
  
  SpreadsheetApp.flush();
  return 'OK: All 10 tables initialized (user_data, login_attempt, Sessions, booking_room, approved_booking, 19f20, 19f01, 19f02, 19f03, 19f04, manuf_lab).';
}

function upsertSheetWithHeaders_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var range = sh.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
}

function seedDemoUsers_(usersSheet) {
  if (usersSheet.getLastRow() > 1) return;
  var demo = [
    [new Date(), 'arry@university.edu', hashPassword_('12345678'), 'Arry Admin'],
    [new Date(), 'jesse@university.edu', hashPassword_('12345678'), 'Jesse Pinkman'],
    [new Date(), 'panji@university.edu', hashPassword_('12345678'), 'Prof. Panji'],
  ];
  usersSheet.getRange(2, 1, demo.length, demo[0].length).setValues(demo);
}

function seedRoomAvailabilitySheet_(sheet) {
  if (sheet.getLastRow() > 1) return;
  var rows = [];
  for (var i = 0; i < TIME_SLOTS.length; i++) {
    rows.push([TIME_SLOTS[i], 'available']);
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
}

function findUserByEmail_(email) {
  var sh = sheet_(SHEET_USERS);
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return null;
  var norm = normalizeEmail_(email);
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[1]) continue;
    if (normalizeEmail_(row[1]) === norm) return userRowParse_(row, r + 1);
  }
  return null;
}

function normalizeEmail_(e) {
  return String(e || '').trim().toLowerCase();
}

function userRowParse_(row, rowNum) {
  // row: [timestamp, email, password, name]
  return {
    id: String(row[1]), // email as id
    name: String(row[3] || row[1].split('@')[0]), // name or email prefix
    email: String(row[1]),
    passwordHash: String(row[2]),
    role: 'student', // default; actual role determined from login_attempt or context
    department: 'General',
    rowNum: rowNum || 0,
  };
}

function publicUser_(u, role) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: role || u.role || 'student',
    department: u.department,
  };
}

function appendLoginEvent_(email, status, role, name) {
  var sh = sheet_(SHEET_LOGIN_EVENTS);
  sh.appendRow([new Date(), email, status, role || 'student', name || '']);
}

function handleLogin_(body, e) {
  if (!getSs_()) return envelope_(false, 'BACKEND_DISABLED');
  var email = body.email || '';
  var password = body.password || '';
  var loginRole = String(body.role || 'student').trim().toLowerCase();
  var ua = uaFrom_(body);
  function failLogin(code) {
    appendLoginEvent_(normalizeEmail_(email), 'failed', loginRole, '');
    return envelope_(false, code);
  }
  if (!password) return failLogin('BAD_CREDENTIALS');
  var row = findUserByEmail_(email);
  if (!row) return failLogin('BAD_CREDENTIALS');
  var hashed = hashPassword_(password);
  if (hashed !== row.passwordHash) return failLogin('BAD_CREDENTIALS');
  var token = Utilities.getUuid() + Utilities.getUuid();
  var expires = new Date(Date.now() + SESSION_MS);
  upsertSession_(token, row.id, expires);
  appendLoginEvent_(row.email, 'success', loginRole, row.name);
  return envelope_(true, null, {
    token: token,
    user: publicUser_(row, loginRole),
    expiresAt: expires.toISOString(),
  });
}

function handleUserRegister_(body) {
  if (!getSs_()) return envelope_(false, 'BACKEND_DISABLED');
  var email = body.email || '';
  var password = body.password || '';
  var name = body.name || '';
  if (!email || !password || !name) return envelope_(false, 'MISSING_FIELDS');
  if (password.length < 8) return envelope_(false, 'PASSWORD_TOO_SHORT');
  var existing = findUserByEmail_(email);
  if (existing) return envelope_(false, 'EMAIL_EXISTS');
  var hashed = hashPassword_(password);
  var sh = sheet_(SHEET_USERS);
  sh.appendRow([new Date(), email, hashed, name]);
  return envelope_(true, null, { message: 'User registered successfully' });
}

function upsertSession_(token, userId, expires) {
  var sh = sheet_(SHEET_SESSIONS);
  sh.appendRow([token, userId, expires.toISOString(), new Date().toISOString()]);
}

function clearSessionRowsForToken_(token) {
  var sh = sheet_(SHEET_SESSIONS);
  var data = sh.getDataRange().getValues();
  var rowNum = null;
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === token) {
      rowNum = i + 1;
      break;
    }
  }
  if (!rowNum) return;
  sh.deleteRow(rowNum);
}

function handleLogout_(body) {
  var token = body.token;
  if (token && getSs_()) clearSessionRowsForToken_(token);
  return envelope_(true, null, { loggedOut: true });
}

function findActiveSession_(token) {
  if (!token) return null;
  var sh = sheet_(SHEET_SESSIONS);
  var data = sh.getDataRange().getValues();
  var now = Date.now();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] !== token) continue;
    var expireStr = String(data[i][2] || '');
    var expire = Date.parse(expireStr);
    if (!expire || expire < now) {
      continue;
    }
    return { userId: String(data[i][1]), expiresAtMs: expire };
  }
  return null;
}

function findUserById_(id) {
  var sh = sheet_(SHEET_USERS);
  var data = sh.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (normalizeEmail_(String(row[1])) === normalizeEmail_(String(id))) {
      return userRowParse_(row, r + 1);
    }
  }
  return null;
}

function handleSession_(body) {
  var token = body.token;
  if (!getSs_()) return envelope_(false, 'BACKEND_DISABLED');
  var sess = findActiveSession_(token);
  if (!sess) return envelope_(false, 'INVALID_SESSION');
  var user = findUserById_(sess.userId);
  if (!user) return envelope_(false, 'USER_NOT_FOUND');
  var role = getUserRole_(user.email);
  return envelope_(true, null, {
    token: token,
    user: publicUser_(user, role),
    expiresAt: new Date(sess.expiresAtMs).toISOString(),
  });
}

// --- Bookings: New table-based functions -------

function requireSessionUser_(body) {
  if (!getSs_()) return { err: envelope_(false, 'BACKEND_DISABLED') };
  var token = body && body.token;
  var sess = findActiveSession_(token);
  if (!sess) return { err: envelope_(false, 'INVALID_SESSION') };
  var user = findUserById_(sess.userId);
  if (!user) return { err: envelope_(false, 'USER_NOT_FOUND') };
  return { user: user };
}

/** Get user role from latest login attempt */
function getUserRole_(email) {
  var sh = sheet_(SHEET_LOGIN_EVENTS);
  var data = sh.getDataRange().getValues();
  var norm = normalizeEmail_(email);
  for (var r = data.length - 1; r >= 1; r--) {
    if (normalizeEmail_(String(data[r][1])) === norm) {
      return String(data[r][3] || 'student');
    }
  }
  return 'student';
}

/** Add booking to booking_room table */
function handleBookingCreate_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  
  var sh = sheet_(SHEET_BOOKING_ROOM);
  var timestamp = new Date();
  var name = body.name || auth.user.name || auth.user.email;
  var room = String(body.room || '');
  var date = String(body.date || '');
  var time_start = String(body.time_start || '');
  var time_end = String(body.time_end || '');
  var purpose = String(body.purpose || '');
  var num_attend = Number(body.num_attend) || 0;
  var equipments = body.equipments ? (Array.isArray(body.equipments) ? body.equipments.join(',') : String(body.equipments)) : '';
  var notes = String(body.notes || '');
  var status = 'pending';
  
  sh.appendRow([timestamp, name, room, date, time_start, time_end, purpose, num_attend, equipments, notes, status, '']);
  var rowNum = sh.getLastRow();
  return envelope_(true, null, {
    booking: {
      id: String(rowNum),
      rowNum: rowNum,
      timestamp: timestamp.toISOString(),
      name: name,
      room: room,
      roomName: body.roomName || room,
      date: date,
      time_start: time_start,
      time_end: time_end,
      purpose: purpose,
      num_attend: num_attend,
      equipments: equipments,
      notes: notes,
      status: status,
    }
  });
}

/** Get all bookings for user or admin */
function handleBookingsList_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  
  var role = getUserRole_(auth.user.email);
  var sh = sheet_(SHEET_BOOKING_ROOM);
  var data = sh.getDataRange().getValues();
  var list = [];
  
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row || !row[0]) continue;
    
    var booking = {
      id: String(r + 1),
      rowNum: r + 1,
      timestamp: row[0] ? new Date(row[0]).toISOString() : '',
      name: String(row[1] || ''),
      room: String(row[2] || ''),
      roomName: String(row[2] || ''),
      date: String(row[3] || ''),
      time_start: String(row[4] || ''),
      time_end: String(row[5] || ''),
      purpose: String(row[6] || ''),
      num_attend: Number(row[7]) || 0,
      equipments: String(row[8] || ''),
      notes: String(row[9] || ''),
      status: String(row[10] || 'pending'),
      rejectReason: String(row[11] || ''),
    };
    
    if (role === 'admin') {
      list.push(booking);
    } else if (booking.name === auth.user.name || booking.name === auth.user.email) {
      list.push(booking);
    }
  }
  
  return envelope_(true, null, { bookings: list });
}

/** Approve a booking: update booking_room status and add to approved_booking */
function handleBookingApprove_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  
  var role = getUserRole_(auth.user.email);
  if (role !== 'admin') return envelope_(false, 'FORBIDDEN');
  
  var rowNum = body && body.rowNum ? Number(body.rowNum) : 0;
  if (!rowNum || rowNum < 2) return envelope_(false, 'BAD_REQUEST');
  
  var sh = sheet_(SHEET_BOOKING_ROOM);
  var data = sh.getDataRange().getValues();
  
  if (rowNum > data.length) return envelope_(false, 'NOT_FOUND');
  
  var bookingRow = data[rowNum - 1];
  if (!bookingRow || !bookingRow[0]) return envelope_(false, 'NOT_FOUND');
  
  var status = String(bookingRow[10] || 'pending').trim().toLowerCase();
  if (status !== 'pending') return envelope_(false, 'BAD_BOOKING_STATE');
  
  // Update status in booking_room
  var newStatus = 'confirmed';
  bookingRow[10] = newStatus;
  sh.getRange(rowNum, 1, 1, bookingRow.length).setValues([bookingRow]);
  
  // Add to approved_booking
  var approvedSh = sheet_(SHEET_APPROVED_BOOKING);
  approvedSh.appendRow([new Date(), bookingRow[1], bookingRow[2], bookingRow[3], bookingRow[4], bookingRow[5]]);
  
  var updatedBooking = {
    id: String(rowNum),
    rowNum: rowNum,
    timestamp: bookingRow[0] ? new Date(bookingRow[0]).toISOString() : '',
    name: String(bookingRow[1] || ''),
    room: String(bookingRow[2] || ''),
    roomName: String(bookingRow[2] || ''),
    date: String(bookingRow[3] || ''),
    time_start: String(bookingRow[4] || ''),
    time_end: String(bookingRow[5] || ''),
    purpose: String(bookingRow[6] || ''),
    num_attend: Number(bookingRow[7]) || 0,
    equipments: String(bookingRow[8] || ''),
    notes: String(bookingRow[9] || ''),
    status: newStatus,
    rejectReason: '',
  };

  return envelope_(true, null, { success: true, message: 'Booking approved', booking: updatedBooking });
}

/** Reject a booking: update status to rejected */
function handleBookingReject_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  
  var role = getUserRole_(auth.user.email);
  if (role !== 'admin') return envelope_(false, 'FORBIDDEN');
  
  var rowNum = body && body.rowNum ? Number(body.rowNum) : 0;
  if (!rowNum || rowNum < 2) return envelope_(false, 'BAD_REQUEST');
  
  var sh = sheet_(SHEET_BOOKING_ROOM);
  var data = sh.getDataRange().getValues();
  
  if (rowNum > data.length) return envelope_(false, 'NOT_FOUND');
  
  var bookingRow = data[rowNum - 1];
  if (!bookingRow || !bookingRow[0]) return envelope_(false, 'NOT_FOUND');
  
  var status = String(bookingRow[10] || 'pending').trim().toLowerCase();
  if (status !== 'pending') return envelope_(false, 'BAD_BOOKING_STATE');
  
  // Update status and store reject reason
  var newStatus = 'rejected';
  var rejectReason = String(body.rejectReason || '');
  bookingRow[10] = newStatus;
  bookingRow[11] = rejectReason;
  sh.getRange(rowNum, 1, 1, bookingRow.length).setValues([bookingRow]);

  var updatedBooking = {
    id: String(rowNum),
    rowNum: rowNum,
    timestamp: bookingRow[0] ? new Date(bookingRow[0]).toISOString() : '',
    name: String(bookingRow[1] || ''),
    room: String(bookingRow[2] || ''),
    roomName: String(bookingRow[2] || ''),
    date: String(bookingRow[3] || ''),
    time_start: String(bookingRow[4] || ''),
    time_end: String(bookingRow[5] || ''),
    purpose: String(bookingRow[6] || ''),
    num_attend: Number(bookingRow[7]) || 0,
    equipments: String(bookingRow[8] || ''),
    notes: String(bookingRow[9] || ''),
    status: newStatus,
    rejectReason: rejectReason,
  };

  return envelope_(true, null, { success: true, message: 'Booking rejected', booking: updatedBooking });
}

/** Get room availability for a specific date/room */
function handleGetRoomAvailability_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  
  var roomId = String(body.roomId || '');
  var date = String(body.date || '');
  
  if (!roomId || !ROOM_SHEET_MAP[roomId]) return envelope_(false, 'INVALID_ROOM');
  if (!date) return envelope_(false, 'MISSING_DATE');
  
  var sh = sheet_(ROOM_SHEET_MAP[roomId]);
  var data = sh.getDataRange().getValues();
  var availability = [];
  
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    availability.push({
      time: String(row[0] || ''),
      status: String(row[1] || 'available'),
    });
  }
  
  return envelope_(true, null, { availability: availability, roomId: roomId, date: date });
}

/** Update room availability status */
function handleUpdateRoomAvailability_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  
  var role = getUserRole_(auth.user.email);
  if (role !== 'admin') return envelope_(false, 'FORBIDDEN');
  
  var roomId = String(body.roomId || '');
  var time = String(body.time || '');
  var status = String(body.status || 'available');
  
  if (!roomId || !ROOM_SHEET_MAP[roomId]) return envelope_(false, 'INVALID_ROOM');
  if (!time) return envelope_(false, 'MISSING_TIME');
  
  var sh = sheet_(ROOM_SHEET_MAP[roomId]);
  var data = sh.getDataRange().getValues();
  
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === time) {
      data[r][1] = status;
      sh.getRange(r + 1, 1, 1, 2).setValues([data[r]]);
      return envelope_(true, null, { success: true, message: 'Availability updated' });
    }
  }
  
  return envelope_(false, 'TIME_SLOT_NOT_FOUND');
}
