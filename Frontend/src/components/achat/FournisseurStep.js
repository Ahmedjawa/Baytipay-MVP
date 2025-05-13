import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import apiClient from '../../utils/apiClient';

export default function FournisseurStep({ achatData, updateAchatData }) {
  const [fournisseurs, setFournisseurs] = React.useState([]);

  React.useEffect(() => {
    const fetchFournisseurs = async () => {
      const response = await apiClient.get('/api/tiers?type=FOURNISSEUR');
      setFournisseurs(response.data);
    };
    fetchFournisseurs();
  }, []);

  return (
    <div>
      <Autocomplete
        options={fournisseurs}
        getOptionLabel={(option) => option.nom}
        value={achatData.fournisseur}
        onChange={(e, newValue) => updateAchatData({...achatData, fournisseur: newValue})}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Rechercher un fournisseur"
            variant="outlined"
          />
        )}
      />
    </div>
  );
}