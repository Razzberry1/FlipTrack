// Auto-shorten product names based on category patterns

// Common RAM brands
const RAM_BRANDS = ['Corsair', 'G.Skill', 'Kingston', 'Crucial', 'TeamGroup', 'ADATA', 'Patriot', 'PNY', 'Samsung', 'Hynix'];

// Common GPU brands
const GPU_BRANDS = ['ASUS', 'EVGA', 'MSI', 'Gigabyte', 'Zotac', 'PNY', 'NVIDIA', 'AMD', 'Sapphire', 'XFX', 'PowerColor'];

// Pokemon/TCG keywords
const TCG_KEYWORDS = ['Pokemon', 'Pokémon', 'TCG', 'Magic', 'MTG', 'Yu-Gi-Oh', 'Yugioh', 'Sports Card'];
const TCG_PRODUCTS = ['ETB', 'Elite Trainer Box', 'Booster Box', 'Booster Pack', 'Collection', 'Bundle', 'Tin', 'Premium Collection'];
const POKEMON_SETS = ['Prismatic Evolution', 'Scarlet & Violet', 'Paldea Evolved', 'Obsidian Flames', 'Paradox Rift',
                      '151', 'Crown Zenith', 'Silver Tempest', 'Lost Origin', 'Astral Radiance', 'Surging Sparks'];

function shortenProductName(fullName, sku) {
  const name = fullName.trim();
  const upperName = name.toUpperCase();

  // Check for RAM patterns
  if (upperName.includes('DDR4') || upperName.includes('DDR5') ||
      upperName.includes('RAM') || upperName.includes('MEMORY')) {
    return shortenRAM(name);
  }

  // Check for GPU patterns
  if (upperName.includes('RTX') || upperName.includes('GTX') ||
      upperName.includes('RADEON') || upperName.includes('GRAPHICS CARD') ||
      upperName.includes('GPU') || upperName.includes('RX ')) {
    return shortenGPU(name);
  }

  // Check for TCG/Pokemon patterns
  for (const keyword of TCG_KEYWORDS) {
    if (upperName.includes(keyword.toUpperCase())) {
      return shortenTCG(name);
    }
  }

  // Default: just truncate if too long
  if (name.length > 50) {
    return name.substring(0, 47) + '...';
  }

  return name;
}

function shortenRAM(name) {
  const parts = [];

  // Find brand
  for (const brand of RAM_BRANDS) {
    if (name.toUpperCase().includes(brand.toUpperCase())) {
      parts.push(brand);
      break;
    }
  }

  // Find model name (e.g., Vengeance, Trident, Fury)
  const modelPatterns = ['Vengeance', 'Trident', 'Fury', 'Dominator', 'Ripjaws', 'HyperX', 'T-Force'];
  for (const model of modelPatterns) {
    if (name.toUpperCase().includes(model.toUpperCase())) {
      parts.push(model);
      break;
    }
  }

  // Find DDR type
  const ddrMatch = name.match(/DDR[45]/i);
  if (ddrMatch) parts.push(ddrMatch[0].toUpperCase());

  // Find capacity
  const capacityMatch = name.match(/(\d+)\s*GB/i);
  if (capacityMatch) parts.push(capacityMatch[1] + 'GB');

  // Find speed
  const speedMatch = name.match(/(\d{4,5})\s*(MHz|MT\/s)/i);
  if (speedMatch) parts.push(speedMatch[1] + 'MHz');

  return parts.length > 2 ? parts.join(' ') : name.substring(0, 50);
}

function shortenGPU(name) {
  const parts = [];

  // Find brand
  for (const brand of GPU_BRANDS) {
    if (name.toUpperCase().includes(brand.toUpperCase())) {
      parts.push(brand);
      break;
    }
  }

  // Find GPU model (RTX/GTX/RX + number)
  const rtxMatch = name.match(/(RTX|GTX)\s*(\d{4}(\s*Ti)?)/i);
  const rxMatch = name.match(/RX\s*(\d{4}(\s*XT)?)/i);

  if (rtxMatch) {
    parts.push(rtxMatch[1].toUpperCase() + ' ' + rtxMatch[2]);
  } else if (rxMatch) {
    parts.push('RX ' + rxMatch[1]);
  }

  // Find VRAM
  const vramMatch = name.match(/(\d{1,2})\s*GB/i);
  if (vramMatch) parts.push(vramMatch[1] + 'GB');

  return parts.length > 1 ? parts.join(' ') : name.substring(0, 50);
}

function shortenTCG(name) {
  const parts = [];

  // Find brand (Pokemon, MTG, etc.)
  for (const keyword of TCG_KEYWORDS) {
    if (name.toUpperCase().includes(keyword.toUpperCase())) {
      parts.push(keyword === 'Pokémon' ? 'Pokemon' : keyword);
      break;
    }
  }

  // Find set name
  for (const set of POKEMON_SETS) {
    if (name.toUpperCase().includes(set.toUpperCase())) {
      parts.push(set);
      break;
    }
  }

  // Find product type
  for (const product of TCG_PRODUCTS) {
    if (name.toUpperCase().includes(product.toUpperCase())) {
      // Use abbreviation if it's Elite Trainer Box
      parts.push(product === 'Elite Trainer Box' ? 'ETB' : product);
      break;
    }
  }

  return parts.length > 1 ? parts.join(' ') : name.substring(0, 50);
}

function detectCategory(name) {
  const upperName = name.toUpperCase();

  if (upperName.includes('DDR4') || upperName.includes('DDR5') ||
      upperName.includes('RAM') || upperName.includes('MEMORY')) {
    return 'Electronics';
  }

  if (upperName.includes('RTX') || upperName.includes('GTX') ||
      upperName.includes('RADEON') || upperName.includes('GPU') ||
      upperName.includes('RX ')) {
    return 'Electronics';
  }

  for (const keyword of TCG_KEYWORDS) {
    if (upperName.includes(keyword.toUpperCase())) {
      if (keyword.includes('Pokemon') || keyword.includes('Pokémon')) {
        return 'Pokemon Cards';
      }
      return 'Trading Cards';
    }
  }

  return 'Other';
}

module.exports = { shortenProductName, detectCategory };
