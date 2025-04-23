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
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

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
        const request = new SongRequest(req.body);
        await request.save();
        res.status(201).json(request);
    } catch (error) {
        res.status(400).json({ error: error.message });
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