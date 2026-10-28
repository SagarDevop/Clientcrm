/**
 * Schema migrations manager and version tracking
 */
export const CURRENT_SCHEMA_VERSION = 2;

export async function checkAndApplyMigrations(database) {
  // In Dexie, declared version upgrades in database.js apply automatically when opening.
  // We track the applied schema version in the settings table.
  try {
    const versionRecord = await database.settings.get('schemaVersion');
    const recordedVersion = versionRecord ? versionRecord.value : 1;

    if (!versionRecord) {
      await database.settings.put({
        key: 'schemaVersion',
        value: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      });
    } else if (recordedVersion < CURRENT_SCHEMA_VERSION) {
      // Future data migrations logic can be placed here
      await database.settings.put({
        key: 'schemaVersion',
        value: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true, version: CURRENT_SCHEMA_VERSION };
  } catch (error) {
    console.error('Migration check failed:', error);
    return { success: false, error };
  }
}
