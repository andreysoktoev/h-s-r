DROP TABLE IF EXISTS
  cars,
  clan_chat,
  clans,
  daily_payments,
  direct_messages,
  experience,
  friends,
  gifts,
  girls,
  hardware,
  health,
  housing,
  item_perks,
  job,
  locales,
  longterm_job,
  messages,
  news,
  profiles,
  roles,
  software,
  texts,
  users
CASCADE;

CREATE TABLE cars (
  id int UNIQUE NOT NULL,
  level int NOT NULL,
  title text NOT NULL,
  description text,
  user_level int NOT NULL,
  price_rub int not null,
  image_path text
);

CREATE TABLE clan_chat (
  id SERIAL,
  sent_at timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  clan_id int NOT NULL,
  clan text NOT NULL,
  user_id int NOT NULL,
  username text NOT NULL,
  message text NOT NULL
);

CREATE TABLE clans (
  id serial,
  title citext check ((char_length(title) BETWEEN 4 and 16) AND title ~* '^[a-z][a-z0-9]+$') UNIQUE NOT NULL,
  rating int DEFAULT 0,
  leader_id int UNIQUE NOT NULL,
  leader text UNIQUE NOT NULL,
  membership_requests int[] DEFAULT '{}'
);

CREATE TABLE daily_payments (
  id serial,
  user_id int NOT NULL,
  type text NOT NULL,
  rating int NOT NULL,
  daily_money int NOT NULL,
  paid_at timestamp NOT NULL
);

CREATE TABLE direct_messages (
  sent_at timestamp NOT NULL,
  user_id_from int NOT NULL,
  username_from text NOT NULL,
  user_id_to int NOT NULL,
  username_to text NOT NULL,
  message text NOT NULL
);

CREATE TABLE experience (
  id serial,
  experience_points int NOT NULL,
  level int NOT NULL
);

CREATE TABLE friends (
  user_to_id int NOT NULL,
  user_from_id int NOT NULL,
  direct text NOT NULL
);

CREATE TABLE gifts (
  id int UNIQUE NOT NULL,
  title text NOT NULL,
  amount float NOT NULL
);

CREATE TABLE girls (
  id int UNIQUE NOT NULL,
  type text NOT NULL,
  level int NOT NULL,
  title text NOT NULL,
  description text,
  image_path text,
  user_level int NOT NULL,
  price_rub int NOT NULL,
  daily_money int NOT NULL,
  rating int NOT NULL
);

CREATE TABLE hardware (
  id int UNIQUE NOT NULL,
  type text NOT NULL,
  level int NOT NULL,
  title text NOT NULL,
  description text,
  image_path text,
  user_level int NOT NULL,
  price_rub int not null
);

CREATE TABLE health (
  id int UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL,
  image_path text,
  user_level int NOT NULL,
  price_rub int not null,
  health int NOT NULL,
  alcohol int NOT NULL,
  mood int NOT NULL
);

CREATE TABLE housing (
  id int UNIQUE NOT NULL,
  level int NOT NULL,
  title text NOT NULL,
  description text,
  user_level int NOT NULL,
  price_rub int not null,
  image_path text
);

CREATE TABLE item_perks (
  left_money int NOT NULL,
  speed_hack int NOT NULL,
  speed_work int NOT NULL,
  chance_good_job int NOT NULL
);

CREATE TABLE job (
  id int UNIQUE NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  user_level int NOT NULL,
  price_rub int,
  price_btc float,
  required_software int[] NOT NULL,
  work_hack int NOT NULL,
  xp int NOT NULL,
  moves int NOT NULL,
  health int NOT NULL,
  alcohol int NOT NULL,
  mood int NOT NULL
);

CREATE TABLE longterm_job (
  id int UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  image_path text,
  user_level int NOT NULL,
  price_rub int,
  price_btc float,
  work_hack int NOT NULL,
  xp int NOT NULL,
  time int NOT NULL,
  moves int NOT NULL,
  health int NOT NULL,
  alcohol int NOT NULL,
  mood int NOT NULL
);

CREATE TABLE messages (
  id SERIAL,
  sent_at timestamp NOT NULL,
  user_id int NOT NULL,
  username text NOT NULL,
  clan_id int,
  clan text,
  message text NOT NULL
);

CREATE TABLE news (
  id serial,
  date timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  title text NOT NULL,
  body text NOT NULL
);

create table roles (
  id serial,
  role text not null unique,
  allow text[] not null default '{}',
  forbid text[] not null default '{}'
);

CREATE TABLE software (
  id int UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  short_description text,
  image_path text,
  user_level int NOT NULL,
  price_rub int not null,
  hardware_level int NOT NULL
);

CREATE TABLE texts (
  id serial,
  alias text PRIMARY KEY NOT NULL,
  text text NOT NULL,
  type text_type NOT NULL,
  ref text,
  hash bytea GENERATED ALWAYS AS (digest(text, 'md5')) STORED
);

CREATE TABLE locales (
  id serial,
  alias text REFERENCES texts ON DELETE CASCADE NOT NULL,
  lang lang NOT NULL,
  translation text NOT NULL,
  text_hash bytea NOT NULL
);

CREATE TABLE users (
  id serial PRIMARY KEY,
  username citext check ((char_length(username) BETWEEN 4 and 16) AND username ~* '^[a-z][a-z0-9]+$') UNIQUE NOT NULL,
  pswhash text NOT NULL,
  role role default 'player' not null
);

CREATE TABLE profiles (
  user_id int REFERENCES users ON DELETE CASCADE NOT NULL,
  username citext check ((char_length(username) BETWEEN 4 and 16) AND username ~* '^[a-z][a-z0-9]+$') UNIQUE NOT NULL,
  alco_balance int DEFAULT 0 CHECK (alco_balance BETWEEN 0 AND 100) NOT NULL,
  alco_liters_use int DEFAULT 0 NOT NULL,
  car int DEFAULT 1 NOT NULL,
  clan text,
  clan_id int,
  experience_points int DEFAULT 0 NOT NULL,
  next_xp int,
  friends int[] DEFAULT '{}' NOT NULL,
  friendship_requests int[] DEFAULT '{}' NOT NULL,
  girl_level int GENERATED ALWAYS AS (LEAST(
    girl_clothes,
    girl_appearance,
    girl_jewelry,
    girl_sport,
    girl_leisure
  )) STORED,
  gift_availability timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  girl_appearance int DEFAULT 1 NOT NULL,
  girl_clothes int DEFAULT 1 NOT NULL,
  girl_jewelry int DEFAULT 1 NOT NULL,
  girl_leisure int DEFAULT 1 NOT NULL,
  girl_sport int DEFAULT 1 NOT NULL,
  health_points int DEFAULT 100 CHECK (health_points BETWEEN 0 AND 100) NOT NULL,
  house int DEFAULT 1 NOT NULL,
  installed_software int[] DEFAULT '{}' NOT NULL,
  job_end timestamp,
  lang lang default 'ru' NOT NULL,
  level int DEFAULT 1 NOT NULL,
  money_btc numeric DEFAULT 0 CHECK (money_btc >= 0) NOT NULL,
  money_rub int DEFAULT 1000 CHECK (money_rub >= 0) NOT NULL,
  mood int DEFAULT 100 CHECK (mood BETWEEN 0 AND 100) NOT NULL,
  moves int DEFAULT 500 check (moves >= 0) NOT NULL,
  hardware_level int GENERATED ALWAYS AS (LEAST(
    pc_cooling,
    pc_cpu,
    pc_drive,
    pc_network,
    pc_motherboard,
    pc_power,
    pc_ram,
    pc_gpu
  )) STORED,
  pc_cooling int DEFAULT 1 NOT NULL,
  pc_cpu int DEFAULT 1 NOT NULL,
  pc_drive int DEFAULT 1 NOT NULL,
  pc_gpu int DEFAULT 1 NOT NULL,
  pc_motherboard int DEFAULT 1 NOT NULL,
  pc_network int DEFAULT 1 NOT NULL,
  pc_power int DEFAULT 1 NOT NULL,
  pc_ram int DEFAULT 1 NOT NULL,
  rating int DEFAULT 0 CHECK (rating >= 0) NOT NULL,
  read_news int[] DEFAULT '{}' NOT NULL,
  work_hack_balance int DEFAULT 0 CHECK (work_hack_balance BETWEEN -100 AND 100) NOT NULL
);