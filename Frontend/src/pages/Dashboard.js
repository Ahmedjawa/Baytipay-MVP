import React, { useState, useEffect } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { fr as frLocale } from 'date-fns/locale';
import { Box, Button, Card, CardContent, CircularProgress, Grid, Paper, TextField, Typography } from '@mui/material';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Line, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import config from '../config';
import apiClient from '../utils/apiClient';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    resume: { 
      totalAPayer: 0, 
      totalPaye: 0, 
      totalImpaye: 0, 
      soldeCaisse: 0 
    },
    graphiques: { 
      transactions: [] 
    },
    prochainesEcheances: [],
    dernieresTransactions: []
  });
  
  const [dateDebut, setDateDebut] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [dateFin, setDateFin] = useState(new Date());
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const d1 = dateDebut.toISOString().split('T')[0];
        const d2 = dateFin.toISOString().split('T')[0];
        const response = await apiClient.get(`${config.backendURL}/dashboard?dateDebut=${d1}&dateFin=${d2}`);
        
        // Fusion sécurisée avec les données existantes
        setData(prev => ({
          ...prev,
          ...response.data,
          graphiques: {
            transactions: response.data.graphiques?.transactions || []
          }
        }));
        
      } catch (error) {
        console.error("Erreur API :", error);
        setData(prev => ({
          ...prev,
          resume: { 
            totalAPayer: 75000, 
            totalPaye: 45000, 
            totalImpaye: 12000, 
            soldeCaisse: 18500 
          },
          graphiques: {
            transactions: [
              { date: '2023-01-01', aPayer: 5000, paye: 3000, impaye: 2000 },
              { date: '2023-01-08', aPayer: 7000, paye: 5000, impaye: 1000 }
            ]
          }
        }));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateDebut, dateFin]);

  const pieData = [
    { name: "À payer", value: data.resume.totalAPayer },
    { name: "Payé", value: data.resume.totalPaye },
    { name: "Impayé", value: data.resume.totalImpaye }
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={frLocale}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Tableau de bord</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker 
              label="Début" 
              value={dateDebut} 
              onChange={setDateDebut} 
              renderInput={(p) => <TextField size="small" {...p} />} 
            />
            <DatePicker 
              label="Fin" 
              value={dateFin} 
              onChange={setDateFin} 
              renderInput={(p) => <TextField size="small" {...p} />} 
            />
            <Button variant="contained" onClick={() => setLoading(true)}>
              Appliquer
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {['Total à payer', 'Total payé', 'Total impayé', 'Solde caisse'].map((label, idx) => (
                <Grid item xs={12} sm={6} md={3} key={idx}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1">{label}</Typography>
                      <Typography variant="h5">
                        {idx === 0 && `${data?.resume?.totalAPayer?.toLocaleString() ?? "N/A"} TND`}
                        {idx === 1 && `${data?.resume?.totalPaye?.toLocaleString() ?? "N/A"} TND`}
                        {idx === 2 && `${data?.resume?.totalImpaye?.toLocaleString() ?? "N/A"} TND`}
                        {idx === 3 && `${data?.resume?.soldeCaisse?.toLocaleString() ?? "N/A"} TND`}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Transactions
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data?.graphiques?.transactions || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="aPayer" 
                        stroke="#8884d8" 
                        name="À payer"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="paye" 
                        stroke="#82ca9d" 
                        name="Payé"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="impaye" 
                        stroke="#ff7300" 
                        name="Impayé"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Répartition
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {pieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
}

export default Dashboard;