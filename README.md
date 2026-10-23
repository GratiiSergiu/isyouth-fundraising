# ISYouth Fundraising

Site static publicat pe GitHub Pages. Proiectele și datele de contact sunt citite din Cloud Firestore după conectarea configurației Firebase.

## Configurarea Firebase

1. Creează un proiect Firebase, activează **Authentication > Google** și creează o bază de date **Cloud Firestore**.
2. Înregistrează o aplicație Web în proiect și verifică `firebase-config.js` pentru valorile `apiKey`, `authDomain`, `projectId` și `appId`. Aceste valori sunt publice; nu adăuga chei de cont de serviciu sau alte secrete în site.
3. În **Authentication > Settings > Authorized domains**, autorizează domeniul pe care este publicat site-ul.
4. În **Firestore Database > Rules**, înlocuiește regulile cu conținutul din `firestore.rules` și apasă **Publish**. Alternativ, Firebase CLI poate publica fișierul cu `firebase deploy --only firestore:rules --project ID_PROIECT`.
5. Fiecare administrator se conectează o dată prin trei clicuri rapide pe logo. În **Authentication > Users**, copiază UID-ul contului aprobat și creează în Firestore documentul `admins/UID` cu câmpul boolean `enabled` setat la `true`.

Numai conturile cu document de administrator activ pot modifica documentul comun `appData/state`. Vizitatorii pot doar să citească proiectele și contactele publice. Un cont neaprobat care pornește autentificarea va fi deconectat automat și nu va putea accesa panoul sau modifica date. Nu crea documente de administrator pentru conturi neaprobate. Regulile Firestore sunt măsura de securitate efectivă; ascunderea panoului în interfață nu înlocuiește aceste reguli.

## Evidența donațiilor cash în Google Sheets

Registrul cu înregistrări individuale rămâne privat. Site-ul cere endpointului Apps Script numai totalurile agregate pe ID de proiect; nu citește și nu publică data, numele sau notele donațiilor.

În Google Sheets, deschide **Extensions > Apps Script**, înlocuiește codul editorului cu `google-apps-script/Code.gs` și salvează. Selectează funcția `setupSheets` din editorul Apps Script și apasă **Run** o singură dată; aprobă permisiunile solicitate. Funcția creează filele `Proiecte` și `Donații` cu antetele și lista de statusuri necesare. Dacă există deja file cu aceste nume și alte antete, funcția se oprește fără să le suprascrie — verifică datele existente înainte să le ajustezi.

Fila `Proiecte` are coloanele `ID proiect`, `Nume proiect`, `Sold inițial (MDL)`. Adaugă câte un rând pentru fiecare proiect și soldul cu care începe evidența în Sheet. Numele ajută la identificarea rândului în registrul intern; denumirea și ținta afișate vizitatorilor rămân administrate pe site.

Fila `Donații` are coloanele `Data donației`, `Data înregistrării`, `ID proiect`, `Sumă (MDL)`, `Nume donator`, `Status`, `Notă internă (opțional)`. Pentru fiecare donație cash, completează data primirii, proiectul, suma, numele donatorului și statusul `Confirmată`; data înregistrării se completează automat când rândul este complet și confirmat. Numele donatorului și nota rămân doar în foaia privată. Dacă o înregistrare este greșită, schimbă statusul în `Anulată`; aceasta nu intră în total și păstrează istoricul.

ID-urile trebuie să coincidă cu ID-urile proiectelor din site (de exemplu `lavoar`, `cafea`, `canapea`, `jocuri`), iar fila `Proiecte` trebuie să conțină toate proiectele afișate pe site. Sumele sunt numere MDL, fără text sau monedă în celulă. Nu adăuga numele donatorilor dacă nu sunt necesare pentru evidența voastră internă.

După completarea soldurilor inițiale, în Apps Script folosește **Deploy > New deployment > Web app**. Setează **Execute as: Me** și accesul la **Anyone**, publică și copiază URL-ul `/exec`. Foaia în sine rămâne partajată numai cu persoanele autorizate; URL-ul public returnează numai totaluri agregate.

În site, conectează-te ca administrator, deschide **Google Sheets**, lipește URL-ul `/exec`, apasă **Salvează setarea**, apoi **Testează sincronizarea**. Totalurile se actualizează și automat la încărcarea paginii și apoi la fiecare cinci minute. Cu integrarea activă, câmpul „Suma strânsă” din formularul proiectului devine doar pentru citire; titlul, descrierea, ținta, categoria, imaginea și statusul se administrează în continuare din site. La adăugarea unui proiect nou, adaugă ID-ul și soldul inițial în fila `Proiecte`.
