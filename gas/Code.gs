/**
 * RoomifyU backend: Users + LoginEvents + Sessions (spreadsheet-backed).
 *
 * Deploy as Web App: Execute as you, access Anyone (later tighten).
 * Create a Google Spreadsheet, copy its ID into Script Properties key SPREADSHEET_ID.
 * Run initializeRoomifySpreadsheetOnce() once from the editor, then Deploy.
 */

var SHEET_USERS = 'user_data';
var SHEET_LOGIN_EVENTS = 'login_attempt';
var SHEET_SESSIONS = 'Sessions';
var SHEET_BOOKINGS = 'Bookings';

/** When no Microsoft Graph reply yet; set Script Property GRAPH_APPROVE_STUB_EVENTS=1 for HCI demos (stores stub ids). */
var PROP_GRAPH_APPROVE_STUB_EVENTS = 'GRAPH_APPROVE_STUB_EVENTS';

/** Microsoft Graph (Script Properties): MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, and MS_GRAPH_REFRESH_TOKEN (delegated) OR omit refresh for client_credentials. Optional: GRAPH_ROOM_CALENDAR_MAP JSON {\"r1\":\"room@tenant.com\"}, GRAPH_DEFAULT_CALENDAR_USER. Gemini: GEMINI_API_KEY, optional GEMINI_MODEL (default gemini-2.0-flash). */
var PROP_GRAPH_TENANT = 'MS_GRAPH_TENANT_ID';
var PROP_GRAPH_CLIENT_ID = 'MS_GRAPH_CLIENT_ID';
var PROP_GRAPH_CLIENT_SECRET = 'MS_GRAPH_CLIENT_SECRET';
var PROP_GRAPH_REFRESH = 'MS_GRAPH_REFRESH_TOKEN';
var PROP_GRAPH_ROOM_MAP = 'GRAPH_ROOM_CALENDAR_MAP';
var PROP_GRAPH_DEFAULT_CAL_USER = 'GRAPH_DEFAULT_CALENDAR_USER';
var PROP_GEMINI_KEY = 'GEMINI_API_KEY';
var PROP_GEMINI_MODEL = 'GEMINI_MODEL';

var BOOKING_HEADERS = [
  'id',
  'userId',
  'userName',
  'roomId',
  'roomName',
  'building',
  'date',
  'startTime',
  'endTime',
  'purpose',
  'attendees',
  'status',
  'equipmentJson',
  'notes',
  'isRecurring',
  'graphEventId',
  'rejectReason',
];
var BOOKING_COL = BOOKING_HEADERS.length;

var PROP_SPREADSHEET_ID = 'SPREADSHEET_ID';
var PROP_AUTH_SALT = 'AUTH_PASSWORD_SALT';

var SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — shorten for tighter security when needed.

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
  if (action === 'calendarAvailability') return handleCalendarAvailability_(body);
  if (action === 'apiChat') return handleApiChat_(body);
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
 * Manual run from editor once: ensures tabs + demo users matching the HCI React demo fixtures.
 */
function initializeRoomifySpreadsheetOnce() {
  ensureAuthSalt_();
  var id = PropertiesService.getScriptProperties().getProperty(PROP_SPREADSHEET_ID);
  if (!id) throw new Error('Set Script Property SPREADSHEET_ID to your Sheet ID first.');
  var ss = SpreadsheetApp.openById(id);
  upsertSheetWithHeaders_(ss, SHEET_USERS, ['timestamp', 'email', 'password', 'role', 'name']);
  upsertSheetWithHeaders_(ss, SHEET_LOGIN_EVENTS, ['timestamp', 'email', 'status']);
  upsertSheetWithHeaders_(ss, SHEET_SESSIONS, ['token', 'userId', 'expiresAt', 'createdAt']);
  upsertSheetWithHeaders_(ss, SHEET_BOOKINGS, BOOKING_HEADERS);
  seedDemoUsers_(ss.getSheetByName(SHEET_USERS));
  seedDemoBookings_(ss.getSheetByName(SHEET_BOOKINGS));
  SpreadsheetApp.flush();
  return 'OK: Users + LoginEvents + Sessions + Bookings tabs ready.';
}

function upsertSheetWithHeaders_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var range = sh.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
}

function seedDemoUsers_(usersSheet) {
  var last = Math.max(usersSheet.getLastRow(), 2);
  if (usersSheet.getLastRow() > 1) return;
  var demo = [
    [new Date(), 'arry@university.edu', hashPassword_('12345678'), 'admin', 'Arry'],
    [new Date(), 'jesse@university.edu', hashPassword_('12345678'), 'student', 'Jesse Pinkman'],
    [new Date(), 'panji@university.edu', hashPassword_('12345678'), 'lecturer', 'Prof. Panji'],
  ];
  usersSheet.getRange(2, 1, demo.length, demo[0].length).setValues(demo);
}

function findUserByEmail_(email) {
  var sh = sheet_(SHEET_USERS);
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return null;
  var norm = normalizeEmail_(email);
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[1]) continue;
    if (normalizeEmail_(row[1]) === norm) return userRowParse_(row);
  }
  return null;
}

function normalizeEmail_(e) {
  return String(e || '').trim().toLowerCase();
}

function userRowParse_(row) {
  return {
    id: String(row[1]), // email as id
    name: String(row[4] || row[1].split('@')[0]), // name from sheet or email prefix
    email: String(row[1]),
    passwordHash: String(row[2]),
    role: String(row[3] || 'student'), // role from sheet or default
    department: 'General',
  };
}

function publicUser_(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
  };
}

function appendLoginEvent_(email, status) {
  var sh = sheet_(SHEET_LOGIN_EVENTS);
  sh.appendRow([new Date(), email, status]);
}

function handleLogin_(body, e) {
  if (!getSs_()) return envelope_(false, 'BACKEND_DISABLED');
  var email = body.email || '';
  var password = body.password || '';
  var ua = uaFrom_(body);
  function failLogin(code) {
    appendLoginEvent_(normalizeEmail_(email), 'failed');
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
  appendLoginEvent_(row.email, 'success');
  return envelope_(true, null, {
    token: token,
    user: publicUser_(row),
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
  var role = 'student'; // default role
  var sh = sheet_(SHEET_USERS);
  sh.appendRow([new Date(), email, hashed, role, name]);
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
    if (String(row[0]) === String(id)) return userRowParse_(row);
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
  return envelope_(true, null, {
    token: token,
    user: publicUser_(user),
    expiresAt: new Date(sess.expiresAtMs).toISOString(),
  });
}

// --- Bookings (Sheets) -------------------------------------------------

function bookingsSheetSafe_() {
  try {
    return sheet_(SHEET_BOOKINGS);
  } catch (e) {
    return null;
  }
}

function seedDemoBookings_(bookSheet) {
  if (!bookSheet) return;
  if (bookSheet.getLastRow() > 1) return;
  var demo = [
    [
      'seed-b-pending',
      '2',
      'Jesse Pinkman',
      'r2',
      'Room 19F-01',
      'Lavenue Building, 19th Floor',
      '2026-04-03',
      '14:00',
      '16:00',
      'Workshop Presentation',
      '35',
      'pending',
      '["Projector","Microphone"]',
      'Student workshop on presentation skills',
      'FALSE',
      '',
      '',
    ],
    [
      'seed-b-confirmed',
      '2',
      'Jesse Pinkman',
      'r1',
      'Microteaching Lab 19F-20',
      'Lavenue Building, 19th Floor',
      '2026-04-02',
      '10:00',
      '12:00',
      'Study Group Session',
      '15',
      'confirmed',
      '["Projector"]',
      'Working on group project',
      'FALSE',
      '',
      '',
    ],
  ];
  bookSheet.getRange(2, 1, 2 + demo.length - 1, BOOKING_COL).setValues(demo);
}

function requireSessionUser_(body) {
  if (!getSs_()) return { err: envelope_(false, 'BACKEND_DISABLED') };
  var token = body && body.token;
  var sess = findActiveSession_(token);
  if (!sess) return { err: envelope_(false, 'INVALID_SESSION') };
  var user = findUserById_(sess.userId);
  if (!user) return { err: envelope_(false, 'USER_NOT_FOUND') };
  return { user: user };
}

function parseEquipmentJson_(cell) {
  try {
    var a = JSON.parse(String(cell || '[]'));
    return Array.isArray(a) ? a : [];
  } catch (ignored) {
    return [];
  }
}

function normalizeBookingStatus_(s) {
  return String(s || '').trim().toLowerCase();
}

function bookingRowToClient_(row) {
  var notes = row[13] != null ? String(row[13]) : '';
  return {
    id: String(row[0]),
    userId: String(row[1]),
    userName: String(row[2]),
    roomId: String(row[3]),
    roomName: String(row[4]),
    building: String(row[5]),
    date: String(row[6]),
    startTime: String(row[7]),
    endTime: String(row[8]),
    purpose: String(row[9]),
    attendees: Number(row[10]) || 0,
    status: normalizeBookingStatus_(row[11]),
    equipment: parseEquipmentJson_(row[12]),
    notes: notes,
    isRecurring: String(row[14]).toUpperCase() === 'TRUE',
    graphEventId: row[15] != null ? String(row[15]) : '',
    rejectReason: row[16] != null ? String(row[16]) : '',
  };
}

function findBookingDataRow_(id) {
  var sh = bookingsSheetSafe_();
  if (!sh) return null;
  var data = sh.getDataRange().getValues();
  var want = String(id);
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === want) return { sheet: sh, rowIndex: r + 1, row: data[r] };
  }
  return null;
}

function graphStubApproveId_() {
  var stub = PropertiesService.getScriptProperties().getProperty(PROP_GRAPH_APPROVE_STUB_EVENTS);
  if (stub === '1' || stub === 'true') return 'stub-' + Utilities.getUuid().replace(/-/g, '');
  return '';
}

function graphAuthConfigured_() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty(PROP_GRAPH_TENANT) || !p.getProperty(PROP_GRAPH_CLIENT_ID)) return false;
  var sec = p.getProperty(PROP_GRAPH_CLIENT_SECRET);
  return !!(sec || p.getProperty(PROP_GRAPH_REFRESH));
}

/** @returns UPN or id string, or '' */
function calendarUserForRoom_(roomId) {
  var rid = String(roomId || '').trim();
  var p = PropertiesService.getScriptProperties();
  var raw = p.getProperty(PROP_GRAPH_ROOM_MAP);
  if (raw) {
    try {
      var m = JSON.parse(raw);
      if (m && m[rid]) return String(m[rid]).trim();
    } catch (ignored) {}
  }
  var def = p.getProperty(PROP_GRAPH_DEFAULT_CAL_USER);
  return def ? String(def).trim() : '';
}

function getGraphAccessToken_() {
  var p = PropertiesService.getScriptProperties();
  var tenant = p.getProperty(PROP_GRAPH_TENANT);
  var clientId = p.getProperty(PROP_GRAPH_CLIENT_ID);
  var secret = p.getProperty(PROP_GRAPH_CLIENT_SECRET);
  var refresh = p.getProperty(PROP_GRAPH_REFRESH);
  if (!tenant || !clientId || !secret) throw new Error('Graph OAuth properties incomplete (tenant, client id, secret).');
  var url = 'https://login.microsoftonline.com/' + encodeURIComponent(tenant) + '/oauth2/v2.0/token';
  var payload;
  if (refresh) {
    payload =
      'client_id=' +
      encodeURIComponent(clientId) +
      '&grant_type=refresh_token&refresh_token=' +
      encodeURIComponent(refresh) +
      '&client_secret=' +
      encodeURIComponent(secret);
  } else {
    payload =
      'client_id=' +
      encodeURIComponent(clientId) +
      '&scope=' +
      encodeURIComponent('https://graph.microsoft.com/.default') +
      '&grant_type=client_credentials&client_secret=' +
      encodeURIComponent(secret);
  }
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    muteHttpExceptions: true,
    payload: payload,
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('Token HTTP ' + code + ': ' + text.slice(0, 500));
  var json = JSON.parse(text);
  if (json.refresh_token) p.setProperty(PROP_GRAPH_REFRESH, json.refresh_token);
  if (!json.access_token) throw new Error('No access_token in token response');
  return String(json.access_token);
}

function graphRequest_(method, graphPath, bodyObj) {
  var token = getGraphAccessToken_();
  var url = 'https://graph.microsoft.com/v1.0/' + graphPath.replace(/^\//, '');
  var opt = {
    method: method,
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token },
  };
  if (bodyObj !== undefined && bodyObj !== null) {
    opt.contentType = 'application/json';
    opt.payload = JSON.stringify(bodyObj);
  }
  var res = UrlFetchApp.fetch(url, opt);
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('Graph ' + method + ' ' + graphPath + ' → ' + code + ': ' + text.slice(0, 600));
  if (!text || String(text).trim() === '' || method === 'delete') return null;
  try {
    return JSON.parse(text);
  } catch (parseErr) {
    return null;
  }
}

function isoLocalDayBounds_(dateStr) {
  var tz = Session.getScriptTimeZone();
  var dayStart = Utilities.parseDate(String(dateStr) + ' 00:00:00', tz, 'yyyy-MM-dd HH:mm');
  var dayEnd = Utilities.parseDate(String(dateStr) + ' 23:59:59', tz, 'yyyy-MM-dd HH:mm:ss');
  return { startIso: dayStart.toISOString(), endIso: dayEnd.toISOString(), tz: tz };
}

/** Half-hour slots 08:00–18:30 (same grid as React generateTimeSlots). */
function slotTimesForDay_() {
  var out = [];
  for (var h = 8; h <= 18; h++) {
    out.push((h < 10 ? '0' : '') + h + ':00');
    if (h < 18) out.push((h < 10 ? '0' : '') + h + ':30');
  }
  return out;
}

function parseHHmmMs_(dateStr, hhmm, tz) {
  return Utilities.parseDate(String(dateStr) + ' ' + String(hhmm), tz, 'yyyy-MM-dd HH:mm').getTime();
}

/** @returns overlap with [slotStartMs, slotEndMs) */
function rangesOverlap_(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function graphFetchCalendarBusyRanges_(calendarUser, startIso, endIso) {
  var encUser = encodeURIComponent(calendarUser);
  var q =
    'users/' +
    encUser +
    '/calendar/calendarView?startDateTime=' +
    encodeURIComponent(startIso) +
    '&endDateTime=' +
    encodeURIComponent(endIso);
  var page = graphRequest_('get', q, null);
  var ranges = [];
  var list = (page && page.value) || [];
  for (var i = 0; i < list.length; i++) {
    var ev = list[i];
    if (ev.isCancelled) continue;
    var st = ev.start && (ev.start.dateTime || ev.start.DateTime);
    var en = ev.end && (ev.end.dateTime || ev.end.DateTime);
    if (!st || !en) continue;
    try {
      var sMs = new Date(st).getTime();
      var eMs = new Date(en).getTime();
      if (!isFinite(sMs) || !isFinite(eMs)) continue;
      ranges.push({ start: sMs, end: eMs });
    } catch (ignored) {}
  }
  return ranges;
}

function bookingsOverlappingRoomDate_(roomId, dateStr) {
  var sh = bookingsSheetSafe_();
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  var out = [];
  var wantRoom = String(roomId);
  var wantDate = String(dateStr);
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[0]) continue;
    var st = normalizeBookingStatus_(row[11]);
    if (st !== 'pending' && st !== 'confirmed') continue;
    if (String(row[3]) !== wantRoom) continue;
    if (String(row[6]) !== wantDate) continue;
    out.push({
      startTime: String(row[7]),
      endTime: String(row[8]),
      status: st,
      userId: String(row[1]),
    });
  }
  return out;
}

function handleCalendarAvailability_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  var roomId = body && body.roomId != null ? String(body.roomId) : '';
  var dateStr = body && body.date != null ? String(body.date) : '';
  if (!roomId || !dateStr) return envelope_(false, 'BAD_REQUEST');
  var tz = Session.getScriptTimeZone();
  var times = slotTimesForDay_();
  var sheetOverlap = bookingsOverlappingRoomDate_(roomId, dateStr);
  var graphRanges = [];
  var graphEnabled = false;
  var graphReadError = '';
  var calUser = calendarUserForRoom_(roomId);
  if (graphAuthConfigured_() && calUser) {
    try {
      var b = isoLocalDayBounds_(dateStr);
      graphRanges = graphFetchCalendarBusyRanges_(calUser, b.startIso, b.endIso);
      graphEnabled = true;
    } catch (e) {
      graphReadError = String(e && e.message ? e.message : e);
    }
  } else if (graphAuthConfigured_() && !calUser) {
    graphReadError = 'Calendar mailbox not mapped for this room (GRAPH_ROOM_CALENDAR_MAP / GRAPH_DEFAULT_CALENDAR_USER).';
  }
  var slots = times.map(function (time) {
    var slotStart = parseHHmmMs_(dateStr, time, tz);
    var slotEnd = slotStart + 30 * 60 * 1000;
    var gBusy = graphRanges.some(function (gr) {
      return rangesOverlap_(gr.start, gr.end, slotStart, slotEnd);
    });
    var sheetBooked = false;
    var sheetPending = false;
    for (var i = 0; i < sheetOverlap.length; i++) {
      var bo = sheetOverlap[i];
      var bStart = parseHHmmMs_(dateStr, bo.startTime, tz);
      var bEnd = parseHHmmMs_(dateStr, bo.endTime, tz);
      if (!rangesOverlap_(bStart, bEnd, slotStart, slotEnd)) continue;
      if (bo.status === 'pending') sheetPending = true;
      else sheetBooked = true;
    }
    var status = 'available';
    if (gBusy || sheetBooked) status = 'booked';
    else if (sheetPending) status = 'pending';
    return { time: time, status: status };
  });
  var pay = { slots: slots, graphEnabled: graphEnabled };
  if (graphReadError) pay.graphReadError = graphReadError;
  return envelope_(true, null, pay);
}

function buildGraphEventPayload_(row) {
  var tz = Session.getScriptTimeZone();
  var dateStr = String(row[6]);
  var st = String(row[7]);
  var en = String(row[8]);
  var subject = 'RoomifyU: ' + String(row[4]) + ' — ' + String(row[9]);
  var equip = '';
  try {
    equip = JSON.parse(String(row[12] || '[]'));
    if (Array.isArray(equip)) equip = equip.join(', ');
    else equip = '';
  } catch (e) {
    equip = '';
  }
  var notes = row[13] != null ? String(row[13]) : '';
  var bodyText =
    'Requested by: ' +
    String(row[2]) +
    '\nBuilding: ' +
    String(row[5]) +
    '\nAttendees: ' +
    String(row[10]) +
    (equip ? '\nEquipment: ' + equip : '') +
    (notes ? '\nNotes: ' + notes : '');
  return {
    subject: subject.slice(0, 250),
    body: { contentType: 'text', content: bodyText.slice(0, 8000) },
    start: { dateTime: dateStr + 'T' + st + ':00', timeZone: tz },
    end: { dateTime: dateStr + 'T' + en + ':00', timeZone: tz },
    categories: ['RoomifyU'],
    isReminderOn: true,
    reminderMinutesBeforeStart: 60,
  };
}

/**
 * Create or PATCH Graph calendar event for a booking row. existingEventId: reuse for idempotent update.
 */
function graphUpsertBookingEvent_(calendarUser, row, existingEventId) {
  var enc = encodeURIComponent(calendarUser);
  var payload = buildGraphEventPayload_(row);
  if (existingEventId && String(existingEventId).trim()) {
    var eid = encodeURIComponent(String(existingEventId).trim());
    var updated = graphRequest_('patch', 'users/' + enc + '/events/' + eid, payload);
    return updated && updated.id ? String(updated.id) : String(existingEventId).trim();
  }
  var created = graphRequest_('post', 'users/' + enc + '/events', payload);
  if (!created || !created.id) throw new Error('Graph create event missing id');
  return String(created.id);
}

function handleApiChat_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  var msg = body && body.message != null ? String(body.message).trim() : '';
  if (!msg) return envelope_(false, 'BAD_REQUEST');
  if (msg.length > 12000) return envelope_(false, 'BAD_REQUEST');
  var p = PropertiesService.getScriptProperties();
  var key = p.getProperty(PROP_GEMINI_KEY);
  if (!key) return envelope_(false, 'GEMINI_DISABLED');
  var model = p.getProperty(PROP_GEMINI_MODEL) || 'gemini-2.0-flash';
  var url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) +
    ':generateContent?key=' +
    encodeURIComponent(key);
  var safeContext = '';
  if (body && body.contextSnippet) safeContext = String(body.contextSnippet).trim().slice(0, 2000);
  var fullUser =
    msg + (safeContext ? '\n\n(Context — room/booking helpers only)\n' + safeContext : '');
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: fullUser }] }],
      generationConfig: { maxOutputTokens: 512, temperature: 0.4 },
    }),
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) return envelope_(false, 'GEMINI_HTTP', { message: text.slice(0, 500) });
  var json = JSON.parse(text);
  var outText = '';
  try {
    outText =
      json.candidates[0].content.parts.map(function (pt) {
        return pt.text || '';
      }).join('');
  } catch (e) {
    outText = '';
  }
  return envelope_(true, null, { reply: outText || '(No reply text)' });
}

function handleBookingsList_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  var sh = bookingsSheetSafe_();
  if (!sh) return envelope_(false, 'BOOKINGS_DISABLED');
  var data = sh.getDataRange().getValues();
  var list = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row || !row[0]) continue;
    var b = bookingRowToClient_(row);
    if (auth.user.role === 'admin') {
      list.push(b);
      continue;
    }
    if (b.userId === auth.user.id) list.push(b);
  }
  return envelope_(true, null, { bookings: list });
}

function handleBookingCreate_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  var sh = bookingsSheetSafe_();
  if (!sh) return envelope_(false, 'BOOKINGS_DISABLED');
  var uid = auth.user.id;
  var equipment = Array.isArray(body.equipment) ? body.equipment : [];
  var id = Utilities.getUuid().replace(/-/g, '');
  var userName =
    auth.user.name ||
    auth.user.email ||
    uid;
  var row = [
    id,
    uid,
    userName,
    String(body.roomId || ''),
    String(body.roomName || ''),
    String(body.building || ''),
    String(body.date || ''),
    String(body.startTime || ''),
    String(body.endTime || ''),
    String(body.purpose || ''),
    Number(body.attendees) || 0,
    'pending',
    JSON.stringify(equipment),
    String(body.notes != null ? body.notes : ''),
    body.isRecurring ? 'TRUE' : 'FALSE',
    '',
    '',
  ];
  sh.appendRow(row);
  var created = bookingRowToClient_(row);
  return envelope_(true, null, { booking: created });
}

function handleBookingApprove_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  if (auth.user.role !== 'admin') return envelope_(false, 'FORBIDDEN');
  var bid = body && body.bookingId ? String(body.bookingId) : '';
  if (!bid) return envelope_(false, 'BAD_REQUEST');
  var found = findBookingDataRow_(bid);
  if (!found) return envelope_(false, 'NOT_FOUND');
  var norm = normalizeBookingStatus_(found.row[11]);
  if (norm !== 'pending') return envelope_(false, 'BAD_BOOKING_STATE');

  var roomId = String(found.row[3]);
  var existingGid = found.row[15] != null && String(found.row[15]).trim() ? String(found.row[15]).trim() : '';

  var props = PropertiesService.getScriptProperties();
  var useStub = props.getProperty(PROP_GRAPH_APPROVE_STUB_EVENTS) === '1' || props.getProperty(PROP_GRAPH_APPROVE_STUB_EVENTS) === 'true';

  var gid = '';
  if (useStub) {
    gid = graphStubApproveId_();
  } else if (graphAuthConfigured_()) {
    var calUser = calendarUserForRoom_(roomId);
    if (!calUser) {
      return envelope_(false, 'GRAPH_CALENDAR_NOT_MAPPED', {
        message: 'Set Script Property GRAPH_ROOM_CALENDAR_MAP or GRAPH_DEFAULT_CALENDAR_USER.',
      });
    }
    try {
      gid = graphUpsertBookingEvent_(calUser, found.row, existingGid);
    } catch (e) {
      return envelope_(false, 'GRAPH_WRITE_FAILED', { message: String(e && e.message ? e.message : e) });
    }
  }

  var next = found.row.slice(0);
  next[11] = 'confirmed';
  next[15] = gid;
  next[16] = '';
  found.sheet.getRange(found.rowIndex, 1, found.rowIndex, BOOKING_COL).setValues([next]);
  var updated = bookingRowToClient_(next);
  return envelope_(true, null, { booking: updated, graphEventId: gid });
}

function handleBookingReject_(body) {
  var auth = requireSessionUser_(body);
  if (auth.err) return auth.err;
  if (auth.user.role !== 'admin') return envelope_(false, 'FORBIDDEN');
  var bid = body && body.bookingId ? String(body.bookingId) : '';
  if (!bid) return envelope_(false, 'BAD_REQUEST');
  var reason =
    body && body.rejectReason != null ? String(body.rejectReason).trim().slice(0, 500) : '';
  if (!reason) return envelope_(false, 'BAD_REQUEST');
  var found = findBookingDataRow_(bid);
  if (!found) return envelope_(false, 'NOT_FOUND');
  var norm = normalizeBookingStatus_(found.row[11]);
  if (norm !== 'pending') return envelope_(false, 'BAD_BOOKING_STATE');
  var next = found.row.slice(0);
  next[11] = 'rejected';
  next[15] = '';
  next[16] = reason;
  found.sheet.getRange(found.rowIndex, 1, found.rowIndex, BOOKING_COL).setValues([next]);
  return envelope_(true, null, { booking: bookingRowToClient_(next) });
}
