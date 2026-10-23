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
    totals.push({ project: project, totalMdl: totalMdl });
  }

  return totals;
}

function createResponse_(data, callback) {
  var content = callback
    ? callback + '(' + JSON.stringify(data) + ');'
    : JSON.stringify(data);
  var mimeType = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(content).setMimeType(mimeType);
}
