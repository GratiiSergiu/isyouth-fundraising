# ISYouth Fundraising

Site static publicat pe GitHub Pages. Proiectele și datele de contact sunt citite din Cloud Firestore după conectarea configurației Firebase.

## Configurarea Firebase

1. Creează un proiect Firebase, activează **Authentication > Google** și creează o bază de date **Cloud Firestore**.
2. Înregistrează o aplicație Web în proiect și verifică `firebase-config.js` pentru valorile `apiKey`, `authDomain`, `projectId` și `appId`. Aceste valori sunt publice; nu adăuga chei de cont de serviciu sau alte secrete în site.
3. În **Authentication > Settings > Authorized domains**, autorizează domeniul pe care este publicat site-ul.
4. În **Firestore Database > Rules**, înlocuiește regulile cu conținutul din `firestore.rules` și apasă **Publish**. Alternativ, Firebase CLI poate publica fișierul cu `firebase deploy --only firestore:rules --project ID_PROIECT`.
5. Fiecare administrator se conectează o dată prin trei clicuri rapide pe logo. În **Authentication > Users**, copiază UID-ul contului aprobat și creează în Firestore documentul `admins/UID` cu câmpul boolean `enabled` setat la `true`.

Numai conturile cu document de administrator activ pot modifica documentul comun `appData/state`. Vizitatorii pot doar să citească proiectele și contactele publice. Un cont neaprobat care pornește autentificarea va fi deconectat automat și nu va putea accesa panoul sau modifica date. Nu crea documente de administrator pentru conturi neaprobate. Regulile Firestore sunt măsura de securitate efectivă; ascunderea panoului în interfață nu înlocuiește aceste reguli.

## Integrarea totalurilor Google Sheets

Site-ul citește numai perechi `Project` / `Total, MDL` din tabelul agregat „OUTPUT - Fundraising Page”. Tabelul poate fi pe orice filă: scriptul caută antetele exacte pe toate filele și refuză să continue dacă găsește zero sau mai multe tabele. Nu citește și nu returnează rândurile individuale de donații ori numele donatorilor. Foaia Google trebuie să rămână restricționată; endpoint-ul public expune doar totalurile agregate.

### Configurare manuală (nu se execută automat)

1. Deschide foaia privată și alege **Extensions > Apps Script**. Copiază conținutul fișierului `google-apps-script/Code.gs` în proiectul Apps Script asociat foii.
2. În editorul foii copiază Spreadsheet ID din URL-ul foii (segmentul dintre `/d/` și `/edit`). În **Project Settings > Script Properties**, adaugă proprietatea `SPREADSHEET_ID` cu această valoare. ID-ul nu este o parolă; scriptul îl folosește pentru a deschide explicit foaia la fiecare cerere.
3. Verifică în foaie că există un singur tabel cu antete exacte `Project` și `Total, MDL`, pe același rând și în coloane alăturate. Datele trebuie să înceapă pe rândul următor; fiecare proiect trebuie să aibă un nume unic și un total numeric MDL.
4. În Apps Script alege **Deploy > New deployment > Web app**. Setează **Execute as** la contul proprietarului foii și **Who has access** la **Anyone**, apoi autorizează și deployează. Fișierul sursă rămâne privat; numai endpoint-ul read-only este public, iar codul proiectează rezultatul strict în nume de proiect și total.
5. Copiază URL-ul Web App care se termină în `/exec`. În site, autentifică-te ca administrator, deschide **Google Sheets**, lipește URL-ul și apasă **Salvează și sincronizează**. URL-ul se salvează în datele comune Firestore; totalurile se reîncarcă la fiecare accesare a site-ului și apoi la fiecare 5 minute. Dacă titlurile nu corespund exact sau lipsește vreun rând, site-ul afișează o eroare vizibilă și păstrează totalurile anterioare.
6. Asigură-te că tabelul OUTPUT are câte un rând cu total pentru fiecare proiect din site, inclusiv proiectele livrate/finalizate. Editează titlurile proiectelor în panoul site-ului astfel încât să corespundă exact cu valorile din coloana `Project`. Țintele, descrierile, imaginile, categoriile și statusurile rămân gestionate în site. Suma strânsă nu se mai editează manual.
7. Pentru modificări ulterioare ale scriptului, folosește **Deploy > Manage deployments**, editează deployment-ul și publică o versiune nouă. Nu schimba foaia la „Anyone”; numai endpoint-ul Web App necesită acces public pentru site-ul static.

Testele offline pentru validarea endpoint-ului și a potrivirii exacte se rulează cu `node --test tests/sheets-sync.test.js`.
