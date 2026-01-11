import { Shipment } from '../models/Shipment.js'

export async function runDbMigrations() {
  // Some users may have an old/incorrect unique index on `shipments.email`.
  // That breaks creation because new shipment docs don't have an email field (treated as null).
  // Error: E11000 duplicate key error ... shipments index: email_1 dup key: { email: null }
  try {
    const indexes = await Shipment.collection.indexes()
    const hasBadEmailIndex = indexes.some((i) => i?.name === 'email_1' && i?.key?.email === 1)

    if (hasBadEmailIndex) {
      // eslint-disable-next-line no-console
      console.log('[db] Dropping invalid index shipments.email_1')
      await Shipment.collection.dropIndex('email_1')
    }
  } catch (e) {
    // Don't crash the app if indexes cannot be read/dropped (permissions, etc.).
    // eslint-disable-next-line no-console
    console.warn('[db] Migration warning:', e?.message ?? e)
  }
}
