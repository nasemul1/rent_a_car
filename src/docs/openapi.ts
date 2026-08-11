export const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Vehicle Rental API',
    version: '1.0.0',
    description: 'REST API for vehicle rental management',
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
      },
    },
    schemas: {
      Staff: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string' },
          name: { type: 'string' },
        },
      },
      Vehicle: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          plate_number: { type: 'string' },
          category: { type: 'string' },
          daily_rate: { type: 'number' },
          photo_path: { type: 'string', nullable: true },
          deleted_at: { type: 'string', nullable: true },
          created_at: { type: 'string' },
          updated_at: { type: 'string' },
        },
      },
      Rental: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          vehicle_id: { type: 'integer' },
          customer_name: { type: 'string' },
          customer_phone: { type: 'string' },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
          total_amount: { type: 'number' },
          status: { type: 'string', enum: ['booked', 'ongoing', 'completed', 'cancelled'] },
          created_at: { type: 'string' },
          updated_at: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          '200': { description: 'Server is healthy' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logged in',
            headers: {
              'Set-Cookie': { schema: { type: 'string' } },
            },
          },
          '401': { description: 'Invalid credentials' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        responses: {
          '200': { description: 'Logged out' },
        },
      },
    },
    '/vehicles': {
      get: {
        tags: ['Vehicles'],
        summary: 'List vehicles',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Paginated vehicles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Vehicle' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Vehicles'],
        summary: 'Create vehicle',
        security: [{ cookieAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  plate_number: { type: 'string' },
                  category: { type: 'string' },
                  daily_rate: { type: 'number' },
                  photo: { type: 'string', format: 'binary' },
                },
                required: ['name', 'plate_number', 'category', 'daily_rate'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/vehicles/{id}': {
      get: {
        tags: ['Vehicles'],
        summary: 'Get vehicle',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Vehicle' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Vehicles'],
        summary: 'Update vehicle',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  plate_number: { type: 'string' },
                  category: { type: 'string' },
                  daily_rate: { type: 'number' },
                  photo: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated' },
        },
      },
      delete: {
        tags: ['Vehicles'],
        summary: 'Delete vehicle',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Deleted' },
        },
      },
    },
    '/rentals': {
      get: {
        tags: ['Rentals'],
        summary: 'List rentals',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'vehicle_id', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['booked', 'ongoing', 'completed', 'cancelled'] } },
          { name: 'start', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'Paginated rentals',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Rental' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Rentals'],
        summary: 'Create rental',
        security: [{ cookieAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  vehicle_id: { type: 'integer' },
                  customer_name: { type: 'string' },
                  customer_phone: { type: 'string' },
                  start_date: { type: 'string', format: 'date' },
                  end_date: { type: 'string', format: 'date' },
                },
                required: ['vehicle_id', 'customer_name', 'customer_phone', 'start_date', 'end_date'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '409': { description: 'Overlapping rental' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/rentals/{id}': {
      get: {
        tags: ['Rentals'],
        summary: 'Get rental',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Rental' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Rentals'],
        summary: 'Update rental',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  vehicle_id: { type: 'integer' },
                  customer_name: { type: 'string' },
                  customer_phone: { type: 'string' },
                  start_date: { type: 'string', format: 'date' },
                  end_date: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated' },
          '409': { description: 'Overlapping rental' },
        },
      },
      delete: {
        tags: ['Rentals'],
        summary: 'Delete rental',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Deleted' },
        },
      },
    },
    '/reports/rentals': {
      get: {
        tags: ['Reports'],
        summary: 'Monthly rental report',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'month', in: 'query', required: true, schema: { type: 'string', example: '2026-08' }, description: 'Month in YYYY-MM format' },
          { name: 'vehicle_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by specific vehicle' },
        ],
        responses: {
          '200': {
            description: 'Report data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        vehicles: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'integer' },
                              name: { type: 'string' },
                              total_bookings: { type: 'integer' },
                              days_rented: { type: 'integer' },
                              revenue: { type: 'number' },
                            },
                          },
                        },
                        top_vehicle: {
                          type: 'object',
                          nullable: true,
                          properties: {
                            id: { type: 'integer' },
                            name: { type: 'string' },
                            revenue: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid month format' },
        },
      },
    },
  },
};
