// server.js
const express = require('express');
const path = require('path');
const app = express();

// Serve static files (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Simple route for AJAX call
app.get('/message', (req, res) => {
    res.send('Hello from the server!');
});

// Start server
app.listen(3000, () => console.log('✅ Server running on http://localhost:3000'));
