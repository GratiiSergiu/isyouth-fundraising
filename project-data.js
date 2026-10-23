(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.ISYOUTH_PROJECTS = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    function normalizeProjects(projects) {
        if (!Array.isArray(projects)) {
            throw new TypeError('Lista proiectelor trebuie să fie un array.');
        }

        return projects.map((project, index) => {
            if (!project || typeof project !== 'object' || Array.isArray(project)) {
                throw new TypeError(`Proiectul de la poziția ${index} este invalid.`);
            }

            const legacyDescription = typeof project.description === 'string'
                ? project.description
                : '';
            const savedFullDescription = typeof project.fullDescription === 'string'
                ? project.fullDescription
                : '';
            const shortDescription = typeof project.shortDescription === 'string'
                ? project.shortDescription
                : legacyDescription || savedFullDescription;
            const fullDescription = typeof project.fullDescription === 'string'
                ? project.fullDescription
                : legacyDescription || shortDescription || savedFullDescription;

            return { ...project, shortDescription, fullDescription };
        });
    }

    return { normalizeProjects };
});
