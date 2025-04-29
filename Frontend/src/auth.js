export const login = async (credentials) => {
  const res = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return await res.json();
};

export const setAuthToken = (token) => {
  localStorage.setItem('token', token);
};