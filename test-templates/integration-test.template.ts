/**
 * Integration Test Template
 * 集成测试模板
 * 
 * Usage: Copy this template for API and database integration tests
 * 使用方法：复制此模板用于 API 和数据库集成测试
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';
// import { setupTestDatabase, TestDatabase } from '../test-utils/database';
// import { createTestUser, createTestData } from '../test-utils/factories';

describe('[API Endpoint/Feature]', () => {
  let app: any; // Express app instance
  let db: any; // Test database instance
  let authToken: string;
  let testUser: any;

  // Setup test server and database
  beforeAll(async () => {
    // Initialize test database
    // db = await setupTestDatabase();
    
    // Create Express app with test configuration
    // app = createServer({ database: db });
    
    // Create test user for authenticated requests
    // testUser = await createTestUser(db, {
    //   email: 'test@example.com',
    //   password: 'password123'
    // });
    
    // Get auth token
    // const loginResponse = await request(app)
    //   .post('/api/auth/login')
    //   .send({ email: 'test@example.com', password: 'password123' });
    // authToken = loginResponse.body.data.token;
  });

  // Clean up after all tests
  afterAll(async () => {
    // await db.cleanup();
    // await app.close();
  });

  // Reset data between tests
  beforeEach(async () => {
    // await db.reset();
    // await createTestData(db);
  });

  describe('GET /api/[resource]', () => {
    it('should return list of resources', async () => {
      // const response = await request(app)
      //   .get('/api/resources')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(200);
      
      // expect(response.body).toMatchObject({
      //   success: true,
      //   data: expect.arrayContaining([
      //     expect.objectContaining({
      //       id: expect.any(Number),
      //       name: expect.any(String),
      //     })
      //   ])
      // });
    });

    it('should filter resources by query params', async () => {
      // const response = await request(app)
      //   .get('/api/resources')
      //   .query({ status: 'active', limit: 10 })
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(200);
      
      // expect(response.body.data).toHaveLength(10);
      // expect(response.body.data.every(r => r.status === 'active')).toBe(true);
    });

    it('should paginate results', async () => {
      // const response = await request(app)
      //   .get('/api/resources')
      //   .query({ page: 2, limit: 5 })
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(200);
      
      // expect(response.body.meta).toMatchObject({
      //   page: 2,
      //   limit: 5,
      //   total: expect.any(Number),
      //   hasMore: expect.any(Boolean)
      // });
    });

    it('should return 401 without authentication', async () => {
      // const response = await request(app)
      //   .get('/api/resources')
      //   .expect(401);
      
      // expect(response.body.error.code).toBe('AUTH_FAILED');
    });
  });

  describe('POST /api/[resource]', () => {
    it('should create new resource with valid data', async () => {
      // const newResource = {
      //   name: 'Test Resource',
      //   description: 'Test Description',
      //   value: 100
      // };
      
      // const response = await request(app)
      //   .post('/api/resources')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send(newResource)
      //   .expect(201);
      
      // expect(response.body.data).toMatchObject({
      //   id: expect.any(Number),
      //   ...newResource,
      //   createdAt: expect.any(String),
      //   updatedAt: expect.any(String)
      // });
      
      // Verify in database
      // const dbResource = await db.query('SELECT * FROM resources WHERE id = $1', [response.body.data.id]);
      // expect(dbResource.rows[0]).toBeDefined();
    });

    it('should validate required fields', async () => {
      // const response = await request(app)
      //   .post('/api/resources')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ description: 'Missing required name field' })
      //   .expect(400);
      
      // expect(response.body.error.code).toBe('VALIDATION_ERROR');
      // expect(response.body.error.details).toContainEqual(
      //   expect.objectContaining({
      //     field: 'name',
      //     message: expect.stringContaining('required')
      //   })
      // );
    });

    it('should handle duplicate entries', async () => {
      // Create first resource
      // await request(app)
      //   .post('/api/resources')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ name: 'Unique Name' })
      //   .expect(201);
      
      // Try to create duplicate
      // const response = await request(app)
      //   .post('/api/resources')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ name: 'Unique Name' })
      //   .expect(409);
      
      // expect(response.body.error.code).toBe('RESOURCE_CONFLICT');
    });
  });

  describe('PUT /api/[resource]/:id', () => {
    it('should update existing resource', async () => {
      // Create resource first
      // const createResponse = await request(app)
      //   .post('/api/resources')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ name: 'Original Name' });
      
      // const resourceId = createResponse.body.data.id;
      
      // Update resource
      // const updateResponse = await request(app)
      //   .put(`/api/resources/${resourceId}`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ name: 'Updated Name' })
      //   .expect(200);
      
      // expect(updateResponse.body.data.name).toBe('Updated Name');
      // expect(updateResponse.body.data.updatedAt).not.toBe(createResponse.body.data.updatedAt);
    });

    it('should return 404 for non-existent resource', async () => {
      // const response = await request(app)
      //   .put('/api/resources/99999')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ name: 'Updated Name' })
      //   .expect(404);
      
      // expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should validate ownership', async () => {
      // Create resource as different user
      // const otherUserResource = await createResourceAsUser(db, otherUser);
      
      // Try to update as current user
      // const response = await request(app)
      //   .put(`/api/resources/${otherUserResource.id}`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ name: 'Hacked!' })
      //   .expect(403);
      
      // expect(response.body.error.code).toBe('AUTH_NO_PERMISSION');
    });
  });

  describe('DELETE /api/[resource]/:id', () => {
    it('should delete existing resource', async () => {
      // Create resource
      // const createResponse = await request(app)
      //   .post('/api/resources')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ name: 'To Delete' });
      
      // const resourceId = createResponse.body.data.id;
      
      // Delete resource
      // await request(app)
      //   .delete(`/api/resources/${resourceId}`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(204);
      
      // Verify deletion
      // await request(app)
      //   .get(`/api/resources/${resourceId}`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(404);
    });

    it('should handle cascade deletion', async () => {
      // Create parent with children
      // const parent = await createParentWithChildren(db);
      
      // Delete parent
      // await request(app)
      //   .delete(`/api/parents/${parent.id}`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(204);
      
      // Verify children are also deleted
      // const children = await db.query('SELECT * FROM children WHERE parent_id = $1', [parent.id]);
      // expect(children.rows).toHaveLength(0);
    });
  });

  describe('Complex Workflows', () => {
    it('should handle complete user journey', async () => {
      // 1. Create goal
      // const goalResponse = await request(app)
      //   .post('/api/goals')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ title: 'Learn Testing', targetDate: '2024-12-31' });
      
      // 2. Create tasks for goal
      // const taskResponse = await request(app)
      //   .post('/api/tasks')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ 
      //     title: 'Write unit tests',
      //     goalId: goalResponse.body.data.id,
      //     xpReward: 50
      //   });
      
      // 3. Complete task
      // const completeResponse = await request(app)
      //   .post(`/api/tasks/${taskResponse.body.data.id}/complete`)
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(200);
      
      // 4. Verify XP was awarded
      // const userResponse = await request(app)
      //   .get('/api/users/me')
      //   .set('Authorization', `Bearer ${authToken}`);
      
      // expect(userResponse.body.data.totalXP).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database connection errors', async () => {
      // Simulate database error
      // await db.disconnect();
      
      // const response = await request(app)
      //   .get('/api/resources')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .expect(500);
      
      // expect(response.body.error.code).toBe('SYSTEM_ERROR');
      
      // Reconnect for other tests
      // await db.connect();
    });

    it('should handle transaction rollbacks', async () => {
      // Start transaction
      // const response = await request(app)
      //   .post('/api/complex-operation')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ 
      //     step1: 'valid',
      //     step2: 'will-fail'
      //   })
      //   .expect(400);
      
      // Verify no partial data was saved
      // const data = await db.query('SELECT * FROM affected_table');
      // expect(data.rows).toHaveLength(0);
    });
  });
});

/**
 * Test Utilities
 * 测试工具函数
 */

// Helper to create authenticated request
const authenticatedRequest = (app: any, method: string, url: string, token: string) => {
  return request(app)[method](url).set('Authorization', `Bearer ${token}`);
};

// Helper to wait for async operations
const waitForCondition = async (condition: () => boolean, timeout = 5000) => {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!condition()) {
    throw new Error('Condition not met within timeout');
  }
};

// Helper to test rate limiting
const testRateLimit = async (app: any, endpoint: string, limit: number) => {
  const requests = Array(limit + 1).fill(null).map(() => 
    request(app).get(endpoint)
  );
  
  const responses = await Promise.all(requests);
  const tooManyRequests = responses.filter(r => r.status === 429);
  
  expect(tooManyRequests.length).toBeGreaterThan(0);
};