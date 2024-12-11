import { z } from 'zod';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * @purpose: Type-safe middleware factory for Zod validation
 * @example:
 *   const handler = withValidation({
 *     body: UserProfileSchema,
 *     query: z.object({ id: z.string() })
 *   })(async (req, data) => {
 *     // data is fully typed and validated
 *     console.log(data.body.email);
 *     return NextResponse.json(data);
 *   });
 */
export function withValidation<
    B extends z.ZodType,
    Q extends z.ZodType = z.ZodType<any>,
    H extends z.ZodType = z.ZodType<any>
>(schemas: {
    body?: B;
    query?: Q;
    headers?: H;
}) {
    return function(
        handler: (
            req: NextRequest,
            data: {
                body: B extends z.ZodType ? z.infer<B> : never;
                query: Q extends z.ZodType ? z.infer<Q> : never;
                headers: H extends z.ZodType ? z.infer<H> : never;
            }
        ) => Promise<NextResponse> | NextResponse
    ) {
        return async function(req: NextRequest) {
            try {
                // Validate request body if schema provided
                const body = schemas.body
                    ? schemas.body.parse(await req.json())
                    : undefined;

                // Validate URL search params if query schema provided
                const query = schemas.query
                    ? schemas.query.parse(Object.fromEntries(new URL(req.url).searchParams))
                    : undefined;

                // Validate headers if schema provided
                const headers = schemas.headers
                    ? schemas.headers.parse(Object.fromEntries(req.headers))
                    : undefined;

                // Call handler with validated data
                return handler(req, { body, query, headers } as any);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    return NextResponse.json(
                        {
                            error: 'Validation Error',
                            details: error.errors.map(e => ({
                                path: e.path.join('.'),
                                message: e.message
                            }))
                        },
                        { status: 400 }
                    );
                }
                return NextResponse.json(
                    { error: 'Internal Server Error' },
                    { status: 500 }
                );
            }
        };
    };
} 