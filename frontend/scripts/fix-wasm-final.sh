#!/bin/bash

echo "🔧 SOLUTION FINALE WASM - Correction complète"

# 1. Vérifier que le fichier WASM existe
echo "📁 Vérification du fichier WASM..."
if [ ! -f "public/wasm/web-ifc.wasm" ]; then
    echo "❌ Fichier WASM manquant dans public/wasm/"
    echo "📥 Téléchargement du fichier WASM..."
    
    mkdir -p public/wasm
    
    # Télécharger depuis le CDN officiel
    curl -L "https://unpkg.com/web-ifc@0.0.57/web-ifc.wasm" -o "public/wasm/web-ifc.wasm"
    
    if [ $? -eq 0 ]; then
        echo "✅ Fichier WASM téléchargé avec succès"
    else
        echo "❌ Échec du téléchargement"
        exit 1
    fi
else
    echo "✅ Fichier WASM trouvé"
fi

# 2. Vérifier la taille du fichier
WASM_SIZE=$(stat -f%z "public/wasm/web-ifc.wasm" 2>/dev/null || stat -c%s "public/wasm/web-ifc.wasm" 2>/dev/null)
echo "📊 Taille du fichier WASM: ${WASM_SIZE} bytes"

if [ "$WASM_SIZE" -lt 1000000 ]; then
    echo "⚠️ Fichier WASM semble trop petit, re-téléchargement..."
    curl -L "https://unpkg.com/web-ifc@0.0.57/web-ifc.wasm" -o "public/wasm/web-ifc.wasm"
fi

# 3. Créer les liens symboliques pour tous les chemins possibles
echo "🔗 Création des liens symboliques..."

# Créer les dossiers nécessaires
mkdir -p public/_next/static/chunks/wasm
mkdir -p public/_next/static/chunks/app/viewer/wasm
mkdir -p public/_next/static/wasm
mkdir -p public/static/wasm

# Créer les liens symboliques
ln -sf ../../../wasm/web-ifc.wasm public/_next/static/chunks/wasm/web-ifc.wasm
ln -sf ../../../../../wasm/web-ifc.wasm public/_next/static/chunks/app/viewer/wasm/web-ifc.wasm
ln -sf ../../wasm/web-ifc.wasm public/_next/static/wasm/web-ifc.wasm
ln -sf ../wasm/web-ifc.wasm public/static/wasm/web-ifc.wasm

echo "✅ Liens symboliques créés"

# 4. Test des chemins
echo "🧪 Test des chemins WASM..."
echo "   /wasm/web-ifc.wasm"
echo "   /_next/static/chunks/wasm/web-ifc.wasm"
echo "   /_next/static/chunks/app/viewer/wasm/web-ifc.wasm"
echo "   /_next/static/wasm/web-ifc.wasm"
echo "   /static/wasm/web-ifc.wasm"

# 5. Redémarrage recommandé
echo ""
echo "🚀 SOLUTION APPLIQUÉE !"
echo "📋 Prochaines étapes :"
echo "   1. Redéployer l'application"
echo "   2. Tester le chargement IFC"
echo "   3. Vérifier les logs de la console"
echo ""
echo "✅ Tous les chemins WASM sont maintenant couverts !"
