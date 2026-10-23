# ISYouth Fundraising

Site static publicat pe GitHub Pages. Proiectele și datele de contact folosesc valorile locale implicite până la configurarea Firebase.

## Configurarea Firebase

1. Creează un proiect Firebase, activează **Authentication > Google** și creează o bază de date **Cloud Firestore**.
2. Înregistrează o aplicație Web în proiect și completează `firebase-config.js` cu `apiKey`, `authDomain`, `projectId` și `appId` afișate de Firebase. Aceste valori sunt publice; nu adăuga chei de cont de serviciu sau alte secrete în site.
3. În **Authentication > Settings > Authorized domains**, autorizează domeniul pe care este publicat site-ul.
4. În **Firestore Database > Rules**, înlocuiește regulile cu conținutul din `firestore.rules` și apasă **Publish**. Alternativ, Firebase CLI poate publica fișierul cu `firebase deploy --only firestore:rules --project ID_PROIECT`.
5. Fiecare administrator se conectează o dată prin trei clicuri rapide pe logo. În **Authentication > Users**, copiază UID-ul contului aprobat și creează în Firestore documentul `admins/UID` cu câmpul boolean `enabled` setat la `true`.

Numai conturile cu document de administrator activ pot modifica documentul comun `appData/state`. Vizitatorii pot doar să citească proiectele și contactele publice. Un cont neaprobat care pornește autentificarea va fi deconectat automat și nu va putea accesa panoul sau modifica date. Nu crea documente de administrator pentru conturi neaprobate. Regulile Firestore sunt măsura de securitate efectivă; ascunderea panoului în interfață nu înlocuiește aceste reguli.

Fereastra Google Sheets din site este momentan doar informativă; integrarea Sheets se configurează separat.
