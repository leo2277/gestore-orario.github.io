# orario

Un primo prototipo, senza dipendenze da installare: avvialo con `npm run dev` e apri `http://localhost:4173`.

## Dati e accesso

Le lezioni vengono salvate nel `localStorage` del browser: è quindi un prototipo personale e non un sistema di autenticazione sicuro. Per una pubblicazione online, il passo successivo consigliato è un backend con un database e autenticazione gestita (ad esempio Supabase Auth o GitHub OAuth). **Non** inserire password o segreti GitHub nel codice frontend o in un repository.

## Importazione rapida

Il pannello **Importa orario** accetta una riga per lezione nel formato:

```text
Lunedì; 08:00; Italiano; Prof.ssa Bianchi; Aula 12; Il Romanticismo
```

I campi successivi all'ora sono facoltativi. Le lezioni possono anche essere create e modificate direttamente dal calendario.


## Pubblicazione su GitHub Pages

Il workflow incluso pubblica automaticamente la versione statica ad ogni push su `work` (oppure può essere avviato manualmente dalla scheda **Actions**). Per abilitarlo una prima volta:

1. Apri **Settings → Pages** nel repository GitHub.
2. In **Build and deployment**, scegli **GitHub Actions** come sorgente.
3. Esegui il push su `work` e attendi che il workflow **Deploy to GitHub Pages** completi il deployment.

L'app verrà esposta all'URL Pages indicato da GitHub. Il riferimento allo script dell'app è relativo, quindi funziona anche quando il sito viene servito sotto il prefisso del repository (ad esempio `utente.github.io/nome-repository/`).
