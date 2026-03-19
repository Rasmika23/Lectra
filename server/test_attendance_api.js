const fetch = require('node-fetch'); // Assuming node-fetch is available or using native fetch if node 18+

const API_BASE_URL = 'http://localhost:5000';
let token = '';

async function login() {
    const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'coordinator@example.com', // Updated to match DB coordinator
            password: 'password123'
        })
    });
    const data = await res.json();
    token = data.token;
    console.log('Logged in, token received');
}

async function testEndpoints() {
    try {
        // Using manually generated token to bypass login issues
        token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJjb29yZGluYXRvckBleGFtcGxlLmNvbSIsInJvbGUiOiJzdWItY29vcmRpbmF0b3IifQ.YMchUf4bV-b0QEi3zMf2Dho1gM9MOOGLm3K3DHC1D1yY';
        console.log('Using manual token');

        // 1. Test GET /subcoordinator/modules
        console.log('\nTesting GET /subcoordinator/modules...');
        const modulesRes = await fetch(`${API_BASE_URL}/subcoordinator/modules`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const modulesText = await modulesRes.text();
        console.log('Raw response:', modulesText);
        let modules;
        try {
            modules = JSON.parse(modulesText);
        } catch (e) {
            console.error('Failed to parse modules JSON');
            return;
        }
        console.log('Modules:', modules);

        if (modules.length > 0) {
            const moduleId = modules[0].moduleid;

            // 2. Test GET /modules/:id/sessions/past
            console.log(`\nTesting GET /modules/${moduleId}/sessions/past...`);
            const sessionsRes = await fetch(`${API_BASE_URL}/modules/${moduleId}/sessions/past`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const sessions = await sessionsRes.json();
            console.log('Past Sessions:', sessions.length);

            if (sessions.length > 0) {
                const sessionId = sessions[0].sessionid;

                // 3. Test POST /sessions/:id/attendance
                console.log(`\nTesting POST /sessions/${sessionId}/attendance...`);
                const attendanceRes = await fetch(`${API_BASE_URL}/sessions/${sessionId}/attendance`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        attendance: { '3': true }, // Assuming lecturer with ID 3
                        topicsCovered: 'Testing API integration',
                        actualDuration: 2.5
                    })
                });
                const result = await attendanceRes.json();
                console.log('Attendance Result:', result);
            }
        }
    } catch (err) {
        console.error('Test failed:', err);
    }
}

testEndpoints();
