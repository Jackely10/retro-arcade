# Retro Arcade

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Jackely10/retro-arcade)

Die Arcade ist jetzt in vier Seiten aufgeteilt:

- `index.html` als Auswahlseite und Player-Deck
- `snake.html` als grosse Einzel-Seite fuer Snake
- `pong.html` als Online-1v1 Seite fuer Pong
- `memory.html` als grosse Einzel-Seite fuer Memory

## Online Pong lokal starten

1. `powershell -ExecutionPolicy Bypass -File server.ps1`
2. `http://localhost:8080/` im Browser oeffnen
3. `pong.html` auswaehlen oder direkt `http://localhost:8080/pong.html` oeffnen
4. Namen eintragen, verbinden und einen Raum erstellen oder beitreten
5. Raumcode oder Einladungslink an die zweite Person weitergeben

## Render Deployment

Die Arcade ist jetzt fuer `Render` vorbereitet:

- `Program.cs` startet den C#-Server direkt ohne PowerShell
- `Dockerfile` baut den Server mit `mono` und liefert die statischen Dateien aus
- `render.yaml` legt einen `Render` Web Service mit Health Check auf `/` an
- Der Server bindet online an `HOST=0.0.0.0` und `PORT`

Typischer Ablauf:

1. Projekt zu GitHub pushen
2. In Render `New +` waehlen
3. Entweder das Repo direkt als `Web Service` mit `Dockerfile` verbinden oder das `render.yaml` als Blueprint nutzen
4. Nach dem Deploy die Root-URL oeffnen und danach `pong.html`

## Neue UX- und Meta-Features

- Globales Profil mit lokal gespeichertem Spielernamen fuer die ganze Arcade
- Globaler Sound-Schalter, der auf allen Seiten synchron bleibt
- Arcade-Statistiken fuer Starts, Siege sowie Snake-, Memory- und Pong-Fortschritt
- `Snake` startet ueber ein Intro-Overlay und zeigt nach dem Lauf einen klaren Game-Over- oder Highscore-Screen
- `Memory` startet ueber ein Intro-Overlay und zeigt nach dem Sieg direkt das Ergebnis mit gespeichertem Bestwert
- `Pong` behaelt Raum und Verbindung fuer Revanchen, blendet nach einem Match ein Rematch-Overlay ein und bleibt bei der bestehenden WebSocket-Logik

## Hinweise

- `pong.html` nutzt WebSockets fuer Echtzeit-Duelle
- `pong.html?room=ABCD` traegt einen Raumcode direkt in die Lobby ein
- `server.ps1` startet den lokalen HTTP- und WebSocket-Server fuer Windows
- `server.cs` enthaelt die serverseitige Raum-, Namens- und Match-Logik
- `Program.cs` ist der Deploy-Entry-Point fuer Container und Render
- `styles.css` enthaelt das gemeinsame Retro-Layout
- `app.js` initialisiert je nach Seite das passende Spiel, Profil-Storage und Statistik-Sync
