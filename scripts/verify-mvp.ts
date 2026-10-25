import http from 'node:http';
import assert from 'node:assert/strict';
import { handleApiRequest } from '../server/apiMiddleware';

async function runTests() {
  console.log('=== CivicLens MVP End-to-End Verification Suite (Chennai Region) ===\n');

  const server = http.createServer(async (req, res) => {
    const handled = await handleApiRequest(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.end('Not found');
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('Failed to bind test server');
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // Reset to clean Chennai state first
    const resetRes = await fetch(`${baseUrl}/api/reset-demo`, { method: 'POST' });
    assert.equal(resetRes.status, 200, 'Reset demo endpoint should return 200');

    // 1. Test Bootstrap
    console.log('1. Testing GET /api/bootstrap (Multi-hub sample dataset & authority directory)...');
    const bootRes = await fetch(`${baseUrl}/api/bootstrap`);
    assert.equal(bootRes.status, 200);
    const bootData = await bootRes.json();
    assert.equal(bootData.reports.length, 20, 'Should have 20 initial sample reports across Chennai, SRM, VIT Vellore, and IIT Palakkad');
    assert.equal(bootData.directory.length, 7, 'Should have 7 grounded authority channels (GCC, SRM/Maraimalai Nagar, VIT/Vellore Corp, IIT Palakkad/LSGD)');
    assert.equal(
      bootData.reports.every((r: { is_sample_data: boolean; gallery_photos?: string[] }) => r.is_sample_data === true && Array.isArray(r.gallery_photos) && r.gallery_photos.length === 3),
      true,
      'All initial reports must be labeled is_sample_data: true and include 3 gallery photos'
    );
    console.log('   PASS: 20 labeled sample reports with real photo galleries & 7 grounded multi-hub authority channels verified.');

    // 2. Test Validation Failures
    console.log('2. Testing input validation (short complaint, bad image MIME)...');
    const badRes1 = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaint: 'Too short',
        address: 'Anna Salai & Teynampet',
        lat: 13.0405,
        lng: 80.2503,
      }),
    });
    assert.equal(badRes1.status, 400, 'Short complaint should be rejected with 400');

    const badRes2 = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaint: 'Valid complaint text describing a hazard on Anna Salai.',
        address: 'Anna Salai & Teynampet',
        lat: 13.0405,
        lng: 80.2503,
        imageDataUrl: 'data:application/pdf;base64,JVBERi0xLjQ=',
      }),
    });
    assert.equal(badRes2.status, 400, 'Non-image data URL should be rejected with 400');
    console.log('   PASS: Invalid inputs gracefully rejected with 400 errors.');

    // 3. Test AI Analysis & PII Redaction + Duplicate Detection + Report Submission
    console.log('3. Testing POST /api/reports (Anna Salai road-damage + PNG image + PII redaction + Duplicate Detection)...');
    const tinyPngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const submitRes = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaint:
          'Deep asphalt pothole in the left MTC bus and bike lane on Anna Salai near Teynampet signal. Contact me at resident.chennai@example.com or 984-012-3456.',
        address: 'Anna Salai & Eldams Rd Signal, Teynampet, Chennai',
        neighborhood: 'Teynampet (Zone 9)',
        lat: 13.0406,
        lng: 80.2504,
        imageDataUrl: tinyPngDataUrl,
        contact: 'resident.chennai@example.com',
      }),
    });
    assert.equal(submitRes.status, 201, 'Valid report submission should return 201');
    const submitData = await submitRes.json();
    const created = submitData.report;

    // Verify all 8 required AI structured fields
    assert.equal(typeof created.title, 'string');
    assert.equal(typeof created.description, 'string');
    assert.equal(created.category, 'Road Damage');
    assert.equal(['Low', 'Medium', 'High', 'Critical'].includes(created.severity), true);
    assert.equal(typeof created.evidence_summary, 'string');
    assert.equal(typeof created.recommended_action, 'string');
    assert.equal(
      created.recommended_authority.includes('Greater Chennai Corporation'),
      true
    );
    assert.equal(typeof created.confidence, 'number');
    assert.equal(created.is_sample_data, false, 'Submitted report must be marked genuine (is_sample_data: false)');
    assert.equal(
      !created.raw_complaint.includes('resident.chennai@example.com') &&
        !created.raw_complaint.includes('984-012-3456'),
      true,
      'PII must be redacted from public report fields'
    );
    assert.equal(
      submitData.duplicates.length >= 1,
      true,
      'Should detect duplicate match with existing Anna Salai road damage report'
    );
    console.log(
      `   PASS: Created report "${created.title}" [Category: ${created.category}, Severity: ${created.severity}, Duplicates found: ${submitData.duplicates.length}].`
    );

    // 4. Test Outside-Jurisdiction Cautious Authority Recommendation
    console.log('4. Testing POST /api/analyze for outside-jurisdiction cautious fallback (Chengalpattu)...');
    const outRes = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaint: 'Broken asphalt curb and blocked walkway near GST Road in Chengalpattu.',
        address: 'GST Road Bypass, Chengalpattu, TN',
        lat: 12.6918,
        lng: 79.9757,
      }),
    });
    assert.equal(outRes.status, 200);
    const outData = await outRes.json();
    assert.equal(
      outData.authority_details.verified,
      false,
      'Outside-jurisdiction report must not claim verified GCC authority'
    );
    assert.equal(
      Boolean(outData.authority_details.cautionNote),
      true,
      'Must provide a cautionNote when authority cannot be verified'
    );
    console.log('   PASS: Cautious unverified recommendation returned for outside-Chennai coordinates.');

    // 5. Test Failed Live AI Call Graceful Recovery (with invalid runtime key)
    console.log('5. Testing graceful fallback when an invalid GEMINI_API_KEY fails...');
    await fetch(`${baseUrl}/api/config/runtime-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'INVALID_TEST_KEY_FOR_ERROR_RECOVERY' }),
    });
    const failSafeRes = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaint: 'Streetlight pole is completely dark on Luz Church Road in Mylapore.',
        address: 'Luz Church Rd, Mylapore, Chennai',
        lat: 13.0329,
        lng: 80.2683,
      }),
    });
    assert.equal(failSafeRes.status, 200, 'Should recover gracefully when Gemini API key is invalid');
    const failSafeData = await failSafeRes.json();
    assert.equal(failSafeData.analysis.category, 'Street Lighting');
    // Clear test runtime key
    await fetch(`${baseUrl}/api/config/runtime-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: '' }),
    });
    console.log('   PASS: Failed AI API call handled gracefully via deterministic fallback.');

    // 6. Test Status Updates & Timeline Persistence
    console.log('6. Testing PATCH /api/reports/:id/status...');
    const statusRes = await fetch(
      `${baseUrl}/api/reports/${encodeURIComponent(created.id)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Resolved',
          note: 'Repaired by GCC BRR Zone 9 patching crew during verification test.',
        }),
      }
    );
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.report.status, 'Resolved');
    assert.equal(statusData.report.status_history.length, 2);
    console.log('   PASS: Status updated to Resolved and timeline persisted.');

    // Restore clean initial Chennai demo state for user/judge
    await fetch(`${baseUrl}/api/reset-demo`, { method: 'POST' });
    console.log('\n=== ALL CHENNAI MVP VERIFICATION TESTS PASSED SUCCESSFULLY ===');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
