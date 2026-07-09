// OpenAPI 3.1 specification for Rock 88.7 Broadcast API
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Rock 88.7 Broadcast API',
    description: 'Open-source radio broadcast automation API for Rivendell Radio Automation System.',
    version: '1.0.0',
    license: { name: 'GPL-2.0', url: 'https://www.gnu.org/licenses/gpl-2.0.html' },
    contact: { name: 'Rock 88.7', url: 'https://github.com/markec12345678/rivendellradio' },
  },
  servers: [{ url: '/api/v1', description: 'Current server' }],
  tags: [
    { name: 'Tracks', description: 'Music library management' },
    { name: 'Schedule', description: 'Show scheduling and log management' },
    { name: 'Stations', description: 'Multi-station management' },
    { name: 'RDS', description: 'RDS/DAB+ metadata output' },
    { name: 'Requests', description: 'Listener song requests' },
    { name: 'Voice Track', description: 'AI voice track generation' },
    { name: 'Reports', description: 'Listener analytics' },
    { name: 'Events', description: 'Event bus and real-time events' },
    { name: 'System', description: 'System status and daemons' },
    { name: 'Auth', description: 'API key authentication' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'API key (rk_live_...)' },
    },
    schemas: {
      Track: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 't001' },
          title: { type: 'string', example: 'Back in Black' },
          artist: { type: 'string', example: 'AC/DC' },
          album: { type: 'string', example: 'Back in Black' },
          genre: { type: 'string', example: 'Hard Rock' },
          length: { type: 'integer', description: 'Duration in ms', example: 253000 },
          bpm: { type: 'integer', example: 127 },
          year: { type: 'integer', example: 1980 },
          isrc: { type: 'string', example: 'AUAP08000012' },
          group: { type: 'string', example: 'MUSIC' },
          albumArt: { type: 'string', example: '/album-art/rock-1.png' },
          playCount: { type: 'integer', example: 1247 },
        },
      },
      RdsMetadata: {
        type: 'object',
        properties: {
          pi: { type: 'string', description: 'Program Identification (hex)', example: '887F' },
          ps: { type: 'string', description: 'Program Service Name (8 chars)', example: 'ROCK887' },
          pty: { type: 'integer', description: 'Program Type (0-31)', example: 11 },
          ptyLabel: { type: 'string', example: 'Rock music' },
          rt: { type: 'string', description: 'RadioText (64 chars)', example: 'AC/DC - Back in Black' },
          dls: { type: 'string', description: 'DAB+ Dynamic Label Segment', example: 'Now playing: Back in Black by AC/DC' },
        },
      },
      ListenerRequest: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'rq001' },
          trackId: { type: 'string', example: 't004' },
          title: { type: 'string', example: 'Bohemian Rhapsody' },
          artist: { type: 'string', example: 'Queen' },
          listenerName: { type: 'string', example: 'Sarah K.' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'played'], example: 'pending' },
          requestedAt: { type: 'string', format: 'date-time' },
        },
      },
      Event: {
        type: 'object',
        properties: {
          type: { type: 'string', example: 'track.started' },
          timestamp: { type: 'string', format: 'date-time' },
          source: { type: 'string', example: 'playout' },
          data: { type: 'object' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['System'], summary: 'Health check', responses: { '200': { description: 'OK' } } },
    },
    '/events': {
      get: {
        tags: ['Events'], summary: 'Get event bus history',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Event history' } },
      },
    },
    '/events/trigger': {
      post: {
        tags: ['Events'], summary: 'Trigger custom event',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: {
          type: { type: 'string' }, source: { type: 'string' }, data: { type: 'object' },
        } } } } },
        responses: { '200': { description: 'Event published' } },
      },
    },
    '/events/test': {
      get: { tags: ['Events'], summary: 'Trigger test track.started event', responses: { '200': { description: 'OK' } } },
    },
  },
  security: [{ ApiKeyAuth: [] }],
}

export async function GET() {
  return NextResponse.json(openapiSpec)
}
