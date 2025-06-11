#!/bin/bash

# Installation de Java via SDKMAN (sans sudo)
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


# Vérifier si Java est disponible
if ! command -v java &> /dev/null; then
    install_java
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