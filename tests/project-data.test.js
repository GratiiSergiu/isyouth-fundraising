const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeProjects } = require('../project-data.js');

test('copies legacy descriptions into both new project description fields', () => {
    const legacyProject = {
        id: 'legacy',
        title: 'Proiect existent',
        description: 'Descrierea existentă'
    };

    const [normalized] = normalizeProjects([legacyProject]);

    assert.equal(normalized.shortDescription, legacyProject.description);
    assert.equal(normalized.fullDescription, legacyProject.description);
    assert.equal(normalized.description, legacyProject.description);
    assert.notEqual(normalized, legacyProject);
});

test('preserves edited short and full descriptions when normalizing again', () => {
    const [normalized] = normalizeProjects([{
        id: 'edited',
        description: 'Text legacy',
        shortDescription: 'Text scurt nou',
        fullDescription: 'Text complet nou'
    }]);

    assert.equal(normalized.shortDescription, 'Text scurt nou');
    assert.equal(normalized.fullDescription, 'Text complet nou');
});

test('uses the available new description when the legacy field is missing', () => {
    const [normalized] = normalizeProjects([{
        id: 'partial',
        fullDescription: 'Descriere completă'
    }]);

    assert.equal(normalized.shortDescription, 'Descriere completă');
    assert.equal(normalized.fullDescription, 'Descriere completă');
});

test('rejects invalid project data instead of silently dropping it', () => {
    assert.throws(() => normalizeProjects({}), /array/i);
    assert.throws(() => normalizeProjects([null]), /invalid/i);
});
