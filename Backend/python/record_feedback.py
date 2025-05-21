#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import json
import os
from adaptive_invoice_parser import AdaptiveInvoiceParser

def main():
    """
    Script pour enregistrer les feedbacks utilisateurs et potentiellement réentraîner le modèle
    Argument:
        1: Chemin vers le fichier JSON contenant les données de feedback
    """
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Argument manquant: chemin vers le fichier de feedback"}))
        sys.exit(1)
    
    # Récupérer le chemin du fichier de feedback
    feedback_path = sys.argv[1]
    
    # Vérifier que le fichier existe
    if not os.path.exists(feedback_path):
        print(json.dumps({"error": f"Le fichier {feedback_path} n'existe pas"}))
        sys.exit(1)
    
    # Charger les données de feedback depuis le fichier JSON
    with open(feedback_path, 'r', encoding='utf-8') as f:
        feedback_data = json.load(f)
    
    # Vérifier que les données sont au format attendu
    if not all(key in feedback_data for key in ['text', 'original', 'corrected']):
        print(json.dumps({
            "error": "Format de données incorrect",
            "required_keys": ['text', 'original', 'corrected']
        }))
        sys.exit(1)
    
    # Créer une instance du parser adaptatif avec le dernier modèle entraîné
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    model_path = None
    
    if os.path.exists(models_dir):
        # Chercher le modèle avec la version la plus récente
        model_versions = [d for d in os.listdir(models_dir) if d.startswith("invoice_model_v")]
        if model_versions:
            model_versions.sort(key=lambda x: int(x.split("_v")[1]) if x.split("_v")[1].isdigit() else 0, reverse=True)
            model_path = os.path.join(models_dir, model_versions[0])
    
    parser = AdaptiveInvoiceParser(model_path)
    
    # Enregistrer le feedback
    result = parser.record_feedback(
        feedback_data['text'],
        feedback_data['original'],
        feedback_data['corrected']
    )
    
    # Retourner le résultat au format JSON
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
