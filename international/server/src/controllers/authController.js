import { InternationalUser } from '../models/InternationalUser.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    company: z.string().optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const register = async (req, res) => {
    try {
        const data = registerSchema.parse(req.body);

        const existing = await InternationalUser.findOne({ email: data.email });
        if (existing) return res.status(400).json({ error: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await InternationalUser.create({ ...data, password: hashedPassword });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1d' });

        res.status(201).json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(400).json({ error: error.issues ? error.issues[0].message : error.message });
    }
};

export const login = async (req, res) => {
    try {
        const data = loginSchema.parse(req.body);

        const user = await InternationalUser.findOne({ email: data.email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(data.password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1d' });

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(400).json({ error: error.issues ? error.issues[0].message : error.message });
    }
};
