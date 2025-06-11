#!/bin/bash

# 1. Démarrer l'émulateur Firebase en arrière-plan
echo "🔥 Démarrage de l'émulateur Firebase Storage..."
firebase emulators:start --only storage --import=./firebase-data --export-on-exit --project=wivision-1b106 &

# 2. Attendre que l'émulateur soit prêt (15 secondes)
echo "⏳ Attente de 15 secondes pour que l'émulateur démarre..."
sleep 15

# 3. Démarrer le serveur Express
echo "🚀 Démarrage du serveur Express..."
node dist/index.js