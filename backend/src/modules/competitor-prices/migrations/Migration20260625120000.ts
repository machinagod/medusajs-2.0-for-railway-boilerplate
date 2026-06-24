import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260625120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "competitor" add column if not exists "price_tax_basis" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "competitor" drop column if exists "price_tax_basis";`)
  }
}
