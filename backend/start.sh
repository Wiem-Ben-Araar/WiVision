#!/bin/bash

# Installer Java 11 (nécessaire pour l'émulateur Firebase)
echo "⬇️ Installation de Java..."
apt-get update
apt-get install -y openjdk-11-jre-headless

# Vérifier l'installation de Java
echo "✅ Java installé:"
java -version

# Démarrer l'émulateur Firebase
echo "🔥 Démarrage de l'émulateur Firebase Storage..."
firebase emulators:start --only storage --import=./firebase-data --export-on-exit --project=wivision-1b106 &

# Attendre que l'émulateur soit prêt
echo "⏳ Attente de 20 secondes pour que l'émulateur démarre..."
sleep 20

# Démarrer le serveur Express
echo "🚀 Démarrage du serveur Express..."
node dist/index.js