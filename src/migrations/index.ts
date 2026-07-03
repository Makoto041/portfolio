import * as migration_20250517_093418_create_blogPosts from './20250517_093418_create_blogPosts';
import * as migration_20250517_093907_create_blogPosts from './20250517_093907_create_blogPosts';
import * as migration_20250706_074347_timeline_richtext_update from './20250706_074347_timeline_richtext_update';
import * as migration_20260703_155139_add_timeline_lifelog_fields from './20260703_155139_add_timeline_lifelog_fields';

export const migrations = [
  {
    up: migration_20250517_093418_create_blogPosts.up,
    down: migration_20250517_093418_create_blogPosts.down,
    name: '20250517_093418_create_blogPosts',
  },
  {
    up: migration_20250517_093907_create_blogPosts.up,
    down: migration_20250517_093907_create_blogPosts.down,
    name: '20250517_093907_create_blogPosts',
  },
  {
    up: migration_20250706_074347_timeline_richtext_update.up,
    down: migration_20250706_074347_timeline_richtext_update.down,
    name: '20250706_074347_timeline_richtext_update',
  },
  {
    up: migration_20260703_155139_add_timeline_lifelog_fields.up,
    down: migration_20260703_155139_add_timeline_lifelog_fields.down,
    name: '20260703_155139_add_timeline_lifelog_fields'
  },
];
