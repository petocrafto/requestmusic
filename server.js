require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static(__dirname));

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// MongoDB Schema
const songRequestSchema = new mongoose.Schema({
    senderName: String,
    recipient: String,
    songTitle: String,
    youtubeLink: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: 'queue' }, // queue, today, tomorrow, history
    targetDate: { type: Date, default: null } // tanggal target request (opsional)
});

const SongRequest = mongoose.model('SongRequest', songRequestSchema);

// Connect to MongoDB
// Ensure environment variables are loaded
if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
}

// MongoDB connection with retry
const connectWithRetry = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        console.log('MongoDB URI:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@'));
        console.log('MongoDB connection state:', mongoose.connection.readyState);
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.error('Will retry connection in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};

// Initial connection
connectWithRetry();

// API Routes
// Get all requests
app.get('/api/requests', async (req, res) => {
    try {
        const requests = await SongRequest.find().sort({ timestamp: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get today's songs
app.get('/api/requests/today', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const requests = await SongRequest.find({ 
            status: 'today',
            targetDate: today
        }).sort({ timestamp: 1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get tomorrow's songs
app.get('/api/requests/tomorrow', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const requests = await SongRequest.find({ 
            status: 'tomorrow',
            targetDate: tomorrow
        }).sort({ timestamp: 1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get queue songs
app.get('/api/requests/queue', async (req, res) => {
    try {
        const requests = await SongRequest.find({ status: 'queue' }).sort({ timestamp: 1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new request
app.post('/api/requests', async (req, res) => {
    try {
        console.log('Received request body:', req.body);
        const { senderName, recipient, songTitle, youtubeLink, message } = req.body;
        if (!senderName || !songTitle || !youtubeLink) {
            console.error('Validation failed: Missing required fields');
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Nama Pengirim, Judul Lagu, dan Link YouTube harus diisi!'
            });
        }
        if (mongoose.connection.readyState !== 1) {
            console.error('MongoDB not ready, state:', mongoose.connection.readyState);
            return res.status(500).json({
                error: 'Database connection is not ready',
                mongoState: mongoose.connection.readyState
            });
        }
        // Hitung jumlah request dengan status 'today' untuk hari ini
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = await SongRequest.countDocuments({
            status: 'today',
            targetDate: today
        });
        let statusToSet = 'today';
        let targetDate = today;
        if (todayCount >= 6) {
            // Jika today sudah 6, cek tomorrow
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const tomorrowCount = await SongRequest.countDocuments({
                status: 'tomorrow',
                targetDate: tomorrow
            });
            console.log('tomorrowCount', tomorrowCount);
            if (tomorrowCount >= 6) {
                statusToSet = 'queue';
                targetDate = null;
            } else {
                statusToSet = 'tomorrow';
                targetDate = tomorrow;
            }
        }
        const newRequest = new SongRequest({
            senderName,
            recipient: recipient || '',
            songTitle,
            youtubeLink,
            message: message || '',
            status: statusToSet,
            targetDate
        });
        console.log('Saving new request:', newRequest);
        const savedRequest = await newRequest.save();
        console.log('Successfully saved request:', savedRequest);
        res.status(201).json(savedRequest);
    } catch (error) {
        console.error('Error saving request:', error);
        res.status(500).json({
            error: 'Failed to save request',
            message: error.message,
            mongoState: mongoose.connection.readyState,
            details: error.toString()
        });
    }
});

// Update request status
app.put('/api/requests/:id', async (req, res) => {
    try {
        const request = await SongRequest.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.json(request);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete request
app.delete('/api/requests/:id', async (req, res) => {
    try {
        await SongRequest.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Reset all requests
app.delete('/api/requests', async (req, res) => {
    try {
        await SongRequest.deleteMany({});
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;

// Error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('MongoDB connection state:', mongoose.connection.readyState);
}); 