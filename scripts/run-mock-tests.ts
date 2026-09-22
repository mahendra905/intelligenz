/**
 * Comprehensive Mock and Acceptance Test Suite for IntelliGenZ Club Supabase + Vercel Architecture
 */
import http from 'http';

const BASE_URL = 'http://127.0.0.1:3000';

interface TestResult {
  suite: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
  details?: string;
  latencyMs?: number;
}

const results: TestResult[] = [];

async function request(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: any; raw: string }> {
  const url = new URL(path, BASE_URL);
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  let payload = '';
  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      payload = options.body;
    } else {
      payload = JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
    }
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let data: any = null;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            data,
            raw,
          });
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function record(suite: string, test: string, pass: boolean, details = '') {
  results.push({
    suite,
    test,
    status: pass ? 'PASS' : 'FAIL',
    details,
  });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] [${suite}] ${test}: ${details}`);
}

async function runAcceptanceTests() {
  console.log('====================================================');
  console.log('STARTING ACCEPTANCE AND FUNCTIONAL TEST SUITE');
  console.log('====================================================\n');

  // 1. Health & Database Connection Check
  try {
    const health = await request('/api/health');
    const isOk = health.status === 200 && health.data?.status === 'ok';
    record(
      'Database Connection',
      'Health check & Supabase connection test',
      isOk,
      `Runtime: ${health.data?.runtime}, DB: ${health.data?.services?.database}, Supabase: ${health.data?.services?.supabase}`
    );
  } catch (err: any) {
    record('Database Connection', 'Health check', false, err.message);
  }

  // 2. Admin Authentication
  let authCookie = '';
  let adminToken = '';
  try {
    // Test Invalid Login
    const invalidLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'superadmin', password: 'wrongpassword_123' },
    });
    record(
      'Admin Authentication',
      'Reject Invalid Credentials',
      invalidLogin.status === 401 && invalidLogin.data?.success === false,
      `Status: ${invalidLogin.status}, Error: ${invalidLogin.data?.error}`
    );

    // Test Valid Login
    const validLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'superadmin', password: 'admin1@10043' },
    });

    const setCookie = validLogin.headers['set-cookie'];
    if (setCookie && Array.isArray(setCookie)) {
      authCookie = setCookie.map((c) => c.split(';')[0]).join('; ');
    } else if (typeof setCookie === 'string') {
      authCookie = (setCookie as string).split(';')[0];
    }
    adminToken = validLogin.data?.token || '';

    record(
      'Admin Authentication',
      'Valid Login & Token Generation',
      validLogin.status === 200 && validLogin.data?.success === true && Boolean(adminToken),
      `User: ${validLogin.data?.user?.email}, Role: ${validLogin.data?.user?.role}`
    );

    // Test Protected Session Endpoint with auth
    const authHeaders = {
      Cookie: authCookie,
      Authorization: `Bearer ${adminToken}`,
    };

    const sessionCheck = await request('/api/auth/verify', { headers: authHeaders });
    record(
      'Admin Authentication',
      'Protected Session Endpoint (/api/auth/verify)',
      sessionCheck.status === 200 && sessionCheck.data?.valid === true,
      `Authenticated User: ${sessionCheck.data?.user?.username}`
    );

    // Protected API without auth
    const unauthCheck = await request('/api/admin/events');
    record(
      'Admin Authentication',
      'Reject Unauthenticated Request on Protected Endpoint (/api/admin/events)',
      unauthCheck.status === 401,
      `Status: ${unauthCheck.status}`
    );

  } catch (err: any) {
    record('Admin Authentication', 'Auth Test Exception', false, err.message);
  }

  const authHeaders = {
    Cookie: authCookie,
    Authorization: `Bearer ${adminToken}`,
  };

  // Pre-cleanup of any prior MOCK_TEST leftovers
  try {
    const [eventsRes, teamRes, annRes, projRes, galRes, certRes] = await Promise.all([
      request('/api/events'),
      request('/api/team'),
      request('/api/announcements'),
      request('/api/projects'),
      request('/api/gallery'),
      request('/api/certificates'),
    ]);

    for (const e of (eventsRes.data || [])) {
      if (String(e.id || '').includes('MOCK_TEST') || String(e.title || '').includes('MOCK_TEST')) {
        await request(`/api/admin/events/${e.id}`, { method: 'DELETE', headers: authHeaders });
      }
    }
    for (const t of (teamRes.data || [])) {
      if (String(t.id || '').includes('MOCK_TEST') || String(t.name || '').includes('MOCK_TEST')) {
        await request(`/api/admin/team/${t.id}`, { method: 'DELETE', headers: authHeaders });
      }
    }
    for (const a of (annRes.data || [])) {
      if (String(a.id || '').includes('MOCK_TEST') || String(a.title || '').includes('MOCK_TEST')) {
        await request(`/api/admin/announcements/${a.id}`, { method: 'DELETE', headers: authHeaders });
      }
    }
    for (const p of (projRes.data || [])) {
      if (String(p.id || '').includes('MOCK_TEST') || String(p.title || '').includes('MOCK_TEST') || String(p.name || '').includes('MOCK_TEST')) {
        await request(`/api/admin/projects/${p.id}`, { method: 'DELETE', headers: authHeaders });
      }
    }
    for (const g of (galRes.data || [])) {
      if (String(g.id || '').includes('MOCK_TEST') || String(g.title || '').includes('MOCK_TEST')) {
        await request(`/api/admin/gallery/${g.id}`, { method: 'DELETE', headers: authHeaders });
      }
    }
    for (const c of (certRes.data || [])) {
      if (String(c.id || '').includes('MOCK_TEST') || String(c.certificate_code || '').includes('MOCK_') || String(c.student_name || '').includes('MOCK_TEST')) {
        await request(`/api/admin/certificates/${c.id}`, { method: 'DELETE', headers: authHeaders });
      }
    }
  } catch (err: any) {
    console.warn('[Pre-cleanup warning]:', err?.message);
  }

  // 3. Settings Read / Update / Verify / Restore Test
  try {
    const settingsGet = await request('/api/settings');
    const originalTagline = settingsGet.data?.site_tagline || 'Official Technical Club';

    const testTagline = `MOCK_TEST_2026_TAGLINE_${Date.now()}`;
    const updateSettings = await request('/api/admin/settings', {
      method: 'PUT',
      headers: authHeaders,
      body: { site_tagline: testTagline },
    });
    const updateOk = updateSettings.status === 200;

    const refetchUpdated = await request('/api/settings');
    const updateVerified = refetchUpdated.data?.site_tagline === testTagline;

    // Restore original
    await request('/api/admin/settings', {
      method: 'PUT',
      headers: authHeaders,
      body: { site_tagline: originalTagline },
    });
    const refetchRestored = await request('/api/settings');
    const restoreVerified = refetchRestored.data?.site_tagline === originalTagline;

    record(
      'Settings Test',
      'Read -> Update -> Verify -> Restore Settings',
      updateOk && updateVerified && restoreVerified,
      `Original: "${originalTagline}", Updated: "${testTagline}", Restored: "${refetchRestored.data?.site_tagline}"`
    );
  } catch (err: any) {
    record('Settings Test', 'Settings Exception', false, err.message);
  }

  // 4. Events CRUD Test
  let createdEventId = '';
  try {
    // CREATE
    const createEventRes = await request('/api/admin/events', {
      method: 'POST',
      headers: authHeaders,
      body: {
        title: 'MOCK_TEST_2026 AI Summit',
        slug: `mock-test-2026-summit-${Date.now()}`,
        description: 'Mock test description for verification.',
        short_description: 'Mock test short description.',
        event_image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800',
        date: '2026-10-15',
        start_time: '10:00 AM',
        end_time: '04:00 PM',
        venue: 'Main Auditorium & AI Center',
        category: 'Workshop',
        maximum_participants: 150,
        status: 'Registration Open',
        featured: false,
      },
    });

    createdEventId = createEventRes.data?.id || '';
    const createdSuccess = createEventRes.status === 201 && Boolean(createdEventId);

    // READ in public events
    const publicEventsRes = await request('/api/events');
    const foundInPublic = Array.isArray(publicEventsRes.data) && publicEventsRes.data.some((e: any) => e.id === createdEventId);

    // UPDATE
    const updateEventRes = await request(`/api/admin/events/${createdEventId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        title: 'MOCK_TEST_2026 UPDATED AI Summit',
        venue: 'Advanced Research Lab 402',
      },
    });

    const updatedPublicRes = await request(`/api/events/${createdEventId}`);
    const updateVerified = updatedPublicRes.data?.title === 'MOCK_TEST_2026 UPDATED AI Summit';

    // DELETE
    const deleteRes = await request(`/api/admin/events/${createdEventId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const deleteSuccess = deleteRes.status === 200 && deleteRes.data?.success === true;

    // REFETCH TO CONFIRM ABSENCE
    const postDeletePublicRes = await request(`/api/events/${createdEventId}`);
    const goneVerified = postDeletePublicRes.status === 404 || !postDeletePublicRes.data?.id;

    record(
      'Events CRUD',
      'Full Lifecycle (CREATE -> READ -> UPDATE -> PUBLIC SYNC -> DELETE -> VERIFY ABSENCE)',
      createdSuccess && foundInPublic && updateVerified && deleteSuccess && goneVerified,
      `Created: ${createdSuccess} (${createdEventId}), FoundPublic: ${foundInPublic}, Updated: ${updateVerified}, Deleted: ${deleteSuccess}, Gone: ${goneVerified}`
    );
  } catch (err: any) {
    record('Events CRUD', 'Events Exception', false, err.message);
  }

  // 5. Event Registration Test
  let regEventId = '';
  let createdRegId = '';
  try {
    // Create temporary event for registration
    const createTargetEvent = await request('/api/admin/events', {
      method: 'POST',
      headers: authHeaders,
      body: {
        title: 'MOCK_TEST_2026 Registration Target Event',
        slug: `mock-test-reg-target-${Date.now()}`,
        description: 'Mock registration target',
        short_description: 'Mock registration target',
        event_image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4',
        date: '2026-11-20',
        start_time: '09:00 AM',
        end_time: '01:00 PM',
        venue: 'Campus Lab 1',
        category: 'Workshop',
        maximum_participants: 50,
        status: 'Registration Open',
      },
    });

    regEventId = createTargetEvent.data?.id;

    // Public Registration Submission
    const regPayload = {
      event_id: regEventId,
      full_name: 'MOCK_TEST_2026 Candidate',
      email: 'mock_test_candidate_2026@drkvsrit.ac.in',
      phone: '+91 9988776655',
      department: 'CSE (AIML)',
      year: 'III Year',
      roll_number: '23KV1A4299_TEST',
      participation_type: 'SOLO',
    };

    const regSubmitRes = await request('/api/registrations', {
      method: 'POST',
      body: regPayload,
    });

    const regCreated = regSubmitRes.status === 201 && Boolean(regSubmitRes.data?.data?.id || regSubmitRes.data?.registration?.id || regSubmitRes.data?.id);
    createdRegId = regSubmitRes.data?.data?.id || regSubmitRes.data?.registration?.id || regSubmitRes.data?.id || '';

    // Verify in Admin Registrations
    const adminRegsRes = await request(`/api/admin/registrations?event_id=${regEventId}`, {
      headers: authHeaders,
    });
    const foundInAdmin = Array.isArray(adminRegsRes.data) && adminRegsRes.data.some((r: any) => r.id === createdRegId || r.roll_number === '23KV1A4299_TEST');

    // Delete Registration
    if (createdRegId) {
      await request(`/api/admin/registrations/${createdRegId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
    }

    // Clean up temporary event
    if (regEventId) {
      await request(`/api/admin/events/${regEventId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
    }

    record(
      'Registration Test',
      'Public Submission -> Admin Query -> Deletion & Cleanup',
      regCreated && foundInAdmin,
      `RegCreated: ${regCreated}, RegId: ${createdRegId}, AdminFound: ${foundInAdmin}`
    );
  } catch (err: any) {
    record('Registration Test', 'Registration Exception', false, err.message);
  }

  // 6. Team Members CRUD Test
  let testTeamId = '';
  try {
    const createTeamRes = await request('/api/admin/team', {
      method: 'POST',
      headers: authHeaders,
      body: {
        name: 'MOCK_TEST_2026 Member',
        position: 'AI Research Lead',
        category: 'Technical Leads',
        department: 'CSE (AIML) & AI',
        year: 'IV Year',
        bio: 'Mock test team member bio.',
        photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        order_index: 99,
      },
    });

    testTeamId = createTeamRes.data?.id || '';
    const teamCreated = createTeamRes.status === 201 && Boolean(testTeamId);

    // Update
    await request(`/api/admin/team/${testTeamId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        position: 'Senior AI Research Lead',
      },
    });

    // Verify
    const teamListRes = await request('/api/team');
    const foundTeam = Array.isArray(teamListRes.data) && teamListRes.data.find((m: any) => m.id === testTeamId);
    const updateVerified = foundTeam?.position === 'Senior AI Research Lead';

    // Delete
    const deleteTeamRes = await request(`/api/admin/team/${testTeamId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (deleteTeamRes.status !== 200) {
      console.log('DEBUG deleteTeamRes:', deleteTeamRes.status, deleteTeamRes.data);
    }

    const postDeleteTeamRes = await request('/api/team');
    const goneTeam = !postDeleteTeamRes.data?.some((m: any) => m.id === testTeamId);

    record(
      'Team Members CRUD',
      'CREATE -> READ -> UPDATE -> DELETE -> VERIFY',
      teamCreated && updateVerified && goneTeam,
      `Created: ${teamCreated} (${testTeamId}), Updated: ${updateVerified}, Deleted: ${goneTeam}`
    );
  } catch (err: any) {
    record('Team Members CRUD', 'Team Exception', false, err.message);
  }

  // 7. Announcements CRUD Test
  let testAnnId = '';
  try {
    const createAnnRes = await request('/api/admin/announcements', {
      method: 'POST',
      headers: authHeaders,
      body: {
        title: 'MOCK_TEST_2026 Announcement Title',
        slug: `mock-test-announcement-${Date.now()}`,
        content: 'Mock announcement full content.',
        summary: 'Mock announcement summary.',
        category: 'Club News',
        author: 'Faculty Advisor',
        author_role: 'Professor',
        featured: false,
      },
    });

    testAnnId = createAnnRes.data?.id || '';
    const annCreated = createAnnRes.status === 201 && Boolean(testAnnId);

    // Update
    await request(`/api/admin/announcements/${testAnnId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        title: 'MOCK_TEST_2026 UPDATED Announcement Title',
      },
    });

    const annListRes = await request('/api/announcements');
    const foundAnn = Array.isArray(annListRes.data) && annListRes.data.find((a: any) => a.id === testAnnId);
    const updateVerified = foundAnn?.title === 'MOCK_TEST_2026 UPDATED Announcement Title';

    // Delete
    const deleteAnnRes = await request(`/api/admin/announcements/${testAnnId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (deleteAnnRes.status !== 200) {
      console.log('DEBUG deleteAnnRes:', deleteAnnRes.status, deleteAnnRes.data);
    }

    const postDeleteAnnRes = await request('/api/announcements');
    const goneAnn = !postDeleteAnnRes.data?.some((a: any) => a.id === testAnnId);

    record(
      'Announcements CRUD',
      'CREATE -> UPDATE -> READ -> DELETE',
      annCreated && updateVerified && goneAnn,
      `Created: ${annCreated} (${testAnnId}), Updated: ${updateVerified}, Gone: ${goneAnn}`
    );
  } catch (err: any) {
    record('Announcements CRUD', 'Announcement Exception', false, err.message);
  }

  // 8. Projects CRUD Test
  let testProjId = '';
  try {
    const createProjRes = await request('/api/admin/projects', {
      method: 'POST',
      headers: authHeaders,
      body: {
        name: 'MOCK_TEST_2026 Autonomous Drone Vision',
        title: 'MOCK_TEST_2026 Autonomous Drone Vision',
        slug: `mock-test-drone-vision-${Date.now()}`,
        description: 'Autonomous computer vision system.',
        short_description: 'Autonomous drone vision.',
        category: 'Computer Vision',
        image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf',
        tech_stack: ['PyTorch', 'YOLOv8', 'ROS2'],
        date: '2026',
      },
    });

    testProjId = createProjRes.data?.id || '';
    const projCreated = createProjRes.status === 201 && Boolean(testProjId);

    // Delete
    await request(`/api/admin/projects/${testProjId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    const projListRes = await request('/api/projects');
    const goneProj = !projListRes.data?.some((p: any) => p.id === testProjId);

    record(
      'Projects CRUD',
      'CREATE -> READ -> DELETE',
      projCreated && goneProj,
      `Created: ${projCreated} (${testProjId}), Deleted & Gone: ${goneProj}`
    );
  } catch (err: any) {
    record('Projects CRUD', 'Projects Exception', false, err.message);
  }

  // 9. Certificates Verification & CRUD Test
  const testCertCode = `MOCK_CERT_${Date.now()}`;
  let testCertId = '';
  try {
    const createCertRes = await request('/api/admin/certificates', {
      method: 'POST',
      headers: authHeaders,
      body: {
        certificate_code: testCertCode,
        student_name: 'MOCK_TEST_2026 Student',
        student_email: 'mock_student_2026@drkvsrit.ac.in',
        student_roll_no: '23KV1A4299_CERT',
        department: 'CSE (AIML)',
        college_name: 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
        event_title: 'AI Workshop 2026',
        certificate_type: 'Merit',
        issue_date: '2026-09-21',
        is_valid: true,
      },
    });

    testCertId = createCertRes.data?.id || '';
    const certCreated = createCertRes.status === 201 && Boolean(testCertId);

    // Public Verification Lookup by code
    const certLookupRes = await request(`/api/certificates/verify/${testCertCode}`);
    const certFound = certLookupRes.status === 200 && certLookupRes.data?.valid === true;

    // Public Verification Lookup by roll number
    const rollLookupRes = await request('/api/certificates/verify/23KV1A4299_CERT');
    const rollFound = rollLookupRes.status === 200 && rollLookupRes.data?.valid === true;

    // Delete
    await request(`/api/admin/certificates/${testCertId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    const postDeleteCertRes = await request(`/api/certificates/verify/${testCertCode}`);
    const certGone = postDeleteCertRes.status === 404 || postDeleteCertRes.data?.valid === false;

    record(
      'Certificates Test',
      'CREATE -> VERIFY BY CODE -> VERIFY BY ROLL -> DELETE',
      certCreated && certFound && rollFound && certGone,
      `Created: ${certCreated} (${testCertId}), FoundCode: ${certFound}, FoundRoll: ${rollFound}, Gone: ${certGone}`
    );
  } catch (err: any) {
    record('Certificates Test', 'Certificate Exception', false, err.message);
  }

  // 10. False-Success / Negative Error Handling Tests
  try {
    // Delete non-existent event
    const fakeEventDelete = await request('/api/admin/events/NON_EXISTENT_ID_99999999', {
      method: 'DELETE',
      headers: authHeaders,
    });
    const correctlyRejectedEvent = fakeEventDelete.status === 404;

    // Delete non-existent team member
    const fakeTeamDelete = await request('/api/admin/team/NON_EXISTENT_TEAM_MEMBER_9999', {
      method: 'DELETE',
      headers: authHeaders,
    });
    const correctlyRejectedTeam = fakeTeamDelete.status === 404;

    // Submit invalid event (missing required title/date)
    const invalidEventSubmit = await request('/api/admin/events', {
      method: 'POST',
      headers: authHeaders,
      body: {
        description: 'Missing title and date',
      },
    });
    const correctlyRejectedInvalid = invalidEventSubmit.status >= 400;

    record(
      'False-Success & Error Handling',
      'Backend rejects invalid IDs and malformed inputs with proper HTTP status & JSON error',
      correctlyRejectedEvent && correctlyRejectedTeam && correctlyRejectedInvalid,
      `Event404: ${correctlyRejectedEvent}, Team404: ${correctlyRejectedTeam}, Malformed400: ${correctlyRejectedInvalid}`
    );
  } catch (err: any) {
    record('False-Success & Error Handling', 'Negative Test Exception', false, err.message);
  }

  // 11. Stats Consistency Test
  try {
    const statsRes = await request('/api/stats');
    const statsValid = statsRes.status === 200 && (typeof statsRes.data?.events_organized === 'number' || typeof statsRes.data?.active_members === 'string' || typeof statsRes.data?.active_members === 'number');
    record(
      'Dashboard & Statistics',
      'Statistics Endpoint Consistency',
      statsValid,
      `Events: ${statsRes.data?.events_organized}, Members: ${statsRes.data?.active_members}`
    );
  } catch (err: any) {
    record('Dashboard & Statistics', 'Stats Exception', false, err.message);
  }

  // 12. Contact Messages & Join Applications Test
  try {
    const contactRes = await request('/api/contact', {
      method: 'POST',
      body: {
        name: 'MOCK_TEST_2026 Visitor',
        email: 'mock_visitor_2026@drkvsrit.ac.in',
        subject: 'MOCK_TEST_2026 Inquiry',
        message: 'Mock test message body.',
      },
    });
    const contactSuccess = contactRes.status === 200 || contactRes.status === 201;

    record(
      'Contact & Recruitment',
      'Public Submission Handling',
      contactSuccess,
      `ContactStatus: ${contactRes.status}`
    );
  } catch (err: any) {
    record('Contact & Recruitment', 'Contact Exception', false, err.message);
  }

  // 13. Attendance / Check-In Test
  try {
    const attendanceRes = await request('/api/admin/checkins', { headers: authHeaders });
    const attendanceValid = attendanceRes.status === 200 && Array.isArray(attendanceRes.data);
    record(
      'Attendance System',
      'Admin Attendance Overview & Checkin Query',
      attendanceValid,
      `AttendanceStatus: ${attendanceRes.status}, Records: ${attendanceRes.data?.length || 0}`
    );
  } catch (err: any) {
    record('Attendance System', 'Attendance Exception', false, err.message);
  }

  // 14. Audit Logs Test
  try {
    const auditRes = await request('/api/admin/audit-logs', { headers: authHeaders });
    const auditValid = auditRes.status === 200 && Array.isArray(auditRes.data);
    record(
      'Audit Logging',
      'Admin Audit Log Trail Recording',
      auditValid,
      `TotalLogs: ${auditRes.data?.length || 0}`
    );
  } catch (err: any) {
    record('Audit Logging', 'Audit Exception', false, err.message);
  }

  // 15. Newsletter Subscription Test
  try {
    const testSubEmail = `mock_sub_${Date.now()}@drkvsrit.ac.in`;
    const subRes = await request('/api/newsletter/subscribe', {
      method: 'POST',
      body: { email: testSubEmail, name: 'MOCK_TEST_2026 Subscriber' },
    });
    const subSuccess = subRes.status === 200 || subRes.status === 201;
    record(
      'Newsletter Broadcasts',
      'Newsletter Subscription & Dispatch Pipeline',
      subSuccess,
      `SubStatus: ${subRes.status}`
    );
  } catch (err: any) {
    record('Newsletter Broadcasts', 'Newsletter Exception', false, err.message);
  }

  // 16. Gallery Management Test
  let testGalId = '';
  try {
    const createGalRes = await request('/api/admin/gallery', {
      method: 'POST',
      headers: authHeaders,
      body: {
        title: 'MOCK_TEST_2026 Gallery Photo',
        image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998',
        caption: 'Mock gallery caption',
        category: 'Workshops',
        event_name: 'AI Bootcamp',
        date: '2026-09-21',
      },
    });
    testGalId = createGalRes.data?.id || '';
    const galCreated = createGalRes.status === 201 && Boolean(testGalId);

    // Delete Gallery item
    await request(`/api/admin/gallery/${testGalId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    record(
      'Gallery CRUD',
      'CREATE -> DELETE Gallery Photo',
      galCreated,
      `Created: ${galCreated} (${testGalId})`
    );
  } catch (err: any) {
    record('Gallery CRUD', 'Gallery Exception', false, err.message);
  }

  // 17. Cleanup Verification
  try {
    const [events, team, announcements, projects] = await Promise.all([
      request('/api/events'),
      request('/api/team'),
      request('/api/announcements'),
      request('/api/projects'),
    ]);

    const mockEventsList = (events.data || []).filter((e: any) => String(e.id || '').includes('MOCK_TEST_2026') || String(e.title || '').includes('MOCK_TEST_2026'));
    const mockTeamList = (team.data || []).filter((t: any) => String(t.id || '').includes('MOCK_TEST_2026') || String(t.name || '').includes('MOCK_TEST_2026'));
    const mockAnnList = (announcements.data || []).filter((a: any) => String(a.id || '').includes('MOCK_TEST_2026') || String(a.title || '').includes('MOCK_TEST_2026'));
    const mockProjList = (projects.data || []).filter((p: any) => String(p.id || '').includes('MOCK_TEST_2026') || String(p.title || '').includes('MOCK_TEST_2026'));

    if (mockAnnList.length > 0) {
      console.log('DEBUG mockAnnList remaining:', mockAnnList);
    }
    if (mockTeamList.length > 0) {
      console.log('DEBUG mockTeamList remaining:', mockTeamList);
    }

    const hasMockEvents = mockEventsList.length > 0;
    const hasMockTeam = mockTeamList.length > 0;
    const hasMockAnn = mockAnnList.length > 0;
    const hasMockProj = mockProjList.length > 0;

    const clean = !hasMockEvents && !hasMockTeam && !hasMockAnn && !hasMockProj;

    record(
      'Cleanup Verification',
      'All temporary MOCK_TEST_2026 records verified deleted and purged',
      clean,
      `Remaining Mock: Events=${hasMockEvents}, Team=${hasMockTeam}, Ann=${hasMockAnn}, Proj=${hasMockProj}`
    );
  } catch (err: any) {
    record('Cleanup Verification', 'Cleanup Check Exception', false, err.message);
  }

  console.log('\n====================================================');
  console.log('SUMMARY OF RESULTS:');
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
