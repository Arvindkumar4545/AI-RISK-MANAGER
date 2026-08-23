import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 4000;
const configuredMlUrl = process.env.ML_URL || 'http://127.0.0.1:8000';
const ML_URL = /^https?:\/\//i.test(configuredMlUrl) ? configuredMlUrl : `http://${configuredMlUrl}`;
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';
let mongoReady = false;
const localUsers = [];
const localReports = [];

const User = mongoose.model('User', new mongoose.Schema({ email: { type: String, unique: true }, passwordHash: String, name: String }, { timestamps: true }));
const RiskReport = mongoose.model('RiskReport', new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, applicant: Object, risk_score: Number, risk_band: String, top_factors: Array }, { timestamps: true }));

function id() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function sign(user) { return jwt.sign({ id: String(user._id || user.id), email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' }); }
function auth(req, res, next) { try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Invalid or missing token' }); } }
function publicUser(user) { return { id: String(user._id || user.id), email: user.email, name: user.name }; }
app.get('/health', (_, res) => res.json({ status: 'ok', database: mongoReady ? 'mongodb' : 'memory-development' }));

app.post('/api/auth/signup', async (req, res) => {
	try {
	const { email, password, name } = req.body;
	if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
	const normalizedEmail = email.toLowerCase();
		if (mongoReady) {
			const passwordHash = await bcrypt.hash(password, 12);
			const user = await User.create({ email: normalizedEmail, passwordHash, name: name || normalizedEmail.split('@')[0] });
			return res.status(201).json({ token: sign(user), user: publicUser(user) });
		}
		if (localUsers.some((user) => user.email === normalizedEmail)) return res.status(400).json({ error: 'Email already registered' });
	const user = { id: id(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), name: name || normalizedEmail.split('@')[0] };
	localUsers.push(user);
	return res.status(201).json({ token: sign(user), user: publicUser(user) });
	} catch (error) { res.status(400).json({ error: error.code === 11000 ? 'Email already registered' : error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
	const email = String(req.body.email || '').toLowerCase();
	const user = mongoReady ? await User.findOne({ email }) : localUsers.find((item) => item.email === email);
	if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
	res.json({ token: sign(user), user: publicUser(user) });
});

app.post('/api/risk/predict', auth, async (req, res) => {
	try {
		const result = (await axios.post(`${ML_URL}/predict`, { data: req.body })).data;
		const reportData = { user: req.user.id, applicant: req.body, ...result, createdAt: new Date() };
	const report = mongoReady ? await RiskReport.create(reportData) : { ...reportData, _id: id() };
	if (!mongoReady) localReports.push(report);
	res.json({ ...result, report_id: report._id });
	} catch (error) { res.status(502).json({ error: 'ML service unavailable', detail: error.message }); }
});

app.post('/api/risk/stress-test', auth, async (req, res) => {
	try {
		const payload = { data: req.body.data || req.body, rate_hike_pct: req.body.rate_hike_pct || 0, inflation_pct: req.body.inflation_pct || 0 };
		res.json((await axios.post(`${ML_URL}/stress-test`, payload)).data);
	} catch (error) { res.status(502).json({ error: 'ML service unavailable', detail: error.message }); }
});

app.get('/api/risk/history', auth, async (req, res) => {
	if (mongoReady) return res.json(await RiskReport.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100));
	res.json(localReports.filter((report) => report.user === req.user.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 100));
});

function startServer() { app.listen(PORT, () => console.log(`Node API listening on http://127.0.0.1:${PORT} (${mongoReady ? 'MongoDB' : 'memory development mode'})`)); }
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai-risk-manager', { serverSelectionTimeoutMS: 2500 })
	.then(() => { mongoReady = true; startServer(); })
	.catch(async (error) => {
		console.warn(`MongoDB unavailable: ${error.message}`);
		console.warn('Starting with temporary in-memory development storage. Start MongoDB for durable data.');
		localUsers.push({ id: id(), email: 'analyst@atlas.finance', passwordHash: await bcrypt.hash('demo123', 12), name: 'Demo Analyst' });
		startServer();
	});
