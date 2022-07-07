INSERT INTO users (username, pswhash, role) VALUES
  ('admin', crypt('administrator', gen_salt('md5')), 'admin');

INSERT INTO users (username, pswhash) VALUES
  ('userTwo', crypt('12345678', gen_salt('md5')));

INSERT INTO users (username, pswhash) VALUES
  ('userThree', crypt('12345678', gen_salt('md5')));

INSERT INTO users (username, pswhash) VALUES
  ('userFour', crypt('12345678', gen_salt('md5')));

INSERT INTO users (username, pswhash) VALUES
  ('userFive', crypt('12345678', gen_salt('md5')));

INSERT INTO clans (title, leader_id, leader) VALUES
  ('anonymous', 1, 'admin'),
  ('clanTwo', 2, 'userTwo');

INSERT INTO profiles (user_id, username, clan_id, clan, level, money_rub, money_btc) VALUES
  (1, 'admin', 1, 'anonymous', 50, 1000000000, 100),
  (2, 'userTwo', 2, 'clanTwo', 25, 100000, 1),
  (3, 'userThree', 1, 'anonymous', 25, 100000, 1),
  (4, 'userFour', NULL, NULL, 25, 100000, 1),
  (5, 'userFive', 1, 'anonymous', 25, 100000, 1);

INSERT INTO messages (sent_at, user_id, username, clan_id, clan, message) VALUES
  (now() AT TIME ZONE 'utc' - interval '5 minute', 1, 'admin', 1, 'anonymous', 'Hi there! My name is one'),
  (now() AT TIME ZONE 'utc' - interval '4 minute', 2, 'userTwo', 2, 'userTwo', 'Hi there! My name is two'),
  (now() AT TIME ZONE 'utc' - interval '3 minute', 3, 'userThree', 1, 'anonymous', 'Hi there! My name is three'),
  (now() AT TIME ZONE 'utc' - interval '2 minute', 4, 'userFour', NULL, NULL, 'Hi there! My name is four'),
  (now() AT TIME ZONE 'utc' - interval '1 minute', 5, 'userFive', 1, 'anonymous', 'Hi there! My name is five');

INSERT INTO news (date, title, body) VALUES
  (now() AT TIME ZONE 'utc' - interval '2 day', 'BREAKING NEWS', 'Lorem Ipsum Dolor'),
  (now() AT TIME ZONE 'utc' - interval '1 day', 'А тем временем', 'В Багдаде все спокойно');

INSERT INTO direct_messages (sent_at, user_id_from, username_from, user_id_to, username_to, message) VALUES
  (now() AT TIME ZONE 'utc' - interval '10 hours', 1, 'admin', 2, 'userTwo', random()),
  (now() AT TIME ZONE 'utc' - interval '11 hours', 1, 'admin', 3, 'userThree', random()),
  (now() AT TIME ZONE 'utc' - interval '12 hours', 1, 'admin', 4, 'userFour', random()),
  (now() AT TIME ZONE 'utc' - interval '13 hours', 1, 'admin', 5, 'userFive', random()),
  (now() AT TIME ZONE 'utc' - interval '14 hours', 2, 'userTwo', 1, 'admin', random()),
  (now() AT TIME ZONE 'utc' - interval '15 hours', 2, 'userTwo', 3, 'userThree', random()),
  (now() AT TIME ZONE 'utc' - interval '16 hours', 2, 'userTwo', 4, 'userFour', random()),
  (now() AT TIME ZONE 'utc' - interval '17 hours', 2, 'userTwo', 5, 'userFive', random()),
  (now() AT TIME ZONE 'utc' - interval '18 hours', 3, 'userThree', 1, 'admin', random()),
  (now() AT TIME ZONE 'utc' - interval '19 hours', 3, 'userThree', 2, 'userTwo', random()),
  (now() AT TIME ZONE 'utc' - interval '20 hours', 3, 'userThree', 4, 'userFour', random()),
  (now() AT TIME ZONE 'utc' - interval '21 hours', 3, 'userThree', 5, 'userFive', random()),
  (now() AT TIME ZONE 'utc' - interval '22 hours', 4, 'userFour', 1, 'admin', random()),
  (now() AT TIME ZONE 'utc' - interval '23 hours', 4, 'userFour', 2, 'userTwo', random()),
  (now() AT TIME ZONE 'utc' - interval '24 hours', 4, 'userFour', 3, 'userThree', random()),
  (now() AT TIME ZONE 'utc' - interval '25 hours', 4, 'userFour', 5, 'userFive', random()),
  (now() AT TIME ZONE 'utc' - interval '26 hours', 5, 'userFive', 1, 'admin', random()),
  (now() AT TIME ZONE 'utc' - interval '27 hours', 5, 'userFive', 2, 'userTwo', random()),
  (now() AT TIME ZONE 'utc' - interval '28 hours', 5, 'userFive', 3, 'userThree', random()),
  (now() AT TIME ZONE 'utc' - interval '29 hours', 5, 'userFive', 4, 'userFour', random());