import spacy
from spacy.training import Example
import json
import os
import pickle
import re
from datetime import datetime

class AdaptiveInvoiceParser:
    def __init__(self, model_path=None):
        # Charger un modèle existant ou en créer un nouveau
        try:
            self.nlp = spacy.load(model_path) if model_path else spacy.blank("fr")
            self.setup_pipeline()
        except:
            self.nlp = spacy.blank("fr")
            self.setup_pipeline()
        
        self.training_data = []
        self.model_version = 1
        self.last_trained = datetime.now().isoformat()
        
        # Fallback regex patterns pour la robustesse
        self.patterns = {
            "DATE": [r"(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})"],
            "MONTANT_HT": [r"(?:total|montant)?\s+ht\s*:?\s*(\d+[\s\.,]*\d*\s*(?:€|EUR)?)"],
            "MONTANT_TTC": [r"(?:total|montant)?\s+ttc\s*:?\s*(\d+[\s\.,]*\d*\s*(?:€|EUR)?)"],
            "TVA": [r"(?:tva|tax)\s*:?\s*(\d+[\s\.,]*\d*\s*(?:%|€|EUR)?)"],
            "REFERENCE": [r"(?:ref|référence|facture)\s*:?\s*([A-Z0-9]{4,}[-\/][A-Z0-9]{4,})"],
            "PHONE": [r"(?:tel|téléphone|tél)\s*:?\s*((?:\+\d{2,3})?[\s\.]?\d{1,2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2})"]
        }
    
    def setup_pipeline(self):
        # Si le pipeline n'existe pas déjà
        if "ner" not in self.nlp.pipe_names:
            ner = self.nlp.create_pipe("ner") if hasattr(self.nlp, 'create_pipe') else self.nlp.add_pipe("ner")
            self.nlp.add_pipe("ner") if hasattr(self.nlp, 'add_pipe') and "ner" not in self.nlp.pipe_names else None
        else:
            ner = self.nlp.get_pipe("ner")
        
        # Ajouter les étiquettes d'entité
        for label in ["DATE", "MONTANT_HT", "MONTANT_TTC", "TVA", "REFERENCE", "ADDRESS", "RECIPIENT", "PHONE"]:
            try:
                ner.add_label(label)
            except:
                # Si l'étiquette existe déjà, passer à la suivante
                pass
    
    def extract_entities(self, text):
        """Extrait les entités d'un texte en utilisant le modèle NER et des règles de secours"""
        doc = self.nlp(text)
        entities = {}
        
        # Récupérer les entités détectées par le modèle ML
        for ent in doc.ents:
            key = ent.label_.lower()
            if key not in entities:
                entities[key] = []
            
            # Déterminer la confiance (si disponible)
            confidence = getattr(ent._, "confidence", 0.85) if hasattr(ent, "_") else 0.85
            
            entities[key].append({
                "value": ent.text,
                "confidence": confidence,
                "source": "ml_model"
            })
        
        # Utiliser les règles regex comme fallback pour les entités manquantes
        self.apply_regex_rules(text, entities)
        
        return {"entities": entities}
    
    def apply_regex_rules(self, text, entities):
        """Applique des règles basées sur des expressions régulières pour compléter l'extraction"""
        for entity_type, patterns in self.patterns.items():
            key = entity_type.lower()
            
            # Ne pas appliquer les règles si l'entité est déjà détectée par le modèle ML
            if key in entities and entities[key]:
                continue
            
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                
                for match in matches:
                    if key not in entities:
                        entities[key] = []
                    
                    value = match.group(1) if match.groups() else match.group(0)
                    entities[key].append({
                        "value": value.strip(),
                        "confidence": 0.7,  # Confiance plus faible pour les règles
                        "source": "regex"
                    })
                    
                    # Une seule correspondance par règle suffit
                    break
    
    def record_feedback(self, text, original_entities, corrected_entities):
        """Enregistre les corrections pour un apprentissage ultérieur"""
        # Conversion des entités au format d'entraînement spaCy
        training_entities = []
        
        for entity_name, entities in corrected_entities.items():
            if not entities:
                continue
                
            # Prendre la première entité si c'est une liste
            entity_value = entities[0]["value"] if isinstance(entities, list) and "value" in entities[0] else entities
            
            # Trouver la position de l'entité dans le texte
            start_idx = text.find(entity_value)
            if start_idx >= 0:
                end_idx = start_idx + len(entity_value)
                training_entities.append((start_idx, end_idx, entity_name.upper()))
        
        # Ajouter aux données d'entraînement
        if training_entities:
            self.training_data.append((text, {"entities": training_entities}))
            
            # Si nous avons suffisamment de données, réentraîner
            if len(self.training_data) >= 10:  # Seuil plus bas pour les tests
                self.train()
        
        return {
            "recorded": len(training_entities) > 0,
            "pending_samples": len(self.training_data),
            "model_version": self.model_version
        }
    
    def train(self, iterations=30):
        """Entraîne ou réentraîne le modèle NER avec les données de feedback"""
        if not self.training_data:
            return {"status": "no_data", "model_version": self.model_version}
            
        print(f"Début d'entraînement avec {len(self.training_data)} échantillons...")
        
        # Convertir les données en format d'entraînement Spacy
        examples = []
        for text, annots in self.training_data:
            doc = self.nlp.make_doc(text)
            example = Example.from_dict(doc, annots)
            examples.append(example)
        
        # Désactiver les autres composants de pipeline pendant l'entraînement
        other_pipes = [pipe for pipe in self.nlp.pipe_names if pipe != "ner"]
        
        with self.nlp.disable_pipes(*other_pipes):
            # Initialiser l'optimiseur
            optimizer = self.nlp.begin_training()
            
            # Entraîner le modèle
            for i in range(iterations):
                losses = {}
                for example in examples:
                    self.nlp.update([example], drop=0.5, sgd=optimizer, losses=losses)
                
                print(f"Itération {i+1}/{iterations}, pertes: {losses}")
        
        # Mettre à jour les métadonnées
        self.model_version += 1
        self.last_trained = datetime.now().isoformat()
        
        # Sauvegarder le modèle
        model_dir = os.path.join(os.path.dirname(__file__), "models")
        os.makedirs(model_dir, exist_ok=True)
        
        model_path = os.path.join(model_dir, f"invoice_model_v{self.model_version}")
        self.nlp.to_disk(model_path)
        
        # Réinitialiser les données d'entraînement après sauvegarde
        self.training_data = []
        
        return {
            "status": "success",
            "model_version": self.model_version,
            "model_path": model_path
        }
    
    def evaluate(self, test_data):
        """Évalue les performances du modèle sur un jeu de test"""
        if not test_data:
            return {"error": "No test data provided"}
            
        true_positives = 0
        false_positives = 0
        false_negatives = 0
        
        for item in test_data:
            text = item["text"]
            expected = item["entities"]
            
            # Prédiction
            extracted = self.extract_entities(text)["entities"]
            
            # Comparaison des résultats
            for entity_type, expected_values in expected.items():
                extracted_values = extracted.get(entity_type, [])
                
                # Convertir en liste si ce n'est pas déjà le cas
                if not isinstance(expected_values, list):
                    expected_values = [expected_values]
                
                expected_texts = [val["value"] if isinstance(val, dict) else val for val in expected_values]
                extracted_texts = [val["value"] for val in extracted_values]
                
                # Compter les vrais/faux positifs et faux négatifs
                for ext in extracted_texts:
                    if any(self._is_similar(ext, exp) for exp in expected_texts):
                        true_positives += 1
                    else:
                        false_positives += 1
                
                for exp in expected_texts:
                    if not any(self._is_similar(exp, ext) for ext in extracted_texts):
                        false_negatives += 1
        
        # Calcul des métriques
        precision = true_positives / (true_positives + false_positives) if true_positives + false_positives > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if true_positives + false_negatives > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if precision + recall > 0 else 0
        
        return {
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "true_positives": true_positives,
            "false_positives": false_positives,
            "false_negatives": false_negatives
        }
    
    def _is_similar(self, str1, str2, threshold=0.7):
        """Vérifie si deux chaînes sont similaires selon une certaine mesure"""
        # Simple implémentation basée sur la longueur de la sous-chaîne commune la plus longue
        return self._longest_common_substring(str1, str2) >= threshold * max(len(str1), len(str2))
    
    def _longest_common_substring(self, s1, s2):
        """Calcule la longueur de la plus longue sous-chaîne commune"""
        s1, s2 = s1.lower(), s2.lower()
        m = [[0] * (1 + len(s2)) for _ in range(1 + len(s1))]
        longest, x_longest = 0, 0
        
        for x in range(1, 1 + len(s1)):
            for y in range(1, 1 + len(s2)):
                if s1[x-1] == s2[y-1]:
                    m[x][y] = m[x-1][y-1] + 1
                    if m[x][y] > longest:
                        longest = m[x][y]
                        x_longest = x
                else:
                    m[x][y] = 0
        
        return longest
    
    def save_model(self, path=None):
        """Sauvegarde le modèle et ses métadonnées"""
        if not path:
            path = os.path.join(os.path.dirname(__file__), "models", f"invoice_model_v{self.model_version}")
        
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # Sauvegarder le modèle spaCy
        self.nlp.to_disk(path)
        
        # Sauvegarder les métadonnées
        metadata = {
            "model_version": self.model_version,
            "last_trained": self.last_trained,
            "patterns": self.patterns,
            "training_data_count": len(self.training_data)
        }
        
        with open(f"{path}_metadata.json", "w") as f:
            json.dump(metadata, f)
        
        return {"status": "success", "path": path}
    
    def load_model(self, path):
        """Charge un modèle sauvegardé avec ses métadonnées"""
        try:
            # Charger le modèle spaCy
            self.nlp = spacy.load(path)
            
            # Charger les métadonnées
            with open(f"{path}_metadata.json", "r") as f:
                metadata = json.load(f)
            
            self.model_version = metadata.get("model_version", 1)
            self.last_trained = metadata.get("last_trained", datetime.now().isoformat())
            self.patterns = metadata.get("patterns", self.patterns)
            
            return {"status": "success", "model_version": self.model_version}
        except Exception as e:
            return {"status": "error", "message": str(e)}

# Point d'entrée pour les tests
if __name__ == "__main__":
    parser = AdaptiveInvoiceParser()
    
    # Exemple de test
    text = """
    FACTURE N° F-12345
    Date: 15/04/2023
    
    Client: Entreprise ABC
    Adresse: 123 Rue de l'Innovation, 75001 Paris
    Téléphone: +33 1 23 45 67 89
    
    Description                   Quantité   Prix unitaire   Total HT
    ----------------------------------------------------------------
    Consultation                     10        100,00 €      1000,00 €
    Développement                    20        150,00 €      3000,00 €
    ----------------------------------------------------------------
    Total HT                                              4000,00 €
    TVA 20%                                                800,00 €
    Total TTC                                            4800,00 €
    """
    
    # Extraire les entités
    result = parser.extract_entities(text)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # Simuler un feedback utilisateur
    corrected = {
        "reference": [{"value": "F-12345", "confidence": 1.0, "source": "user"}],
        "date": [{"value": "15/04/2023", "confidence": 1.0, "source": "user"}],
        "montant_ht": [{"value": "4000,00 €", "confidence": 1.0, "source": "user"}],
        "tva": [{"value": "800,00 €", "confidence": 1.0, "source": "user"}],
        "montant_ttc": [{"value": "4800,00 €", "confidence": 1.0, "source": "user"}],
        "telephone": [{"value": "+33 1 23 45 67 89", "confidence": 1.0, "source": "user"}]
    }
    
    # Enregistrer le feedback
    parser.record_feedback(text, result["entities"], corrected)
    
    # Entraîner le modèle avec ce seul exemple (pour test)
    parser.train(iterations=5)
    
    # Tester à nouveau
    result2 = parser.extract_entities(text)
    print("\nAprès entraînement:")
    print(json.dumps(result2, indent=2, ensure_ascii=False))
