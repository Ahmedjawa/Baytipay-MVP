#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import json
import re
import os

def extract_entities(text):
    """Extrait des entités d'un texte en utilisant des règles simples"""
    entities = {}
    
    # Nettoyer le texte pour faciliter l'extraction
    clean_text = re.sub(r'\s+', ' ', text)  # Remplacer les espaces multiples par un seul
    clean_text = clean_text.replace('\n', ' ')  # Remplacer les sauts de ligne par des espaces
    
    print(f"Utilisation du texte OCR fourni ({len(text)} caractères)")
    print(f"Texte OCR nettoyé (pour débogage): {text[:100]}...")
    
    # Texte complet pour le débogage
    print(f"Texte OCR complet (pour l'analyse des patterns): {text}")
    
    # Analyser le texte caractère par caractère pour trouver des correspondances précises
    # Cela est particulièrement utile pour les textes OCR où les espaces et sauts de ligne peuvent être mal reconnus
    print("Recherche de dates dans le texte...")
    date_patterns = [
        r"[Dd]ate\s*:?\s*(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4})",
        r"[Dd]ate\s*:?\s*(\d{4}-\d{2}-\d{2})",
        r"\b(\d{2}[-/\.]\d{2}[-/\.]\d{2,4})\b",
        r"Date\s*:\s*([0-9]{1,2}-[0-9]{1,2}-[0-9]{2,4})",
        r"[Dd]ate.*?([0-9]{1,2}[\./-][0-9]{1,2}[\./-][0-9]{2,4})",
        # Pattern spécial pour détecter les dates sans séparateurs
        r"[Dd]ate\s*:?\s*(\d{4}\d{2}\d{2})",
        # Pattern pour détecter spécifiquement ce format "Date:2020-11-25"
        r"Date:(\d{4}-\d{2}-\d{2})"
    ]
    
    # Rechercher avec chaque pattern
    date_found = False
    for pattern in date_patterns:
        print(f"Essai du pattern: {pattern}")
        date_matches = re.findall(pattern, text, re.IGNORECASE)
        if date_matches:
            for match in date_matches:
                print(f"Match potentiel trouvé pour la date: {match}")
                # Valider que c'est une date plausible
                try:
                    # Si la date est au format YYYYMMDD sans séparateurs, la reformater
                    if re.match(r'^\d{8}$', match):
                        year = match[0:4]
                        month = match[4:6]
                        day = match[6:8]
                        formatted_date = f"{year}-{month}-{day}"
                    else:
                        # Standardiser le format de date
                        parts = re.split(r'[-/\.]', match)
                        if len(parts) == 3:
                            # Déterminer si c'est JJ/MM/AAAA ou AAAA-MM-JJ
                            if len(parts[0]) == 4:  # Format AAAA-MM-JJ
                                year, month, day = parts
                            else:  # Format JJ/MM/AAAA
                                day, month, year = parts
                                # Ajouter le siècle si nécessaire
                                if len(year) == 2:
                                    year = '20' + year if int(year) < 50 else '19' + year
                            
                            formatted_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                        else:
                            formatted_date = match
                    
                    entities["date"] = formatted_date
                    print(f"Date validée et formatée: {formatted_date}")
                    date_found = True
                    break
                except Exception as e:
                    print(f"Erreur lors de la validation de la date {match}: {str(e)}")
                    continue
            
            if date_found:
                break
    
    if not date_found:
        print("Aucune date valide trouvée avec les patterns réguliers")
        # Recherche plus agressive pour la date
        clean_text = text.replace('\n', ' ')
        print("Recherche agressive de dates...")
        # Chercher explicitement pour "Date:2020-11-25" ou similaire
        raw_date_match = re.search(r'Date:(\S+)', clean_text)
        if raw_date_match:
            raw_date = raw_date_match.group(1)
            print(f"Date brute trouvée: {raw_date}")
            # Vérifier si c'est une date valide
            date_match = re.search(r'(\d{4}-\d{2}-\d{2}|\d{2}[/.-]\d{2}[/.-]\d{2,4})', raw_date)
            if date_match:
                entities["date"] = date_match.group(1)
                print(f"Date trouvée par recherche agressive: {entities['date']}")
            else:
                print(f"La date brute trouvée n'est pas dans un format reconnaissable: {raw_date}")
    
    # Rechercher tous les nombres dans le texte qui pourraient être des montants
    # Cela permet de trouver des montants même s'ils ne sont pas explicitement marqués
    amount_patterns = [
        # Montants avec symbole monétaire ou indication
        r'(\d+[\s\.,]*\d*)\s*(?:€|EUR|DT|TND|DIN)',
        # Nombres avec décimales (potentiels montants)
        r'(\d+[\s\.,]\d{2,3})'
    ]
    
    potential_amounts = []
    for pattern in amount_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            amount = match.group(1).replace(" ", "").replace(",", ".")
            potential_amounts.append((amount, match.start()))
            print(f"Montant potentiel trouvé: {amount} à la position {match.start()}")
    
    # Trier les montants potentiels par valeur décroissante
    potential_amounts.sort(key=lambda x: float(x[0]), reverse=True)
    
    # Si des montants ont été trouvés, essayer de déterminer leur nature
    if potential_amounts:
        # Le plus grand montant est probablement le TTC
        if len(potential_amounts) >= 1:
            entities["montantTTC"] = potential_amounts[0][0]
            print(f"Montant TTC détecté (plus grand montant): {potential_amounts[0][0]}")
        
        # Le deuxième plus grand est probablement le HT
        if len(potential_amounts) >= 2:
            entities["montantHT"] = potential_amounts[1][0]
            print(f"Montant HT détecté (2ème plus grand montant): {potential_amounts[1][0]}")
        
        # Le troisième pourrait être la TVA
        if len(potential_amounts) >= 3:
            entities["tva"] = potential_amounts[2][0]
            print(f"TVA détectée (3ème plus grand montant): {potential_amounts[2][0]}")
    
    # Extraire le montant HT avec des patterns plus précis
    ht_patterns = [
        r"[Mm]ontant\s*HT\s*:?\s*(\d+[\s\.,]*\d*)\s*(?:€|EUR|DT|TND)?",
        r"[Tt]otal\s*HT\s*:?\s*(\d+[\s\.,]*\d*)\s*(?:€|EUR|DT|TND)?",
        r"HT\s*:?\s*(\d+[\s\.,]*\d*)\s*(?:€|EUR|DT|TND)?",
        r"[Mm]ontant\s*HT\s*(\d+[\s\.,]*\d*)\s*(?:€|EUR|DT|TND)?",
        r"[Hh][Tt][\s\:\.]*(\d+[\s\.,]*\d*)",
        r"[Hh]ors\s*[Tt]axe[\s\.:]*(\d+[\s\.,]*\d*)"
    ]
    
    for pattern in ht_patterns:
        ht_match = re.search(pattern, text, re.IGNORECASE)
        if ht_match:
            # Nettoyer la valeur (enlever les espaces, remplacer la virgule par un point)
            value = ht_match.group(1).replace(" ", "").replace(",", ".")
            entities["montantHT"] = value
            print(f"Montant HT trouvé avec pattern {pattern}: {value}")
            break
    
    # Extraire le montant TTC
    ttc_patterns = [
        r"[Tt]otal\s*(?:en)?\s*TTC\s*:?\s*(\d+[\s\.,]*\d*)\s*(?:€|EUR|DT|TND)?",
        r"[Mm]ontant\s*(?:en)?\s*TTC\s*:?\s*(\d+[\s\.,]*\d*)\s*(?:€|EUR|DT|TND)?",
        r"TTC\s*:?\s*(\d+[\s\.,]*\d*)\s*(?:€|EUR|DT|TND)?",
        r"[Tt]otal\s*:?\s*(\d+[\s\.,]*\d*)\s*(?:€|EUR|DT|TND)?",
        r"[Tt]outes\s*[Tt]axes\s*[Cc]omprises[\s\:\.]*(\d+[\s\.,]*\d*)",
        r"[Tt][Tt][Cc][\s\:\.]*(\d+[\s\.,]*\d*)"
    ]
    
    for pattern in ttc_patterns:
        ttc_match = re.search(pattern, text, re.IGNORECASE)
        if ttc_match:
            value = ttc_match.group(1).replace(" ", "").replace(",", ".")
            entities["montantTTC"] = value
            print(f"Montant TTC trouvé avec pattern {pattern}: {value}")
            break
    
    # Extraire la TVA
    tva_patterns = [
        r"TVA\s*(?:\d+%)?(?:\s*:)?\s*(\d+[\s\.,]*\d*)\s*(?:€|EUR|DT|TND)?",
        r"[Tt]axe\s*:?\s*(\d+[\s\.,]*\d*)\s*(?:€|EUR|DT|TND)?",
        r"TVA\s*(\d+)%",
        r"[Tt][Vv][Aa][\s\:\.]*(\d+[\s\.,]*\d*)"
    ]
    
    for pattern in tva_patterns:
        tva_match = re.search(pattern, text, re.IGNORECASE)
        if tva_match:
            value = tva_match.group(1).replace(" ", "").replace(",", ".")
            # Vérifier si c'est un taux ou un montant
            if "%" in pattern or int(float(value)) < 50:  # Si c'est moins de 50, c'est probablement un pourcentage
                entities["tauxTVA"] = value
                print(f"Taux de TVA trouvé: {value}%")
            else:
                entities["tva"] = value
                print(f"Montant TVA trouvé: {value}")
            break
    
    # Extraire le nom du fournisseur/destinataire
    vendor_patterns = [
        r"[Nn]om\s*(?:de)?\s*(?:destinataire|fournisseur)\s*:?\s*([A-Za-zÀ-ÿ\s]+?)(?=\s*[A-Z]|\s*\d|$)",
        r"[Dd]estinataire\s*:?\s*([A-Za-zÀ-ÿ\s]+?)(?=\s*[A-Z]|\s*\d|$)",
        r"[Ff]ournisseur\s*:?\s*([A-Za-zÀ-ÿ\s]+?)(?=\s*[A-Z]|\s*\d|$)",
        r"NOMDEDESTINATAIRE\s*:?\s*([A-Za-zÀ-ÿ\s]+)"
    ]
    
    for pattern in vendor_patterns:
        vendor_match = re.search(pattern, text, re.IGNORECASE)
        if vendor_match:
            entities["vendor"] = vendor_match.group(1).strip()
            print(f"Fournisseur/destinataire trouvé: {vendor_match.group(1).strip()}")
            break
    
    # Extraire la référence ou numéro de document
    ref_patterns = [
        r"(?:ref|référence|facture|fac|bon|numéro)[\s\.:]*([A-Z0-9]{2,}[-\/][A-Z0-9]{2,})",
        r"(?:ref|référence|facture|fac|bon|numéro)[\s\.:]*(\d{6,})",
        r"\b([A-Z]{2,}\d{4,})\b",
        r"BONDELIVRAISON.*?(\d{9,12})"
    ]
    
    for pattern in ref_patterns:
        ref_match = re.search(pattern, text, re.IGNORECASE)
        if ref_match:
            entities["reference"] = ref_match.group(1).strip()
            print(f"Référence trouvée: {ref_match.group(1).strip()}")
            break

    # Si nous avons extrait des entités montantHT et montantTTC mais pas de TVA, calculons-la
    if "montantHT" in entities and "montantTTC" in entities and "tva" not in entities:
        try:
            ht = float(entities["montantHT"])
            ttc = float(entities["montantTTC"])
            tva = ttc - ht
            entities["tva"] = str(round(tva, 2))
            print(f"TVA calculée: {entities['tva']}")
        except (ValueError, TypeError):
            pass
    
    # Créer un format de résultat complet compatible avec l'API
    result = {
        "entities": entities,
        "raw_results": {},
        "processing_time": 0.0
    }
    
    print(f"Entités extraites: {entities}")
    
    return result

def main():
    """
    Script utilisé par le service Python Bridge pour extraire des entités d'un document
    Arguments:
        1: Chemin vers le fichier texte
        2: (Optionnel) Chemin vers l'image source
    """
    # Vérifier qu'il y a au moins un argument
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Arguments insuffisants"}))
        sys.exit(1)
    
    # Récupérer le chemin du fichier texte
    text_path = sys.argv[1]
    
    # Vérifier que le fichier existe
    if not os.path.exists(text_path):
        print(json.dumps({"error": f"Le fichier {text_path} n'existe pas"}))
        sys.exit(1)
    
    # Lire le contenu du fichier
    try:
        with open(text_path, 'r', encoding='utf-8') as f:
            text = f.read()
    except UnicodeDecodeError:
        # Essayer avec une autre encodage si utf-8 échoue
        try:
            with open(text_path, 'r', encoding='latin-1') as f:
                text = f.read()
        except Exception as e:
            print(json.dumps({"error": f"Erreur de lecture du fichier avec encoding alternatif: {str(e)}"}))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Erreur de lecture du fichier: {str(e)}"}))
        sys.exit(1)
    
    # Extraire les entités
    result = extract_entities(text)
    
    # Retourner le résultat en JSON
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()