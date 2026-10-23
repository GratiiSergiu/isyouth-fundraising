function setupSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const projectsSheet = getOrCreateSheet_(spreadsheet, 'Proiecte');
  const donationsSheet = getOrCreateSheet_(spreadsheet, 'Donații');

  ensureHeaders_(projectsSheet, ['ID proiect', 'Sold inițial (MDL)']);
  ensureHeaders_(donationsSheet, ['Data', 'ID proiect', 'Sumă (MDL)', 'Status', 'Notă internă']);

  projectsSheet.getRange('B:B').setNumberFormat('#,##0.00');
  donationsSheet.getRange('A:A').setNumberFormat('dd.mm.yyyy');
  donationsSheet.getRange('C:C').setNumberFormat('#,##0.00');

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Confirmată', 'Anulată'], true)
    .setAllowInvalid(false)
    .build();
  donationsSheet.getRange(2, 4, donationsSheet.getMaxRows() - 1, 1).setDataValidation(statusRule);
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function ensureHeaders_(sheet, expectedHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  const existingHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length)
    .getValues()[0]
    .map(normalizeHeader_);
  const expected = expectedHeaders.map(normalizeHeader_);
  if (existingHeaders.some((header, index) => header !== expected[index])) {
    throw new Error(`The header row in ${sheet.getName()} does not match the expected layout.`);
  }
}

function doGet(event) {
  if (!event || !event.parameter || event.parameter.callback !== 'isYouthReceiveSheetsTotals') {
    return ContentService.createTextOutput('Invalid request.');
  }

  try {
    return jsonp_({
      totals: calculateProjectTotals_(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    return jsonp_({ error: 'Sheet data is invalid. Please contact an administrator.' });
  }
}

function calculateProjectTotals_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const projectsSheet = spreadsheet.getSheetByName('Proiecte');
  const donationsSheet = spreadsheet.getSheetByName('Donații');

  if (!projectsSheet || !donationsSheet) {
    throw new Error('Required sheets are missing.');
  }

  const totals = readOpeningBalances_(projectsSheet);
  addConfirmedDonations_(donationsSheet, totals);
  return totals;
}

function readOpeningBalances_(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 1) throw new Error('The Proiecte sheet is empty.');

  const headers = rows[0].map(normalizeHeader_);
  const idColumn = headers.indexOf('id proiect');
  const balanceColumn = headers.indexOf('sold initial mdl');
  if (idColumn < 0 || balanceColumn < 0) throw new Error('Invalid Proiecte headers.');

  const totals = {};
  for (const row of rows.slice(1)) {
    const projectId = String(row[idColumn] || '').trim();
    if (!projectId) continue;

    const balance = Number(row[balanceColumn]);
    if (!Number.isFinite(balance) || balance < 0 || Object.prototype.hasOwnProperty.call(totals, projectId)) {
      throw new Error('Invalid or duplicate project opening balance.');
    }
    totals[projectId] = balance;
  }
  return totals;
}

function addConfirmedDonations_(sheet, totals) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 1) throw new Error('The Donații sheet is empty.');

  const headers = rows[0].map(normalizeHeader_);
  const idColumn = headers.indexOf('id proiect');
  const amountColumn = headers.indexOf('suma mdl');
  const statusColumn = headers.indexOf('status');
  if (idColumn < 0 || amountColumn < 0 || statusColumn < 0) {
    throw new Error('Invalid Donații headers.');
  }

  for (const row of rows.slice(1)) {
    if (row.every(value => value === '' || value === null)) continue;

    const projectId = String(row[idColumn] || '').trim();
    const amount = Number(row[amountColumn]);
    const status = normalizeHeader_(row[statusColumn]);
    if (!projectId || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid donation row.');
    }
    if (status === 'anulata' || status === 'cancelled' || status === 'canceled') continue;
    if (status !== 'confirmata' && status !== 'confirmed') {
      throw new Error('Donation status must be Confirmată or Anulată.');
    }
    if (!Object.prototype.hasOwnProperty.call(totals, projectId)) {
      throw new Error('Donation references an unknown project.');
    }
    totals[projectId] += amount;
  }
}

function normalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jsonp_(payload) {
  return ContentService
    .createTextOutput(`window.isYouthReceiveSheetsTotals(${JSON.stringify(payload)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
