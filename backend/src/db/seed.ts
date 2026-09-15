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
    name: 'Rahul Sharma',
    role: 'student',
    student_id: 'CS2024001',
    phone: '+91 98765 43210',
  },
  {
    email: 'faculty@campus.demo',
    password: 'Demo1234!',
    name: 'Prof. Anita Roy',
    role: 'faculty',
    phone: '+91 98765 43211',
  },
  {
    email: 'staff@campus.demo',
    password: 'Demo1234!',
    name: 'Suresh Kumar',
    role: 'staff',
    phone: '+91 98765 43212',
  },
  {
    email: 'admin@campus.demo',
    password: 'Demo1234!',
    name: 'Admin User',
    role: 'admin',
    phone: '+91 98765 43213',
  },
  {
    email: 'depthead@campus.demo',
    password: 'Demo1234!',
    name: 'Priya Singh',
    role: 'grievance_authority',
    phone: '+91 98765 43214',
  },
];

export async function seedAuthUsers() {
  console.log('🌱 Seeding demo accounts into Supabase Auth & public.users...');

  // Get existing auth users
  const { data: userList, error: listError } = await db.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Failed to list existing users:', listError.message);
    throw listError;
  }

  const existingAuthMap = new Map<string, string>();
  userList.users.forEach((u) => {
    if (u.email) {
      existingAuthMap.set(u.email.toLowerCase(), u.id);
    }
  });

  for (const demoUser of DEMO_USERS) {
    let authUserId = existingAuthMap.get(demoUser.email.toLowerCase());

    if (!authUserId) {
      console.log(`Creating Auth user: ${demoUser.email}...`);
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: demoUser.email,
        password: demoUser.password,
        email_confirm: true,
        user_metadata: {
          name: demoUser.name,
          role: demoUser.role,
        },
      });

      if (createError) {
        console.error(`❌ Failed to create ${demoUser.email}:`, createError.message);
        continue;
      }
      authUserId = created.user.id;
      console.log(`  ✓ Auth user created with ID: ${authUserId}`);
    } else {
      console.log(`  ℹ Auth user already exists: ${demoUser.email} (${authUserId})`);
      // Update password just in case
      await db.auth.admin.updateUserById(authUserId, {
        password: demoUser.password,
        email_confirm: true,
        user_metadata: {
          name: demoUser.name,
          role: demoUser.role,
        },
      });
    }

    // Upsert into public.users
    const { error: upsertError } = await db.from('users').upsert(
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

    if (upsertError) {
      console.error(`❌ Failed to upsert public.users for ${demoUser.email}:`, upsertError.message);
    } else {
      console.log(`  ✓ Synced to public.users (${demoUser.role})`);
    }
  }

  console.log('✅ Auth and demo user seeding completed successfully!');
}

if (require.main === module) {
  seedAuthUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal seed error:', err);
      process.exit(1);
    });
}
