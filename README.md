# Orario studente

App locale (nessun server) per trasformare un orario scolastico scritto in modo disordinato in un orario settimanale interattivo, con docente, aula e argomento per ogni lezione. Pubblicata su GitHub Pages.

## Come funziona

- **`index.html`** — pagina di ingresso: scegli un nome progetto (serve solo a tenere separati i dati, non è un vero login) e, facoltativamente, i dati per sincronizzare con GitHub.
- **`orario.html`** — l'app vera e propria: importa/incolla l'orario, modifica ogni lezione, esporta in PDF o Word.
- **`data/<progetto>.json`** — se attivi la sincronizzazione GitHub, qui viene salvato l'orario di quel progetto, come "database" del repo stesso.
- Senza sincronizzazione GitHub, i dati restano solo nel browser (localStorage) di chi li ha inseriti.

## Attivare GitHub Pages

1. Vai su **Settings → Pages** di questo repository.
2. In "Build and deployment", scegli **Deploy from a branch**.
3. Branch: `main`, cartella `/ (root)`. Salva.
4. Dopo circa un minuto il sito sarà su `https://<tuo-utente>.github.io/<nome-repo>/`.

## Attivare la sincronizzazione con GitHub (opzionale)

L'orario può essere letto/scritto direttamente in questo repository tramite le API di GitHub, chiamate dal browser. Per farlo funzionare:

1. Vai su [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. Crea un **fine-grained token** limitato **solo a questo repository**.
3. Dagli il permesso **Contents: Read and write** (nient'altro serve).
4. Copia il token e incollalo nella pagina di ingresso dell'app, insieme a utente e nome del repository.

> **Attenzione alla sicurezza:** il token viene salvato solo nel `localStorage` del browser (mai committato nel repository), ma resta comunque leggibile da chiunque abbia accesso a quel browser o ne apra la console degli strumenti per sviluppatori. Per un uso più sicuro in futuro, valuta di spostare le chiamate dietro una piccola funzione serverless (es. Cloudflare Worker o GitHub Actions) invece di tenere il token lato client.

## Struttura

```
index.html        pagina di ingresso / scelta progetto
orario.html        l'app dell'orario
assets/theme.css   stile condiviso
assets/storage.js  lettura/scrittura locale + GitHub
assets/app.js      logica dell'app (parser import, griglia, editor, export)
data/              un file .json per ogni "progetto"
```

## Formato di import riconosciuto

Una lezione per riga, in quasi qualsiasi ordine:

```
Lunedì 08:00-09:00 Matematica - Rossi - Aula 3
Martedì 10-11 Inglese Prof. Verdi
Mercoledì 8:00/9:00 Storia
```

Parole chiave riconosciute: `Aula` / `Lab` per l'aula, `Prof.` / `Prof.ssa` per il docente. Le righe non riconosciute vengono segnalate per l'aggiunta manuale.
