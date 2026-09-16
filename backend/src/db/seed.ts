import { db } from './client';

export interface DemoUser {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'faculty' | 'staff' | 'admin' | 'grievance_authority';
  student_id?: string;
  phone?: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    email: 'student@campus.demo',
    password: 'Demo1234!',
    name: 'Demo-student-1',
    role: 'student',
    student_id: 'CS2024001',
    phone: '+91 98765 43210',
  },
  {
    email: 'faculty@campus.demo',
    password: 'Demo1234!',
    name: 'Demo-faculty-1',
    role: 'faculty',
    phone: '+91 98765 43211',
  },
  {
    email: 'staff@campus.demo',
    password: 'Demo1234!',
    name: 'Demo-staff-1',
    role: 'staff',
    phone: '+91 98765 43212',
  },
  {
    email: 'staff2@campus.demo',
    password: 'Demo1234!',
    name: 'Demo-staff-2',
    role: 'staff',
    phone: '+91 98765 43215',
  },
  {
    email: 'staff3@campus.demo',
    password: 'Demo1234!',
    name: 'Demo-staff-3',
    role: 'staff',
    phone: '+91 98765 43216',
  },
  {
    email: 'admin@campus.demo',
    password: 'Demo1234!',
    name: 'Demo-admin-1',
    role: 'admin',
    phone: '+91 98765 43213',
  },
  {
    email: 'depthead@campus.demo',
    password: 'Demo1234!',
    name: 'Demo-head-of-dept-1',
    role: 'grievance_authority',
    phone: '+91 98765 43214',
  },
];

export const DEPARTMENTS = [
  { name: 'Electrical', description: 'Power supply, fans, lights, AC, generators', contact: 'ext-401' },
  { name: 'Plumbing', description: 'Water supply, pipe leaks, washroom fittings', contact: 'ext-402' },
  { name: 'IT/Network', description: 'Wi-Fi, LAN, lab computers, projectors', contact: 'ext-403' },
  { name: 'Hostel', description: 'Hostel rooms, mess, furniture, warden affairs', contact: 'ext-404' },
  { name: 'Housekeeping', description: 'Cleaning, sanitation, waste disposal', contact: 'ext-405' },
  { name: 'Academic', description: 'Timetables, classrooms, attendance issues', contact: 'ext-406' },
  { name: 'Student Welfare', description: 'Hostel allocations, medical, student support', contact: 'ext-407' },
  { name: 'Security', description: 'Gates, CCTV, parking, campus entry passes', contact: 'ext-408' },
  { name: 'Library', description: 'Book lending, reading rooms, digital library', contact: 'ext-409' },
];

export const LOCATIONS = [
  { building: 'Hostel B', floor: '2nd Floor', room: 'Room 204', label: 'Hostel B - Room 204' },
  { building: 'Hostel A', floor: '1st Floor', room: 'Common Room', label: 'Hostel A - Common Room' },
  { building: 'CSE Block', floor: '3rd Floor', room: 'Lab 302', label: 'CSE Block - Lab 302' },
  { building: 'ECE Block', floor: '2nd Floor', room: 'Seminar Hall', label: 'ECE Block - Seminar Hall' },
  { building: 'Library', floor: 'Ground Floor', room: 'Reference Section', label: 'Library - Reference Section' },
  { building: 'Main Building', floor: '1st Floor', room: 'Auditorium', label: 'Main Building - Auditorium' },
  { building: 'Admin Building', floor: 'Ground Floor', room: 'Registrar Office', label: 'Admin Building - Registrar Office' },
  { building: 'Cafeteria', floor: 'Ground Floor', room: 'Main Dining Area', label: 'Cafeteria - Main Dining' },
  { building: 'Labs', floor: 'Basement', room: 'Server Room', label: 'Central Labs - Server Room' },
];

export async function seedAll() {
  console.log('🌱 Starting full database seed (Level 1 & Level 2)...');

  // 1. Seed Auth users
  const { data: userList, error: listError } = await db.auth.admin.listUsers();
  if (listError) throw listError;

  const existingAuthMap = new Map<string, string>();
  userList.users.forEach((u) => {
    if (u.email) existingAuthMap.set(u.email.toLowerCase(), u.id);
  });

  const userIdMap: Record<string, string> = {};

  for (const demoUser of DEMO_USERS) {
    let authUserId = existingAuthMap.get(demoUser.email.toLowerCase());

    if (!authUserId) {
      console.log(`Creating Auth user: ${demoUser.email}...`);
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: demoUser.email,
        password: demoUser.password,
        email_confirm: true,
        user_metadata: { name: demoUser.name, role: demoUser.role },
      });
      if (createError) {
        console.error(`❌ Failed to create ${demoUser.email}:`, createError.message);
        continue;
      }
      authUserId = created.user.id;
    } else {
      await db.auth.admin.updateUserById(authUserId, {
        password: demoUser.password,
        email_confirm: true,
        user_metadata: { name: demoUser.name, role: demoUser.role },
      });
    }

    userIdMap[demoUser.email] = authUserId;

    await db.from('users').upsert(
      {
        id: authUserId,
        name: demoUser.name,
        email: demoUser.email,
        role: demoUser.role,
        student_id: demoUser.student_id ?? null,
        phone: demoUser.phone ?? null,
      },
      { onConflict: 'id' }
    );
  }
  console.log('✓ Users seeded');

  // 2. Seed Departments
  const deptIdMap: Record<string, string> = {};
  for (const d of DEPARTMENTS) {
    const { data: existing } = await db.from('departments').select('id, name').eq('name', d.name).maybeSingle();
    if (existing) {
      deptIdMap[d.name] = existing.id;
    } else {
      const { data: inserted, error: insErr } = await db
        .from('departments')
        .insert({
          name: d.name,
          description: d.description,
          contact: d.contact,
          head_id: d.name === 'Hostel' ? userIdMap['depthead@campus.demo'] : null,
        })
        .select('id, name')
        .single();

      if (inserted) {
        deptIdMap[d.name] = inserted.id;
      } else if (insErr) {
        console.error(`Error inserting department ${d.name}:`, insErr.message);
      }
    }
  }
  console.log('✓ Departments seeded:', Object.keys(deptIdMap).length);

  // 3. Seed Locations
  const locationIdMap: Record<string, string> = {};
  for (const loc of LOCATIONS) {
    const { data: existing } = await db.from('locations').select('id').eq('label', loc.label).maybeSingle();
    if (existing) {
      locationIdMap[loc.label] = existing.id;
    } else {
      const { data, error } = await db.from('locations').insert(loc).select('id').single();
      if (!error && data) {
        locationIdMap[loc.label] = data.id;
      }
    }
  }
  console.log('✓ Locations seeded:', Object.keys(locationIdMap).length);

  // 4. Seed Staff
  const staffIdMap: Record<string, string> = {};
  const staffConfigs = [
    {
      email: 'staff@campus.demo',
      dept: 'Electrical',
      skills: ['electrical', 'fans', 'lighting', 'wiring'],
      workload: 1,
    },
    {
      email: 'staff2@campus.demo',
      dept: 'IT/Network',
      skills: ['wifi', 'lan', 'hardware', 'projectors'],
      workload: 2,
    },
    {
      email: 'staff3@campus.demo',
      dept: 'Plumbing',
      skills: ['plumbing', 'pipe_repair', 'washroom', 'sanitary'],
      workload: 0,
    },
  ];

  for (const sc of staffConfigs) {
    const userId = userIdMap[sc.email];
    const deptId = deptIdMap[sc.dept];
    if (!userId) {
      console.warn(`Missing user for staff ${sc.email}`);
      continue;
    }

    const { data: existingStaff } = await db.from('staff').select('id').eq('user_id', userId).maybeSingle();
    if (existingStaff) {
      staffIdMap[sc.email] = existingStaff.id;
    } else {
      const { data: createdStaff, error: staffErr } = await db
        .from('staff')
        .insert({
          user_id: userId,
          department_id: deptId ?? null,
          skills: sc.skills,
          availability: 'available',
          current_workload: sc.workload,
        })
        .select('id')
        .single();

      if (createdStaff) {
        staffIdMap[sc.email] = createdStaff.id;
      } else if (staffErr) {
        console.error(`Error inserting staff ${sc.email}:`, staffErr.message);
      }
    }
  }
  console.log('✓ Staff seeded:', Object.keys(staffIdMap).length);

  // 5. Seed Sample Issues (9 issues in various states)
  const studentId = userIdMap['student@campus.demo'];
  const facultyId = userIdMap['faculty@campus.demo'];

  const sampleIssues = [
    {
      title: 'Ceiling fan making loud grinding noise',
      description: 'The fan in Hostel B Room 204 oscillates erratically and produces high friction noise. Blade might be loose.',
      category: 'Electrical',
      subcategory: 'Fan',
      location_label: 'Hostel B - Room 204',
      severity: 'medium',
      priority: 'medium',
      status: 'in_progress',
      created_by: studentId,
      assigned_department: deptIdMap['Electrical'],
      assigned_staff: staffIdMap['staff@campus.demo'],
    },
    {
      title: 'Water tap leaking continuously in washroom',
      description: 'Tap 3 on the 1st floor washroom has a broken washer and is continuously flowing, wasting water.',
      category: 'Plumbing',
      subcategory: 'Tap Leakage',
      location_label: 'Hostel A - Common Room',
      severity: 'high',
      priority: 'high',
      status: 'assigned',
      created_by: studentId,
      assigned_department: deptIdMap['Plumbing'],
      assigned_staff: staffIdMap['staff3@campus.demo'],
    },
    {
      title: 'Wi-Fi access point down in CSE Lab 302',
      description: 'Students cannot connect to eduroam or CampusNet in Lab 302 during lab practical session.',
      category: 'IT/Network',
      subcategory: 'Wi-Fi',
      location_label: 'CSE Block - Lab 302',
      severity: 'high',
      priority: 'high',
      status: 'in_progress',
      created_by: facultyId,
      assigned_department: deptIdMap['IT/Network'],
      assigned_staff: staffIdMap['staff2@campus.demo'],
    },
    {
      title: 'Projector display flickering green in Seminar Hall',
      description: 'HDMI display output flickers intermittently during guest lecture presentations.',
      category: 'IT/Network',
      subcategory: 'Audio/Visual',
      location_label: 'ECE Block - Seminar Hall',
      severity: 'medium',
      priority: 'medium',
      status: 'reported',
      created_by: facultyId,
      assigned_department: deptIdMap['IT/Network'],
    },
    {
      title: 'Air conditioning not cooling in Reference Section',
      description: 'Central AC unit 2 blowing room temperature air. Ambient temperature is very warm.',
      category: 'Electrical',
      subcategory: 'AC',
      location_label: 'Library - Reference Section',
      severity: 'low',
      priority: 'low',
      status: 'reported',
      created_by: studentId,
      assigned_department: deptIdMap['Electrical'],
    },
    {
      title: 'Mic audio system failure in Auditorium',
      description: 'Handheld wireless microphone has static and battery failure during morning assembly.',
      category: 'IT/Network',
      subcategory: 'Audio',
      location_label: 'Main Building - Auditorium',
      severity: 'high',
      priority: 'high',
      status: 'resolved',
      created_by: facultyId,
      assigned_department: deptIdMap['IT/Network'],
      assigned_staff: staffIdMap['staff2@campus.demo'],
    },
    {
      title: 'Window latch broken allowing rain inside',
      description: 'Second window from left cannot be closed securely, rain enters during thunderstorms.',
      category: 'Hostel',
      subcategory: 'Carpentry',
      location_label: 'Hostel B - Room 204',
      severity: 'medium',
      priority: 'medium',
      status: 'verified',
      created_by: studentId,
      assigned_department: deptIdMap['Hostel'],
    },
    {
      title: 'Water cooler dispensing warm water',
      description: 'Water cooler refrigeration compressor seems tripped near the cafeteria entrance.',
      category: 'Electrical',
      subcategory: 'Water Cooler',
      location_label: 'Cafeteria - Main Dining',
      severity: 'medium',
      priority: 'medium',
      status: 'resolved',
      created_by: studentId,
      assigned_department: deptIdMap['Electrical'],
      assigned_staff: staffIdMap['staff@campus.demo'],
    },
    {
      title: 'Spill cleanup required near entrance ramp',
      description: 'Slippery juice spill on the floor near the registrar lobby needs prompt mopping.',
      category: 'Housekeeping',
      subcategory: 'Spill',
      location_label: 'Admin Building - Registrar Office',
      severity: 'high',
      priority: 'high',
      status: 'resolved',
      created_by: facultyId,
      assigned_department: deptIdMap['Housekeeping'],
    },
  ];

  for (const issue of sampleIssues) {
    const locId = locationIdMap[issue.location_label];
    const deptId = deptIdMap[issue.category];

    // Check if issue with title exists
    const { data: existing } = await db.from('issues').select('id').eq('title', issue.title).maybeSingle();

    if (!existing) {
      const { data: createdIssue, error } = await db
        .from('issues')
        .insert({
          ...issue,
          location_id: locId ?? null,
          assigned_department: deptId ?? issue.assigned_department ?? null,
          sla_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        })
        .select('id, status')
        .single();

      if (!error && createdIssue) {
        // Add initial status update
        await db.from('issue_updates').insert({
          issue_id: createdIssue.id,
          actor_id: issue.created_by,
          new_status: createdIssue.status,
          comment: 'Initial issue reported through CampusFlow',
        });
      }
    } else {
      // Update department and staff if missing
      await db.from('issues').update({
        assigned_department: deptId ?? issue.assigned_department ?? null,
        assigned_staff: issue.assigned_staff ?? null,
        location_id: locId ?? null,
      }).eq('id', existing.id);
    }
  }

  console.log('✓ 9 sample issues & status history seeded');
  console.log('🎉 Level 2 Database Foundation seeding complete!');
}

if (require.main === module) {
  seedAll()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal seed error:', err);
      process.exit(1);
    });
}
