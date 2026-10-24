(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.ISYOUTH_GALLERY = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const maxGalleryImages = 12;

    function validateImgixUrl(value) {
        if (typeof value !== 'string' || !value.trim()) {
            throw new TypeError('Adaugă un URL de imagine Imgix.');
        }

        let url;
        try {
            url = new URL(value.trim());
        } catch {
            throw new TypeError('Adresa imaginii este invalidă.');
        }
        if (url.protocol !== 'https:' ||
            !url.hostname.endsWith('.imgix.net') ||
            url.hostname === 'imgix.net' ||
            url.username ||
            url.password ||
            url.port ||
            url.pathname === '/') {
            throw new TypeError('Folosește un URL HTTPS de imagine de pe un subdomeniu *.imgix.net.');
        }
        return url.href;
    }

    function normalizeGallery(gallery) {
        if (!Array.isArray(gallery) || gallery.length > maxGalleryImages) {
            throw new TypeError('Galeria trebuie să conțină cel mult 12 fotografii.');
        }

        return gallery.map((image, index) => {
            if (!image || typeof image !== 'object' || Array.isArray(image) ||
                typeof image.id !== 'string' || !image.id.trim() ||
                typeof image.url !== 'string') {
                throw new TypeError(`Fotografia ${index + 1} din galerie este invalidă.`);
            }

            let url;
            try {
                url = validateImgixUrl(image.url);
            } catch {
                throw new TypeError(`Adresa fotografiei ${index + 1} trebuie să fie un URL HTTPS valid de pe *.imgix.net.`);
            }

            const label = image.label === undefined ? '' : image.label;
            const date = image.date === undefined ? '' : image.date;
            if (typeof label !== 'string' || label.length > 80 ||
                typeof date !== 'string' || (date && !isValidDate(date)) ||
                (image.order !== undefined &&
                    (!Number.isInteger(image.order) || image.order < 0 || image.order >= maxGalleryImages))) {
                throw new TypeError(`Eticheta, data sau ordinea fotografiei ${index + 1} din galerie este invalidă.`);
            }

            return {
                id: image.id.trim(),
                url,
                label,
                date,
                ...(image.order === undefined ? {} : { order: image.order })
            };
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
        if (gallery.every(image => Number.isInteger(image.order))) {
            return gallery.slice().sort((first, second) => first.order - second.order);
        }
        return gallery.slice().sort((first, second) => {
            if (!first.date) return second.date ? 1 : 0;
            if (!second.date) return -1;
            return first.date.localeCompare(second.date);
        });
    }

    function moveGalleryImage(gallery, index, direction) {
        if (!Array.isArray(gallery) || !Number.isInteger(index) ||
            index < 0 || index >= gallery.length || (direction !== -1 && direction !== 1)) {
            throw new RangeError('Poziția fotografiei pentru reordonare este invalidă.');
        }

        const target = index + direction;
        if (target < 0 || target >= gallery.length) return gallery;

        const reordered = gallery.slice();
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        return reordered.map((image, order) => ({ ...image, order }));
    }

    return {
        maxGalleryImages,
        validateImgixUrl,
        normalizeGallery,
        canShowGallery,
        sortGalleryChronologically,
        moveGalleryImage
    };
});
