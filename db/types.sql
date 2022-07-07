drop type if exists
  lang,
  role,
  text_type
cascade;

create type lang as enum ('ru', 'en');
create type role as enum (
  'admin',
  'moderator',
  'player',
  'translator'
);
create type text_type as enum ('static', 'dynamic');