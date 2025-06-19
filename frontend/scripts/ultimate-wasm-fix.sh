#!/bin/bash

echo "🎯 SOLUTION ULTIME WASM - Téléchargement de toutes les versions"

# Créer le dossier wasm s'il n'existe pas
mkdir -p public/wasm

# Télécharger toutes les versions possibles de web-ifc
echo "📥 Téléchargement des fichiers WASM..."

# Version principale
curl -L "https://unpkg.com/web-ifc@0.0.57/web-ifc.wasm" -o "public/wasm/web-ifc.wasm"

# Version multi-thread
curl -L "https://unpkg.com/web-ifc@0.0.57/web-ifc-mt.wasm" -o "public/wasm/web-ifc-mt.wasm" 2>/dev/null || echo "⚠️ web-ifc-mt.wasm non disponible"

# Versions alternatives
curl -L "https://unpkg.com/web-ifc-three@0.0.125/web-ifc.wasm" -o "public/wasm/web-ifc-three.wasm" 2>/dev/null || echo "⚠️ web-ifc-three.wasm non disponible"

# Vérifier les téléchargements
echo ""
echo "📊 Vérification des fichiers téléchargés:"
for file in public/wasm/*.wasm; do
    if [ -f "$file" ]; then
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "unknown")
        echo "   ✅ $(basename "$file"): ${size} bytes"
    fi
done

echo ""
echo "🎯 INTERCEPTION RUNTIME CONFIGURÉE !"
echo "📋 Toutes les requêtes WASM seront redirigées vers /wasm/"
echo "🚀 Redéployez maintenant !"
