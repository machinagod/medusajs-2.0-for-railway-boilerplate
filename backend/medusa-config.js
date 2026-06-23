import { loadEnv, Modules, defineConfig } from '@medusajs/utils';
import {
  ADMIN_CORS,
  AUTH_CORS,
  BACKEND_URL,
  COOKIE_SECRET,
  DATABASE_URL,
  JWT_SECRET,
  REDIS_URL,
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL,
  SHOULD_DISABLE_ADMIN,
  STORE_CORS,
  STRIPE_API_KEY,
  STRIPE_WEBHOOK_SECRET,
  WORKER_MODE,
  MINIO_ENDPOINT,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET,
  MEILISEARCH_HOST,
  MEILISEARCH_ADMIN_KEY,
  IS_MOLONI_ENABLED,
  MOLONI_CLIENT_ID,
  MOLONI_CLIENT_SECRET,
  MOLONI_USER,
  MOLONI_PASSWORD,
  MOLONI_COMPANY_ID,
  MOLONI_SANDBOX
  // Relative path (not the bare "lib/constants" alias): the alias only resolves
  // under `medusa start`/`develop`, which register tsconfig path-aliases. The
  // `medusa db:migrate` step (run on every deploy) loads this config via a plain
  // dynamic import with NO alias registration, so a bare specifier throws
  // "Cannot find module 'lib/constants'" and crashes boot. The `src/` subtree is
  // preserved under `.medusa/server/src/`, so this relative path resolves
  // identically in source (dev) and in the built server (db:migrate + start).
} from './src/lib/constants';

loadEnv(process.env.NODE_ENV, process.cwd());

const medusaConfig = {
  projectConfig: {
    databaseUrl: DATABASE_URL,
    databaseLogging: false,
    redisUrl: REDIS_URL,
    workerMode: WORKER_MODE,
    http: {
      adminCors: ADMIN_CORS,
      authCors: AUTH_CORS,
      storeCors: STORE_CORS,
      jwtSecret: JWT_SECRET,
      cookieSecret: COOKIE_SECRET
    },
    build: {
      rollupOptions: {
        external: ["@medusajs/dashboard", "@medusajs/admin-shared"]
      }
    }
  },
  admin: {
    backendUrl: BACKEND_URL,
    disable: SHOULD_DISABLE_ADMIN,
  },
  modules: [
    {
      // Amazon-style product characteristics (highlight bullets + spec table).
      resolve: './src/modules/product-attributes'
    },
    {
      key: Modules.FILE,
      resolve: '@medusajs/file',
      options: {
        providers: [
          ...(MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY ? [{
            resolve: './src/modules/minio-file',
            id: 'minio',
            options: {
              endPoint: MINIO_ENDPOINT,
              accessKey: MINIO_ACCESS_KEY,
              secretKey: MINIO_SECRET_KEY,
              bucket: MINIO_BUCKET // Optional, default: medusa-media
            }
          }] : [{
            resolve: '@medusajs/file-local',
            id: 'local',
            options: {
              upload_dir: 'static',
              backend_url: `${BACKEND_URL}/static`
            }
          }])
        ]
      }
    },
    ...(REDIS_URL ? [{
      key: Modules.EVENT_BUS,
      resolve: '@medusajs/event-bus-redis',
      options: {
        redisUrl: REDIS_URL
      }
    },
    {
      key: Modules.WORKFLOW_ENGINE,
      resolve: '@medusajs/workflow-engine-redis',
      options: {
        redis: {
          url: REDIS_URL,
        }
      }
    }] : []),
    ...(SENDGRID_API_KEY && SENDGRID_FROM_EMAIL || RESEND_API_KEY && RESEND_FROM_EMAIL ? [{
      key: Modules.NOTIFICATION,
      resolve: '@medusajs/notification',
      options: {
        providers: [
          ...(SENDGRID_API_KEY && SENDGRID_FROM_EMAIL ? [{
            resolve: '@medusajs/notification-sendgrid',
            id: 'sendgrid',
            options: {
              channels: ['email'],
              api_key: SENDGRID_API_KEY,
              from: SENDGRID_FROM_EMAIL,
            }
          }] : []),
          ...(RESEND_API_KEY && RESEND_FROM_EMAIL ? [{
            resolve: './src/modules/email-notifications',
            id: 'resend',
            options: {
              channels: ['email'],
              api_key: RESEND_API_KEY,
              from: RESEND_FROM_EMAIL,
            },
          }] : []),
        ]
      }
    }] : []),
    ...(STRIPE_API_KEY && STRIPE_WEBHOOK_SECRET ? [{
      key: Modules.PAYMENT,
      resolve: '@medusajs/payment',
      options: {
        providers: [
          {
            resolve: '@medusajs/payment-stripe',
            id: 'stripe',
            options: {
              apiKey: STRIPE_API_KEY,
              webhookSecret: STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    }] : []),
    ...(IS_MOLONI_ENABLED ? [{
      resolve: './src/modules/moloni',
      options: {
        clientId: MOLONI_CLIENT_ID,
        clientSecret: MOLONI_CLIENT_SECRET,
        username: MOLONI_USER,
        password: MOLONI_PASSWORD,
        companyId: MOLONI_COMPANY_ID,
        sandbox: MOLONI_SANDBOX,
      }
    }] : [])
  ],
  plugins: [
    {
      // Frequently-bought-together. Subscribes to placed orders and serves
      // GET /store/products-bought-together/:product_id. Historical co-purchase
      // baskets (Moloni FT/FR/SM) are seeded once via
      // src/scripts/backfill-bought-together.ts; it self-maintains from live orders.
      resolve: '@rsc-labs/medusa-products-bought-together-v2',
      options: {}
    },
  ...(MEILISEARCH_HOST && MEILISEARCH_ADMIN_KEY ? [{
      resolve: '@rokmohar/medusa-plugin-meilisearch',
      options: {
        config: {
          host: MEILISEARCH_HOST,
          apiKey: MEILISEARCH_ADMIN_KEY
        },
        settings: {
          products: {
            type: 'products',
            enabled: true,
            // `fields` drives the admin graph query, so the SKU must be fetched
            // via the real relation path `variants.sku` (the flat `variant_sku`
            // is not a graph field and is silently dropped). The transformer
            // below flattens it into the indexed `variant_sku` attribute.
            fields: ['id', 'title', 'description', 'handle', 'variants.sku', 'thumbnail'],
            transformer: (product) => ({
              id: product.id,
              title: product.title,
              description: product.description,
              handle: product.handle,
              thumbnail: product.thumbnail,
              // Moloni reference(s) — the identifier the company/customers use.
              variant_sku: Array.isArray(product.variants)
                ? product.variants.map((v) => v?.sku).filter(Boolean)
                : [],
            }),
            indexSettings: {
              searchableAttributes: ['title', 'description', 'variant_sku'],
              displayedAttributes: ['id', 'handle', 'title', 'description', 'variant_sku', 'thumbnail'],
              filterableAttributes: ['id', 'handle'],
            },
            primaryKey: 'id',
          }
        }
      }
    }] : [])
  ]
};

console.log(JSON.stringify(medusaConfig, null, 2));
export default defineConfig(medusaConfig);
