//const Dossier = require('../models/dossier.model');
const MouvementCaisse = require('../models/caisse.model');

exports.getSummary = async (req, res) => {
    try {
        const { dateDebut, dateFin } = req.query;

        if (!dateDebut || !dateFin) {
            return res.status(400).json({
                success: false,
                message: 'Les dates de début et de fin sont requises'
            });
        }

        // Convertir les dates en objets Date
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);

        if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Format de date invalide'
            });
        }

        // 1. Récupérer les échéances dans la période sélectionnée
        const echeances = await Dossier.find({
            dateEcheance: { $gte: debut, $lte: fin },
            entrepriseId: req.user.entrepriseId
        });

        const totalMontant = echeances.reduce((sum, e) => sum + e.montant, 0);
        const aVenir = echeances.filter(e => e.statut === 'à venir').length;
        const paye = echeances.filter(e => e.statut === 'payé').length;
        const enRetard = echeances.filter(e => e.statut === 'en retard').length;

        // 2. Récupérer les mouvements de caisse
        const mouvements = await MouvementCaisse.find({
            date: { $gte: dateDebut, $lte: dateFin }
        });

        const entrees = mouvements
            .filter(m => m.type === 'entrée')
            .reduce((sum, m) => sum + m.montant, 0);

        const depenses = mouvements
            .filter(m => m.type === 'dépense')
            .reduce((sum, m) => sum + m.montant, 0);

        // Résumé global
        const dashboardData = {
            totalEcheances: echeances.length,
            totalMontant,
            aVenir,
            paye,
            enRetard,
            caisse: {
                entrees,
                depenses
            }
        };

        res.status(200).json(dashboardData);
    } catch (error) {
        console.error('Erreur dashboard :', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
};
