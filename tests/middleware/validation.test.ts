import { withValidation } from '../../frontend/nextjs/middleware/validation';
import { z } from 'zod';
import { NextRequest } from 'next/server';

describe('Validation Middleware', () => {
    // Test schema
    const TestSchema = z.object({
        email: z.string().email(),
        age: z.number().min(18)
    });

    // Mock NextRequest
    const createMockRequest = (body: any, query: any = {}, headers: any = {}) => {
        const req = {
            json: jest.fn().mockResolvedValue(body),
            url: `http://test.com?${new URLSearchParams(query).toString()}`,
            headers: new Headers(headers)
        } as unknown as NextRequest;
        return req;
    };

    it('should validate valid request body', async () => {
        const handler = withValidation({
            body: TestSchema
        })(async (req, data) => {
            expect(data.body).toEqual({
                email: 'test@example.com',
                age: 20
            });
            return new Response(JSON.stringify(data.body));
        });

        const req = createMockRequest({
            email: 'test@example.com',
            age: 20
        });

        await handler(req);
    });

    it('should reject invalid request body', async () => {
        const handler = withValidation({
            body: TestSchema
        })(async (req, data) => {
            return new Response(JSON.stringify(data.body));
        });

        const req = createMockRequest({
            email: 'invalid-email',
            age: 15
        });

        const response = await handler(req);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Validation Error');
        expect(result.details).toHaveLength(2);
    });

    it('should validate query parameters', async () => {
        const QuerySchema = z.object({
            id: z.string().uuid()
        });

        const handler = withValidation({
            query: QuerySchema
        })(async (req, data) => {
            expect(data.query.id).toBe('123e4567-e89b-12d3-a456-426614174000');
            return new Response(JSON.stringify(data.query));
        });

        const req = createMockRequest(
            {},
            { id: '123e4567-e89b-12d3-a456-426614174000' }
        );

        await handler(req);
    });

    it('should validate headers', async () => {
        const HeaderSchema = z.object({
            'x-api-key': z.string().min(10)
        });

        const handler = withValidation({
            headers: HeaderSchema
        })(async (req, data) => {
            expect(data.headers['x-api-key']).toBe('valid-api-key-12345');
            return new Response(JSON.stringify(data.headers));
        });

        const req = createMockRequest(
            {},
            {},
            { 'x-api-key': 'valid-api-key-12345' }
        );

        await handler(req);
    });

    it('should handle multiple validation types', async () => {
        const handler = withValidation({
            body: TestSchema,
            query: z.object({ id: z.string() }),
            headers: z.object({ 'x-api-key': z.string() })
        })(async (req, data) => {
            expect(data.body).toEqual({
                email: 'test@example.com',
                age: 20
            });
            expect(data.query.id).toBe('123');
            expect(data.headers['x-api-key']).toBe('test-key');
            return new Response(JSON.stringify(data));
        });

        const req = createMockRequest(
            { email: 'test@example.com', age: 20 },
            { id: '123' },
            { 'x-api-key': 'test-key' }
        );

        await handler(req);
    });

    it('should handle internal errors gracefully', async () => {
        const handler = withValidation({
            body: TestSchema
        })(async () => {
            throw new Error('Internal error');
        });

        const req = createMockRequest({
            email: 'test@example.com',
            age: 20
        });

        const response = await handler(req);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Internal Server Error');
    });
}); 