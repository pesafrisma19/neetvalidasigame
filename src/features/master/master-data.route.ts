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

const createCapabilitySchema = z.object({
  code: z.enum(['NICKNAME', 'REGION', 'FIRST_TOPUP', 'EMAIL', 'ROLE', 'SERVER', 'CLAN', 'LEVEL']),
  name: z.string().min(2),
  description: z.string().optional(),
  version: z.string().default('v1'),
});

const postCapabilityRoute = createRoute({
  method: 'post',
  path: '/capabilities',
  summary: 'Create New Capability',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: createCapabilitySchema } } } },
  responses: { 201: { description: 'Capability created' } },
});

masterRoute.openapi(postCapabilityRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const capability = await masterService.createCapability(body);
    return c.json(createSuccessResponse(capability, 'Capability created'), 201);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to create capability', 'CREATE_FAILED', err.message), 400);
  }
});

const updateCapabilityRoute = createRoute({
  method: 'put',
  path: '/capabilities/{id}',
  summary: 'Update Capability',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: createCapabilitySchema.partial() } } },
  },
  responses: { 200: { description: 'Capability updated' } },
});

masterRoute.openapi(updateCapabilityRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const capability = await masterService.updateCapability(id, body);
    return c.json(createSuccessResponse(capability, 'Capability updated'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to update capability', 'UPDATE_FAILED', err.message), 400);
  }
});

const deleteCapabilityRoute = createRoute({
  method: 'delete',
  path: '/capabilities/{id}',
  summary: 'Delete Capability',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'Capability deleted' } },
});

masterRoute.openapi(deleteCapabilityRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const capability = await masterService.deleteCapability(id);
    return c.json(createSuccessResponse(capability, 'Capability deleted'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to delete capability', 'DELETE_FAILED', err.message), 400);
  }
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
    if (body.providerId) {
      updatePayload.provider = { connect: { id: body.providerId } };
      const endpoints = await masterService.getAllEndpoints();
      const matchingEndpoint = endpoints.find((e) => e.providerId === body.providerId);
      if (matchingEndpoint) {
        updatePayload.endpoint = { connect: { id: matchingEndpoint.id } };
      }
    }

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

// ============================================
// 5. RECYCLE BIN TRASH & RESTORE ROUTES
// ============================================

// Mappings Trash & Restore
const getTrashMappingsRoute = createRoute({
  method: 'get',
  path: '/trash/mappings',
  summary: 'List Soft-Deleted Mappings',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: { 200: { description: 'Trash mappings list' } },
});

masterRoute.openapi(getTrashMappingsRoute, async (c) => {
  const mappings = await masterService.getDeletedMappings();
  return c.json(createSuccessResponse(mappings, 'Trash mappings fetched'), 200);
});

const postRestoreMappingRoute = createRoute({
  method: 'post',
  path: '/restore/mappings/{id}',
  summary: 'Restore Soft-Deleted Mapping',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'Mapping restored' } },
});

masterRoute.openapi(postRestoreMappingRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const mapping = await masterService.restoreMapping(id);
    return c.json(createSuccessResponse(mapping, 'Mapping restored'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to restore mapping', 'RESTORE_FAILED', err.message), 400);
  }
});

// Games Trash & Restore
const getTrashGamesRoute = createRoute({
  method: 'get',
  path: '/trash/games',
  summary: 'List Soft-Deleted Games',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: { 200: { description: 'Trash games list' } },
});

masterRoute.openapi(getTrashGamesRoute, async (c) => {
  const games = await masterService.getDeletedGames();
  return c.json(createSuccessResponse(games, 'Trash games fetched'), 200);
});

const postRestoreGameRoute = createRoute({
  method: 'post',
  path: '/restore/games/{id}',
  summary: 'Restore Soft-Deleted Game',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'Game restored' } },
});

masterRoute.openapi(postRestoreGameRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const game = await masterService.restoreGame(id);
    return c.json(createSuccessResponse(game, 'Game restored'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to restore game', 'RESTORE_FAILED', err.message), 400);
  }
});

// Providers Trash & Restore
const getTrashProvidersRoute = createRoute({
  method: 'get',
  path: '/trash/providers',
  summary: 'List Soft-Deleted Providers',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: { 200: { description: 'Trash providers list' } },
});

masterRoute.openapi(getTrashProvidersRoute, async (c) => {
  const providers = await masterService.getDeletedProviders();
  return c.json(createSuccessResponse(providers, 'Trash providers fetched'), 200);
});

const postRestoreProviderRoute = createRoute({
  method: 'post',
  path: '/restore/providers/{id}',
  summary: 'Restore Soft-Deleted Provider',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'Provider restored' } },
});

masterRoute.openapi(postRestoreProviderRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const provider = await masterService.restoreProvider(id);
    return c.json(createSuccessResponse(provider, 'Provider restored'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to restore provider', 'RESTORE_FAILED', err.message), 400);
  }
});

// Capabilities Trash & Restore
const getTrashCapabilitiesRoute = createRoute({
  method: 'get',
  path: '/trash/capabilities',
  summary: 'List Soft-Deleted Capabilities',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  responses: { 200: { description: 'Trash capabilities list' } },
});

masterRoute.openapi(getTrashCapabilitiesRoute, async (c) => {
  const capabilities = await masterService.getDeletedCapabilities();
  return c.json(createSuccessResponse(capabilities, 'Trash capabilities fetched'), 200);
});

const postRestoreCapabilityRoute = createRoute({
  method: 'post',
  path: '/restore/capabilities/{id}',
  summary: 'Restore Soft-Deleted Capability',
  tags: ['Master Data'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'Capability restored' } },
});

masterRoute.openapi(postRestoreCapabilityRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const capability = await masterService.restoreCapability(id);
    return c.json(createSuccessResponse(capability, 'Capability restored'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to restore capability', 'RESTORE_FAILED', err.message), 400);
  }
});
