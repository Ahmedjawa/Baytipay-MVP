// client/src/components/Layout.js - Structure générale de l'application

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, Box, Drawer, Toolbar, Typography, Divider, IconButton, 
  List, ListItem, ListItemIcon, ListItemText, Menu, MenuItem, 
  Avatar, Tooltip, Badge, Container
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Folder as FolderIcon,
  Payment as PaymentIcon,
  AccountBalance as AccountBalanceIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Translate as TranslateIcon,
  ChevronLeft as ChevronLeftIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

// Largeur du drawer
const drawerWidth = 240;

export default function Layout({ children, setDirection }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // États pour la gestion du drawer et des menus
  const [open, setOpen] = useState(true);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElLang, setAnchorElLang] = useState(null);
  
  // Gestion du menu utilisateur
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };
  
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  
  // Gestion du menu de langue
  const handleOpenLangMenu = (event) => {
    setAnchorElLang(event.currentTarget);
  };
  
  const handleCloseLangMenu = () => {
    setAnchorElLang(null);
  };
  
  // Changement de langue et direction
  const handleLanguageChange = (lang) => {
    if (lang === 'ar') {
      setDirection('rtl');
    } else {
      setDirection('ltr');
    }
    handleCloseLangMenu();
  };
  
  // Éléments du menu principal
  const menuItems = [
    { text: 'Tableau de bord', icon: <DashboardIcon />, path: '/' },
    { text: 'Clients', icon: <PeopleIcon />, path: '/clients' },
    { text: 'Fournisseurs', icon: <PeopleIcon />, path: '/fournisseurs' },
    { text: 'Dossiers', icon: <FolderIcon />, path: '/dossiers' },
    { text: 'Transactions', icon: <PaymentIcon />, path: '/transactions' },
    { text: 'Caisse', icon: <AccountBalanceIcon />, path: '/caisse' },
    { text: 'Assistant IA', icon: <ChatIcon />, path: '/chatbot' },
    { text: 'Paramètres', icon: <SettingsIcon />, path: '/settings' },
  ];
  
  return (
    <Box sx={{ display: 'flex' }}>
      {/* Barre d'applications */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="ouvrir drawer"
            onClick={() => setOpen(!open)}
            edge="start"
            sx={{ marginRight: 2 }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            TrésoTunisia - Gestion de Trésorerie
          </Typography>
          
          {/* Menu de langue */}
          <Tooltip title="Changer la langue">
            <IconButton onClick={handleOpenLangMenu} sx={{ p: 0, mx: 1 }}>
              <TranslateIcon />
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: '45px' }}
            id="menu-language"
            anchorEl={anchorElLang}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorElLang)}
            onClose={handleCloseLangMenu}
          >
            <MenuItem onClick={() => handleLanguageChange('fr')}>
              <Typography textAlign="center">Français</Typography>
            </MenuItem>
            <MenuItem onClick={() => handleLanguageChange('ar')}>
              <Typography textAlign="center">العربية</Typography>
            </MenuItem>
            <MenuItem onClick={() => handleLanguageChange('en')}>
              <Typography textAlign="center">English</Typography>
            </MenuItem>
          </Menu>
          
          {/* Notifications */}
          <IconButton color="inherit">
            <Badge badgeContent={4} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          {/* Menu utilisateur */}
          <Tooltip title="Paramètres du compte">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, ml: 2 }}>
              <Avatar alt="Utilisateur" src="/avatar.jpg" />
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: '45px' }}
            id="menu-appbar"
            anchorEl={anchorElUser}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
          >
            <MenuItem onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <Typography textAlign="center">Profil</Typography>
            </MenuItem>
            <MenuItem onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <Typography textAlign="center">Déconnexion</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Drawer latéral */}
      <Drawer
        variant="persistent"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem 
                button 
                key={item.text}
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
        </Box>
      </Drawer>
      
      {/* Contenu principal */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Container maxWidth="xl">
          {children}
        </Container>
      </Box>
    </Box>
  );
}