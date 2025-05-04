import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  Avatar, 
  CircularProgress,
  Button,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import apiClient from '../utils/apiClient';

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Bonjour! Comment puis-je vous aider aujourd'hui?", sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Fonction pour faire défiler vers le bas automatiquement après chaque message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Gestion de l'envoi du message
  const handleSend = async () => {
    if (input.trim() === '') return;
    
    // Ajouter le message de l'utilisateur
    const userMessage = {
      id: messages.length + 1,
      text: input,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Envoyer la question au backend
      const response = await apiClient.post('/api/ai/ask', { question: input });
      
      // Ajouter la réponse du bot
      const botMessage = {
        id: messages.length + 2,
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      
      // Message d'erreur
      const errorMessage = {
        id: messages.length + 2,
        text: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer plus tard.",
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Gestion de la touche Entrée
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Fonction pour formater l'heure
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Fonction pour effacer l'historique des messages
  const clearChat = () => {
    setMessages([
      { id: 1, text: "Bonjour! Comment puis-je vous aider aujourd'hui?", sender: 'bot', timestamp: new Date() }
    ]);
  };

  return (
    <Box sx={{ p: 4, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Assistant BaytiPay
        </Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={clearChat}
          sx={{ borderRadius: '20px' }}
        >
          Nouvelle conversation
        </Button>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Zone de messages */}
      <Paper 
        elevation={3} 
        sx={{ 
          flex: 1, 
          p: 2, 
          mb: 2, 
          overflow: 'auto',
          bgcolor: '#f5f5f5',
          borderRadius: '12px'
        }}
      >
        <List>
          {messages.map((message) => (
            <ListItem 
              key={message.id} 
              sx={{ 
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 1
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main',
                    ml: message.sender === 'user' ? 1 : 0,
                    mr: message.sender === 'user' ? 0 : 1
                  }}
                >
                  {message.sender === 'user' ? <PersonIcon /> : <SmartToyIcon />}
                </Avatar>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    borderRadius: '12px',
                    bgcolor: message.sender === 'user' ? '#e3f2fd' : 'white',
                    ...(message.isError && { bgcolor: '#ffebee' })
                  }}
                >
                  <Typography variant="body1">{message.text}</Typography>
                  <Typography 
                    variant="caption" 
                    color="textSecondary" 
                    sx={{ 
                      display: 'block',
                      textAlign: message.sender === 'user' ? 'right' : 'left',
                      mt: 0.5
                    }}
                  >
                    {formatTime(message.timestamp)}
                  </Typography>
                </Paper>
              </Box>
            </ListItem>
          ))}
          {loading && (
            <ListItem sx={{ justifyContent: 'flex-start', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 1 }}>
                  <SmartToyIcon />
                </Avatar>
                <CircularProgress size={24} />
              </Box>
            </ListItem>
          )}
          <div ref={messagesEndRef} />
        </List>
      </Paper>
      
      {/* Zone de saisie */}
      <Paper 
        elevation={3} 
        component="form" 
        sx={{ 
          p: '2px 4px', 
          display: 'flex', 
          alignItems: 'center',
          borderRadius: '24px',
          bgcolor: 'white'
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Écrivez votre message..."
          sx={{ ml: 1, flex: 1 }}
          variant="standard"
          InputProps={{
            disableUnderline: true,
          }}
        />
        <IconButton 
          color="primary" 
          sx={{ p: '10px' }} 
          onClick={handleSend}
          disabled={loading || input.trim() === ''}
        >
          <SendIcon />
        </IconButton>
      </Paper>
    </Box>
  );
}