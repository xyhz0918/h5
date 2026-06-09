const SHEET_NAME = "events";
const HEADERS = [
  "serverTime",
  "clientTime",
  "eventName",
  "sessionId",
  "orderId",
  "page",
  "bugId",
  "bugType",
  "description",
  "stage",
  "progress",
  "sourceHost",
  "pathname",
  "userAgent",
  "viewport",
  "data"
];

function json_(payload, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function readPayload_(event) {
  if (!event || !event.postData || !event.postData.contents) return {};

  try {
    return JSON.parse(event.postData.contents);
  } catch (error) {
    return {};
  }
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty("SPREADSHEET_ID");

  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  return SpreadsheetApp.getActiveSpreadsheet();
}

function getEventsSheet_() {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function assertToken_(payload) {
  const expectedToken = PropertiesService.getScriptProperties().getProperty("SHEET_WEBHOOK_TOKEN");

  if (!expectedToken || payload.token !== expectedToken) {
    throw new Error("TOKEN_INVALID");
  }
}

function appendEvent_(event) {
  const sheet = getEventsSheet_();
  const data = event && typeof event.data === "object" ? JSON.stringify(event.data) : "";
  const row = [
    new Date().toISOString(),
    event.clientTime || "",
    event.eventName || "",
    event.sessionId || "",
    event.orderId || "",
    event.page || "",
    event.bugId || "",
    event.bugType || "",
    event.description || "",
    event.stage || "",
    event.progress || "",
    event.sourceHost || "",
    event.pathname || "",
    event.userAgent || "",
    event.viewport || "",
    data
  ];

  sheet.appendRow(row);
}

function listEvents_(limit) {
  const sheet = getEventsSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) return [];

  const safeLimit = Math.max(1, Math.min(Number(limit) || 300, 500));
  const startRow = Math.max(2, lastRow - safeLimit + 1);
  const rowCount = lastRow - startRow + 1;
  const values = sheet.getRange(startRow, 1, rowCount, HEADERS.length).getValues();

  return values
    .reverse()
    .map((row) =>
      HEADERS.reduce((record, header, index) => {
        const value = row[index];
        record[header] = value instanceof Date ? value.toISOString() : value;
        return record;
      }, {})
    );
}

function doPost(event) {
  try {
    const payload = readPayload_(event);
    assertToken_(payload);

    if (payload.action === "list") {
      return json_({
        ok: true,
        rows: listEvents_(payload.limit)
      });
    }

    appendEvent_(payload.event || {});
    return json_({ ok: true });
  } catch (error) {
    const message = error && error.message === "TOKEN_INVALID" ? "Token invalid" : "Google Apps Script error";
    return json_({ ok: false, message });
  }
}
