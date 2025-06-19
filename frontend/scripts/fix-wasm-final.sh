#!/bin/bash

echo "🔧 SOLUTION FINALE WASM - Correction du chemin exact"

# Créer le dossier wasm
echo "📁 Création du dossier wasm..."
mkdir -p public/wasm

# Télécharger les fichiers WASM nécessaires
echo "📥 Téléchargement des fichiers WASM..."

# Fichier principal
curl -L "https://unpkg.com/web-ifc@0.0.57/web-ifc.wasm" -o "public/wasm/web-ifc.wasm"

# Fichier multi-thread (optionnel)
curl -L "https://unpkg.com/web-ifc@0.0.57/web-ifc-mt.wasm" -o "public/wasm/web-ifc-mt.wasm" 2>/dev/null || echo "⚠️ web-ifc-mt.wasm non disponible"

# Vérifier les tailles
echo "📊 Vérification des fichiers téléchargés:"
if [ -f "public/wasm/web-ifc.wasm" ]; then
    size=$(stat -c%s "public/wasm/web-ifc.wasm" 2>/dev/null || stat -f%z "public/wasm/web-ifc.wasm" 2>/dev/null)
    echo "   ✅ web-ifc.wasm: $size bytes"
else
    echo "   ❌ web-ifc.wasm: ÉCHEC"
    exit 1
fi

if [ -f "public/wasm/web-ifc-mt.wasm" ]; then
    size=$(stat -c%s "public/wasm/web-ifc-mt.wasm" 2>/dev/null || stat -f%z "public/wasm/web-ifc-mt.wasm" 2>/dev/null)
    echo "   ✅ web-ifc-mt.wasm: $size bytes"
fi

echo ""
echo "🚀 SOLUTION APPLIQUÉE !"
echo "📋 Le rewrite /_next/static/chunks/wasm/web-ifc.wasm -> /wasm/web-ifc.wasm est configuré"
echo "✅ Redéployez maintenant pour appliquer les changements !"
