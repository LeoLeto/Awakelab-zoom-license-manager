import mongoose from 'mongoose';
import { Assignment } from '../models/Assignment.model';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * Migrate legacy `tipoUso` values on assignments to the current enum values.
 *
 * Older assignments hold `tipoUso` strings that predate the current enum
 * (e.g. "USO ASOCIADO A LMS MOODLE GRUPO ASPASIA"). These break any full
 * document validation (Mongoose `.save()`), so this script normalises them.
 *
 * Writes go through the raw MongoDB driver (Assignment.collection) so they
 * bypass Mongoose validators — otherwise the very values we are fixing would
 * block the update.
 *
 * Usage (from backend/):
 *   npm run migrate-tipouso            # DRY RUN — reports, changes nothing
 *   npm run migrate-tipouso -- --apply # APPLY — writes the changes
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zoom_licenses';

const CANONICAL = {
  NO_PLATFORM: 'Uso no asociado a plataforma',
  MOODLE: 'Uso para una plataforma Moodle de Grupo Aspasia',
} as const;

const VALID = new Set<string>([CANONICAL.NO_PLATFORM, CANONICAL.MOODLE]);

/**
 * Map a legacy tipoUso string to a canonical enum value, or null when the
 * value cannot be mapped confidently (those are reported, never guessed).
 * "NO ASOCIAD" is checked before "ASOCIAD" because it is a substring.
 */
function mapLegacy(value: string): string | null {
  const v = value.toUpperCase();
  // Explicit decisions for one-off legacy values.
  if (v.includes('REUNI')) return CANONICAL.NO_PLATFORM; // "Reunión" → standalone meeting use
  if (v === 'BOTH') return CANONICAL.MOODLE; // "Both" → includes platform use
  // General rules. "NO ASOCIAD" is checked before "ASOCIAD" (substring).
  if (v.includes('NO ASOCIAD')) return CANONICAL.NO_PLATFORM;
  if (v.includes('MOODLE') || v.includes('LMS') || v.includes('ASOCIAD') || v.includes('PLATAFORMA')) {
    return CANONICAL.MOODLE;
  }
  return null;
}

async function run() {
  const apply = process.argv.includes('--apply');
  console.log(`\n🔧 Migrate legacy tipoUso — mode: ${apply ? 'APPLY (writing changes)' : 'DRY RUN (no changes)'}\n`);

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  try {
    const allValues: string[] = await Assignment.collection.distinct('tipoUso');
    const legacyValues = allValues.filter((v) => !VALID.has(v));

    if (legacyValues.length === 0) {
      console.log('🎉 No legacy tipoUso values found. Nothing to migrate.');
      return;
    }

    console.log(`Found ${legacyValues.length} distinct legacy value(s):\n`);

    let totalMatched = 0;
    let totalUpdated = 0;
    const unmapped: string[] = [];

    for (const legacy of legacyValues) {
      const count = await Assignment.collection.countDocuments({ tipoUso: legacy });
      const target = mapLegacy(legacy);
      totalMatched += count;

      if (!target) {
        unmapped.push(legacy);
        console.log(`   ⚠️  "${legacy}" — ${count} doc(s) — NO confident mapping (left untouched)`);
        continue;
      }

      console.log(`   • "${legacy}" — ${count} doc(s) → "${target}"`);

      if (apply) {
        const res = await Assignment.collection.updateMany(
          { tipoUso: legacy },
          { $set: { tipoUso: target } }
        );
        totalUpdated += res.modifiedCount ?? 0;
      }
    }

    console.log('\n────────────────────────────────────────');
    console.log(`Documents matched (legacy): ${totalMatched}`);
    console.log(
      apply
        ? `Documents updated:          ${totalUpdated}`
        : 'Documents updated:          0 (dry run — re-run with --apply to write)'
    );

    if (unmapped.length > 0) {
      console.log(`\n⚠️  ${unmapped.length} value(s) had no confident mapping and were NOT changed:`);
      unmapped.forEach((v) => console.log(`     - "${v}"`));
      console.log('   Review these manually and extend mapLegacy() if needed.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
