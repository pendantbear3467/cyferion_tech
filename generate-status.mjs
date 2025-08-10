// generate-status.mjs
import fs from 'node:fs/promises';

const SERVICES = [
    { id: 'site', name: 'Cyferion Website', url: 'https://cyferion.tech' },
    { id: 'app', name: 'Main App', url: 'https://app.cyferion.tech' },
    { id: 'graf', name: 'Grafana (home)', url: 'https://grafana.cyferion.tech' },
];

// simple fetch-with-timeout
async function ping(url, timeoutMs = 5000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
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

async function main() {
    const checks = await Promise.all(SERVICES.map(async s => {
        const { ok, latency } = await ping(s.url);
        return {
            id: s.id,
            name: s.name,
            url: s.url,
            status: classify(latency, ok),
            latency_ms: latency,
            checked_at: new Date().toISOString(),
            // keep short sparkline; shift old values if you want over time
            history_ms: latency ? [latency] : []
        };
    }));

    const data = {
        updated_at: new Date().toISOString(),
        services: checks,
        incidents: [] // you can inject incidents here if needed
    };

    await fs.writeFile('status.json', JSON.stringify(data, null, 2));
    console.log('Wrote status.json @', new Date().toISOString());
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});