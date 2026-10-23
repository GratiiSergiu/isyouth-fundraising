const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const {
    createAuthTransitionHandler,
    createDailyVerseRotator,
    dailyVerses
} = require('../daily-verse.js');

const storageKey = 'isyouth_daily_verse_index';

function createMemoryStorage(initialEntries = {}) {
    const values = new Map(Object.entries(initialEntries));
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, value);
        }
    };
}

test('advances once on page load and continues from localStorage on reload', () => {
    const storage = createMemoryStorage();
    const firstPage = createDailyVerseRotator(dailyVerses, () => storage);
    const firstVerse = firstPage.advance();
    const reloadedPage = createDailyVerseRotator(dailyVerses, () => storage);
    const secondVerse = reloadedPage.advance();

    assert.equal(firstVerse.reference, '2 Corinteni 9:7');
    assert.equal(secondVerse.reference, 'Luca 6:38');
    assert.equal(storage.getItem(storageKey), '1');
});

test('ignores the initial auth callback and advances once for each login or logout', () => {
    const storage = createMemoryStorage();
    const rotator = createDailyVerseRotator(dailyVerses, () => storage);
    const advancedReferences = [rotator.advance().reference];
    const onAuthStateChange = createAuthTransitionHandler(() => {
        advancedReferences.push(rotator.advance().reference);
    });

    onAuthStateChange(null);
    onAuthStateChange(null);
    onAuthStateChange({ uid: 'admin-1' });
    onAuthStateChange({ uid: 'admin-1' });
    onAuthStateChange(null);

    assert.deepEqual(advancedReferences, [
        '2 Corinteni 9:7',
        'Luca 6:38',
        '2 Corinteni 9:11'
    ]);
});

test('wraps around without repeating the previous verse', () => {
    const storage = createMemoryStorage({ [storageKey]: '3' });
    const firstPage = createDailyVerseRotator(dailyVerses, () => storage);
    const verseAfterLast = firstPage.advance();
    const reloadedPage = createDailyVerseRotator(dailyVerses, () => storage);
    const verseAfterFirst = reloadedPage.advance();

    assert.equal(verseAfterLast.reference, '2 Corinteni 9:7');
    assert.equal(verseAfterFirst.reference, 'Luca 6:38');
});

test('restarts from the first verse and reports malformed persisted state', () => {
    const storage = createMemoryStorage({ [storageKey]: 'not-an-index' });
    const errors = [];
    const rotator = createDailyVerseRotator(dailyVerses, () => storage, {
        error: (...args) => errors.push(args)
    });

    assert.equal(rotator.advance().reference, '2 Corinteni 9:7');
    assert.equal(storage.getItem(storageKey), '0');
    assert.equal(errors.length, 1);
});

test('uses an in-memory index when browser storage is unavailable', () => {
    const errors = [];
    const getUnavailableStorage = () => {
        throw new Error('Storage unavailable');
    };
    const rotator = createDailyVerseRotator(dailyVerses, getUnavailableStorage, {
        error: (...args) => errors.push(args)
    });

    assert.equal(rotator.advance().reference, '2 Corinteni 9:7');
    assert.equal(rotator.advance().reference, 'Luca 6:38');
    assert.equal(errors.length, 2);
});

test('browser script advances exactly once during initialization', () => {
    const scriptSource = fs.readFileSync(path.join(__dirname, '..', 'daily-verse.js'), 'utf8');
    const storage = createMemoryStorage();
    const elements = {
        'daily-verse-text': { textContent: '' },
        'daily-verse-reference': { textContent: '' }
    };
    const context = {
        localStorage: storage,
        document: { getElementById: id => elements[id] },
        console
    };
    context.window = context;

    vm.runInNewContext(scriptSource, context);

    assert.equal(storage.getItem(storageKey), '0');
    assert.equal(elements['daily-verse-reference'].textContent, '2 Corinteni 9:7');
});
