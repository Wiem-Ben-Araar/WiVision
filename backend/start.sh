#!/bin/bash

# Solution sans installation Java - Utilisation de la version embarquée dans firebase-tools
echo "🚀 Démarrage de l'émulateur Firebase Storage..."
npx firebase emulators:start --only storage --import=./firebase-data --export-on-exit --project=wivision-1b106 &

# Attendre que l'émulateur soit prêt
echo "⏳ Attente de 20 secondes pour que l'émulateur démarre..."
sleep 20

# Démarrer le serveur Express
echo "🚀 Démarrage du serveur Express..."
node dist/index.js