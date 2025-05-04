exports.getAll = (req, res) => {
    res.json({ message: "Liste des utilisateurs" });
};

exports.getById = (req, res) => {
    res.json({ message: `Utilisateur ${req.params.id}` });
};
