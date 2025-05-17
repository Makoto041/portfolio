import * as migration_20250517_093418_create_blogPosts from './20250517_093418_create_blogPosts';
import * as migration_20250517_093907_create_blogPosts from './20250517_093907_create_blogPosts';

export const migrations = [
  {
    up: migration_20250517_093418_create_blogPosts.up,
    down: migration_20250517_093418_create_blogPosts.down,
    name: '20250517_093418_create_blogPosts',
  },
  {
    up: migration_20250517_093907_create_blogPosts.up,
    down: migration_20250517_093907_create_blogPosts.down,
    name: '20250517_093907_create_blogPosts'
  },
];
