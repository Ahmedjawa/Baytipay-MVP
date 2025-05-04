// Version temporaire de auth.js pour tester sans backend
export const login = async (credentials) => {
  // Simulation d'un délai réseau
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Vérification basique des identifiants (à remplacer par votre logique réelle)
  if (credentials.email === 'test@example.com' && credentials.password === 'password123') {
    // Succès - simuler un token JWT
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTk5OTk5OTk5OX0.signature';
    return { 
      success: true, 
      token: fakeToken,
      user: { name: 'Utilisateur Test', email: credentials.email }
    };
  } else {
    // Échec
    return { 
      success: false, 
      message: 'Identifiants incorrects' 
    };
  }
};

export const setAuthToken = (token) => {
  localStorage.setItem('token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const isTokenValid = () => {
  const token = getAuthToken();
  return !!token; // Pour les tests, considérer tout token comme valide
};

export const logout = () => {
  localStorage.removeItem('token');
};