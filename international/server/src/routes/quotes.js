import express from 'express';
import { InternationalQuote } from '../models/InternationalQuote.js';

const router = express.Router();

// Create a new quote request
router.post('/', async (req, res) => {
    try {
        const quote = await InternationalQuote.create(req.body);
        res.status(201).json(quote);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// List all quotes (Manager view - simplified for now)
router.get('/', async (req, res) => {
    try {
        const quotes = await InternationalQuote.find().sort({ createdAt: -1 });
        res.json(quotes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update quote status
router.patch('/:id', async (req, res) => {
    try {
        const quote = await InternationalQuote.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(quote);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
