(function (root) {
    function isAppsScriptEndpoint(value) {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' &&
                url.hostname === 'script.google.com' &&
                !url.port &&
                /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) &&
                !url.search &&
                !url.hash;
        } catch (error) {
            return false;
        }
    }

    function applyTotals(projects, payload) {
        if (payload && !Array.isArray(payload) && typeof payload.error === 'string') {
            throw new Error(payload.error);
        }
        if (!Array.isArray(payload)) {
            throw new Error('Răspunsul endpoint-ului trebuie să fie o listă de totaluri.');
        }

        const totalsByProject = new Map();
        payload.forEach((entry, index) => {
            if (!entry || typeof entry !== 'object' ||
                Object.keys(entry).length !== 2 ||
                !Object.prototype.hasOwnProperty.call(entry, 'project') ||
                !Object.prototype.hasOwnProperty.call(entry, 'totalMdl')) {
                throw new Error(`Totalul de pe poziția ${index + 1} conține date invalide.`);
            }
            if (typeof entry.project !== 'string' || !entry.project.trim() ||
                entry.project !== entry.project.trim()) {
                throw new Error(`Numele proiectului de pe poziția ${index + 1} este invalid.`);
            }
            if (typeof entry.totalMdl !== 'number' || !Number.isFinite(entry.totalMdl) || entry.totalMdl < 0) {
                throw new Error(`Totalul MDL pentru „${entry.project}” trebuie să fie un număr pozitiv sau zero.`);
            }
            if (totalsByProject.has(entry.project)) {
                throw new Error(`Proiectul „${entry.project}” apare de mai multe ori în totalurile Google Sheets.`);
            }
            totalsByProject.set(entry.project, entry.totalMdl);
        });

        const siteProjectNames = new Set();
        projects.forEach(project => {
            if (!project || typeof project.title !== 'string' || !project.title.trim()) {
                throw new Error('Un proiect din site nu are un titlu valid.');
            }
            if (siteProjectNames.has(project.title)) {
                throw new Error(`Titlul „${project.title}” este duplicat în proiectele site-ului.`);
            }
            siteProjectNames.add(project.title);
        });

        const missingProjects = projects.filter(project => !totalsByProject.has(project.title));
        if (missingProjects.length) {
            throw new Error(`Lipsesc totaluri Google Sheets pentru: ${missingProjects.map(project => `„${project.title}”`).join(', ')}.`);
        }

        return projects.map(project => ({
            ...project,
            raised: totalsByProject.get(project.title)
        }));
    }

    const api = { isAppsScriptEndpoint, applyTotals };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.ISYOUTH_SHEETS = api;
})(typeof window === 'undefined' ? globalThis : window);
