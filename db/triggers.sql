drop function if exists
  news(),
  profile()
cascade;

create function news() returns trigger as $$
  begin
    perform pg_notify('news', null);
    return null;
  end;
$$ language plpgsql;

create function profile() returns trigger as $$
  begin

    if tg_op = any (array['INSERT', 'UPDATE']) then
      update profiles p
      set next_xp = (
        select min(experience_points)
        from experience e
        where p.level < e.level
      )
      where user_id = new.user_id;
      perform pg_notify('profile_' || new.user_id, null);
    end if;

    if tg_op = any (array['INSERT', 'DELETE']) then
      update clans c set rating = (
        select sum(level) from profiles where clan_id = c.id
      );
    end if;

    if tg_op = 'UPDATE' then

      if (
        new.level >= (
          select min(user_level)
          from cars
          where old.level < user_level
        ) or
        new.money_rub >= (
          select min(price_rub)
          from cars
          where old.money_rub < price_rub and new.level >= user_level
        ) or
        new.money_rub < (
          select max(price_rub)
          from cars
          where old.money_rub >= price_rub and new.level >= user_level
        )
      ) then
        perform pg_notify('cars_' || new.user_id, null);
      end if;

      if (new.level is distinct from old.level) then
        update clans c set rating = (
          select sum(level) from profiles where clan_id = c.id
        );
      end if;

      if (
        new.level >= (
          select min(user_level)
          from girls
          where old.level < user_level
        ) or
        new.money_rub >= (
          select min(price_rub)
          from girls
          where old.money_rub < price_rub and new.level >= user_level
        ) or
        new.money_rub < (
          select max(price_rub)
          from girls
          where old.money_rub >= price_rub and new.level >= user_level
        )
      ) then
        perform pg_notify('girls_' || new.user_id, null);
      end if;

      if (
        new.level >= (
          select min(user_level)
          from hardware
          where old.level < user_level
        ) or
        new.money_rub >= (
          select min(price_rub)
          from hardware
          where old.money_rub < price_rub and new.level >= user_level
        ) or
        new.money_rub < (
          select max(price_rub)
          from hardware
          where old.money_rub >= price_rub and new.level >= user_level
        ) or
        new.pc_cooling is distinct from old.pc_cooling or
        new.pc_cpu is distinct from old.pc_cpu or
        new.pc_drive is distinct from old.pc_drive or
        new.pc_network is distinct from old.pc_network or
        new.pc_motherboard is distinct from old.pc_motherboard or
        new.pc_power is distinct from old.pc_power or
        new.pc_ram is distinct from old.pc_ram or
        new.pc_gpu is distinct from old.pc_gpu
      ) then
        perform pg_notify('hardware_' || new.user_id, null);
      end if;

      if (
        new.level >= (
          select min(user_level)
          from health
          where old.level < user_level
        ) or
        new.money_rub >= (
          select min(price_rub)
          from health
          where old.money_rub < price_rub and new.level >= user_level
        ) or
        new.money_rub < (
          select max(price_rub)
          from health
          where old.money_rub >= price_rub and new.level >= user_level
        )
      ) then
        perform pg_notify('health_' || new.user_id, null);
      end if;

      if (
        new.level >= (
          select min(user_level)
          from housing
          where old.level < user_level
        ) or
        new.money_rub >= (
          select min(price_rub)
          from housing
          where old.money_rub < price_rub and new.level >= user_level
        ) or
        new.money_rub < (
          select max(price_rub)
          from housing
          where old.money_rub >= price_rub and new.level >= user_level
        )
      ) then
        perform pg_notify('housing_' || new.user_id, null);
      end if;

      if (
        new.level >= (
          select min(user_level)
          from job
          where old.level < user_level
        ) or
        (
          select max(required_software)
          from job
          where new.installed_software @> required_software
        ) > (
          select max(required_software)
          from job
          where old.installed_software @> required_software and new.level >= user_level
        )
      ) then
        perform pg_notify('job_' || new.user_id, null);
      end if;

      if (
        new.level >= (
          select min(user_level)
          from longterm_job
          where old.level < user_level
        )
      ) then
        perform pg_notify('longterm_job_' || new.user_id, null);
      end if;

      if new.read_news is distinct from old.read_news then
        perform pg_notify('news_' || new.user_id, null);
      end if;

      if (
        new.level >= (
          select min(user_level)
          from software
          where old.level < user_level
        ) or
        new.hardware_level >= (
          select min(hardware_level)
          from software
          where old.hardware_level < hardware_level and new.level >= user_level
        ) or
        new.money_rub >= (
          select min(price_rub)
          from software
          where old.money_rub < price_rub and new.hardware_level >= hardware_level and new.level >= user_level
        ) or
        new.money_rub < (
          select max(price_rub)
          from software
          where old.money_rub >= price_rub and new.hardware_level >= hardware_level and new.level >= user_level
        ) or
        new.installed_software is distinct from old.installed_software
      ) then
        perform pg_notify('software_' || new.user_id, null);
      end if;

    end if;

    return null;
  end;
$$ language plpgsql;

create trigger news_ins_del
after insert or delete
on news
for each row
execute function news();

create trigger news_upd
after update
on news
for each row
when (new is distinct from old)
execute function news();

create trigger profile_ins_del
after insert or delete
on profiles
for each row
execute function profile();

create trigger profile_upd
after update
on profiles
for each row
when (new is distinct from old)
execute function profile();