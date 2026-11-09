# Oroscopo App

PWA mobile che mostra l'oroscopo giornaliero, settimanale, mensile e annuale di onlyoroscopo.com con una grafica che puoi personalizzare.

## Avvio

```
npm start        # oppure: node server.js
```

Apri http://localhost:3000. Serve solo Node 18 o più recente, senza dipendenze.

## Come funziona

- `server.js` legge gli oroscopi dei 12 segni dall'API WordPress del sito (categorie 44 giornaliero, 46 settimanale, 45 mensile, 47 annuale), li riformatta (valutazioni, testo, parola del giorno, affinità) e li salva in `data/` (`latest.json` per il giornaliero, `settimanale-latest.json` ecc. per gli altri, più un archivio).
- Ricontrolla il sito ogni ora. Il sito pubblica l'oroscopo del giorno dopo verso le 19.
- La webapp chiama `/api/oroscopo?period=giornaliero|settimanale|mensile|annuale` (senza parametro: giornaliero). Il service worker tiene in cache l'ultima versione, così l'app si legge anche offline.

## Personalizzare la grafica

- **Dall'app**: tocca il pulsante con la tavolozza in alto a destra. Puoi scegliere tra 6 temi, cambiare i 5 colori, il tipo di carattere, lo stile delle valutazioni, la dimensione del testo, l'arrotondamento e il cielo stellato. Le scelte si salvano nel browser. Con "Copia tema" e "Incolla tema" le passi da un dispositivo all'altro.
- **Dal codice**: i valori di partenza sono in `public/theme.css`, il layout è in `public/app.css` e i temi predefiniti stanno in `PRESETS` dentro `public/app.js`.
- **Icone**: cambia i colori in cima a `tools/make-icons.js` e lancia `npm run icons`.

## Installarla sul telefono (PWA)

Il browser permette di installare una PWA solo su **HTTPS** oppure su `localhost`. Hai due strade:

1. **Pubblicarla online** su un servizio che esegue Node (Render, Railway, Fly.io, un VPS…): il server è già pronto e usa la variabile `PORT`.
2. **Provarla al volo** con un tunnel HTTPS verso il PC, per esempio `npx cloudflared tunnel --url http://localhost:3000`, e aprire sul telefono l'URL che ti dà.

Poi: Android/Chrome → menu → *Installa app*. iPhone/Safari → Condividi → *Aggiungi alla schermata Home*.
