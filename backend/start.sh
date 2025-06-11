#!/bin/bash

# Fonction pour vérifier si Java est disponible
check_java() {
    if command -v java >/dev/null 2>&1; then
        echo "☕ Java détecté: $(java -version 2>&1 | head -n 1)"
        return 0
    else
        echo "⚠️ Java non détecté"
        return 1
    fi
}

# Fonction pour démarrer l'émulateur Firebase
start_emulator() {
    echo "🚀 Démarrage de l'émulateur Firebase Storage..."
    npx firebase emulators:start --only storage --import=./firebase-data --export-on-exit --project=wivision-1b106 &
    
    echo "⏳ Attente de 20 secondes pour que l'émulateur démarre..."
    sleep 20
}

# Démarrage conditionnel
if check_java; then
    start_emulator
else
    echo "🔄 Démarrage sans émulateur Firebase (Java non disponible)"
    echo "📡 Le service utilisera Firebase Storage en mode cloud"
fi

# Démarrer le serveur Express
echo "🚀 Démarrage du serveur Express..."
node dist/index.js