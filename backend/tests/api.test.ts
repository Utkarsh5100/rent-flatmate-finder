import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { prisma } from '../src/lib/prisma.js';
import { generateAccessToken } from '../src/lib/jwt.js';
import bcrypt from 'bcrypt';

let ownerToken: string;
let tenantToken: string;
let ownerId: string;
let tenantId: string;
let listingId: string;

beforeAll(async () => {
  // Clean test data
  await prisma.listingPhoto.deleteMany();
  await prisma.compatibilityScore.deleteMany();
  await prisma.interestRequest.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.tenantProfile.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('Test1234', 10);

  const owner = await prisma.user.create({
    data: { email: 'owner-test@test.com', hashedPassword: hash, firstName: 'Test', lastName: 'Owner', role: 'OWNER' },
  });
  const tenant = await prisma.user.create({
    data: { email: 'tenant-test@test.com', hashedPassword: hash, firstName: 'Test', lastName: 'Tenant', role: 'TENANT' },
  });

  ownerId = owner.id;
  tenantId = tenant.id;
  ownerToken = generateAccessToken({ userId: owner.id, role: 'OWNER' });
  tenantToken = generateAccessToken({ userId: tenant.id, role: 'TENANT' });
});

afterAll(async () => {
  await prisma.listingPhoto.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.tenantProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Listing CRUD', () => {
  it('POST /api/listings — owner can create', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field('title', 'Test Room')
      .field('description', 'A nice test room for integration tests')
      .field('location', 'Mumbai')
      .field('rent', '15000')
      .field('availableFrom', '2025-08-01')
      .field('roomType', 'SINGLE')
      .field('furnishingStatus', 'FURNISHED')
      .field('amenities', '["wifi","parking"]')
      .field('rules', '["no-smoking"]')
      .expect(201);

    expect(res.body.status).toBe('success');
    expect(res.body.data.listing.title).toBe('Test Room');
    expect(res.body.data.listing.ownerId).toBe(ownerId);
    listingId = res.body.data.listing.id as string;
  });

  it('POST /api/listings — tenant cannot create', async () => {
    await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${tenantToken}`)
      .field('title', 'Hack')
      .field('description', 'Should not work at all')
      .field('location', 'Mumbai')
      .field('rent', '10000')
      .field('availableFrom', '2025-08-01')
      .field('roomType', 'SINGLE')
      .field('furnishingStatus', 'FURNISHED')
      .expect(403);
  });

  it('GET /api/listings/:id — get single listing', async () => {
    const res = await request(app).get(`/api/listings/${listingId}`).expect(200);
    expect(res.body.data.listing.id).toBe(listingId);
    expect(res.body.data.listing.owner.firstName).toBe('Test');
  });

  it('GET /api/listings/mine — owner sees own listings', async () => {
    const res = await request(app)
      .get('/api/listings/mine')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.data.listings.length).toBeGreaterThanOrEqual(1);
  });

  it('PUT /api/listings/:id — owner can update own listing', async () => {
    const res = await request(app)
      .put(`/api/listings/${listingId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .field('title', 'Updated Room')
      .field('rent', '18000')
      .expect(200);
    expect(res.body.data.listing.title).toBe('Updated Room');
    expect(res.body.data.listing.rent).toBe(18000);
  });

  it('PATCH /api/listings/:id/status — mark as FILLED', async () => {
    const res = await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'FILLED' })
      .expect(200);
    expect(res.body.data.listing.status).toBe('FILLED');
  });

  it('PATCH /api/listings/:id/status — mark back ACTIVE', async () => {
    await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
  });

  it('DELETE /api/listings/:id — owner can delete own listing', async () => {
    await request(app)
      .delete(`/api/listings/${listingId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    await request(app).get(`/api/listings/${listingId}`).expect(404);
  });
});

describe('Listing Browse + Filters + Pagination', () => {
  beforeEach(async () => {
    await prisma.listing.deleteMany();
  });

  async function seedListings() {
    const base = {
      ownerId,
      description: 'Test listing description here',
      availableFrom: new Date('2025-08-01'),
      furnishingStatus: 'FURNISHED' as const,
      amenities: ['wifi'],
      rules: [],
      maxOccupants: 1,
    };

    await prisma.listing.createMany({
      data: [
        { ...base, title: 'Mumbai Single', location: 'Mumbai', rent: 10000, roomType: 'SINGLE', status: 'ACTIVE' },
        { ...base, title: 'Mumbai Double', location: 'Mumbai', rent: 20000, roomType: 'DOUBLE', status: 'ACTIVE' },
        { ...base, title: 'Delhi Studio', location: 'Delhi', rent: 15000, roomType: 'STUDIO', status: 'ACTIVE' },
        { ...base, title: 'Bangalore Apt', location: 'Bangalore', rent: 25000, roomType: 'APARTMENT', status: 'ACTIVE' },
        { ...base, title: 'Mumbai Filled', location: 'Mumbai', rent: 12000, roomType: 'SINGLE', status: 'FILLED' },
      ],
    });
  }

  it('returns only ACTIVE listings by default', async () => {
    await seedListings();
    const res = await request(app).get('/api/listings').expect(200);
    expect(res.body.data.listings.length).toBe(4);
    expect(res.body.data.listings.every((l: { status: string }) => l.status === 'ACTIVE')).toBe(true);
  });

  it('includes FILLED when includeFilled=true', async () => {
    await seedListings();
    const res = await request(app).get('/api/listings?includeFilled=true').expect(200);
    expect(res.body.data.listings.length).toBe(5);
  });

  it('filters by location (case insensitive)', async () => {
    await seedListings();
    const res = await request(app).get('/api/listings?location=mumbai').expect(200);
    expect(res.body.data.listings.length).toBe(2); // excludes FILLED
    expect(res.body.data.listings.every((l: { location: string }) => l.location === 'Mumbai')).toBe(true);
  });

  it('filters by rent range', async () => {
    await seedListings();
    const res = await request(app).get('/api/listings?minRent=12000&maxRent=20000').expect(200);
    const rents = res.body.data.listings.map((l: { rent: number }) => l.rent) as number[];
    expect(rents.every((r: number) => r >= 12000 && r <= 20000)).toBe(true);
  });

  it('filters by roomType', async () => {
    await seedListings();
    const res = await request(app).get('/api/listings?roomType=STUDIO').expect(200);
    expect(res.body.data.listings.length).toBe(1);
    expect(res.body.data.listings[0].title).toBe('Delhi Studio');
  });

  it('pagination works', async () => {
    await seedListings();
    const res = await request(app).get('/api/listings?limit=2&page=1').expect(200);
    expect(res.body.data.listings.length).toBe(2);
    expect(res.body.data.pagination.total).toBe(4);
    expect(res.body.data.pagination.totalPages).toBe(2);

    const page2 = await request(app).get('/api/listings?limit=2&page=2').expect(200);
    expect(page2.body.data.listings.length).toBe(2);
  });
});

describe('Tenant Profile', () => {
  it('POST /api/profile — tenant can create profile', async () => {
    const res = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        preferredLocation: 'Mumbai',
        budgetMin: 8000,
        budgetMax: 20000,
        moveInDate: '2025-08-01',
        occupation: 'Engineer',
        lifestyle: 'non-smoker',
        bio: 'Looking for a quiet place',
      })
      .expect(200);
    expect(res.body.data.profile.preferredLocation).toBe('Mumbai');
  });

  it('POST /api/profile — owner cannot create profile', async () => {
    await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ preferredLocation: 'X', budgetMin: 0, budgetMax: 1000, moveInDate: '2025-08-01' })
      .expect(403);
  });

  it('GET /api/profile — tenant can read profile', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);
    expect(res.body.data.profile.userId).toBe(tenantId);
  });
});
