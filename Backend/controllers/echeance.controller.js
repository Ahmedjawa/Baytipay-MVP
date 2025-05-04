// Exemple de contrôleur pour les échéances

exports.getAll = (req, res) => {
    res.json({ message: "Liste des échéances" });
};

exports.create = (req, res) => {
    res.json({ message: "Échéance créée avec succès" });
};

exports.update = (req, res) => {
    const id = req.params.id;
    res.json({ message: `Échéance ${id} mise à jour` });
};

exports.remove = (req, res) => {
    const id = req.params.id;
    res.json({ message: `Échéance ${id} supprimée` });
};
