const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

const PORT = process.env.PORT || 3000;

// --- DATABASE SETUP ---
// Connect to the DB using DATABASE_URL (usually provided by Railway)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:yvTrdgBQgxxHuflNcAziuHHRljeXrtvW@postgres.railway.internal:5432/railway',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Initialize database table if it doesn't exist
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS players (
                username VARCHAR(50),
                score BIGINT DEFAULT 0
            )
        `);

        try {
            await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS id VARCHAR(100)`);
            await pool.query(`UPDATE players SET id = username WHERE id IS NULL`);
            await pool.query(`ALTER TABLE players DROP CONSTRAINT IF EXISTS players_pkey CASCADE`);
            await pool.query(`ALTER TABLE players ADD CONSTRAINT players_id_unique UNIQUE (id)`);
            await pool.query(`ALTER TABLE players ALTER COLUMN score TYPE BIGINT`);

            // Add settings table for info/news
            await pool.query(`
                CREATE TABLE IF NOT EXISTS settings (
                    key VARCHAR(50) PRIMARY KEY,
                    value TEXT
                )
            `);
            await pool.query(`
                INSERT INTO settings (key, value) VALUES ('news', 'Selamat datang di Pop Balil 3!') ON CONFLICT (key) DO NOTHING
            `);
        } catch (migrationErr) {
            console.log('Migration step skipped or already applied.', migrationErr);
        }

        console.log('Database table "players" is ready.');
    } catch (err) {
        console.error('Error initializing database at startup:', err);
    }
}
initDB();

// Fetch all players to format leaderboard
async function getAllPlayers() {
    try {
        const res = await pool.query('SELECT username, score FROM players ORDER BY score DESC');
        const playersObj = {};
        res.rows.forEach(row => {
            playersObj[row.username] = { score: parseInt(row.score, 10) };
        });
        return playersObj;
    } catch (err) {
        console.error('Error fetching players:', err);
        return {};
    }
}

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.static(__dirname)); // Serve HTML, CSS, JS from root

// --- SOCKET.IO ---
io.on('connection', async (socket) => {
    console.log('A user connected:', socket.id);

    // Send initial leaderboard
    const allPlayers = await getAllPlayers();
    socket.emit('leaderboardUpdate', allPlayers);

    // Fetch and send news
    try {
        const newsRes = await pool.query("SELECT value FROM settings WHERE key = 'news'");
        if (newsRes.rows.length > 0) {
            socket.emit('newsUpdate', newsRes.rows[0].value);
        }
    } catch (err) {
        console.error('Error fetching news:', err);
    }

    // Handle user login/init
    socket.on('initUser', async (data) => {
        let username;
        let id;

        if (typeof data === 'string') {
            username = data;
            id = data;
        } else {
            username = data.username;
            id = data.id;
        }

        socket.userId = id;
        socket.username = username;

        try {
            // Check if user exists
            const res = await pool.query('SELECT username, score FROM players WHERE id = $1', [id]);

            let score = 0;
            if (res.rows.length > 0) {
                // User exists
                score = parseInt(res.rows[0].score, 10);
                if (res.rows[0].username && res.rows[0].username !== username) {
                    username = res.rows[0].username;
                    socket.username = username;
                    socket.emit('usernameUpdated', username);
                }
            } else {
                // New user
                await pool.query('INSERT INTO players (id, username, score) VALUES ($1, $2, $3)', [id, username, 0]);
            }

            // Send initial score to the newly connected user
            socket.emit('userScore', score);

            // Broadcast new user to all
            const updatedLeaderboard = await getAllPlayers();
            io.emit('leaderboardUpdate', updatedLeaderboard);
        } catch (err) {
            console.error('Error in initUser:', err);
        }
    });

    // Handle pop event
    socket.on('pop', async (id) => {
        if (!id) return;

        try {
            // Increment logic atomically to prevent race conditions
            const updateRes = await pool.query(
                'UPDATE players SET score = score + 1 WHERE id = $1 RETURNING score',
                [id]
            );

            let newScore = 1;
            if (updateRes.rows.length > 0) {
                newScore = parseInt(updateRes.rows[0].score, 10);
            } else {
                // Failsafe: if somehow user popped before initialization
                await pool.query('INSERT INTO players (id, username, score) VALUES ($1, $2, $3)', [id, socket.username || id, 1]);
            }

            // Immediately send back updated score to the user clicking
            socket.emit('userScore', newScore);

            // Update leaderboard for everyone
            const updatedLeaderboard = await getAllPlayers();
            io.emit('leaderboardUpdate', updatedLeaderboard);
        } catch (err) {
            console.error('Error in pop:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
