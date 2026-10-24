# ISYouth Fundraising

Site static publicat pe GitHub Pages. Proiectele și datele de contact sunt citite din Cloud Firestore după conectarea configurației Firebase.

## Configurarea Firebase

1. Creează un proiect Firebase, activează **Authentication > Google**, creează o bază de date **Cloud Firestore** și activează **Storage**.
2. Înregistrează o aplicație Web în proiect și verifică `firebase-config.js` pentru valorile `apiKey`, `authDomain`, `projectId`, `appId` și `storageBucket`. Copiază `storageBucket` din Firebase Console (**Storage**); nu ghici numele bucket-ului. Aceste valori sunt publice; nu adăuga chei de cont de serviciu sau alte secrete în site.
3. În **Authentication > Settings > Authorized domains**, autorizează domeniul pe care este publicat site-ul.
4. În **Firestore Database > Rules**, înlocuiește regulile cu conținutul din `firestore.rules` și apasă **Publish**. În **Storage > Rules**, înlocuiește regulile cu `storage.rules` și apasă **Publish**. Alternativ, Firebase CLI poate publica ambele seturi cu `firebase deploy --only firestore:rules,storage --project ID_PROIECT`.
5. Fiecare administrator se conectează o dată prin trei clicuri rapide pe logo. În **Authentication > Users**, copiază UID-ul contului aprobat și creează în Firestore documentul `admins/UID` cu câmpul boolean `enabled` setat la `true`.

Numai conturile cu document de administrator activ pot modifica documentul comun `appData/state`. Vizitatorii pot doar să citească proiectele și contactele publice. Un cont neaprobat care pornește autentificarea va fi deconectat automat și nu va putea accesa panoul sau modifica date. Nu crea documente de administrator pentru conturi neaprobate. Regulile Firestore sunt măsura de securitate efectivă; ascunderea panoului în interfață nu înlocuiește aceste reguli.

## Galerie foto pentru proiecte finalizate

Galeria este opțională și se activează separat din editarea unui proiect cu status **Livrat / Finalizat**. Este destinată proiectelor cu etape vizibile (de exemplu reparații sau renovări), nu achizițiilor obișnuite; proiectele active nu afișează cronologii, chiar dacă date vechi au rămas în document. Administratorii pot încărca maximum 12 fotografii per proiect, de cel mult 5 MB fiecare, în format JPEG, PNG, WebP sau GIF, cu etichetă de etapă și dată opționale. Fotografiile sunt publice pentru afișare; regulile permit scrierea și ștergerea numai conturilor cu document `admins/UID` activ.

Încărcarea necesită un bucket Firebase Storage activ, regulile `storage.rules` publicate și valoarea `storageBucket` din Firebase Console adăugată la `firebase-config.js`. Fără această configurare, site-ul păstrează funcționale detaliile și proiectele existente, dar încărcările și eliminarea fotografiilor sunt dezactivate. Activarea Storage poate necesita planul **Blaze** și poate genera costuri conform tarifelor Google Cloud/Firebase; verifică planul, cotele și facturarea proiectului înainte de activare. La ștergerea proiectului sau a unei fotografii, site-ul șterge obiectul din Storage după salvarea datelor; erorile de ștergere sunt afișate, iar obiectele rămase trebuie eliminate manual din Firebase Console.

## Integrarea totalurilor Google Sheets

Site-ul citește numai perechi `Project` / `Total, MDL` din tabelul agregat „OUTPUT - Fundraising Page”. Tabelul poate fi pe orice filă: scriptul caută antetele exacte pe toate filele și refuză să continue dacă găsește zero sau mai multe tabele. Nu citește și nu returnează rândurile individuale de donații ori numele donatorilor. Foaia Google trebuie să rămână restricționată; endpoint-ul public expune doar totalurile agregate.

### Configurare manuală (nu se execută automat)

1. Deschide foaia privată și alege **Extensions > Apps Script**. Copiază conținutul fișierului `google-apps-script/Code.gs` în proiectul Apps Script asociat foii.
2. În editorul foii copiază Spreadsheet ID din URL-ul foii (segmentul dintre `/d/` și `/edit`). În **Project Settings > Script Properties**, adaugă proprietatea `SPREADSHEET_ID` cu această valoare. ID-ul nu este o parolă; scriptul îl folosește pentru a deschide explicit foaia la fiecare cerere.
3. Verifică în foaie că există un singur tabel cu antete exacte `Project` și `Total, MDL`, pe același rând și în coloane alăturate. Datele trebuie să înceapă pe rândul următor; fiecare proiect trebuie să aibă un nume unic și un total numeric MDL.
4. În Apps Script alege **Deploy > New deployment > Web app**. Setează **Execute as** la contul proprietarului foii și **Who has access** la **Anyone**, apoi autorizează și deployează. Fișierul sursă rămâne privat; numai endpoint-ul read-only este public, iar codul proiectează rezultatul strict în nume de proiect și total.
5. Copiază URL-ul Web App care se termină în `/exec`. În site, autentifică-te ca administrator, deschide **Google Sheets**, lipește URL-ul și apasă **Salvează și sincronizează**. URL-ul se salvează în datele comune Firestore; totalurile se reîncarcă la fiecare accesare a site-ului și apoi la fiecare 5 minute. Dacă titlurile nu corespund exact sau lipsește vreun rând, site-ul afișează o eroare vizibilă și păstrează totalurile anterioare.
6. Asigură-te că tabelul OUTPUT are câte un rând cu total pentru fiecare proiect din site, inclusiv proiectele livrate/finalizate. Editează titlurile proiectelor în panoul site-ului astfel încât să corespundă exact cu valorile din coloana `Project`. Țintele, textele scurte pentru card, descrierile complete, imaginile, categoriile și statusurile rămân gestionate în site. Proiectele existente cu un singur câmp de descriere folosesc temporar acel text atât pentru card, cât și pentru detaliile complete; la următoarea editare, cele două câmpuri se salvează separat. Suma strânsă nu se mai editează manual.
7. Pentru modificări ulterioare ale scriptului, folosește **Deploy > Manage deployments**, editează deployment-ul și publică o versiune nouă. Nu schimba foaia la „Anyone”; numai endpoint-ul Web App necesită acces public pentru site-ul static.

Testele offline se rulează cu `node --test tests/*.test.js`.
