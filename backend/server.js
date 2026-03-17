const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // In development, allow all origins. In production, allow frontend URL (or specific list).
        const allowedOrigins = (
            process.env.FRONTEND_URLS
                ? process.env.FRONTEND_URLS.split(',').map(s => s.trim()).filter(Boolean)
                : [process.env.FRONTEND_URL || 'http://localhost:5173']
        );

        if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Import routes
const rankRoutes = require('./routes/rankRoutes');
const getSupabase = require('./supabaseClient');
const DataForSEOService = require('./services/dataForSEOService');
const { findDomainInResults } = require('./services/rankCalculator');
const { requireAuth } = require('./middleware/authMiddleware');

// Routes
app.use('/api/rank', requireAuth, rankRoutes);

// ─── Server-side auto-sync ────────────────────────────────────────────────────
// Runs every 60 s regardless of whether any frontend is connected.
// High-priority tasks complete in ~1-3 min, so this catches them promptly.
async function runAutoSync() {
    try {
        const login = process.env.DATAFORSEO_LOGIN;
        const password = process.env.DATAFORSEO_PASSWORD;
        if (!login || !password) return;

        const sb = getSupabase();
        const service = new DataForSEOService(login, password);

        const { data: pendingRows, error } = await sb
            .from('rank_checks')
            .select('id, task_id, domain')
            .eq('status', 'pending')
            .not('task_id', 'is', null);

        if (error || !pendingRows || pendingRows.length === 0) return;

        console.log(`🔄 Auto-sync: checking ${pendingRows.length} pending task(s)…`);
        let synced = 0;

        await Promise.all(pendingRows.map(async (row) => {
            try {
                const taskResult = await service.getTaskResult(row.task_id);
                if (!taskResult.ready) return;

                const targetDomain = row.domain || taskResult.tag || '';
                const rankResult = findDomainInResults(targetDomain, taskResult.organicResults);

                const { error: updateError } = await sb
                    .from('rank_checks')
                    .update({
                        status: 'completed',
                        rank: rankResult.found ? rankResult.position : null,
                        url: rankResult.url || null
                    })
                    .eq('id', row.id);

                if (!updateError) {
                    synced++;
                    console.log(`✅ Auto-sync: ${row.id} → rank ${rankResult.position ?? 'not found'}`);
                }
            } catch { /* skip individual task errors */ }
        }));

        if (synced > 0) console.log(`🔄 Auto-sync complete: ${synced}/${pendingRows.length} resolved`);
    } catch (err) {
        console.error('Auto-sync error:', err.message);
    }
}

// Start auto-sync 30 s after boot, then every 60 s
setTimeout(() => {
    runAutoSync();
    setInterval(runAutoSync, 60000);
}, 30000);

// ─── Database Keep-Alive Pinger ────────────────────────────────────────────────
// Supabase pauses free projects after 7 days of inactivity.
// This runs a lightweight query every 12 hours to keep the project active.
async function runKeepAlivePing() {
    try {
        const sb = getSupabase();
        // A minimal query: just fetch 1 row to trigger DB activity
        const { data, error } = await sb
            .from('rank_checks')
            .select('id')
            .limit(1);

        if (error) {
            console.error('⚠️ Keep-alive ping failed:', error.message);
        } else {
            console.log('💓 Database keep-alive ping successful at', new Date().toISOString());
        }
    } catch (err) {
        console.error('⚠️ Keep-alive ping error:', err.message);
    }
}

// Run the first keep-alive ping 1 minute after server start, then every 12 hours
setTimeout(() => {
    runKeepAlivePing();
    setInterval(runKeepAlivePing, 12 * 60 * 60 * 1000);
}, 60000);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Rank Tracker API is running (DataForSEO Edition)',
        version: '1.0.0',
        provider: 'DataForSEO',
        credentialsConfigured: !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

const path = require('path');

// 404 handler for API routes
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API Route not found' });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
    const frontendDistPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendDistPath));

    // Catch-all route to serve the React app for non-API requests
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
}

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔑 Credentials: ${process.env.DATAFORSEO_LOGIN ? '✓ Configured' : '✗ Missing (add .env)'}`);
    });
}

module.exports = app;
