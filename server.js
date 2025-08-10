import express from 'express';
import Knex from 'knex';
import fetch from 'node-fetch'; // For Node <18, otherwise use global fetch

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Knex (SQLite example, change for your DB)
const knex = Knex({
    client: 'sqlite3',
    connection: { filename: './status.db' },
    useNullAsDefault: true,
});

// Create tables if not exist (services, incidents, users)
await knex.schema.hasTable('services').then(exists => {
    if (!exists) {
        return knex.schema.createTable('services', t => {
            t.string('id').primary();
            t.string('name');
            t.string('url');
            t.string('status');
            t.integer('latency_ms');
            t.timestamp('checked_at');
        });
    }
});
await knex.schema.hasTable('incidents').then(exists => {
    if (!exists) {
        return knex.schema.createTable('incidents', t => {
            t.increments('id').primary();
            t.string('service_id');
            t.string('title');
            t.string('severity');
            t.string('status');
            t.timestamp('started_at');
            t.timestamp('resolved_at');
            t.text('description');
        });
    }
});
await knex.schema.hasTable('users').then(exists => {
    if (!exists) {
        return knex.schema.createTable('users', t => {
            t.increments('id').primary();
            t.string('username');
            t.string('email');
            t.timestamp('last_seen');
        });
    }
});

// Service definitions (could be stored in DB)
const SERVICES = [
    { id: 'site', name: 'Cyferion Website', url: 'https://cyferion.tech' },
    { id: 'app', name: 'Main App', url: 'https://app.cyferion.tech' },
    { id: 'graf', name: 'Grafana (home)', url: 'https://grafana.cyferion.tech' },
];

// Health check function
async function checkService(svc) {
    const start = Date.now();
    try {
        const res = await fetch(svc.url, { method: 'GET', timeout: 6000 });
        const latency = Date.now() - start;
        const status = res.ok ? (latency > 300 ? 'degraded' : 'operational') : 'outage';
        return {...svc, status, latency_ms: latency, checked_at: new Date() };
    } catch (e) {
        return {...svc, status: 'outage', latency_ms: null, checked_at: new Date() };
    }
}

// Periodic status updater
async function updateStatuses() {
    for (const svc of SERVICES) {
        const result = await checkService(svc);
        await knex('services').insert(result).onConflict('id').merge();
        // Incident logic here (open/resolve based on status)
    }
}
setInterval(updateStatuses, 60000); // Every minute

// API endpoints
app.get('/api/status', async(req, res) => {
    const services = await knex('services').select();
    const incidents = await knex('incidents').where('status', 'open');
    res.json({ updated_at: new Date(), services, incidents });
});

app.get('/api/users', async(req, res) => {
    const users = await knex('users').select();
    res.json(users);
});

// Add more endpoints as needed (e.g., for metrics, history, etc.)

app.listen(PORT, () => {
    console.log(`Status dashboard API running on port ${PORT}`);
});