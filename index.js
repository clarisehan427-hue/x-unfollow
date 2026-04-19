const express = require('express');
const app = express();

// Use the PORT Railway gives us, or default to 8080
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.send('CREAO_BRIDGE_ONLINE');
});

app.get('/targets', (req, res) => {
    res.json({ status: "connected", message: "Logic is ready for X integration" });
});

// Force it to listen on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
    console.log(`LIVE_ON_PORT_${PORT}`);
});
