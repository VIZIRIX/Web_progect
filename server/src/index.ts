const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.get('/api/health', (req, res) => {
    res.json({ status: 'success', message: 'Сервер успішно працює!' });
});

app.listen(PORT, () => {
    console.log(`Сервер запущено на порту ${PORT}`);
});
