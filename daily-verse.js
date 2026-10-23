const dailyVerses = [
    {
        text: 'Fiecare sa dea dupa cum a hotarat in inima lui: nu cu parere de rau sau de sila, caci „pe cine da cu bucurie il iubeste Dumnezeu.”',
        reference: '2 Corinteni 9:7',
    },
    {
        text: 'Dati, si vi se va da; ba inca, vi se va turna in san o masura buna, indesata, clatinata, care se va varsa pe deasupra. Caci cu ce masura veti masura, cu aceea vi se va masura.',
        reference: 'Luca 6:38',
    },
    {
        text: 'In chipul acesta veti fi imbogatiti in toate privintele pentru orice darnicie, care, prin noi, va face sa se aduca multumiri lui Dumnezeu.',
        reference: '2 Corinteni 9:11',
    },
    {
        text: 'Sa stiti: cine seamana putin, putin va secera; iar cine seamana mult, mult va secera.',
        reference: '2 Corinteni 9:6',
    },
];

const utcDate = new Date();
const utcDay = Math.floor(Date.UTC(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
) / 86400000);
const verse = dailyVerses[utcDay % dailyVerses.length];

document.getElementById('daily-verse-text').textContent = verse.text;
document.getElementById('daily-verse-reference').textContent = verse.reference;
