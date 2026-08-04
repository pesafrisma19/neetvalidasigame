import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { GameRepository } from '../../repositories/game/game.repository.js';
import { ProviderRepository, ProviderEndpointRepository } from '../../repositories/provider/provider.repository.js';
import { CapabilityRepository } from '../../repositories/capability/capability.repository.js';
import { MappingRepository } from '../../repositories/mapping/mapping.repository.js';
import { UserRepository } from '../../repositories/user/user.repository.js';
import { MasterDataService } from '../../services/master/master-data.service.js';
import { adminAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-envelope.js';
const gameRepo = new GameRepository(prisma);
const providerRepo = new ProviderRepository(prisma);
const endpointRepo = new ProviderEndpointRepository(prisma);
const capabilityRepo = new CapabilityRepository(prisma);
const mappingRepo = new MappingRepository(prisma);
const userRepo = new UserRepository();

const masterService = new MasterDataService(
  prisma,
  gameRepo,
  providerRepo,
  endpointRepo,
  capabilityRepo,
  mappingRepo,
  userRepo
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

const inputFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'select']),
  required: z.boolean().optional().default(false),
  placeholder: z.string().optional(),
  sampleValue: z.string().optional(),
  options: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .optional(),
});

const inputFieldsSchema = z
  .object({
    fields: z.array(inputFieldSchema),
  })
  .optional();

const createGameSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  iconUrl: z.string().optional(),
  userIdRegex: z.string().optional(),
  zoneIdRegex: z.string().optional(),
  inputFields: inputFieldsSchema,
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

// ------------------------------------------------------
// API KEY MANAGEMENT ENDPOINTS
// ------------------------------------------------------

const CreateApiKeySchema = z.object({
  clientName: z.string().min(2, 'Client name must be at least 2 characters'),
  rateLimit: z.number().int().min(0).default(100),
});

const UpdateApiKeySchema = z.object({
  clientName: z.string().min(2).optional(),
  rateLimit: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/v1/admin/api-keys (List Active API Keys)
const getApiKeysRoute = createRoute({
  method: 'get',
  path: '/api-keys',
  summary: 'List Active API Keys',
  tags: ['Admin API Keys'],
  security: [{ BearerAuth: [] }],
  responses: { 200: { description: 'Active API Keys list' } },
});

masterRoute.openapi(getApiKeysRoute, async (c) => {
  const keys = await prisma.apiKey.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      clientName: true,
      keyPrefix: true,
      rateLimit: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(createSuccessResponse(keys, 'API Keys fetched'), 200);
});

// POST /api/v1/admin/api-keys (Generate New API Key - RETURNS rawKey ONCE ONLY)
const postCreateApiKeyRoute = createRoute({
  method: 'post',
  path: '/api-keys',
  summary: 'Generate New API Key',
  tags: ['Admin API Keys'],
  security: [{ BearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: CreateApiKeySchema } } } },
  responses: { 201: { description: 'API Key generated successfully' } },
});

masterRoute.openapi(postCreateApiKeyRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const rawKey = `nv_live_${randomBytes(16).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 14);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        clientName: body.clientName,
        keyPrefix,
        keyHash,
        rateLimit: body.rateLimit ?? 100,
        isActive: true,
      },
      select: {
        id: true,
        clientName: true,
        keyPrefix: true,
        rateLimit: true,
        isActive: true,
        createdAt: true,
      },
    });

    return c.json(
      createSuccessResponse(
        { ...apiKeyRecord, rawKey },
        'API Key generated successfully. Save this rawKey now! It will NOT be shown again.'
      ),
      201
    );
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to generate API Key', 'CREATE_FAILED', err.message), 400);
  }
});

// PUT /api/v1/admin/api-keys/{id} (Update API Key Metadata)
const putUpdateApiKeyRoute = createRoute({
  method: 'put',
  path: '/api-keys/{id}',
  summary: 'Update API Key Metadata',
  tags: ['Admin API Keys'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: UpdateApiKeySchema } } },
  },
  responses: { 200: { description: 'API Key updated' } },
});

masterRoute.openapi(putUpdateApiKeyRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: body,
      select: {
        id: true,
        clientName: true,
        keyPrefix: true,
        rateLimit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return c.json(createSuccessResponse(updatedKey, 'API Key updated successfully'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to update API Key', 'UPDATE_FAILED', err.message), 400);
  }
});

// DELETE /api/v1/admin/api-keys/{id} (Soft-Delete / Revoke API Key)
const deleteApiKeyRoute = createRoute({
  method: 'delete',
  path: '/api-keys/{id}',
  summary: 'Revoke / Soft-Delete API Key',
  tags: ['Admin API Keys'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'API Key revoked' } },
});

masterRoute.openapi(deleteApiKeyRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const revokedKey = await prisma.apiKey.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return c.json(createSuccessResponse(revokedKey, 'API Key revoked successfully'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to revoke API Key', 'REVOKE_FAILED', err.message), 400);
  }
});

// GET /api/v1/admin/trash/api-keys (List Revoked / Trash API Keys)
const getTrashApiKeysRoute = createRoute({
  method: 'get',
  path: '/trash/api-keys',
  summary: 'List Revoked / Trash API Keys',
  tags: ['Admin API Keys'],
  security: [{ BearerAuth: [] }],
  responses: { 200: { description: 'Trash API Keys list' } },
});

masterRoute.openapi(getTrashApiKeysRoute, async (c) => {
  const keys = await prisma.apiKey.findMany({
    where: { deletedAt: { not: null } },
    select: {
      id: true,
      clientName: true,
      keyPrefix: true,
      rateLimit: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
  return c.json(createSuccessResponse(keys, 'Trash API Keys fetched'), 200);
});

// POST /api/v1/admin/restore/api-keys/{id} (Restore Revoked API Key)
const postRestoreApiKeyRoute = createRoute({
  method: 'post',
  path: '/restore/api-keys/{id}',
  summary: 'Restore Revoked API Key',
  tags: ['Admin API Keys'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'API Key restored' } },
});

masterRoute.openapi(postRestoreApiKeyRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const restoredKey = await prisma.apiKey.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });
    return c.json(createSuccessResponse(restoredKey, 'API Key restored successfully'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to restore API Key', 'RESTORE_FAILED', err.message), 400);
  }
});

// ------------------------------------------------------
// ADMIN LOG VIEWER ENDPOINT
// ------------------------------------------------------

const GetLogsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  status: z.enum(['SUCCESS', 'FAILED', 'FALLBACK', 'CIRCUIT_OPEN', 'TIMEOUT']).optional(),
  apiKeyId: z.string().optional(),
  gameId: z.string().optional(),
  providerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

// GET /api/v1/admin/logs (Paginated & Filtered Validation Logs)
const getValidationLogsRoute = createRoute({
  method: 'get',
  path: '/logs',
  summary: 'Get Paginated & Filtered Validation Logs',
  tags: ['Admin Logs'],
  security: [{ BearerAuth: [] }],
  request: { query: GetLogsQuerySchema },
  responses: { 200: { description: 'Paginated validation logs list' } },
});

masterRoute.openapi(getValidationLogsRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.apiKeyId) {
      if (query.apiKeyId === 'legacy' || query.apiKeyId === 'unknown') {
        where.apiKeyId = null;
      } else {
        where.apiKeyId = query.apiKeyId;
      }
    }

    if (query.gameId) {
      where.gameId = query.gameId;
    }

    if (query.providerId) {
      where.providerId = query.providerId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { inputUserId: { contains: s, mode: 'insensitive' } },
        { inputZoneId: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [totalRecords, logs] = await Promise.all([
      prisma.validationLog.count({ where }),
      prisma.validationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          game: { select: { id: true, code: true, name: true } },
          provider: { select: { id: true, name: true } },
          endpoint: { select: { id: true, name: true } },
          apiKey: { select: { id: true, clientName: true, keyPrefix: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return c.json(
      createSuccessResponse(logs, 'Validation logs fetched successfully', {
        page,
        limit,
        totalRecords,
        totalPages,
      }),
      200
    );
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to fetch validation logs', 'FETCH_FAILED', err.message), 400);
  }
});

// ============================================
// 11. ADMIN USER MANAGEMENT ENDPOINTS
// ============================================


const GetUsersQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'email', 'balance']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const getUsersRoute = createRoute({
  method: 'get',
  path: '/users',
  summary: 'List Paginated Users',
  tags: ['Admin Management'],
  security: [{ BearerAuth: [] }],
  request: { query: GetUsersQuerySchema },
  responses: { 200: { description: 'Users list fetched successfully' } },
});

masterRoute.openapi(getUsersRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const rawLimit = parseInt(query.limit || '20', 10);
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));

    const ALLOWED_SORT_FIELDS = ['createdAt', 'name', 'email', 'balance'] as const;
    const sortBy = ALLOWED_SORT_FIELDS.includes(query.sortBy as any) ? query.sortBy : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const result = await masterService.getAllUsers(query.search, page, limit, sortBy as any, sortOrder);

    return c.json(
      createSuccessResponse(result.users, 'Users fetched successfully', result.meta),
      200
    );
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to fetch users', 'FETCH_FAILED', err.message), 400);
  }
});

const getUserByIdRoute = createRoute({
  method: 'get',
  path: '/users/{id}',
  summary: 'Get Single User Profile Detail',
  tags: ['Admin Management'],
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'User detail profile fetched successfully' },
    404: { description: 'User account not found' },
  },
});

masterRoute.openapi(getUserByIdRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const user = await masterService.getUserById(id);

    if (!user) {
      return c.json(createErrorResponse('User account not found', 'NOT_FOUND'), 404);
    }

    return c.json(createSuccessResponse(user, 'User profile fetched successfully'), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to fetch user detail', 'FETCH_FAILED', err.message), 400);
  }
});

// ============================================
// 12. ADMIN MANUAL USER TOP-UP ENDPOINT
// ============================================

const adminUserTopupRoute = createRoute({
  method: 'post',
  path: '/users/{id}/topup',
  summary: 'Admin Manual Top-Up User Wallet Balance',
  tags: ['Admin Management'],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            amount: z.number().int().positive().openapi({ example: 10000, description: 'Amount in IDR to credit to user wallet' }),
            description: z.string().optional().openapi({ example: 'Top-up manual via TF BCA Bank' }),
            referenceNo: z.string().optional().openapi({ example: 'TF-BCA-889102' }),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: 'User wallet balance successfully credited' },
    400: { description: 'Invalid input parameters or user not found' },
  },
});

masterRoute.openapi(adminUserTopupRoute, async (c) => {
  try {
    const { id: userId } = c.req.valid('param');
    const { amount, description, referenceNo } = c.req.valid('json');

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!targetUser) {
      return c.json(createErrorResponse('User account not found', 'NOT_FOUND'), 404);
    }

    // Execute Interactive Callback Transaction for Atomic Top-up & Mutation Log
    const [updatedUser, txLog] = await prisma.$transaction(async (tx) => {
      const userBefore = await tx.user.findUnique({ where: { id: userId } });
      if (!userBefore) throw new Error('USER_NOT_FOUND');

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amount },
        },
      });

      const log = await tx.balanceTransaction.create({
        data: {
          userId,
          amount,
          balanceBefore: userBefore.balance,
          balanceAfter: updated.balance,
          type: 'MANUAL_TOPUP_ADMIN',
          description: description || `Top-up manual Admin (Ref: ${referenceNo || 'ADMIN_MANUAL'})`,
        },
      });

      return [updated, log];
    });

    return c.json(
      createSuccessResponse(
        {
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            balanceBefore: txLog.balanceBefore,
            balanceAfter: updatedUser.balance,
            amountCredited: amount,
          },
          transaction: txLog,
        },
        `Saldo akun ${updatedUser.name} berhasil ditambah Rp ${amount.toLocaleString('id-ID')}`
      ),
      200
    );
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to top-up user balance', 'TOPUP_FAILED', err.message), 400);
  }
});
