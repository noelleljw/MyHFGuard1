const http = require('http');

http.get('http://localhost:3001/debug-db?patientId=test-patient-id-123', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
}).on('error', (e) => {
  console.error(e);
});
