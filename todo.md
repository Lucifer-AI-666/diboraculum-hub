# Diboraculum Hub - TODO

## Setup & Infrastructure
- [x] Schema DB: tabelle users, vip_sessions, chat_history, threat_logs
- [x] Design system: CSS cyberpunk, variabili neon, font monospace
- [x] App.tsx: routing completo con protezione auth su tutte le route

## Login VIP
- [x] Schermata login VIP con input codice crittografico
- [x] Backend: procedura verifyVipCode con algoritmo hash proprietario
- [x] Sessione persistente dopo login VIP
- [x] Redirect automatico alla dashboard dopo login

## Dashboard & Layout
- [x] DashboardLayout cyberpunk con sidebar neon
- [x] Sidebar con link a tutti i moduli (Chat, Sentinel, Oraculum, Ordo-ab-Chao)
- [x] Header con status sistema e profilo utente
- [x] Animazioni e transizioni cyberpunk

## Modulo Chat AI
- [x] Interfaccia chat con selezione modello (Mistral, Claude, Gemini, GPT)
- [x] Streaming SSE delle risposte in tempo reale
- [x] Storico conversazioni persistente in DB
- [x] Rendering markdown nelle risposte
- [x] Indicatore di digitazione durante streaming

## Modulo Tauros Sentinel (CyberSec)
- [x] Scanner URL: rilevamento phishing e minacce via AI
- [x] Analisi APK Android: estrazione metadati e permessi
- [x] Threat Feed: monitoraggio minacce in tempo reale con AI
- [x] Log delle scansioni in DB

## Modulo Oraculum OSINT
- [x] Ricerca OSINT con interfaccia HUD JARVIS
- [x] Hash cracking (MD5, SHA1, SHA256) via AI
- [x] Google Dorks generator
- [x] Visualizzazione risultati in stile terminale/HUD

## Modulo Ordo-ab-Chao Hub
- [x] Panoramica repository GitHub (Lucifer-AI-666)
- [x] Status deployment Vercel attivi
- [x] Feed attività recente
- [x] Metriche sistema

## API Gateway
- [x] Endpoint /api/chat/stream: routing multi-modello con SSE (tRPC chat.send con streaming)
- [x] Endpoint /api/sentinel/scan-url: scansione URL (tRPC sentinel.scanUrl)
- [x] Endpoint /api/sentinel/analyze-apk: analisi APK (tRPC sentinel.analyzeApk)
- [x] Endpoint /api/oraculum/osint: ricerca OSINT (tRPC oraculum.search)
- [x] Endpoint /api/oraculum/hash: hash cracking (tRPC oraculum.crackHash)
- [x] Gestione sicura chiavi API server-side (BUILT_IN_FORGE_API_KEY, mai esposta al client)

## Testing & Deploy
- [x] Test vitest per procedure tRPC principali
- [x] Checkpoint finale

## AI Agents (File System Access API)
- [x] Modulo AI Agent con accesso al filesystem del dispositivo (File System Access API)
- [x] Agent può creare file e cartelle sul dispositivo
- [x] Agent può leggere, modificare e spostare file
- [x] Agent può eliminare file e cartelle
- [x] Interfaccia terminale per l'agent con log delle azioni in tempo reale
- [x] Backend: procedure tRPC per pianificazione e esecuzione task agent
- [x] Permessi granulari: l'utente autorizza l'accesso a cartelle specifiche

## PWA (Progressive Web App)
- [x] manifest.json con icone, nome, colori tema cyberpunk
- [x] Service Worker per caching offline
- [x] Installabilità su desktop e mobile
- [x] Splash screen cyberpunk
- [x] Notifiche push (opzionale - non implementato, fuori scope v1.0)

## Sistema Auto-Aggiornamento Dipendenze (Real-time)
- [x] Fix: risolvere pagina bianca (React non si monta)
- [x] Backend: endpoint tRPC per leggere package.json e versioni installate
- [x] Backend: endpoint per eseguire pnpm outdated e restituire dipendenze obsolete
- [x] Backend: endpoint per aggiornare singola dipendenza o tutte con output live
- [x] Frontend: pagina "Dep Manager" nella sidebar con tabella dipendenze
- [x] Frontend: polling in tempo reale delle versioni disponibili su npm registry
- [x] Frontend: pulsante "Update All" e "Update Single" con log streaming live
- [x] Frontend: badge "outdated" / "up-to-date" / "major update" per ogni dipendenza
