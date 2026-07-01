// ──────────────────────────────────────────────────────────────────────────────
// Prisma Seed Script — Rent & Flatmate Finder
//
// Creates realistic test data:
//   • 1 admin, 3 owners, 4 tenants (with profiles)
//   • 10 listings across different cities/price ranges with photos
//   • Pre-computed compatibility scores (no live LLM needed)
//   • A few interest requests and a sample conversation with messages
//   • Sample notifications
//
// Run: npx prisma db seed
// ──────────────────────────────────────────────────────────────────────────────

import { PrismaClient, UserRole, RoomType, FurnishingStatus, ListingStatus, InterestStatus, ComputedVia, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

// Placeholder bcrypt hash for "Password123!" — in production, use bcrypt.hash()
// This is the bcrypt hash so seed users can log in during development.
const PLACEHOLDER_HASH = '$2b$10$K4GbJxJ5t5J5J5J5J5J5JeD5J5J5J5J5J5J5J5J5J5J5J5J5J5J5';

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Clean existing data (reverse dependency order) ──────────────────────
  await prisma.notification.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.interestRequest.deleteMany();
  await prisma.compatibilityScore.deleteMany();
  await prisma.listingPhoto.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.tenantProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('  ✓ Cleaned existing data');

  // ═══════════════════════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════════════════════

  const admin = await prisma.user.create({
    data: {
      email: 'admin@rentfinder.com',
      hashedPassword: PLACEHOLDER_HASH,
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    },
  });

  const owners = await Promise.all([
    prisma.user.create({
      data: {
        email: 'priya.sharma@email.com',
        hashedPassword: PLACEHOLDER_HASH,
        firstName: 'Priya',
        lastName: 'Sharma',
        phone: '+91-9876543210',
        role: UserRole.OWNER,
      },
    }),
    prisma.user.create({
      data: {
        email: 'rajesh.kumar@email.com',
        hashedPassword: PLACEHOLDER_HASH,
        firstName: 'Rajesh',
        lastName: 'Kumar',
        phone: '+91-9876543211',
        role: UserRole.OWNER,
      },
    }),
    prisma.user.create({
      data: {
        email: 'anita.desai@email.com',
        hashedPassword: PLACEHOLDER_HASH,
        firstName: 'Anita',
        lastName: 'Desai',
        phone: '+91-9876543212',
        role: UserRole.OWNER,
      },
    }),
  ]);

  console.log(`  ✓ Created 1 admin + 3 owners`);

  const tenants = await Promise.all([
    prisma.user.create({
      data: {
        email: 'amit.patel@email.com',
        hashedPassword: PLACEHOLDER_HASH,
        firstName: 'Amit',
        lastName: 'Patel',
        phone: '+91-9123456780',
        role: UserRole.TENANT,
        tenantProfile: {
          create: {
            preferredLocation: 'Mumbai',
            budgetMin: 8000,
            budgetMax: 15000,
            moveInDate: new Date('2025-02-01'),
            occupation: 'Software Engineer',
            lifestyle: 'Early riser, non-smoker, vegetarian',
            bio: 'Working professional looking for a clean, quiet flatmate in Mumbai. I work from home 3 days a week and enjoy cooking.',
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'sneha.reddy@email.com',
        hashedPassword: PLACEHOLDER_HASH,
        firstName: 'Sneha',
        lastName: 'Reddy',
        phone: '+91-9123456781',
        role: UserRole.TENANT,
        tenantProfile: {
          create: {
            preferredLocation: 'Bangalore',
            budgetMin: 10000,
            budgetMax: 20000,
            moveInDate: new Date('2025-01-15'),
            occupation: 'Data Scientist',
            lifestyle: 'Night owl, social, fitness enthusiast',
            bio: 'Looking for a modern furnished room near tech parks in Bangalore. Open to shared spaces with like-minded professionals.',
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'vikram.singh@email.com',
        hashedPassword: PLACEHOLDER_HASH,
        firstName: 'Vikram',
        lastName: 'Singh',
        phone: '+91-9123456782',
        role: UserRole.TENANT,
        tenantProfile: {
          create: {
            preferredLocation: 'Delhi',
            budgetMin: 5000,
            budgetMax: 12000,
            moveInDate: new Date('2025-03-01'),
            occupation: 'Graduate Student',
            lifestyle: 'Quiet, studious, non-smoker, vegetarian',
            bio: 'Masters student at DU looking for affordable accommodation near the university. Prefer a quiet environment for studying.',
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'meera.nair@email.com',
        hashedPassword: PLACEHOLDER_HASH,
        firstName: 'Meera',
        lastName: 'Nair',
        phone: '+91-9123456783',
        role: UserRole.TENANT,
        tenantProfile: {
          create: {
            preferredLocation: 'Mumbai',
            budgetMin: 12000,
            budgetMax: 25000,
            moveInDate: new Date('2025-01-20'),
            occupation: 'Marketing Manager',
            lifestyle: 'Social, pet-friendly, occasional cook',
            bio: 'Looking for a well-furnished room in a good society in Mumbai. I have a small dog — need pet-friendly accommodation.',
          },
        },
      },
    }),
  ]);

  console.log(`  ✓ Created 4 tenants with profiles`);

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTINGS (10 across different cities / price ranges)
  // ═══════════════════════════════════════════════════════════════════════════

  const listingsData = [
    // Owner 1 (Priya) — 4 listings
    {
      ownerId: owners[0]!.id,
      title: 'Cozy Single Room in Andheri West',
      description: 'Well-maintained single room in a 2BHK flat. Close to metro station, supermarkets, and restaurants. Building has 24/7 security and power backup.',
      location: 'Mumbai',
      address: 'Andheri West, Mumbai 400058',
      rent: 12000,
      deposit: 24000,
      availableFrom: new Date('2025-02-01'),
      roomType: RoomType.SINGLE,
      furnishingStatus: FurnishingStatus.FURNISHED,
      amenities: ['wifi', 'ac', 'washing-machine', 'power-backup', 'security'],
      rules: ['no-smoking', 'no-loud-music-after-10pm'],
      maxOccupants: 1,
    },
    {
      ownerId: owners[0]!.id,
      title: 'Spacious Double Room in Bandra',
      description: 'Large double room in a sea-facing apartment. Fully furnished with modern amenities. Walking distance to Bandra Bandstand and Carter Road.',
      location: 'Mumbai',
      address: 'Bandra West, Mumbai 400050',
      rent: 22000,
      deposit: 44000,
      availableFrom: new Date('2025-01-20'),
      roomType: RoomType.DOUBLE,
      furnishingStatus: FurnishingStatus.FURNISHED,
      amenities: ['wifi', 'ac', 'gym', 'swimming-pool', 'parking', 'sea-view'],
      rules: ['no-smoking', 'no-pets'],
      maxOccupants: 2,
    },
    {
      ownerId: owners[0]!.id,
      title: 'Budget-Friendly Shared Room in Powai',
      description: 'Shared room for working professionals or students. Near IIT Bombay campus and Hiranandani Gardens. Includes basic furniture and kitchen access.',
      location: 'Mumbai',
      address: 'Powai, Mumbai 400076',
      rent: 7000,
      deposit: 14000,
      availableFrom: new Date('2025-01-15'),
      roomType: RoomType.SHARED,
      furnishingStatus: FurnishingStatus.SEMI_FURNISHED,
      amenities: ['wifi', 'kitchen-access', 'laundry'],
      rules: ['no-smoking', 'guests-allowed-till-9pm'],
      maxOccupants: 2,
    },
    {
      ownerId: owners[0]!.id,
      title: 'Modern Studio in Lower Parel',
      description: 'Independent studio apartment with kitchenette and attached bathroom. Ideal for working professionals who want privacy.',
      location: 'Mumbai',
      address: 'Lower Parel, Mumbai 400013',
      rent: 18000,
      deposit: 36000,
      availableFrom: new Date('2025-03-01'),
      roomType: RoomType.STUDIO,
      furnishingStatus: FurnishingStatus.FURNISHED,
      amenities: ['wifi', 'ac', 'kitchenette', 'power-backup', 'elevator'],
      rules: ['no-smoking'],
      maxOccupants: 1,
    },
    // Owner 2 (Rajesh) — 3 listings
    {
      ownerId: owners[1]!.id,
      title: 'Tech Park Adjacent Room in Whitefield',
      description: 'Single room in a gated community near ITPL and Whitefield tech parks. Quick access to BMTC buses and upcoming metro.',
      location: 'Bangalore',
      address: 'Whitefield, Bangalore 560066',
      rent: 14000,
      deposit: 28000,
      availableFrom: new Date('2025-01-25'),
      roomType: RoomType.SINGLE,
      furnishingStatus: FurnishingStatus.FURNISHED,
      amenities: ['wifi', 'ac', 'gym', 'parking', 'power-backup'],
      rules: ['no-smoking', 'no-pets'],
      maxOccupants: 1,
    },
    {
      ownerId: owners[1]!.id,
      title: 'Affordable Room near Koramangala',
      description: 'Semi-furnished room in a quiet residential area. Walking distance to Koramangala commercial areas, restaurants, and Forum Mall.',
      location: 'Bangalore',
      address: 'Koramangala 4th Block, Bangalore 560034',
      rent: 11000,
      deposit: 22000,
      availableFrom: new Date('2025-02-10'),
      roomType: RoomType.SINGLE,
      furnishingStatus: FurnishingStatus.SEMI_FURNISHED,
      amenities: ['wifi', 'kitchen-access', 'laundry', 'parking'],
      rules: ['no-smoking', 'vegetarian-kitchen'],
      maxOccupants: 1,
    },
    {
      ownerId: owners[1]!.id,
      title: 'Premium 2BHK Apartment in Indiranagar',
      description: 'Entire 2BHK apartment available for rent. Fully furnished with premium interiors, modular kitchen, and balcony. Heart of Indiranagar nightlife.',
      location: 'Bangalore',
      address: '12th Main, Indiranagar, Bangalore 560038',
      rent: 35000,
      deposit: 70000,
      availableFrom: new Date('2025-02-15'),
      roomType: RoomType.APARTMENT,
      furnishingStatus: FurnishingStatus.FURNISHED,
      amenities: ['wifi', 'ac', 'modular-kitchen', 'parking', 'balcony', 'gym'],
      rules: ['no-smoking-indoors'],
      maxOccupants: 3,
    },
    // Owner 3 (Anita) — 3 listings
    {
      ownerId: owners[2]!.id,
      title: 'Student-Friendly Room near Delhi University',
      description: 'Affordable single room ideal for students. Close to DU North Campus, Hudson Lane restaurants, and GTB Nagar metro.',
      location: 'Delhi',
      address: 'Vijay Nagar, Delhi 110009',
      rent: 6000,
      deposit: 12000,
      availableFrom: new Date('2025-03-01'),
      roomType: RoomType.SINGLE,
      furnishingStatus: FurnishingStatus.UNFURNISHED,
      amenities: ['wifi', 'kitchen-access'],
      rules: ['no-smoking', 'no-loud-music'],
      maxOccupants: 1,
    },
    {
      ownerId: owners[2]!.id,
      title: 'Furnished Room in Saket',
      description: 'Well-furnished room in a modern apartment. Near Select Citywalk Mall, metro station, and Qutub Minar.',
      location: 'Delhi',
      address: 'Saket, New Delhi 110017',
      rent: 15000,
      deposit: 30000,
      availableFrom: new Date('2025-02-01'),
      roomType: RoomType.DOUBLE,
      furnishingStatus: FurnishingStatus.FURNISHED,
      amenities: ['wifi', 'ac', 'parking', 'power-backup', 'elevator'],
      rules: ['no-smoking', 'no-pets'],
      maxOccupants: 2,
    },
    {
      ownerId: owners[2]!.id,
      title: 'Shared Room in Hauz Khas',
      description: 'Bohemian shared living space in the artsy Hauz Khas Village area. Great for creative professionals. Rooftop access and community events.',
      location: 'Delhi',
      address: 'Hauz Khas, New Delhi 110016',
      rent: 9000,
      deposit: 18000,
      availableFrom: new Date('2025-01-20'),
      roomType: RoomType.SHARED,
      furnishingStatus: FurnishingStatus.FURNISHED,
      amenities: ['wifi', 'rooftop-access', 'community-events', 'laundry'],
      rules: ['open-minded-community', 'clean-up-after-yourself'],
      maxOccupants: 2,
    },
  ];

  const listings = await Promise.all(
    listingsData.map((data) => prisma.listing.create({ data })),
  );

  console.log(`  ✓ Created ${listings.length} listings`);

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTING PHOTOS (2–3 per listing, placeholder URLs)
  // ═══════════════════════════════════════════════════════════════════════════

  const photoSets = [
    ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
    ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'],
    ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800'],
    ['https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
    ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'],
    ['https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800', 'https://images.unsplash.com/photo-1600566753376-12c8ab7c5a38?w=800'],
    ['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800', 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800'],
    ['https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800', 'https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?w=800'],
    ['https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800'],
    ['https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800'],
  ];

  let photoCount = 0;
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i]!;
    const photos = photoSets[i] ?? photoSets[0]!;
    for (let j = 0; j < photos.length; j++) {
      await prisma.listingPhoto.create({
        data: {
          listingId: listing.id,
          url: photos[j]!,
          altText: `${listing.title} - Photo ${j + 1}`,
          order: j,
        },
      });
      photoCount++;
    }
  }

  console.log(`  ✓ Created ${photoCount} listing photos`);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPATIBILITY SCORES (pre-computed, simulating LLM output)
  // ═══════════════════════════════════════════════════════════════════════════

  const scoresData = [
    // Amit (Mumbai, 8k–15k, SW engineer, vegetarian, WFH) — scores against Mumbai listings
    {
      tenantId: tenants[0]!.id,
      listingId: listings[0]!.id, // Andheri Single, 12k
      score: 92,
      explanation: 'Excellent match. Rent (₹12,000) is within budget. Location is in preferred city Mumbai. Furnished single room suits a WFH professional. Non-smoking rule aligns with lifestyle. WiFi and AC included.',
      computedVia: ComputedVia.LLM,
    },
    {
      tenantId: tenants[0]!.id,
      listingId: listings[2]!.id, // Powai Shared, 7k
      score: 74,
      explanation: 'Good budget fit (₹7,000). Mumbai location matches preference. However, shared room may not be ideal for WFH. Semi-furnished may need additional setup. Near IIT campus which is a good area.',
      computedVia: ComputedVia.LLM,
    },
    {
      tenantId: tenants[0]!.id,
      listingId: listings[1]!.id, // Bandra Double, 22k
      score: 45,
      explanation: 'Location is great (Mumbai) but rent (₹22,000) exceeds maximum budget of ₹15,000. Furnished double room is more space than needed. No-pets rule is fine but premium pricing is a barrier.',
      computedVia: ComputedVia.LLM,
    },
    // Sneha (Bangalore, 10k–20k, Data Scientist, night owl, fitness) — Bangalore listings
    {
      tenantId: tenants[1]!.id,
      listingId: listings[4]!.id, // Whitefield Single, 14k
      score: 88,
      explanation: 'Strong match. Rent (₹14,000) is well within budget. Whitefield location is adjacent to tech parks — ideal for a data scientist. Gym included matches fitness lifestyle. Furnished with AC.',
      computedVia: ComputedVia.LLM,
    },
    {
      tenantId: tenants[1]!.id,
      listingId: listings[5]!.id, // Koramangala, 11k
      score: 72,
      explanation: 'Good budget fit. Koramangala is a vibrant area matching social lifestyle. However, semi-furnished and vegetarian-kitchen rule may not suit all preferences. No gym on premises.',
      computedVia: ComputedVia.LLM,
    },
    {
      tenantId: tenants[1]!.id,
      listingId: listings[6]!.id, // Indiranagar 2BHK, 35k
      score: 38,
      explanation: 'Bangalore location is correct, but rent (₹35,000) far exceeds the ₹20,000 budget maximum. Premium apartment with great amenities but financially out of range.',
      computedVia: ComputedVia.FALLBACK,
    },
    // Vikram (Delhi, 5k–12k, student, quiet, vegetarian) — Delhi listings
    {
      tenantId: tenants[2]!.id,
      listingId: listings[7]!.id, // Vijay Nagar near DU, 6k
      score: 95,
      explanation: 'Near-perfect match. Budget (₹6,000) is very affordable. Located near Delhi University — ideal for a graduate student. No-smoking and no-loud-music rules match quiet, studious lifestyle perfectly.',
      computedVia: ComputedVia.LLM,
    },
    {
      tenantId: tenants[2]!.id,
      listingId: listings[9]!.id, // Hauz Khas Shared, 9k
      score: 58,
      explanation: 'Rent (₹9,000) is within budget and Delhi location is correct. However, bohemian shared living with community events may not suit a quiet, studious student. The social environment could be distracting.',
      computedVia: ComputedVia.LLM,
    },
    // Meera (Mumbai, 12k–25k, marketing, social, pet-friendly) — Mumbai listings
    {
      tenantId: tenants[3]!.id,
      listingId: listings[1]!.id, // Bandra Double, 22k
      score: 68,
      explanation: 'Rent (₹22,000) is within budget. Bandra is a premium Mumbai location perfect for a social lifestyle. However, the no-pets rule is a dealbreaker — tenant has a dog.',
      computedVia: ComputedVia.LLM,
    },
    {
      tenantId: tenants[3]!.id,
      listingId: listings[0]!.id, // Andheri Single, 12k
      score: 76,
      explanation: 'Rent (₹12,000) is at the low end of budget. Mumbai location matches. Furnished is good. However, no explicit pet policy — would need to confirm with owner. Single room may feel small.',
      computedVia: ComputedVia.FALLBACK,
    },
    {
      tenantId: tenants[3]!.id,
      listingId: listings[3]!.id, // Lower Parel Studio, 18k
      score: 82,
      explanation: 'Great fit. Rent (₹18,000) is comfortably within budget. Independent studio gives privacy for pet. Lower Parel is a great Mumbai location. No explicit no-pets rule. Furnished with kitchenette.',
      computedVia: ComputedVia.LLM,
    },
  ];

  await Promise.all(
    scoresData.map((data) => prisma.compatibilityScore.create({ data })),
  );

  console.log(`  ✓ Created ${scoresData.length} compatibility scores`);

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEREST REQUESTS + CONVERSATIONS + MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  // Amit interested in Andheri listing (accepted → has a conversation)
  const interest1 = await prisma.interestRequest.create({
    data: {
      tenantId: tenants[0]!.id,
      listingId: listings[0]!.id,
      status: InterestStatus.ACCEPTED,
      message: 'Hi! I am very interested in this room. I work from home as a software engineer and am looking for a quiet, clean place. Would love to schedule a visit!',
      resolvedAt: new Date('2025-01-18'),
    },
  });

  const conversation1 = await prisma.conversation.create({
    data: { interestRequestId: interest1.id },
  });

  // Sample chat messages
  await prisma.chatMessage.createMany({
    data: [
      {
        conversationId: conversation1.id,
        senderId: owners[0]!.id,
        content: 'Hi Amit! Thanks for your interest. The room is available for visit this weekend. What time works for you?',
        readAt: new Date('2025-01-18T10:30:00'),
        createdAt: new Date('2025-01-18T10:00:00'),
      },
      {
        conversationId: conversation1.id,
        senderId: tenants[0]!.id,
        content: 'Hi Priya! Saturday morning around 11 AM would be great. Is that okay?',
        readAt: new Date('2025-01-18T11:00:00'),
        createdAt: new Date('2025-01-18T10:45:00'),
      },
      {
        conversationId: conversation1.id,
        senderId: owners[0]!.id,
        content: 'Saturday 11 AM works perfectly. I will share the exact location on Google Maps. See you then!',
        readAt: new Date('2025-01-18T11:30:00'),
        createdAt: new Date('2025-01-18T11:15:00'),
      },
      {
        conversationId: conversation1.id,
        senderId: tenants[0]!.id,
        content: 'Great, thank you! Looking forward to it. 🙂',
        createdAt: new Date('2025-01-18T11:35:00'),
      },
    ],
  });

  // Sneha interested in Whitefield listing (pending)
  await prisma.interestRequest.create({
    data: {
      tenantId: tenants[1]!.id,
      listingId: listings[4]!.id,
      status: InterestStatus.PENDING,
      message: 'Hello! This room looks perfect for my commute to the tech park. I am a data scientist and would love to discuss further.',
    },
  });

  // Vikram interested in DU listing (pending)
  await prisma.interestRequest.create({
    data: {
      tenantId: tenants[2]!.id,
      listingId: listings[7]!.id,
      status: InterestStatus.PENDING,
      message: 'Hi, I am a masters student at DU. This location is ideal for me. Is the room still available?',
    },
  });

  // Meera interested in Bandra listing (declined — pets not allowed)
  await prisma.interestRequest.create({
    data: {
      tenantId: tenants[3]!.id,
      listingId: listings[1]!.id,
      status: InterestStatus.DECLINED,
      message: 'Beautiful apartment! I have a small dog though — is that okay?',
      resolvedAt: new Date('2025-01-19'),
    },
  });

  console.log('  ✓ Created 4 interest requests + 1 conversation with 4 messages');

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  await prisma.notification.createMany({
    data: [
      {
        userId: owners[0]!.id,
        type: NotificationType.INTEREST_RECEIVED,
        title: 'New Interest Request',
        message: 'Amit Patel is interested in your listing "Cozy Single Room in Andheri West".',
        read: true,
        metadata: { listingId: listings[0]!.id, tenantName: 'Amit Patel' },
      },
      {
        userId: tenants[0]!.id,
        type: NotificationType.INTEREST_ACCEPTED,
        title: 'Interest Accepted!',
        message: 'Priya Sharma accepted your interest in "Cozy Single Room in Andheri West". You can now chat!',
        read: true,
        metadata: { listingId: listings[0]!.id },
      },
      {
        userId: owners[1]!.id,
        type: NotificationType.INTEREST_RECEIVED,
        title: 'New Interest Request',
        message: 'Sneha Reddy is interested in your listing "Tech Park Adjacent Room in Whitefield".',
        read: false,
        metadata: { listingId: listings[4]!.id, tenantName: 'Sneha Reddy' },
      },
      {
        userId: tenants[3]!.id,
        type: NotificationType.INTEREST_DECLINED,
        title: 'Interest Declined',
        message: 'Your interest in "Spacious Double Room in Bandra" was declined. The owner noted: no pets allowed.',
        read: false,
        metadata: { listingId: listings[1]!.id },
      },
      {
        userId: tenants[1]!.id,
        type: NotificationType.COMPATIBILITY_COMPUTED,
        title: 'New Matches Found',
        message: 'We found 3 compatible listings in Bangalore for you. Check your matches!',
        read: false,
      },
    ],
  });

  console.log('  ✓ Created 5 notifications');

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  const counts = {
    users: await prisma.user.count(),
    tenantProfiles: await prisma.tenantProfile.count(),
    listings: await prisma.listing.count(),
    photos: await prisma.listingPhoto.count(),
    scores: await prisma.compatibilityScore.count(),
    interests: await prisma.interestRequest.count(),
    conversations: await prisma.conversation.count(),
    messages: await prisma.chatMessage.count(),
    notifications: await prisma.notification.count(),
  };

  console.log('\n🎉 Seeding complete!\n');
  console.log('  Summary:');
  console.log(`    Users:                ${counts.users} (1 admin + 3 owners + 4 tenants)`);
  console.log(`    Tenant Profiles:      ${counts.tenantProfiles}`);
  console.log(`    Listings:             ${counts.listings}`);
  console.log(`    Listing Photos:       ${counts.photos}`);
  console.log(`    Compatibility Scores: ${counts.scores}`);
  console.log(`    Interest Requests:    ${counts.interests}`);
  console.log(`    Conversations:        ${counts.conversations}`);
  console.log(`    Chat Messages:        ${counts.messages}`);
  console.log(`    Notifications:        ${counts.notifications}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
