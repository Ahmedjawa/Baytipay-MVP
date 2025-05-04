const Dossier = require('../models/dossier.model');
const MouvementCaisse = require('../models/caisse.model');

exports.getSummary = async (req, res) => {
    try {
        const { debut, fin } = req.query;

        const dateDebut = debut ? new Date(debut) : new Date(); // par défaut : aujourd'hui
        const dateFin = fin ? new Date(fin) : new Date();

        // 1. Récupérer les échéances dans la période sélectionnée
        const echeances = await Dossier.find({
            dateEcheance: { $gte: dateDebut, $lte: dateFin }
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
