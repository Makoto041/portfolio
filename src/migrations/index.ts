import * as migration_20250517_093418_create_blogPosts from './20250517_093418_create_blogPosts';
import * as migration_20250517_093907_create_blogPosts from './20250517_093907_create_blogPosts';
import * as migration_20250706_074347_timeline_richtext_update from './20250706_074347_timeline_richtext_update';
import * as migration_20260703_155139_add_timeline_lifelog_fields from './20260703_155139_add_timeline_lifelog_fields';
import * as migration_20260705_021042_notices_and_hero from './20260705_021042_notices_and_hero';
import * as migration_20260705_031719_spotify_playlist from './20260705_031719_spotify_playlist';

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
    name: '20260703_155139_add_timeline_lifelog_fields',
  },
  {
    up: migration_20260705_021042_notices_and_hero.up,
    down: migration_20260705_021042_notices_and_hero.down,
    name: '20260705_021042_notices_and_hero',
  },
  {
    up: migration_20260705_031719_spotify_playlist.up,
    down: migration_20260705_031719_spotify_playlist.down,
    name: '20260705_031719_spotify_playlist'
  },
];
