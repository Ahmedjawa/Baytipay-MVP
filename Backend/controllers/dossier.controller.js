exports.getAll = (req, res) => {
    res.json({ message: "Liste des dossiers" });
};

exports.create = (req, res) => {
    res.json({ message: "Dossier créé" });
};
