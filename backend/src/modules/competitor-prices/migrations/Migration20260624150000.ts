import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260624150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "competitor" add column if not exists "scraper_hints" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "competitor" drop column if exists "scraper_hints";`)
  }
}
