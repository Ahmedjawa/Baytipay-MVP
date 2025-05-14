// components/depense/RecapitulatifStep.js
import React from 'react';
import {
  Box, Grid, Typography, Paper, Divider, Button, Chip,
  List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import {
  Category, Euro, CalendarToday, Business, Description,
  Repeat, Payment, AccountBalance, Notes, Receipt,
  Print, Edit, Notifications,Alarm // Icône ajoutée ici
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function RecapitulatifStep({ depenseData, updateDepenseData, categories, onImprimer }) {
  const findCategoryName = (categoryId) => {
    if (!categories || !categoryId) return 'Non spécifiée';
    const category = categories.find(cat => cat._id === categoryId);
    return category ? category.nom : 'Non spécifiée';
  };

  // Formater les montants
  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);
  };

  // Formater les dates
  const formatDate = (date) => {
    if (!date) return 'Non spécifiée';
    try {
      return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  // Obtenir le libellé du mode de paiement
  const getModePaiementLabel = (mode) => {
    const modes = {
      'ESPECES': 'Espèces',
      'CHEQUE': 'Chèque',
      'VIREMENT': 'Virement',
      'EFFET': 'Effet',
      'CARTE_BANCAIRE': 'Carte bancaire'
    };
    return modes[mode] || mode;
  };

  // Obtenir le libellé du statut de paiement
  const getStatutPaiementLabel = (statut) => {
    const statuts = {
      'PAYEE': 'Payée',
      'A_PAYER': 'À payer'
    };
    return statuts[statut] || statut;
  };

  // Obtenir le libellé de la fréquence
  const getFrequenceLabel = (frequence) => {
    const frequences = {
      'QUOTIDIENNE': 'Quotidienne',
      'HEBDOMADAIRE': 'Hebdomadaire',
      'MENSUELLE': 'Mensuelle',
      'TRIMESTRIELLE': 'Trimestrielle',
      'SEMESTRIELLE': 'Semestrielle',
      'ANNUELLE': 'Annuelle'
    };
    return frequences[frequence] || frequence;
  };

  // Obtenir les libellés des canaux de notification
  const getCanauxNotificationLabels = (canaux) => {
    if (!canaux || canaux.length === 0) return 'Aucun';
    
    const labels = {
      'APPLICATION': 'Application',
      'EMAIL': 'Email',
      'SMS': 'SMS'
    };
    
    return canaux.map(canal => labels[canal] || canal).join(', ');
  };

  // Fonction pour naviguer vers une étape spécifique pour modification
  const handleEdit = (stepIndex) => {
    // Cette fonction pourrait être implémentée dans le composant parent
    // pour permettre de revenir à une étape spécifique
    console.log(`Modifier l'étape ${stepIndex}`);
    // Par exemple, on pourrait avoir une fonction onEdit dans les props
    // et l'appeler ici avec l'index de l'étape
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>Récapitulatif de la dépense</Typography>
      
      {/* Informations générales */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Informations générales
          </Typography>
          <Button 
            startIcon={<Edit />} 
            size="small" 
            onClick={() => handleEdit(0)}
            sx={{ minWidth: 'auto' }}
          >
            Modifier
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <List dense disablePadding>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <Category fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Catégorie" 
                  secondary={findCategoryName(depenseData.categorie)} 
                />
              </ListItem>
              
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <Euro fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Montant" 
                  secondary={formatMontant(depenseData.montant)} 
                />
              </ListItem>
              
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <CalendarToday fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Date de la dépense" 
                  secondary={formatDate(depenseData.dateDepense)} 
                />
              </ListItem>
            </List>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <List dense disablePadding>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <Business fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Bénéficiaire" 
                  secondary={
                    depenseData.beneficiaire ? 
                      (depenseData.beneficiaire.raisonSociale || 
                       `${depenseData.beneficiaire.prenom || ''} ${depenseData.beneficiaire.nom || ''}`) : 
                      'Non spécifié'
                  } 
                />
              </ListItem>
              
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <Description fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Description" 
                  secondary={depenseData.description || 'Aucune description'} 
                />
              </ListItem>
              
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <Repeat fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Type de dépense" 
                  secondary={depenseData.estRecurrente ? 'Récurrente' : 'Ponctuelle'} 
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Informations de paiement */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Informations de paiement
          </Typography>
          <Button 
            startIcon={<Edit />} 
            size="small" 
            onClick={() => handleEdit(1)}
            sx={{ minWidth: 'auto' }}
          >
            Modifier
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <List dense disablePadding>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <Payment fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Statut" 
                  secondary={
                    <Chip 
                      label={getStatutPaiementLabel(depenseData.paiement.statut)} 
                      color={depenseData.paiement.statut === 'PAYEE' ? 'success' : 'warning'}
                      size="small"
                    />
                  } 
                />
              </ListItem>
              
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <Payment fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Mode de paiement" 
                  secondary={getModePaiementLabel(depenseData.paiement.modePaiement)} 
                />
              </ListItem>
              
              {depenseData.paiement.statut === 'PAYEE' && (
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <CalendarToday fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Date de paiement" 
                    secondary={formatDate(depenseData.paiement.datePaiement)} 
                  />
                </ListItem>
              )}
            </List>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <List dense disablePadding>
              {depenseData.paiement.reference && (
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <Description fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Référence" 
                    secondary={depenseData.paiement.reference} 
                  />
                </ListItem>
              )}
              
              {depenseData.paiement.banque && (
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <AccountBalance fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Banque" 
                    secondary={depenseData.paiement.banque} 
                  />
                </ListItem>
              )}
              
              {depenseData.notes && (
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <Notes fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Notes" 
                    secondary={depenseData.notes} 
                  />
                </ListItem>
              )}
            </List>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Justificatifs */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Pièces justificatives
          </Typography>
          <Button 
            startIcon={<Edit />} 
            size="small" 
            onClick={() => handleEdit(2)}
            sx={{ minWidth: 'auto' }}
          >
            Modifier
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        {depenseData.justificatifs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Aucune pièce justificative n'a été ajoutée.
          </Typography>
        ) : (
          <List dense>
            {depenseData.justificatifs.map((justificatif, index) => (
              <ListItem key={justificatif.id} disableGutters>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <Receipt fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={justificatif.nom}
                  secondary={`Ajouté le ${new Date(justificatif.dateUpload).toLocaleDateString()}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
      
      {/* Section Périodicité - uniquement si dépense récurrente */}
      {depenseData.estRecurrente && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Périodicité et notifications
            </Typography>
            <Button 
              startIcon={<Edit />} 
              size="small" 
              onClick={() => handleEdit(3)}
              sx={{ minWidth: 'auto' }}
            >
              Modifier
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <Repeat fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Fréquence" 
                    secondary={getFrequenceLabel(depenseData.periodicite.frequence)} 
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <CalendarToday fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Date de début" 
                    secondary={formatDate(depenseData.periodicite.dateDebut)} 
                  />
                </ListItem>
                
                {depenseData.periodicite.dateFin ? (
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: '40px' }}>
                      <CalendarToday fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Date de fin" 
                      secondary={formatDate(depenseData.periodicite.dateFin)} 
                    />
                  </ListItem>
                ) : (
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: '40px' }}>
                      <Repeat fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Nombre d'occurrences" 
                      secondary={depenseData.periodicite.nombreOccurrences} 
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <CalendarToday fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Délai de préavis" 
                    secondary={`${depenseData.periodicite.notifications.delaiPreAvis} jour(s) avant l'échéance`} 
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <Notifications fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Canaux de notification" 
                    secondary={getCanauxNotificationLabels(depenseData.periodicite.notifications.canaux)} 
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <Alarm fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Rappels en cas de non-paiement" 
                    secondary={depenseData.periodicite.notifications.rappels ? 'Activés' : 'Désactivés'} 
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* Bouton d'impression */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={onImprimer}
          sx={{ minWidth: 200 }}
        >
          Imprimer ce récapitulatif
        </Button>
      </Box>
    </Box>
  );
}

export default RecapitulatifStep;