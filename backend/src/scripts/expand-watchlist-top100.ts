import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COMPETITOR_PRICES_MODULE } from "../modules/competitor-prices"

/**
 * Bootstrap the competitor-price watchlist with our TOP-100 best sellers
 * (trailing 12 months, by revenue, from the Moloni sales cache as of 2026-06-23).
 *
 * Our Medusa variant `sku` equals the Moloni `reference`, so we resolve each
 * top-seller to its Medusa product by SKU and upsert a product_watch (the watch
 * is keyed unique on product_id, so re-runs are idempotent).
 *
 * Pure services (labour, etc.) are excluded — they have no competitor price.
 * Run:  medusa exec ./src/scripts/expand-watchlist-top100.ts        (dry-run)
 *       medusa exec ./src/scripts/expand-watchlist-top100.ts commit (persist)
 */

// reference (= our SKU) → display name. Order = revenue rank.
const TOP_SELLERS: Array<{ ref: string; name: string }> = [
  { ref: "NES1512405101", name: "Maquina Injecção/Extracção AX 14 Nilfisk" },
  { ref: "PA3023", name: "Toalha de Mãos Zig-Zag Amoos 2F 21x22cm (20 maços)" },
  { ref: "DL1021", name: "Super Desengordurante (5L)" },
  { ref: "M-3030690", name: "Triturador XM-52 230/50-60/1 Sammic" },
  { ref: "DL1051", name: "Lava Loiça Máquina (20L/25Kg)" },
  { ref: "FR1900", name: "Embalagem Alumínio Redonda 1900cc com Tampa - 08D (100un)" },
  { ref: "DI1040", name: "Swarfega Orange (4L)" },
  { ref: "7508916", name: "JD Spectak G VC1 (20L)" },
  { ref: "PF3109", name: "Papel Chaminé Amoos 2F 129m (6 Rolos)" },
  { ref: "DT1503", name: "Cook Desentop (1,5Kg)" },
  { ref: "PB3017", name: "Papel Higiénico Celea 2F 35m (96 rolos)" },
  { ref: "AC70000", name: "Saboneteira Aitana Branca" },
  { ref: "N107415322", name: "Aspirador Vp300 Hepa Basic Nilfisk" },
  { ref: "PB3023", name: "Papel Higiénico Jumbo Eco Renova 2F 180m (12 rolos)" },
  { ref: "N107421144", name: "Aspirador VP300 Hepa Basic" },
  { ref: "100882635", name: "Hypofoam VF6 (20L)" },
  { ref: "AH37002", name: "Suporte Toalhas ABS Smart Branco" },
  { ref: "PE3105", name: "Rolo Industrial Amoos 2F 400m (2 rolos)" },
  { ref: "AK12002", name: "Aerosol Inseticida (4un)" },
  { ref: "ADV2100W", name: "Secador Branco Automático" },
  { ref: "DA2010", name: "Detergente Optima Basic (20L)" },
  { ref: "N1408618000", name: "Sacos p/ GD-910 (10un)" },
  { ref: "DA2013", name: "Detergente Optima Tenso (20L)" },
  { ref: "PB3037", name: "Papel Higiénico Celea 2F 56m (42 rolos)" },
  { ref: "AD97009020.01", name: "Porta Rolos Branco com Cobertura Azul Hermética" },
  { ref: "PA3265", name: "Papel Autocorte GC Ecologic 1F 150m (6 rolos)" },
  { ref: "SV-1525", name: "Sacos Vácuo 15x25 (Cx1000)" },
  { ref: "PT2121", name: "Toalhas de Mesa em Rolo 1,20x100m (1 rolo)" },
  { ref: "DI1043", name: "Swarfega Orange Pump (4L)" },
  { ref: "M-012363", name: "Espalhador 75 mm 4.3kW" },
  { ref: "EA2007", name: "Eliminador de Insectos - Luralite" },
  { ref: "PB3021", name: "Papel Higiénico Jumbo (12 rolos)" },
  { ref: "N9097354000", name: "Kit Lábios 720MM 28 PU" },
  { ref: "PP0450", name: "Embalagem Plástica para Sopa Pequena com Tampa (50un)" },
  { ref: "PC3046", name: "Guardanapos 40x40cm (24 maços)" },
  { ref: "BH0001", name: "Sabonetes 12gr Flow Pack (500un)" },
  { ref: "DA2015", name: "Detergente Optima Star (25L)" },
  { ref: "7010131", name: "Suma Rinse A5 (20L)" },
  { ref: "PB3025", name: "Papel Higiénico Jumbo Renova 2F 170m (12 rolos)" },
  { ref: "HT9013", name: "Rolo Folha Alumínio 0,40x250m" },
  { ref: "NVF90417", name: 'Escova 20"' },
  { ref: "PC3043", name: "Guardanapos 33x33cm (30 maços)" },
  { ref: "DA2014", name: "Detergente Suavinet DM (20L)" },
  { ref: "DB1522", name: "Hipoclorito de Sódio (6Kg)" },
  { ref: "M-012362", name: "Espalhador 95mm 6.4kW" },
  { ref: "DM1201", name: "Gel de Maos (5L)" },
  { ref: "HR1162", name: "Rolo Pano Microfibra Superglass (3,6m x 40cm)" },
  { ref: "DL1050", name: "Lava Loiça Máquina (5L/6Kg)" },
  { ref: "7513206", name: "Tapi Extract C1B (5L)" },
  { ref: "DA2012", name: "Detergente Optima Oxigen (20L)" },
  { ref: "M-5300112", name: "Cesto para Pratos 500x500mm C-3 Sammic" },
  { ref: "SA4003", name: "Sacos Lixo Preto 80x120 (10Kg)" },
  { ref: "HI1203", name: "Contentor com Rodas e Pedal 120L (601/2/3P)" },
  { ref: "PE3112", name: "Rolo Industrial TT 2F (2 rolos)" },
  { ref: "SR2002", name: "Rolo Lixo Preto 90x110 BD (10 sacos x 25 rolos)" },
  { ref: "PC3034", name: "Guardanapos Tipo L (6000 folhas)" },
  { ref: "HT8053", name: "Esfregão Aço Inox 60gr Celea (10un)" },
  { ref: "HC2007", name: "Carro 25L C/Prensa Vertical" },
  { ref: "PA3011", name: "Toalhas de Mão V Eco Celea 2F 21x20,5cm (20 maços x 190 folhas)" },
  { ref: "SD4204", name: "Sacos Lixo Branco 80x120 (10Kg)" },
  { ref: "7508266", name: "Suma Grill D9 (6x2L)" },
  { ref: "DL1003", name: "Lava Loiça Manual Super Concentrado (5L)" },
  { ref: "PCT224046", name: "Guardanapos 47x47cm GC Class Dalia Branco (500un)" },
  { ref: "SV-2030", name: "Sacos Vácuo 20x30 (Cx1000)" },
  { ref: "V143585", name: "Pano PVA Micro Azul 35x38 (5un)" },
  { ref: "DL1060", name: "Abrilhantador Maquina (5L)" },
  { ref: "N107419590", name: "Sacos Filtro Aero (5un)" },
  { ref: "HB2621", name: "Recarga Vassoura Retangular Profissional Fibras Suaves" },
  { ref: "AI90000", name: "Dispensador Basic para Aromas/Inseticida" },
  { ref: "7010074", name: "Suma Ultra L2 (20L)" },
  { ref: "PT2580", name: "Toalhas de Mesa 80X80 (200)" },
  { ref: "DI2073", name: "Deb Original Foam Wash (6x1L)" },
  { ref: "406150", name: "Detergente Lavagem Automática de Louça (5L)" },
  { ref: "PC3041", name: "Guardanapos Celea 33x33cm (30 maços x 100)" },
  { ref: "DI5010", name: "Janitol Plus (5L)" },
  { ref: "PT2100", name: "Toalha de Mesa em Rolo 1x100m (1 rolo)" },
  { ref: "DC1201", name: "Detergente Desinfetante (5L)" },
  { ref: "HH3602", name: "Haste telescópica 2 x 1,5m" },
  { ref: "V100235", name: "Peluche Completo Evolution 35cm" },
  { ref: "BH1020", name: "Champô/Gel de Banho Frasco 30ml Aroma (230un)" },
  { ref: "101105542", name: "Taski Sprint Emerel Degreaser (5L)" },
  { ref: "100842645", name: "Optimax Rinse (20L)" },
  { ref: "PL900000900", name: "Pedra Lávica (5kg)" },
  { ref: "PA3264", name: "Papel Autocorte GC Ecologic 2F 150m (6 rolos)" },
  { ref: "V143586", name: "Pano PVA Micro Vermelho 35x38 (5un)" },
  { ref: "SB4114", name: "Sacos Lixo Azul 80x100 (10Kg)" },
  { ref: "N9099692000", name: "Mangueira de Despejo Nilfisk" },
  { ref: "V100243", name: "Lava Vidros Completo Evolution 35cm" },
  { ref: "RP2100", name: "Avental de PE Branco (100un)" },
  { ref: "SA4004", name: "Sacos Lixo Preto 100x120 com Fole (10Kg)" },
  { ref: "FR2600", name: "Embalagem Alumínio Oval 2600cc com Tampa - 22 (100un)" },
  { ref: "DC1103", name: "Detergente Lava Tudo Lavanda (5L)" },
  { ref: "HH3101", name: "Cabo Metálico com Rosca 1,40m" },
  { ref: "7516657", name: "Suma Chlorsan D10.4 (20L)" },
  { ref: "SC4405", name: "Sacos Lixo Branco 70x100 (10Kg)" },
  { ref: "7512912", name: "Good Sense Fresh (6x0,75ml)" },
  { ref: "100842643", name: "Optimax Detergente (20L)" },
  { ref: "M-00002", name: "Filtro Anti-Gordura 500.500.50" },
  { ref: "M-S0100252", name: "Espalhador Cobre Pequeno" },
]

// Pure-service / non-product references that have no competitor price.
const EXCLUDE_REFS = new Set(["M.O.", "M.O"])

export default async function expandWatchlist({ container }: { container: any }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const svc: any = container.resolve(COMPETITOR_PRICES_MODULE)
  const commit = process.argv.includes("commit")

  const targets = TOP_SELLERS.filter((t) => !EXCLUDE_REFS.has(t.ref))
  logger.info(
    `[expand-watchlist] ${commit ? "COMMIT" : "DRY-RUN"} — ${targets.length} top sellers (excluded ${TOP_SELLERS.length - targets.length} service refs)`
  )

  // Resolve our products by variant SKU (= Moloni reference).
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "variants.sku"],
    pagination: { take: 5000, skip: 0 },
  })
  const bySku = new Map<string, any>()
  for (const p of products) {
    for (const v of p.variants ?? []) {
      if (v.sku) bySku.set(String(v.sku), p)
    }
  }

  let created = 0
  let existed = 0
  const missing: string[] = []
  for (const t of targets) {
    const p = bySku.get(t.ref)
    if (!p) {
      missing.push(t.ref)
      continue
    }
    const [w] = await svc.listProductWatches({ product_id: p.id })
    if (w) {
      existed++
      continue
    }
    if (commit) {
      await svc.createProductWatches({
        product_id: p.id,
        product_sku: t.ref,
        title: p.title ?? t.name,
      })
    }
    created++
  }

  logger.info(
    `[expand-watchlist] watches ${commit ? "created" : "to create"}=${created} existed=${existed} missing=${missing.length}`
  )
  if (missing.length) {
    logger.warn(`[expand-watchlist] no Medusa product for refs: ${missing.join(", ")}`)
  }
  if (!commit) {
    logger.info("[expand-watchlist] DRY-RUN — pass 'commit' to persist")
  }
}
