# GitHub und Render Schnellstart

## Option 1: Ohne Git im Browser hochladen

1. Auf GitHub ein neues Repository erstellen, zum Beispiel `retro-arcade`
2. `README`, `.gitignore` oder Lizenz dort nicht automatisch anlegen
3. Im neuen Repo `uploading an existing file` waehlen
4. Alle Dateien aus diesem Projektordner hochladen
5. Commit bestaetigen
6. In Render das GitHub-Repo verbinden und deployen

## Option 2: Mit GitHub Desktop

1. GitHub Desktop installieren und anmelden
2. `Add an Existing Repository from your Local Drive` waehlen
3. Falls GitHub Desktop anbietet, den Ordner als Repository zu initialisieren, bestaetigen
4. Dieses Projekt auswaehlen: `C:\Users\zouhi\Desktop\Projekt`
5. Ersten Commit machen
6. `Publish repository` klicken
7. Danach in Render das Repo verbinden

## Render danach

1. In Render `New +` klicken
2. `Web Service` oder Blueprint mit `render.yaml` waehlen
3. GitHub-Repo verbinden
4. Deploy starten
5. Nach dem Build die Root-URL und danach `pong.html` testen

## Wichtige Projektdateien

- `Program.cs` ist der Server-Startpunkt fuer Render
- `Dockerfile` baut den Container
- `render.yaml` enthaelt die Render-Konfiguration
- `server.cs` enthaelt HTTP- und WebSocket-Logik
