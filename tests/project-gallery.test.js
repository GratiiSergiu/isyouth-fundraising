const assert = require('node:assert/strict');
const test = require('node:test');
const {
    canShowGallery,
    maxGalleryImages,
    normalizeGallery,
    sortGalleryChronologically,
    validateImageFile
} = require('../project-gallery.js');

const image = {
    id: 'photo-1',
    storagePath: 'project-galleries/renovation/photo-1.webp',
    url: 'https://firebasestorage.googleapis.com/v0/b/example/o/photo-1.webp',
    label: 'Înainte',
    date: '2026-01-15'
};

test('validates supported image types and the 5 MB upload limit', () => {
    assert.equal(validateImageFile({ type: 'image/webp', size: 100 }), true);
    assert.throws(() => validateImageFile({ type: 'image/svg+xml', size: 100 }), /JPEG, PNG, WebP sau GIF/);
    assert.throws(() => validateImageFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }), /5 MB/);
    assert.throws(() => validateImageFile({ type: 'image/png', size: 0 }), /5 MB/);
});

test('normalizes optional labels and dates while enforcing gallery shape', () => {
    assert.deepEqual(normalizeGallery([image]), [image]);
    assert.deepEqual(normalizeGallery([{ ...image, label: undefined, date: undefined }]), [{
        ...image,
        label: '',
        date: ''
    }]);
    assert.throws(() => normalizeGallery([{ ...image, date: '2026-02-30' }]), /data.*invalidă/);
    assert.throws(() => normalizeGallery([{ ...image, storagePath: '../outside' }]), /invalidă/);
    assert.throws(() => normalizeGallery(Array(maxGalleryImages + 1).fill(image)), /12/);
});

test('only opted-in completed projects with photos expose a gallery', () => {
    assert.equal(canShowGallery({ status: 'completed', galleryEnabled: true, gallery: [image] }), true);
    assert.equal(canShowGallery({ status: 'active', galleryEnabled: true, gallery: [image] }), false);
    assert.equal(canShowGallery({ status: 'completed', galleryEnabled: false, gallery: [image] }), false);
    assert.equal(canShowGallery({ status: 'completed', galleryEnabled: true, gallery: [] }), false);
});

test('sorts dated photos in chronological order and leaves undated photos last', () => {
    const sorted = sortGalleryChronologically([
        { ...image, id: 'later', date: '2026-03-01' },
        { ...image, id: 'undated', date: '' },
        { ...image, id: 'earlier', date: '2026-01-01' }
    ]);

    assert.deepEqual(sorted.map(photo => photo.id), ['earlier', 'later', 'undated']);
});
