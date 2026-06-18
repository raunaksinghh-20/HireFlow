import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

async function testLogin() {
  try {
    const data = { email: 'test@example.com', password: 'password123' };
    const response = await api.post('/login', new URLSearchParams({ username: data.email, password: data.password }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    console.log("Success:", response.data);
  } catch (error) {
    console.error("Error response:", error.response?.data);
    console.error("Error message:", error.message);
  }
}

testLogin();
