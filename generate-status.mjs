// generate-status.mjs  (Node 18+)
import fs from 'node:fs/promises';

const SERVICES = [
    { id: 'site', name: 'Cyferion Website', url: 'https://cyferion.tech' },
    { id: 'app', name: 'Main App', url: 'https://app.cyferion.tech' },
    { id: 'graf', name: 'Grafana (home)', url: 'https://grafana.cyferion.tech' },
];

const MAX_POINTS = 50;
const TIMEOUT_MS = 6000;

async function loadPrev() {
    try {
        return JSON.parse(await fs.readFile('status.json', 'utf8'));
    } catch {
        return { services: [], incidents: [] };
    }
}

async function ping(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const start = performance.now();
    try {
        const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
        const ok = res.ok;
        const latency = Math.round(performance.now() - start);
        return { ok, latency };
    } catch {
        return { ok: false, latency: null };
    } finally {
        clearTimeout(t);
    }
}

function classify(latency, ok) {
    if (!ok) return 'outage';
    if (latency >= 300) return 'degraded';
    return 'operational';
}

// Incident management: open new, resolve old
function updateIncidents(incidents, svc) {
    const id = `outage-${svc.id}`;
    const now = new Date().toISOString();
    // If outage, open incident if not already open
    if (svc.status === 'outage') {
        const open = incidents.find(i => i.id === id && i.status !== 'resolved');
        if (!open) {
            incidents.unshift({
                id,
                title: `${svc.name} outage`,
                severity: 'major',
                status: 'open',
                started_at: now,
                description: `Automated check reports ${svc.name} unreachable.`
            });
        }
    } else {
        // If service recovered, resolve incident
        const idx = incidents.findIndex(i => i.id === id && i.status !== 'resolved');
        if (idx !== -1) {
            incidents[idx] = {
                ...incidents[idx],
                status: 'resolved',
                resolved_at: now,
                description: `${svc.name} is back online.`
            };
        }
    }
    return incidents;
}

async function main() {
    const prev = await loadPrev();
    const prevHist = Object.fromEntries((prev.services || []).map(s => [s.id, s.history_ms || []]));
    let incidents = prev.incidents || [];

    const checks = await Promise.all(SERVICES.map(async s => {
        const { ok, latency } = await ping(s.url);
        const status = classify(latency, ok);
        const hist = prevHist[s.id] ? [...prevHist[s.id]] : [];
        if (latency != null) {
            hist.push(latency);
            if (hist.length > MAX_POINTS) hist.shift();
        }
        const svc = {
            id: s.id,
            name: s.name,
            url: s.url,
            status,
            latency_ms: latency,
            checked_at: new Date().toISOString(),
            history_ms: hist
        };
        incidents = updateIncidents(incidents, svc);
        return svc;
    }));

    const data = { updated_at: new Date().toISOString(), services: checks, incidents };
    await fs.writeFile('status.json', JSON.stringify(data, null, 2));
    console.log('Wrote status.json @', new Date().toISOString());
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});