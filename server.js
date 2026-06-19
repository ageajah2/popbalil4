const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

const PORT = process.env.PORT || 3000;

// --- DATABASE SETUP ---
const { MongoClient } = require('mongodb');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ibuage2_db_user:urrKM0PfYOTp0mbi@member1.c7sbnep.mongodb.net';
const client = new MongoClient(MONGODB_URI);
let db;

// Initialize database table if it doesn't exist
async function initDB() {
    try {
        await client.connect();
        db = client.db(); // Uses database from MONGODB_URI
        console.log('Connected to MongoDB successfully.');

        // Initialize unique indexes
        await db.collection('players').createIndex({ id: 1 }, { unique: true });
        await db.collection('settings').createIndex({ key: 1 }, { unique: true });

        // Insert default settings document
        await db.collection('settings').updateOne(
            { key: 'news' },
            { $setOnInsert: { value: 'Selamat datang di Pop Balil 3!' } },
            { upsert: true }
        );

        console.log('Database tables are ready in MongoDB.');
    } catch (err) {
        console.error('Error initializing MongoDB database at startup:', err);
    }
}
initDB();

// Fetch all players to format leaderboard
async function getAllPlayers() {
    try {
        if (!db) return {};
        const players = await db.collection('players').find().sort({ score: -1 }).toArray();
        const playersObj = {};
        players.forEach(p => {
            if (p.username) {
                playersObj[p.username] = { score: parseInt(p.score, 10) || 0 };
            }
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
        if (db) {
            const newsDoc = await db.collection('settings').findOne({ key: 'news' });
            if (newsDoc) {
                socket.emit('newsUpdate', newsDoc.value);
            }
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
            if (!db) throw new Error('Database not initialized');
            // Check if user exists
            const player = await db.collection('players').findOne({ id: id });

            let score = 0;
            if (player) {
                // User exists
                score = parseInt(player.score, 10) || 0;
                if (player.username && player.username !== username) {
                    username = player.username;
                    socket.username = username;
                    socket.emit('usernameUpdated', username);
                }
            } else {
                // New user
                await db.collection('players').insertOne({ id: id, username: username, score: 0 });
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
            if (!db) throw new Error('Database not initialized');
            // Increment logic atomically to prevent race conditions
            const updatedDoc = await db.collection('players').findOneAndUpdate(
                { id: id },
                { 
                    $inc: { score: 1 },
                    $setOnInsert: { username: socket.username || id }
                },
                { returnDocument: 'after', upsert: true }
            );

            const newScore = updatedDoc ? (parseInt(updatedDoc.score, 10) || 0) : 1;

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
