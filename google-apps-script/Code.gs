function doGet(e) {
  var callback = e && e.parameter ? e.parameter.callback : '';
  if (callback && !/^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback)) {
    return createResponse_({ error: 'Numele callback-ului este invalid.' }, '');
  }

  try {
    return createResponse_(getProjectTotals_(), callback);
  } catch (error) {
    return createResponse_({ error: error.message || 'Nu s-au putut citi totalurile proiectelor.' }, callback);
  }
}

function getProjectTotals_() {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Scriptul trebuie asociat foii Google care conține tabelul de totaluri.');
  }

  var tables = [];
  spreadsheet.getSheets().forEach(function (sheet) {
    var headers = sheet.createTextFinder('Project')
      .matchCase(true)
      .matchEntireCell(true)
      .findAll();

    headers.forEach(function (header) {
      var projectColumn = header.getColumn();
      var totalHeader = sheet.getRange(header.getRow(), projectColumn + 1).getValue();
      if (totalHeader === 'Total, MDL') {
        tables.push({
          sheet: sheet,
          headerRow: header.getRow(),
          projectColumn: projectColumn
        });
      }
    });
  });

  if (tables.length !== 1) {
    throw new Error(tables.length
      ? 'Au fost găsite mai multe tabele cu antetele Project / Total, MDL; păstrează unul singur.'
      : 'Nu a fost găsit un tabel cu antetele Project / Total, MDL.');
  }

  var table = tables[0];
  var lastRow = table.sheet.getLastRow();
  var lastDonationDates = getLatestDonationDates_(spreadsheet);
  if (lastRow <= table.headerRow) {
    return [];
  }

  var rows = table.sheet.getRange(
    table.headerRow + 1,
    table.projectColumn,
    lastRow - table.headerRow,
    2
  ).getValues();
  var totals = [];
  var names = new Set();

  for (var i = 0; i < rows.length; i++) {
    var project = rows[i][0];
    var totalMdl = rows[i][1];

    if (project === '' && totalMdl === '') {
      break;
    }
    if (typeof project !== 'string' || !project.trim() || project !== project.trim()) {
      throw new Error('Numele unui proiect din tabel este gol sau invalid (rând ' + (table.headerRow + i + 1) + ').');
    }
    if (names.has(project)) {
      throw new Error('Numele proiectului „' + project + '” apare de mai multe ori în tabel.');
    }
    if (typeof totalMdl !== 'number' || !isFinite(totalMdl) || totalMdl < 0) {
      throw new Error('Totalul MDL pentru „' + project + '” este gol sau invalid.');
    }

    names.add(project);
    totals.push({
      project: project,
      totalMdl: totalMdl,
      lastDonation: lastDonationDates[project] || ''
    });
  }

  return totals;
}

function getLatestDonationDates_(spreadsheet) {
  var latestByProject = Object.create(null);
  var timeZone = spreadsheet.getSpreadsheetTimeZone();

  spreadsheet.getSheets().forEach(function (sheet) {
    var dateHeaders = sheet.createTextFinder('Date')
      .matchCase(true)
      .matchEntireCell(true)
      .findAll();
    var projectHeaders = sheet.createTextFinder('Project')
      .matchCase(true)
      .matchEntireCell(true)
      .findAll();

    dateHeaders.forEach(function (dateHeader) {
      projectHeaders.forEach(function (projectHeader) {
        if (projectHeader.getRow() !== dateHeader.getRow()) {
          return;
        }

        var headerRow = dateHeader.getRow();
        var lastRow = sheet.getLastRow();
        if (lastRow <= headerRow) {
          return;
        }

        var rowCount = lastRow - headerRow;
        var dates = sheet.getRange(headerRow + 1, dateHeader.getColumn(), rowCount, 1).getValues();
        var projects = sheet.getRange(headerRow + 1, projectHeader.getColumn(), rowCount, 1).getValues();
        for (var i = 0; i < rowCount; i++) {
          var project = projects[i][0];
          var dateValue = dates[i][0];
          if (project === '' || project === null || project === undefined ||
              dateValue === '' || dateValue === null || dateValue === undefined) {
            continue;
          }
          if (typeof project !== 'string' || !project.trim() || project !== project.trim()) {
            throw new Error('Numele proiectului din registrul donațiilor este invalid (rând ' + (headerRow + i + 1) + ').');
          }

          var donationDate = normalizeDonationDate_(dateValue, timeZone, headerRow + i + 1);
          if (!latestByProject[project] || donationDate > latestByProject[project]) {
            latestByProject[project] = donationDate;
          }
        }
      });
    });
  });

  return latestByProject;
}

function normalizeDonationDate_(value, timeZone, row) {
  if (value && typeof value.getTime === 'function') {
    if (!isFinite(value.getTime())) {
      throw new Error('Data donației este invalidă (rând ' + row + ').');
    }
    return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    var parsedDate = new Date(value + 'T00:00:00.000Z');
    if (!isFinite(parsedDate.getTime()) ||
        Utilities.formatDate(parsedDate, 'UTC', 'yyyy-MM-dd') !== value) {
      throw new Error('Data donației trebuie să fie o dată validă (rând ' + row + ').');
    }
    return value;
  }

  throw new Error('Data donației trebuie să fie o dată Google Sheets sau în formatul AAAA-LL-ZZ (rând ' + row + ').');
}

function createResponse_(data, callback) {
  var content = callback
    ? callback + '(' + JSON.stringify(data) + ');'
    : JSON.stringify(data);
  var mimeType = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(content).setMimeType(mimeType);
}
