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

// ============================================
// 1. GAMES CRUD
// ============================================
const getGamesRoute = createRoute({
  method: 'get',
  path: '/games',
  summary: 'List All Games',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: { 200: { description: 'Games list' } },
});

masterRoute.openapi(getGamesRoute, async (c) => {
  const games = await masterService.getAllGames();
  return c.json(createSuccessResponse(games, 'Games fetched'), 200);
});

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
  request: { body: { content: { 'application/json': { schema: createGameSchema } } } },
  responses: { 201: { description: 'Game created' } },
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

const updateGameRoute = createRoute({
  method: 'put',
  path: '/games/{id}',
  summary: 'Update Game',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: createGameSchema.partial() } } },
  },
  responses: { 200: { description: 'Game updated' } },
});

masterRoute.openapi(updateGameRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const game = await masterService.updateGame(id, body);
    return c.json(createSuccessResponse(game, 'Game updated'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to update game', 'UPDATE_FAILED', err.message), 400);
  }
});

const deleteGameRoute = createRoute({
  method: 'delete',
  path: '/games/{id}',
  summary: 'Delete Game',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'Game deleted' } },
});

masterRoute.openapi(deleteGameRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const game = await masterService.deleteGame(id);
    return c.json(createSuccessResponse(game, 'Game deleted'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to delete game', 'DELETE_FAILED', err.message), 400);
  }
});

// ============================================
// 2. PROVIDERS CRUD
// ============================================
const getProvidersRoute = createRoute({
  method: 'get',
  path: '/providers',
  summary: 'List All Providers',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: { 200: { description: 'Providers list' } },
});

masterRoute.openapi(getProvidersRoute, async (c) => {
  const providers = await masterService.getAllProviders();
  return c.json(createSuccessResponse(providers, 'Providers fetched'), 200);
});

const createProviderSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
});

const postProviderRoute = createRoute({
  method: 'post',
  path: '/providers',
  summary: 'Create New Provider',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: createProviderSchema } } } },
  responses: { 201: { description: 'Provider created' } },
});

masterRoute.openapi(postProviderRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const provider = await masterService.createProvider(body);
    return c.json(createSuccessResponse(provider, 'Provider created'), 201);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to create provider', 'CREATE_FAILED', err.message), 400);
  }
});

const updateProviderRoute = createRoute({
  method: 'put',
  path: '/providers/{id}',
  summary: 'Update Provider',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: createProviderSchema.partial() } } },
  },
  responses: { 200: { description: 'Provider updated' } },
});

masterRoute.openapi(updateProviderRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const provider = await masterService.updateProvider(id, body);
    return c.json(createSuccessResponse(provider, 'Provider updated'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to update provider', 'UPDATE_FAILED', err.message), 400);
  }
});

const deleteProviderRoute = createRoute({
  method: 'delete',
  path: '/providers/{id}',
  summary: 'Delete Provider',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'Provider deleted' } },
});

masterRoute.openapi(deleteProviderRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const provider = await masterService.deleteProvider(id);
    return c.json(createSuccessResponse(provider, 'Provider deleted'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to delete provider', 'DELETE_FAILED', err.message), 400);
  }
});

// ============================================
// 3. CAPABILITIES CRUD
// ============================================
const getCapabilitiesRoute = createRoute({
  method: 'get',
  path: '/capabilities',
  summary: 'List All Capabilities',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: { 200: { description: 'Capabilities list' } },
});

masterRoute.openapi(getCapabilitiesRoute, async (c) => {
  const capabilities = await masterService.getAllCapabilities();
  return c.json(createSuccessResponse(capabilities, 'Capabilities fetched'), 200);
});

// ============================================
// 4. MAPPINGS CRUD
// ============================================
const getMappingsRoute = createRoute({
  method: 'get',
  path: '/mappings',
  summary: 'List All Validation Mappings',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: { 200: { description: 'Mappings list' } },
});

masterRoute.openapi(getMappingsRoute, async (c) => {
  const mappings = await masterService.getAllMappings();
  return c.json(createSuccessResponse(mappings, 'Mappings fetched'), 200);
});

const createMappingSchema = z.object({
  gameId: z.string(),
  capabilityId: z.string(),
  providerId: z.string(),
  endpointId: z.string().optional(),
  slug: z.string(),
  adapterKey: z.string(),
  priority: z.number().default(1),
  requestParamMapping: z.record(z.unknown()).optional(),
  responseFieldMapping: z.record(z.unknown()).optional(),
});

const postMappingRoute = createRoute({
  method: 'post',
  path: '/mappings',
  summary: 'Create New Validation Mapping',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: createMappingSchema } } } },
  responses: { 201: { description: 'Mapping created' } },
});

masterRoute.openapi(postMappingRoute, async (c) => {
  try {
    const body = c.req.valid('json');

    // Auto-resolve ProviderEndpoint ID if not provided explicitly
    let targetEndpointId = body.endpointId;
    if (!targetEndpointId) {
      const endpoints = await masterService.getAllEndpoints();
      const matchingEndpoint = endpoints.find((e) => e.providerId === body.providerId);
      targetEndpointId = matchingEndpoint?.id;
    }

    if (!targetEndpointId) {
      return c.json(createErrorResponse('Provider belum memiliki endpoint terdaftar', 'ENDPOINT_MISSING'), 400);
    }

    const prismaPayload = {
      slug: body.slug,
      adapterKey: body.adapterKey,
      priority: body.priority || 1,
      requestParamMapping: body.requestParamMapping || { userId: 'userId', zoneId: 'zoneId' },
      responseFieldMapping: body.responseFieldMapping || { nickname: 'data.username', region: 'data.countryOrigin' },
      game: { connect: { id: body.gameId } },
      capability: { connect: { id: body.capabilityId } },
      provider: { connect: { id: body.providerId } },
      endpoint: { connect: { id: targetEndpointId } },
    };

    const mapping = await masterService.createMapping(prismaPayload as any);
    return c.json(createSuccessResponse(mapping, 'Mapping created'), 201);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to create mapping', 'CREATE_FAILED', err.message), 400);
  }
});

const updateMappingRoute = createRoute({
  method: 'put',
  path: '/mappings/{id}',
  summary: 'Update Validation Mapping',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: createMappingSchema.partial() } } },
  },
  responses: { 200: { description: 'Mapping updated' } },
});

masterRoute.openapi(updateMappingRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    const updatePayload: any = {};
    if (body.slug) updatePayload.slug = body.slug;
    if (body.adapterKey) updatePayload.adapterKey = body.adapterKey;
    if (body.priority) updatePayload.priority = body.priority;
    if (body.requestParamMapping) updatePayload.requestParamMapping = body.requestParamMapping;
    if (body.responseFieldMapping) updatePayload.responseFieldMapping = body.responseFieldMapping;

    if (body.gameId) updatePayload.game = { connect: { id: body.gameId } };
    if (body.capabilityId) updatePayload.capability = { connect: { id: body.capabilityId } };
    if (body.providerId) updatePayload.provider = { connect: { id: body.providerId } };
    if (body.endpointId) updatePayload.endpoint = { connect: { id: body.endpointId } };

    const mapping = await masterService.updateMapping(id, updatePayload);
    return c.json(createSuccessResponse(mapping, 'Mapping updated'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to update mapping', 'UPDATE_FAILED', err.message), 400);
  }
});

const deleteMappingRoute = createRoute({
  method: 'delete',
  path: '/mappings/{id}',
  summary: 'Delete Mapping',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'Mapping deleted' } },
});

masterRoute.openapi(deleteMappingRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const mapping = await masterService.deleteMapping(id);
    return c.json(createSuccessResponse(mapping, 'Mapping deleted'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to delete mapping', 'DELETE_FAILED', err.message), 400);
  }
});
