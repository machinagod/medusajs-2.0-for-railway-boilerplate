import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260615111408 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "moloni_sync_cursor" drop constraint if exists "moloni_sync_cursor_entity_unique";`);
    this.addSql(`create table if not exists "moloni_sync_cursor" ("id" text not null, "entity" text not null, "last_modified" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "moloni_sync_cursor_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_moloni_sync_cursor_deleted_at" ON "moloni_sync_cursor" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_moloni_sync_cursor_entity_unique" ON "moloni_sync_cursor" ("entity") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "moloni_sync_cursor" cascade;`);
  }

}
