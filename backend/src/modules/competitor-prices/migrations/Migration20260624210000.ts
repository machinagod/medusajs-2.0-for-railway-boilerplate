import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260624210000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "product_watch" add column if not exists "consecutive_misses" integer not null default 0;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_watch" drop column if exists "consecutive_misses";`)
  }
}
