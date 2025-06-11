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

# Démarrer l'émulateur Firebase en mode détaché
echo "🚀 Démarrage de l'émulateur Firebase Storage..."
npx firebase emulators:start --only storage,ui --import=./firebase-data --export-on-exit --project=wivision-1b106 > firebase-emulator.log 2>&1 &

# Attendre que l'UI soit accessible
echo "⏳ Attente du démarrage de l'interface utilisateur..."
counter=0
max_wait=30

while ! nc -z localhost 4000; do 
  sleep 1
  counter=$((counter+1))
  if [ $counter -ge $max_wait ]; then
    echo "❌ L'interface utilisateur n'a pas démarré dans le délai imparti"
    cat firebase-emulator.log
    break
  fi
done

echo "✅ Interface utilisateur prête sur le port 4000"

# Démarrer le serveur Express
echo "🚀 Démarrage du serveur Express..."
node dist/index.js