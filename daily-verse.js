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

const utcDate = new Date();
const utcDay = Math.floor(Date.UTC(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
) / 86400000);
const verse = dailyVerses[utcDay % dailyVerses.length];

document.getElementById('daily-verse-text').textContent = verse.text;
document.getElementById('daily-verse-reference').textContent = verse.reference;
