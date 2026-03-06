import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/news';

async function testRegistryAlignment() {
    console.log('--- Canonical Registry Alignment Test ---\n');

    const validEvent = {
        title: 'Valid AI News Event',
        content: 'This is a valid event that should be deterministically mapped.',
        source: 'api',
        sourceUrl: 'https://example.com/valid-ai-news'
    };

    const orphanEvent = {
        title: 'Unregister Orphan News Event',
        content: 'This event should be rejected because its source is unregistered.',
        source: 'manual'
    };

    try {
        // Test 1: Deterministic Mapping (Run 1)
        console.log('Test 1: Ingesting valid event (Run 1)...');
        let res1 = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validEvent)
        });
        let data1 = await res1.json();
        console.log(`Status: ${res1.status}`);
        console.log(`Registry Reference ID: ${data1.registry_reference_id}\n`);

        // Test 2: Deterministic Mapping (Run 2)
        console.log('Test 2: Ingesting exact same valid event (Run 2)...');
        let res2 = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validEvent)
        });
        let data2 = await res2.json();
        console.log(`Status: ${res2.status}`);
        console.log(`Registry Reference ID: ${data2.registry_reference_id}`);

        // Validate determinism
        if (data1.registry_reference_id === data2.registry_reference_id) {
            console.log('✓ SUCCESS: Deterministic matching confirmed.\n');
        } else {
            console.error('✗ FAILED: Mismatching Reference IDs for same source event.\n');
        }

        // Test 3: Rejection Discipline
        console.log('Test 3: Attempting to ingest orphan event (Missing Registry Check)...');
        let res3 = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orphanEvent)
        });
        let data3 = await res3.json();
        console.log(`Status: ${res3.status}`);
        console.log(`Response:`, data3);

        if (res3.status === 400 && data3.error && data3.error.includes('Orphan Event Rejected')) {
            console.log('✓ SUCCESS: Orphan event properly rejected without fallback.\n');
        } else {
            console.error('✗ FAILED: Orphan event was not rejected correctly.\n');
        }

    } catch (err) {
        console.error('Test execution failed:', err);
    }
}

testRegistryAlignment();
