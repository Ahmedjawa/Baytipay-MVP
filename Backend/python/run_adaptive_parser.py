#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import json
import os
from adaptive_invoice_parser import AdaptiveInvoiceParser

def main():
    """
    Point d'entrée pour l'utilisation du parser adaptatif depuis le backend Node.js
    Arguments:
        1: Chemin vers le fichier texte à analyser
        2: (Optionnel) Chemin vers l'image source
    """
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Argument manquant: chemin vers le fichier texte"}))
        sys.exit(1)
    
    # Récupérer les arguments
    text_path = sys.argv[1]
    image_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Vérifier que le fichier existe
    if not os.path.exists(text_path):
        print(json.dumps({"error": f"Le fichier {text_path} n'existe pas"}))
        sys.exit(1)
    
    # Charger le texte depuis le fichier
    with open(text_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Créer une instance du parser adaptatif
    # Chercher d'abord s'il existe un modèle déjà entraîné
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    model_path = None
    
    if os.path.exists(models_dir):
        # Chercher le modèle avec la version la plus récente
        model_versions = [d for d in os.listdir(models_dir) if d.startswith("invoice_model_v")]
        if model_versions:
            model_versions.sort(key=lambda x: int(x.split("_v")[1]) if x.split("_v")[1].isdigit() else 0, reverse=True)
            model_path = os.path.join(models_dir, model_versions[0])
    
    parser = AdaptiveInvoiceParser(model_path)
    
    # Extraire les entités
    result = parser.extract_entities(text)
    
    # Ajouter les statistiques du modèle
    result["model_stats"] = {
        "model_version": parser.model_version,
        "last_trained": parser.last_trained
    }
    
    # Retourner le résultat au format JSON
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
