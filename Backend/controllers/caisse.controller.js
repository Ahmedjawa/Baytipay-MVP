exports.getMouvements = (req, res) => {
    res.json({ message: "Liste des mouvements de caisse" });
};

exports.addMouvement = (req, res) => {
    res.json({ message: "Mouvement de caisse ajouté" });
};
