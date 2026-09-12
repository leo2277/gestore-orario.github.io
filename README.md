# orario

Un primo prototipo, senza dipendenze da installare: avvialo con `npm run dev` e apri `http://localhost:4173`.

## Dati e accesso

GitHub Pages ospita soltanto file statici (HTML, CSS e JavaScript): non può eseguire un database o un backend. Al momento le lezioni vengono quindi salvate nel `localStorage` del singolo browser. Il sito è online, ma i dati non vengono condivisi tra dispositivi e possono essere cancellati svuotando i dati del browser.

Per avere dati realmente online e persistenti, collega l'app a un servizio esterno, ad esempio **Supabase** (database PostgreSQL + autenticazione). Il flusso consigliato è:

1. Crea un progetto Supabase e abilita l'accesso con email oppure Google.
2. Crea una tabella `lessons` con almeno `id`, `user_id`, `day`, `slot`, `subject`, `teacher`, `room`, `topic` e `color`.
3. Abilita le Row Level Security policy affinché ogni utente possa leggere e modificare solo le righe con il proprio `user_id`.
4. Inserisci nel frontend soltanto l'URL del progetto e la **publishable/anon key**; non inserire mai una service-role key o una password nel repository.
5. Sostituisci le letture e scritture di `localStorage` in `src/main.jsx` con chiamate al database dopo il login.

Se vuoi un'app solo pubblica, senza account e senza dati personali, `localStorage` è sufficiente; per un orario accessibile da più dispositivi o utenti serve un database esterno. **Non** inserire password o segreti GitHub nel codice frontend o nel repository.

## Importazione rapida

Il pannello **Importa orario** accetta una riga per lezione nel formato:

```text
Lunedì; 08:00; Italiano; Prof.ssa Bianchi; Aula 12; Il Romanticismo
```

I campi successivi all'ora sono facoltativi. Le lezioni possono anche essere create e modificate direttamente dal calendario.


## Pubblicazione su GitHub Pages

Il workflow incluso pubblica automaticamente la versione statica ad ogni push su `main` (oppure può essere avviato manualmente dalla scheda **Actions**). Per abilitarlo una prima volta:

1. Apri **Settings → Pages** nel repository GitHub.
2. In **Build and deployment**, scegli **GitHub Actions** come sorgente.
3. Esegui il push su `main` e attendi che il workflow **Deploy static content to Pages** completi il deployment.

L'app verrà esposta all'URL Pages indicato da GitHub. I riferimenti a script e foglio di stile sono relativi, quindi funzionano anche quando il sito viene servito sotto il prefisso del repository (ad esempio `utente.github.io/nome-repository/`). Se la pagina è bianca, apri **Actions**, verifica che l'ultimo deploy sia verde e controlla che in **Settings → Pages** la sorgente sia ancora **GitHub Actions**. Dopo un nuovo push attendi il termine del workflow e aggiorna la pagina senza cache (`Ctrl/Cmd+Shift+R`).
