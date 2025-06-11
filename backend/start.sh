#!/bin/bash

# Installation de Java si pas présent
if ! command -v java &> /dev/null; then
    echo "📦 Installation de Java..."
    apt-get update
    apt-get install -y openjdk-11-jre-headless
    export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
    export PATH=$PATH:$JAVA_HOME/bin
fi

# Vérification de Java
echo "☕ Version Java:"
java -version

# Démarrage de l'émulateur Firebase Storage
echo "🚀 Démarrage de l'émulateur Firebase Storage..."
npx firebase emulators:start --only storage --import=./firebase-data --export-on-exit --project=wivision-1b106 &

# Attendre que l'émulateur soit prêt
echo "⏳ Attente de 20 secondes pour que l'émulateur démarre..."
sleep 20

# Démarrer le serveur Express
echo "🚀 Démarrage du serveur Express..."
node dist/index.js