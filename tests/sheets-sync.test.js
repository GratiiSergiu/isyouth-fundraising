const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { applyTotals, isAppsScriptEndpoint } = require('../sheets-sync.js');

const scriptSource = fs.readFileSync(
    path.join(__dirname, '..', 'google-apps-script', 'Code.gs'),
    'utf8'
);

function makeSheet(name, values) {
    return {
        name,
        values,
        createTextFinder(search) {
            return {
                matchCase() {
                    return this;
                },
                matchEntireCell() {
                    return this;
                },
                findAll() {
                    const matches = [];
                    values.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
                        if (value === search) {
                            matches.push({
                                getRow: () => rowIndex + 1,
                                getColumn: () => columnIndex + 1
                            });
                        }
                    }));
                    return matches;
                }
            };
        },
        getRange(row, column, rowCount, columnCount) {
            if (rowCount === undefined) {
                return { getValue: () => values[row - 1]?.[column - 1] ?? '' };
            }
            return {
                getValues: () => Array.from({ length: rowCount }, (_, rowOffset) =>
                    Array.from({ length: columnCount }, (_, columnOffset) =>
                        values[row + rowOffset - 1]?.[column + columnOffset - 1] ?? ''
                    )
                )
            };
        },
        getLastRow() {
            return values.length;
        },
        getLastColumn() {
            return Math.max(0, ...values.map(row => row.length));
        }
    };
}

function callEndpoint(sheets, parameters) {
    const context = {
        SpreadsheetApp: {
            getActiveSpreadsheet: () => ({
                getSheets: () => sheets,
                getSpreadsheetTimeZone: () => 'UTC'
            }),
            openById: () => ({
                getSheets: () => sheets,
                getSpreadsheetTimeZone: () => 'UTC'
            })
        },
        PropertiesService: {
            getScriptProperties: () => ({ getProperty: () => 'mock-sheet-id' })
        },
        Utilities: {
            formatDate(date) {
                return date.toISOString().slice(0, 10);
            }
        },
        ContentService: {
            MimeType: { JSON: 'application/json', JAVASCRIPT: 'application/javascript' },
            createTextOutput(content) {
                return {
                    content,
                    mimeType: '',
                    setMimeType(mimeType) {
                        this.mimeType = mimeType;
                        return this;
                    }
                };
            }
        }
    };
    vm.runInNewContext(scriptSource, context);
    return context.doGet({ parameter: parameters || {} });
}

function parseResponse(response, callback) {
    if (callback) {
        assert.equal(response.mimeType, 'application/javascript');
        return JSON.parse(response.content.slice(callback.length + 1, -2));
    }
    return JSON.parse(response.content);
}

function makeOutputSheet(rows, includeLastDonation = true) {
    const values = [
        [],
        [...Array(14).fill(''), 'Project', 'Total, MDL', ...(includeLastDonation ? ['ultima donație'] : [])],
        ...rows.map(([project, total, lastDonation]) => [
            ...Array(14).fill(''),
            project,
            total,
            ...(includeLastDonation ? [lastDonation] : [])
        ])
    ];
    return makeSheet('OUTPUT - Fundraising Page', values);
}

test('reads the OUTPUT donation date and aggregate without exposing private register data', () => {
    const privateRegister = makeSheet('Donations', [
        ['Date', 'Donator', 'Amount', 'CCY', 'Project', 'MDL Amount'],
        ['not an OUTPUT date', 'Private Donor', 100, 'MDL', 'Project A', 100],
        ['not an OUTPUT date', 'Another Private Donor', 25, 'MDL', 'Project A', 25],
        ['not an OUTPUT date', 'Third Private Donor', 50, 'MDL', 'Project B', 50]
    ]);
    const output = makeOutputSheet([
        ['Project A', 1250, '2026-10-24'],
        ['Project B', 0, '2026-10-20']
    ]);
    const callback = 'window.result';
    const result = parseResponse(callEndpoint([privateRegister, output], { callback }), callback);

    assert.deepEqual(result, [
        { project: 'Project A', totalMdl: 1250, lastDonation: '2026-10-24' },
        { project: 'Project B', totalMdl: 0, lastDonation: '2026-10-20' }
    ]);
    assert.equal(JSON.stringify(result).includes('Private Donor'), false);
    assert.deepEqual(Object.keys(result[0]), ['project', 'totalMdl', 'lastDonation']);
    assert.equal(result.some(row => Object.keys(row).some(key => /donor|amount|ccy/i.test(key))), false);
});

test('returns an empty donation date when the OUTPUT date cell is blank', () => {
    const result = parseResponse(callEndpoint([makeOutputSheet([['Project A', 100]])]));
    assert.deepEqual(result, [{ project: 'Project A', totalMdl: 100, lastDonation: '' }]);
});

test('uses spreadsheet-local dates from Google Sheets date cells', () => {
    const spreadsheetDate = vm.runInNewContext('new Date("2026-10-24T20:00:00.000Z")');

    assert.deepEqual(
        parseResponse(callEndpoint([makeOutputSheet([['Project A', 100, spreadsheetDate]])])),
        [{ project: 'Project A', totalMdl: 100, lastDonation: '2026-10-24' }]
    );
});

test('continues to serve aggregate totals for an older OUTPUT table without a date column', () => {
    assert.deepEqual(
        parseResponse(callEndpoint([makeOutputSheet([['Project A', 100]], false)])),
        [{ project: 'Project A', totalMdl: 100, lastDonation: '' }]
    );
});

test('rejects invalid dates and duplicate OUTPUT date headers', () => {
    assert.match(
        parseResponse(callEndpoint([makeOutputSheet([['Project A', 100, 'not a date']])])).error,
        /Data donației/
    );
    const duplicateDateHeader = makeSheet('OUTPUT', [
        ['Project', 'Total, MDL', 'ultima donație', 'Ultima donație'],
        ['Project A', 100, '2026-10-24', '2026-10-24']
    ]);
    assert.match(parseResponse(callEndpoint([duplicateDateHeader])).error, /mai multe coloane/);
});

test('requires one uniquely detected output table', () => {
    assert.match(
        parseResponse(callEndpoint([makeSheet('Other', [])])).error,
        /Nu a fost găsit/
    );
    const output = makeOutputSheet([['Project A', 100]]);
    assert.match(
        parseResponse(callEndpoint([output, makeOutputSheet([['Project B', 200]])])).error,
        /mai multe tabele/
    );
});

test('rejects duplicate projects and missing or malformed totals', () => {
    for (const rows of [
        [['Project A', 100], ['Project A', 200]],
        [['Project A', '']],
        [['Project A', '1 000']],
        [['Project A', -1]]
    ]) {
        assert.ok(parseResponse(callEndpoint([makeOutputSheet(rows)])).error);
    }
});

test('JSONP responses invoke only a syntactically safe callback', () => {
    const response = callEndpoint([makeOutputSheet([['Project A', 100]])], { callback: 'window.result' });
    assert.equal(response.mimeType, 'application/javascript');
    assert.match(response.content, /^window\.result\(\[/);
    assert.match(callEndpoint([], { callback: 'alert(1)' }).content, /callback-ului este invalid/);
});

test('validates aggregate shape, exact project matching, and all site totals before updating', () => {
    const projects = [
        { id: 'a', title: 'Project A', target: 500, raised: 10 },
        { id: 'b', title: 'Project B', target: 900, raised: 20 }
    ];
    const updated = applyTotals(projects, [
        { project: 'Project A', totalMdl: 125, lastDonation: '2026-10-25' },
        { project: 'Project B', totalMdl: 0, lastDonation: '2026-10-23' }
    ]);
    assert.deepEqual(updated.map(project => project.raised), [125, 0]);
    assert.equal(updated[0].lastDonation, '25 octombrie 2026');
    assert.equal(updated[1].lastDonation, '23 octombrie 2026');
    assert.deepEqual(projects.map(project => project.raised), [10, 20]);

    assert.throws(
        () => applyTotals(projects, [{ project: 'project a', totalMdl: 125 }]),
        /Project A.*Project B/
    );
    assert.throws(
        () => applyTotals(projects, [{ project: 'Project A', totalMdl: 125 }, { project: 'Project B', totalMdl: 'bad' }]),
        /număr pozitiv/
    );
    assert.throws(
        () => applyTotals(projects, [{ project: 'Project A', totalMdl: 125, donor: 'Private Donor' }]),
        /date invalide/
    );
    assert.throws(
        () => applyTotals(projects, [
            { project: 'Project A', totalMdl: 125, lastDonation: '2026-02-30' },
            { project: 'Project B', totalMdl: 20, lastDonation: '' }
        ]),
        /data ultimei donații.*invalidă/i
    );
    assert.throws(
        () => applyTotals([projects[0], { ...projects[1], title: 'Project A' }], [
            { project: 'Project A', totalMdl: 125 }
        ]),
        /duplicat/
    );
});

test('keeps stored donation dates when an older endpoint only returns totals', () => {
    const projects = [{ id: 'a', title: 'Project A', raised: 10, lastDonation: '23 octombrie 2026' }];
    const [updated] = applyTotals(projects, [{ project: 'Project A', totalMdl: 125 }]);

    assert.equal(updated.raised, 125);
    assert.equal(updated.lastDonation, '23 octombrie 2026');
});

test('accepts only the Apps Script deployment URL format', () => {
    assert.equal(isAppsScriptEndpoint('https://script.google.com/macros/s/Abc_123-xyz/exec'), true);
    assert.equal(isAppsScriptEndpoint('https://example.com/macros/s/Abc/exec'), false);
    assert.equal(isAppsScriptEndpoint('https://script.google.com/macros/s/Abc/exec?x=1'), false);
});
