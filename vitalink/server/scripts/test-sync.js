const http = require('http');

const data = JSON.stringify({
  patient_id: 'test-patient-id-123',
  date: '2025-12-20',
  steps_samples: [
    { startTime: '2025-12-20T14:30:00Z', endTime: '2025-12-20T14:31:00Z', count: 100 },
    { startTime: '2025-12-20T15:15:00Z', endTime: '2025-12-20T15:16:00Z', count: 200 }
  ],
  hr_samples: [
    { time: '2025-12-20T14:30:00Z', bpm: 80 },
    { time: '2025-12-20T15:15:00Z', bpm: 90 }
  ]
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/patient/sync-metrics',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(data);
req.end();
