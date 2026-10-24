(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.ISYOUTH_GALLERY = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const maxGalleryImages = 12;
    const maxImageBytes = 5 * 1024 * 1024;
    const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

    function validateImageFile(file) {
        if (!file || !allowedImageTypes.has(file.type)) {
            throw new TypeError('Alege o imagine JPEG, PNG, WebP sau GIF.');
        }
        if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxImageBytes) {
            throw new RangeError('Fiecare fotografie trebuie să aibă între 1 byte și 5 MB.');
        }
        return true;
    }

    function normalizeGallery(gallery) {
        if (!Array.isArray(gallery) || gallery.length > maxGalleryImages) {
            throw new TypeError('Galeria trebuie să conțină cel mult 12 fotografii.');
        }

        return gallery.map((image, index) => {
            if (!image || typeof image !== 'object' || Array.isArray(image) ||
                typeof image.id !== 'string' || !image.id.trim() ||
                typeof image.storagePath !== 'string' ||
                !/^project-galleries\/[^/]+\/[^/]+$/.test(image.storagePath) ||
                typeof image.url !== 'string') {
                throw new TypeError(`Fotografia ${index + 1} din galerie este invalidă.`);
            }

            let url;
            try {
                url = new URL(image.url);
            } catch {
                throw new TypeError(`Adresa fotografiei ${index + 1} este invalidă.`);
            }
            if (url.protocol !== 'https:') {
                throw new TypeError(`Adresa fotografiei ${index + 1} trebuie să folosească HTTPS.`);
            }

            const label = image.label === undefined ? '' : image.label;
            const date = image.date === undefined ? '' : image.date;
            if (typeof label !== 'string' || label.length > 80 ||
                typeof date !== 'string' || (date && !isValidDate(date))) {
                throw new TypeError(`Eticheta sau data fotografiei ${index + 1} este invalidă.`);
            }

            return { id: image.id, storagePath: image.storagePath, url: url.href, label, date };
        });
    }

    function isValidDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }

    function canShowGallery(project) {
        return Boolean(
            project &&
            project.status === 'completed' &&
            project.galleryEnabled === true &&
            Array.isArray(project.gallery) &&
            project.gallery.length > 0
        );
    }

    function sortGalleryChronologically(gallery) {
        return gallery.slice().sort((first, second) => {
            if (!first.date) return second.date ? 1 : 0;
            if (!second.date) return -1;
            return first.date.localeCompare(second.date);
        });
    }

    return {
        maxGalleryImages,
        maxImageBytes,
        validateImageFile,
        normalizeGallery,
        canShowGallery,
        sortGalleryChronologically
    };
});
