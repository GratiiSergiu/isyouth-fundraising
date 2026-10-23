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
        }
    };
}

function callEndpoint(sheets, parameters) {
    const context = {
        SpreadsheetApp: {
            getActiveSpreadsheet: () => ({ getSheets: () => sheets }),
            openById: () => ({ getSheets: () => sheets })
        },
        PropertiesService: {
            getScriptProperties: () => ({ getProperty: () => 'mock-sheet-id' })
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

function makeOutputSheet(rows) {
    const values = [
        [],
        [...Array(14).fill(''), 'Project', 'Total, MDL'],
        ...rows.map(([project, total]) => [...Array(14).fill(''), project, total])
    ];
    return makeSheet('OUTPUT - Fundraising Page', values);
}

test('locates the exact output headers on any tab and returns aggregates only', () => {
    const privateRegister = makeSheet('Donations', [
        ['Date', 'Donator', 'Amount', 'CCY', 'Project', 'MDL Amount'],
        ['2026-10-01', 'Private Donor', 100, 'MDL', 'Project A', 100]
    ]);
    const output = makeOutputSheet([['Project A', 1250], ['Project B', 0]]);
    const callback = 'window.result';
    const result = parseResponse(callEndpoint([privateRegister, output], { callback }), callback);

    assert.deepEqual(result, [
        { project: 'Project A', totalMdl: 1250 },
        { project: 'Project B', totalMdl: 0 }
    ]);
    assert.equal(JSON.stringify(result).includes('Private Donor'), false);
    assert.equal(result.some(row => Object.keys(row).some(key => /donor|date|amount|ccy/i.test(key))), false);
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
        { project: 'Project A', totalMdl: 125 },
        { project: 'Project B', totalMdl: 0 }
    ]);
    assert.deepEqual(updated.map(project => project.raised), [125, 0]);
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
        () => applyTotals([projects[0], { ...projects[1], title: 'Project A' }], [
            { project: 'Project A', totalMdl: 125 }
        ]),
        /duplicat/
    );
});

test('accepts only the Apps Script deployment URL format', () => {
    assert.equal(isAppsScriptEndpoint('https://script.google.com/macros/s/Abc_123-xyz/exec'), true);
    assert.equal(isAppsScriptEndpoint('https://example.com/macros/s/Abc/exec'), false);
    assert.equal(isAppsScriptEndpoint('https://script.google.com/macros/s/Abc/exec?x=1'), false);
});
