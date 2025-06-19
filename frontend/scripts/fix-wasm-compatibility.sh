#!/bin/bash

echo "🎯 CORRECTION COMPATIBILITÉ WASM"

# Supprimer les anciens fichiers
rm -rf public/wasm/*

# Télécharger la version exacte compatible avec web-ifc-viewer
echo "📥 Téléchargement de la version compatible..."

# Version spécifique pour web-ifc-viewer
curl -L "https://unpkg.com/web-ifc-viewer@1.0.175/dist/web-ifc.wasm" -o "public/wasm/web-ifc.wasm" 2>/dev/null || \
curl -L "https://unpkg.com/web-ifc@0.0.44/web-ifc.wasm" -o "public/wasm/web-ifc.wasm" 2>/dev/null || \
curl -L "https://unpkg.com/web-ifc@0.0.43/web-ifc.wasm" -o "public/wasm/web-ifc.wasm"

# Version multi-thread compatible
curl -L "https://unpkg.com/web-ifc@0.0.44/web-ifc-mt.wasm" -o "public/wasm/web-ifc-mt.wasm" 2>/dev/null || echo "⚠️ MT version non disponible"

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
echo "🎯 VERSION COMPATIBLE INSTALLÉE !"
echo "🚀 Redéployez maintenant !"
