import { db } from '../database.js';
import { generateId } from '../../utils/id.js';

export const CONTENT_STAGES = [
  { id: 'idea', label: 'Idea', color: 'slate' },
  { id: 'planned', label: 'Planned', color: 'blue' },
  { id: 'in_production', label: 'In Production', color: 'amber' },
  { id: 'internal_review', label: 'Internal Review', color: 'purple' },
  { id: 'client_review', label: 'Client Review', color: 'indigo' },
  { id: 'approved', label: 'Approved', color: 'emerald' },
  { id: 'scheduled', label: 'Scheduled', color: 'teal' },
  { id: 'published', label: 'Published', color: 'emerald' },
];

export const CONTENT_CHANNELS = [
  { id: 'instagram_reels', label: 'Instagram Reel', icon: 'Film' },
  { id: 'instagram_stories', label: 'Instagram Story', icon: 'Circle' },
  { id: 'instagram_post', label: 'Static Post', icon: 'Image' },
  { id: 'instagram_carousel', label: 'Carousel', icon: 'Layers' },
  { id: 'youtube', label: 'YouTube Video/Short', icon: 'Play' },
  { id: 'linkedin', label: 'LinkedIn Post', icon: 'Share2' },
  { id: 'custom', label: 'Other Channel', icon: 'Globe' },
];

export const contentRepo = {
  async getAll({ clientId, stage, channel, search } = {}, database = db) {
    if (!database.content_items) return [];
    let collection = database.content_items.toCollection();

    if (clientId) {
      collection = database.content_items.where('clientId').equals(clientId);
    } else if (stage) {
      collection = database.content_items.where('stage').equals(stage);
    }

    let items = await collection.sortBy('scheduledDate');
    items.reverse();

    if (clientId && stage) {
      items = items.filter((item) => item.stage === stage);
    }
    if (channel) {
      items = items.filter((item) => item.channel === channel);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(q)) ||
          (item.caption && item.caption.toLowerCase().includes(q)) ||
          (item.clientName && item.clientName.toLowerCase().includes(q))
      );
    }

    return items;
  },

  async getById(id, database = db) {
    if (!id || !database.content_items) return null;
    return database.content_items.get(id);
  },

  async create(data, database = db) {
    const now = new Date().toISOString();
    const id = data.id || generateId();

    const record = {
      id,
      clientId: data.clientId,
      clientName: (data.clientName || '').trim(),
      channel: data.channel || 'instagram_reels',
      title: (data.title || '').trim(),
      caption: (data.caption || '').trim(),
      brief: (data.brief || '').trim(),
      assetUrl: (data.assetUrl || '').trim(),
      scriptNotes: (data.scriptNotes || '').trim(),
      scheduledDate: data.scheduledDate || null,
      stage: data.stage || 'idea', // idea, planned, in_production, internal_review, client_review, approved, scheduled, published
      approvalStatus: data.approvalStatus || 'pending', // pending, approved, rejected
      revisionNotes: (data.revisionNotes || '').trim(),
      publishedUrl: (data.publishedUrl || '').trim(),
      publishedAt: data.stage === 'published' ? now : null,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    if (database.content_items) {
      await database.content_items.add(record);
    }
    return record;
  },

  async update(id, updates, database = db) {
    if (!database.content_items) return null;
    const existing = await database.content_items.get(id);
    if (!existing) throw new Error(`Content item ${id} not found`);

    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };

    if (updates.stage === 'published' && !existing.publishedAt) {
      cleanUpdates.publishedAt = now;
    }

    await database.content_items.update(id, cleanUpdates);
    return database.content_items.get(id);
  },

  async updateStage(id, stage, database = db) {
    return this.update(id, { stage }, database);
  },

  async delete(id, database = db) {
    if (!database.content_items) return false;
    return database.content_items.delete(id);
  },
};
