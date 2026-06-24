import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260624180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_price_history" (
      "id" text not null,
      "product_id" text not null,
      "pvp1" integer null,
      "pvp2" integer null,
      "cost" integer null,
      "captured_at" timestamptz not null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "product_price_history_pkey" primary key ("id")
    );`)
    this.addSql(
      `create index if not exists "IDX_pph_product_captured" on "product_price_history" ("product_id", "captured_at") where "deleted_at" is null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_price_history" cascade;`)
  }
}
