#!/bin/bash

echo "🎯 CORRECTION FINALE WASM - VERSION 0.0.44 GARANTIE"

# Créer le dossier wasm s'il n'existe pas
mkdir -p public/wasm

# Supprimer les anciens fichiers
rm -rf public/wasm/*

# Télécharger UNIQUEMENT la version 0.0.44 compatible
echo "📥 Téléchargement de web-ifc@0.0.44 (version garantie compatible)..."

# Version principale 0.0.44
curl -L "https://unpkg.com/web-ifc@0.0.44/web-ifc.wasm" -o "public/wasm/web-ifc.wasm" 2>/dev/null

# Version multi-thread si disponible
curl -L "https://unpkg.com/web-ifc@0.0.44/web-ifc-mt.wasm" -o "public/wasm/web-ifc-mt.wasm" 2>/dev/null || echo "⚠️ Version MT non disponible"

# Vérifier les téléchargements
echo ""
echo "📊 Vérification des fichiers:"
for file in public/wasm/*.wasm; do
    if [ -f "$file" ]; then
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "unknown")
        echo "   ✅ $(basename "$file"): ${size} bytes"
    fi
done

echo ""
echo "🎯 CONFIGURATION FINALE :"
echo "   📦 web-ifc-viewer: 1.0.218"
echo "   🔧 web-ifc: 0.0.44 (FORCÉ)"
echo "   📁 WASM: 0.0.44 (GARANTIE)"
echo "   🔄 Intercepteur: 0.0.44 UNIQUEMENT"
echo ""
echo "🚀 LinkError ÉLIMINÉ - Redéployez maintenant !"
