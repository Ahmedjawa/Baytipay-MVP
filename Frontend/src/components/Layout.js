// client/src/components/Layout.js - Structure générale de l'application

import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
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
  Logout as LogoutIcon,
  Business as BusinessIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useAuth } from '../context/AuthContext'; // Import du contexte d'authentification
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

// Largeur du drawer
const drawerWidth = 240;

export default function Layout({ setDirection }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth(); // Récupération de la fonction de déconnexion
  
  // États pour la gestion du drawer et des menus
  const [open, setOpen] = useState(true);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElLang, setAnchorElLang] = useState(null);
  const [anchorElTiers, setAnchorElTiers] = useState(null);
  
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
  
  // Gestion du sous-menu Tiers
  const handleOpenTiersMenu = (event) => {
    setAnchorElTiers(event.currentTarget);
  };
  
  const handleCloseTiersMenu = () => {
    setAnchorElTiers(null);
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
  
  // Fonction de déconnexion
  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
    navigate('/login');
  };
  
  // Éléments du menu principal
  const menuItems = [
    { text: 'Tableau de bord', icon: <DashboardIcon />, path: '/' },
    { 
      text: 'Tiers', 
      icon: <BusinessIcon />, 
     path: '/tiers'
    },
    { 
      text: 'Articles', 
      icon: <InventoryIcon />, 
      path: '/articles'
    },
	{ 
    text: 'Achat', 
    icon: <LocalShippingIcon />, 
    path: '/achat'
  },
	
    { 
      text: 'Vente', 
      icon: <ShoppingCartIcon />, 
      path: '/vente'
    },
	 { 
      text: 'Depense', 
      icon: <ShoppingCartIcon />, 
      path: '/depense'
    },
    { text: 'Dossiers', icon: <FolderIcon />, path: '/dossiers' },
    { text: 'Transactions', icon: <PaymentIcon />, path: '/transactions' },
    { text: 'Caisse', icon: <AccountBalanceIcon />, path: '/caisse' },
    { text: 'Assistant IA', icon: <ChatIcon />, path: '/chatbot' },
    { text: 'Paramètres', icon: <SettingsIcon />, path: '/settings' },
  ];
  
  // Sous-menu pour les tiers
  const tiersSubMenuItems = [
    { text: 'Liste des tiers', path: '/tiers' },
    { text: 'Ajouter un tiers', path: '/tiers/nouveau' },
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
            <MenuItem onClick={handleLogout}>
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
                onClick={item.hasSubmenu ? item.onClick : () => navigate(item.path)}
                selected={!item.hasSubmenu && location.pathname === item.path}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
            {/* Menu contextuel pour les tiers */}
            <Menu
              anchorEl={anchorElTiers}
              open={Boolean(anchorElTiers)}
              onClose={handleCloseTiersMenu}
              sx={{ ml: 2 }}
            >
              {tiersSubMenuItems.map((item) => (
                <MenuItem 
                  key={item.text} 
                  onClick={() => {
                    navigate(item.path);
                    handleCloseTiersMenu();
                  }}
                >
                  {item.text}
                </MenuItem>
              ))}
            </Menu>
          </List>
          <Divider sx={{ my: 2 }} />
        </Box>
      </Drawer>
      
      {/* Contenu principal */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Container maxWidth="xl">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}