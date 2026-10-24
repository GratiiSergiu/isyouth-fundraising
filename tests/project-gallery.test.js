const assert = require('node:assert/strict');
const test = require('node:test');
const {
    canShowGallery,
    maxGalleryImages,
    moveGalleryImage,
    normalizeGallery,
    sortGalleryChronologically,
    validateImgixUrl
} = require('../project-gallery.js');

const image = {
    id: 'photo-1',
    url: 'https://isyouth.imgix.net/project/photo-1.webp?auto=format',
    label: 'Înainte',
    date: '2026-01-15',
    order: 0
};

test('accepts only HTTPS image URLs on Imgix subdomains', () => {
    assert.equal(
        validateImgixUrl('https://isyouth.imgix.net/project/photo-1.webp?auto=format'),
        'https://isyouth.imgix.net/project/photo-1.webp?auto=format'
    );
    assert.throws(() => validateImgixUrl('http://isyouth.imgix.net/photo.webp'), /HTTPS/);
    assert.throws(() => validateImgixUrl('https://images.unsplash.com/photo.webp'), /\*\.imgix\.net/);
    assert.throws(() => validateImgixUrl('javascript:alert(1)'), /HTTPS/);
    assert.throws(() => validateImgixUrl('data:image/png;base64,AAAA'), /HTTPS/);
    assert.throws(() => validateImgixUrl('https://isyouth.imgix.net@evil.example/photo.webp'), /\*\.imgix\.net/);
    assert.throws(() => validateImgixUrl('https://isyouth.imgix.net:8443/photo.webp'), /\*\.imgix\.net/);
});

test('normalizes optional labels and dates while enforcing gallery shape', () => {
    assert.deepEqual(normalizeGallery([image]), [image]);
    assert.deepEqual(normalizeGallery([{ ...image, storagePath: 'project-galleries/legacy/photo.webp' }]), [image]);
    assert.deepEqual(normalizeGallery([{ ...image, label: undefined, date: undefined }]), [{
        ...image,
        label: '',
        date: '',
        order: 0
    }]);
    assert.throws(() => normalizeGallery([{ ...image, date: '2026-02-30' }]), /data.*invalidă/i);
    assert.throws(() => normalizeGallery([{ ...image, order: maxGalleryImages }]), /ordinea.*invalidă/i);
    assert.throws(() => normalizeGallery([{ ...image, url: 'https://outside.example/photo.webp' }]), /imgix.net/);
    assert.throws(() => normalizeGallery([{
        ...image,
        url: 'https://firebasestorage.googleapis.com/v0/b/example/o/photo.webp'
    }]), /imgix.net/);
    assert.throws(() => normalizeGallery(Array(maxGalleryImages + 1).fill(image)), /12/);
});

test('only opted-in completed projects with photos expose a gallery', () => {
    assert.equal(canShowGallery({ status: 'completed', galleryEnabled: true, gallery: [image] }), true);
    assert.equal(canShowGallery({ status: 'active', galleryEnabled: true, gallery: [image] }), false);
    assert.equal(canShowGallery({ status: 'completed', galleryEnabled: false, gallery: [image] }), false);
    assert.equal(canShowGallery({ status: 'completed', galleryEnabled: true, gallery: [] }), false);
});

test('sorts legacy dated photos chronologically and leaves undated photos last', () => {
    const sorted = sortGalleryChronologically([
        { ...image, id: 'later', order: undefined, date: '2026-03-01' },
        { ...image, id: 'undated', order: undefined, date: '' },
        { ...image, id: 'earlier', order: undefined, date: '2026-01-01' }
    ]);

    assert.deepEqual(sorted.map(photo => photo.id), ['earlier', 'later', 'undated']);
});

test('uses saved manual order and updates it when moving a photo', () => {
    const gallery = [
        { ...image, id: 'first', order: 0 },
        { ...image, id: 'second', order: 1 }
    ];
    const reordered = moveGalleryImage(gallery, 1, -1);

    assert.deepEqual(reordered.map(photo => [photo.id, photo.order]), [['second', 0], ['first', 1]]);
    assert.deepEqual(sortGalleryChronologically(reordered).map(photo => photo.id), ['second', 'first']);
    assert.deepEqual(gallery.map(photo => photo.id), ['first', 'second']);
});
