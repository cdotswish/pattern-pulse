const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('.'));
app.use(express.json());

// In-memory leaderboard (replace with a database in production)
let leaderboard = [];

app.post('/api/score', (req, res) => {
    const { playerName, score } = req.body;
    
    leaderboard.push({ playerName, score, timestamp: Date.now() });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10); // Keep only top 10
    
    res.json({ success: true, leaderboard });
});

app.get('/api/leaderboard', (req, res) => {
    res.json(leaderboard);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
