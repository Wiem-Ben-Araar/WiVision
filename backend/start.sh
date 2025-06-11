#!/bin/bash

# Installation de Java via SDKMAN
install_java() {
    echo "📦 Installation de Java via SDKMAN..."

    if [ ! -d "$HOME/.sdkman" ]; then
        curl -s "https://get.sdkman.io" | bash
    fi

    source "$HOME/.sdkman/bin/sdkman-init.sh" || source "/opt/render/.sdkman/bin/sdkman-init.sh"

    if ! command -v java &> /dev/null; then
        echo "🔽 Téléchargement de Java 11..."
        sdk install java 11.0.21-tem
        sdk use java 11.0.21-tem
    fi

    export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
    export PATH="$JAVA_HOME/bin:$PATH"

    echo "☕ Version Java:"
    which java
    java -version
}

# Function to check if port is open using curl/wget
check_port_http() {
    local port=$1
    curl -s --connect-timeout 1 "http://localhost:$port" > /dev/null 2>&1
    return $?
}

# Function to check if port is listening using /proc/net/tcp
check_port_listening() {
    local port=$1
    # Convert port to hex
    local hex_port=$(printf "%04X" $port)
    # Check if port is in listening state
    grep -q ":${hex_port} " /proc/net/tcp 2>/dev/null
    return $?
}

# Vérifier et installer Java si nécessaire
if ! command -v java &> /dev/null; then
    install_java
fi

# Vérification de Java
echo "☕ Version Java:"
java -version

# Créer les répertoires manquants
echo "📂 Création des répertoires d'export..."
mkdir -p ./firebase-data/storage_export/metadata
mkdir -p ./firebase-data/storage_export/blobs

# Démarrer l'émulateur Firebase en mode détaché (sans UI pour la production)
echo "🚀 Démarrage de l'émulateur Firebase Storage..."
if [ "$NODE_ENV" = "production" ]; then
    # En production, pas besoin de l'UI
    npx firebase emulators:start --only storage --import=./firebase-data --export-on-exit --project=wivision-1b106 > firebase-emulator.log 2>&1 &
else
    # En développement, avec l'UI
    npx firebase emulators:start --only storage,ui --import=./firebase-data --export-on-exit --project=wivision-1b106 > firebase-emulator.log 2>&1 &
fi

# Store the emulator PID
EMULATOR_PID=$!

# Attendre que l'émulateur Storage soit accessible
echo "⏳ Attente du démarrage de l'émulateur Storage..."
counter=0
max_wait=30

while ! check_port_listening 9199; do 
  sleep 1
  counter=$((counter+1))
  if [ $counter -ge $max_wait ]; then
    echo "❌ L'émulateur Storage n'a pas démarré dans le délai imparti"
    echo "📋 Logs de l'émulateur:"
    cat firebase-emulator.log
    break
  fi
done

if check_port_listening 9199; then
    echo "✅ Émulateur Storage prêt sur le port 9199"
else
    echo "⚠️ Impossible de vérifier le port 9199, continuons quand même..."
fi

# Cleanup function
cleanup() {
    echo "🛑 Arrêt des services..."
    if [ ! -z "$EMULATOR_PID" ]; then
        kill $EMULATOR_PID 2>/dev/null
        wait $EMULATOR_PID 2>/dev/null
    fi
    exit
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Démarrer le serveur Express
echo "🚀 Démarrage du serveur Express..."
node dist/index.js

# If we reach here, the server has stopped
cleanup