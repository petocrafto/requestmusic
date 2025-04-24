require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// MongoDB Schema
const songRequestSchema = new mongoose.Schema({
    senderName: String,
    recipient: String,
    songTitle: String,
    youtubeLink: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: 'queue' } // queue, today, tomorrow, history
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
            timestamp: { $gte: today }
        }).sort({ timestamp: 1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get tomorrow's songs
app.get('/api/requests/tomorrow', async (req, res) => {
    try {
        const requests = await SongRequest.find({ status: 'tomorrow' }).sort({ timestamp: 1 });
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
        console.log('Received request:', req.body);
        
        // Validate required fields
        const { senderName, songTitle, youtubeLink } = req.body;
        if (!senderName || !songTitle || !youtubeLink) {
            throw new Error('Missing required fields: senderName, songTitle, and youtubeLink are required');
        }

        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database connection is not ready');
        }

        const request = new SongRequest(req.body);
        console.log('Attempting to save request...');
        const savedRequest = await request.save();
        console.log('Successfully saved request:', savedRequest);
        res.status(201).json(savedRequest);
    } catch (error) {
        console.error('Error saving request:', error);
        // Send more detailed error message
        res.status(400).json({
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

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Access the app from other devices using:');
    console.log(`http://192.168.42.45:${PORT}`);
}); 