## Установка и настройка

Скачать репозиторий и установить модули:

    git clone https://github.com/personal-security/hacker-simulator-rest.git
    cd hacker-simulator-rest
    npm i

Прописать в .env файле все необходимые данные:

    AUTH=3001
    DB_URL=postgres://username:password@host:port/db
    DEFAULT=80
    GAME_2048=4001
    HACKER=3002
    I18N=5001
    NETWALK=4002
    SECRET=someStrongSecretKey

Загрузить таблицы и строки в БД:

    sudo -u postgres psql db
    \i db/tables.sql
    \i db/rows.sql

Запустить все микросервисы через PM2:

    pm2 start all