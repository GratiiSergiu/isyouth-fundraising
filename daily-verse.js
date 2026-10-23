(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root.document) {
        root.ISYOUTH_DAILY_VERSE = api;
        const rotator = api.createDailyVerseRotator(api.dailyVerses, () => root.localStorage);
        root.advanceDailyVerse = function () {
            const verse = rotator.advance();
            root.document.getElementById('daily-verse-text').textContent = verse.text;
            root.document.getElementById('daily-verse-reference').textContent = verse.reference;
        };
        root.advanceDailyVerse();
    }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const dailyVerses = [
        {
            text: 'Fiecare să dea după cum a hotărît în inima lui: nu cu părere de rău, sau de silă, căci „pe cine dă cu bucurie, îl iubește Dumnezeu.“',
            reference: '2 Corinteni 9:7',
        },
        {
            text: 'Dați, și vi se va da; ba încă, vi se va turna în sîn o măsură bună, îndesată, clătinată, care se va vărsa pe deasupra. Căci cu ce măsură veți măsura, cu aceea vi se va măsura.“',
            reference: 'Luca 6:38',
        },
        {
            text: 'În chipul acesta veți fi îmbogățiți în toate privințele, pentru orice dărnicie, care, prin noi, va face să se aducă mulțămiri lui Dumnezeu.',
            reference: '2 Corinteni 9:11',
        },
        {
            text: 'Să știți: cine samănă puțin, puțin va secera; iar cine samănă mult, mult va secera.',
            reference: '2 Corinteni 9:6',
        },
    ];
    const storageKey = 'isyouth_daily_verse_index';

    function createDailyVerseRotator(verses, getStorage, logger = console) {
        if (!Array.isArray(verses) || verses.length === 0) {
            throw new TypeError('Lista versetelor trebuie să fie un array nevid.');
        }

        let memoryPreviousIndex = null;

        function advance() {
            let previousIndex = memoryPreviousIndex;
            let storage = null;

            try {
                storage = getStorage();
                const storedIndex = storage.getItem(storageKey);
                if (storedIndex !== null) {
                    const parsedIndex = Number(storedIndex);
                    if (
                        /^(0|[1-9]\d*)$/.test(storedIndex)
                        && Number.isSafeInteger(parsedIndex)
                        && parsedIndex >= 0
                        && parsedIndex < verses.length
                    ) {
                        previousIndex = parsedIndex;
                    } else {
                        logger.error('Indexul versetului salvat este invalid; se continuă de la indexul din memorie sau de la primul verset.');
                    }
                }
            } catch (error) {
                logger.error('Stocarea versetului nu este disponibilă; se folosește indexul din memorie.', error);
                storage = null;
            }

            const nextIndex = previousIndex === null ? 0 : (previousIndex + 1) % verses.length;
            memoryPreviousIndex = nextIndex;

            if (storage) {
                try {
                    storage.setItem(storageKey, String(nextIndex));
                } catch (error) {
                    logger.error('Indexul versetului nu a putut fi salvat; se continuă cu indexul din memorie.', error);
                }
            }

            return verses[nextIndex];
        }

        return { advance };
    }

    function createAuthTransitionHandler(onTransition) {
        if (typeof onTransition !== 'function') {
            throw new TypeError('Acțiunea la schimbarea autentificării trebuie să fie o funcție.');
        }

        let initialized = false;
        let previousUid = null;
        return function (user) {
            const nextUid = user ? user.uid : null;
            if (!initialized) {
                initialized = true;
                previousUid = nextUid;
                return;
            }

            if (nextUid !== previousUid) {
                previousUid = nextUid;
                onTransition();
            }
        };
    }

    return { dailyVerses, createDailyVerseRotator, createAuthTransitionHandler };
});
