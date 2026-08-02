import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import { GameRepository } from '../../repositories/game/game.repository.js';
import { ProviderRepository, ProviderEndpointRepository } from '../../repositories/provider/provider.repository.js';
import { CapabilityRepository } from '../../repositories/capability/capability.repository.js';
import { MappingRepository } from '../../repositories/mapping/mapping.repository.js';
import { MasterDataService } from '../../services/master/master-data.service.js';
import { adminAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-envelope.js';

const prisma = new PrismaClient();
const gameRepo = new GameRepository(prisma);
const providerRepo = new ProviderRepository(prisma);
const endpointRepo = new ProviderEndpointRepository(prisma);
const capabilityRepo = new CapabilityRepository(prisma);
const mappingRepo = new MappingRepository(prisma);

const masterService = new MasterDataService(
  prisma,
  gameRepo,
  providerRepo,
  endpointRepo,
  capabilityRepo,
  mappingRepo
);

export const masterRoute = new OpenAPIHono();

// Apply auth middleware to all admin master routes
masterRoute.use('/*', adminAuthMiddleware);

// 1. Get Games
const getGamesRoute = createRoute({
  method: 'get',
  path: '/games',
  summary: 'List All Games',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: { description: 'Games list' },
  },
});

masterRoute.openapi(getGamesRoute, async (c) => {
  const games = await masterService.getAllGames();
  return c.json(createSuccessResponse(games, 'Games fetched'), 200);
});

// 2. Create Game
const createGameSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  iconUrl: z.string().optional(),
  userIdRegex: z.string().optional(),
  zoneIdRegex: z.string().optional(),
});

const postGameRoute = createRoute({
  method: 'post',
  path: '/games',
  summary: 'Create New Game',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: createGameSchema } } },
  },
  responses: {
    201: { description: 'Game created' },
  },
});

masterRoute.openapi(postGameRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const game = await masterService.createGame(body);
    return c.json(createSuccessResponse(game, 'Game created'), 201);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to create game', 'CREATE_FAILED', err.message), 400);
  }
});

// 3. Get Providers
const getProvidersRoute = createRoute({
  method: 'get',
  path: '/providers',
  summary: 'List All Providers',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: { description: 'Providers list' },
  },
});

masterRoute.openapi(getProvidersRoute, async (c) => {
  const providers = await masterService.getAllProviders();
  return c.json(createSuccessResponse(providers, 'Providers fetched'), 200);
});

// 4. Get Capabilities
const getCapabilitiesRoute = createRoute({
  method: 'get',
  path: '/capabilities',
  summary: 'List All Capabilities',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: { description: 'Capabilities list' },
  },
});

masterRoute.openapi(getCapabilitiesRoute, async (c) => {
  const capabilities = await masterService.getAllCapabilities();
  return c.json(createSuccessResponse(capabilities, 'Capabilities fetched'), 200);
});

// 5. Get Mappings
const getMappingsRoute = createRoute({
  method: 'get',
  path: '/mappings',
  summary: 'List All Validation Mappings',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: { description: 'Mappings list' },
  },
});

masterRoute.openapi(getMappingsRoute, async (c) => {
  const mappings = await masterService.getAllMappings();
  return c.json(createSuccessResponse(mappings, 'Mappings fetched'), 200);
});
