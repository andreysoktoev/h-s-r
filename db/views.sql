drop view if exists
  cars_view,
  girls_view,
  hardware_view,
  health_view,
  housing_view,
  job_view,
  longterm_job_view,
  news_view,
  software_view
cascade;

create or replace view cars_view as
select
  s.id,
  s.level,
  (
    case
      when lt.text_hash = tt.hash and lt.lang = p.lang then lt.translation
      else tt.text
    end
  ) title,
  (
    case
      when ld.text_hash = td.hash and ld.lang = p.lang then ld.translation
      else td.text
    end
  ) description,
  s.image_path,
  s.user_level,
  s.price_rub,
  p.user_id,
  (
    case
      when s.user_level > p.level then 'blocked'
      when s.price_rub > p.money_rub then 'notAvailable'
      else 'available'
    end
  ) status,
  (
    case
      when s.user_level > p.level then (
        select text from texts where alias = 'insufficientLevel'
      )
      when s.price_rub > p.money_rub then (
        select text from texts where alias = 'insufficientFunds'
      )
      else (
        select text from texts where alias = 'available'
      )
    end
  ) message
from cars s
left join texts tt on s.title = tt.alias
left join texts td on s.description = td.alias
left join locales lt on s.title = lt.alias
left join locales ld on s.description = ld.alias
left join profiles p on true
order by id, user_id;

create or replace view girls_view as
select
  s.id,
  s.type,
  s.level,
  (
    case
      when lt.text_hash = tt.hash and lt.lang = p.lang then lt.translation
      else tt.text
    end
  ) title,
  (
    case
      when ld.text_hash = td.hash and ld.lang = p.lang then ld.translation
      else td.text
    end
  ) description,
  s.image_path,
  s.user_level,
  s.price_rub,
  s.daily_money,
  s.rating,
  p.user_id,
  (
    case
      when s.user_level > p.level then 'blocked'
      when s.price_rub > p.money_rub then 'notAvailable'
      else 'available'
    end
  ) status,
  (
    case
      when s.user_level > p.level then (
        select text from texts where alias = 'insufficientLevel'
      )
      when s.price_rub > p.money_rub then (
        select text from texts where alias = 'insufficientFunds'
      )
      else (
        select text from texts where alias = 'available'
      )
    end
  ) message
from girls s
left join texts tt on s.title = tt.alias
left join texts td on s.description = td.alias
left join locales lt on s.title = lt.alias
left join locales ld on s.description = ld.alias
left join profiles p on true
order by id, user_id;

create or replace view hardware_view as
select
  s.id,
  s.type,
  s.level,
  s.title,
  (
    case
      when ld.text_hash = td.hash and ld.lang = p.lang then ld.translation
      else td.text
    end
  ) description,
  s.image_path,
  s.user_level,
  s.price_rub,
  next_title,
  next_user_level,
  next_price_rub,
  p.user_id,
  (
    case
      when s.next_user_level > p.level then 'blocked'
      when s.next_price_rub > p.money_rub then 'notAvailable'
      else 'available'
    end
  ) status,
  (
    case
      when s.next_user_level > p.level then (
        select text from texts where alias = 'insufficientLevel'
      )
      when s.next_price_rub > p.money_rub then (
        select text from texts where alias = 'insufficientFunds'
      )
      else (
        select text from texts where alias = 'available'
      )
    end
  ) message
from (
  select
    *,
    lead(title) over w as next_title,
    lead(user_level) over w as next_user_level,
    lead(price_rub) over w as next_price_rub
  from hardware
  window w as (partition by type order by level)
) s
left join texts tt on s.title = tt.alias
left join texts td on s.description = td.alias
left join locales lt on s.title = lt.alias
left join locales ld on s.description = ld.alias
left join profiles p on
  s.type = 'pc_cooling' and s.level = p.pc_cooling or
  s.type = 'pc_cpu' and s.level = p.pc_cpu or
  s.type = 'pc_drive' and s.level = p.pc_drive or
  s.type = 'pc_gpu' and s.level = p.pc_gpu or
  s.type = 'pc_motherboard' and s.level = p.pc_motherboard or
  s.type = 'pc_network' and s.level = p.pc_network or
  s.type = 'pc_power' and s.level = p.pc_power or
  s.type = 'pc_ram' and s.level = p.pc_ram
order by type, level;

create or replace view health_view as
select
  s.id,
  (
    case
      when lt.text_hash = tt.hash and lt.lang = p.lang then lt.translation
      else tt.text
    end
  ) title,
  (
    case
      when ld.text_hash = td.hash and ld.lang = p.lang then ld.translation
      else td.text
    end
  ) description,
  s.type,
  s.image_path,
  s.user_level,
  s.price_rub,
  s.health,
  s.alcohol,
  s.mood,
  p.user_id,
  (
    case
      when s.user_level > p.level then 'blocked'
      when s.price_rub > p.money_rub then 'notAvailable'
      else 'available'
    end
  ) status,
  (
    case
      when s.user_level > p.level then (
        select text from texts where alias = 'insufficientLevel'
      )
      when s.price_rub > p.money_rub then (
        select text from texts where alias = 'insufficientFunds'
      )
      else (
        select text from texts where alias = 'available'
      )
    end
  ) message
from health s
left join texts tt on s.title = tt.alias
left join texts td on s.description = td.alias
left join locales lt on s.title = lt.alias
left join locales ld on s.description = ld.alias
left join profiles p on true
order by id, user_id;

create or replace view housing_view as
select
  s.id,
  s.level,
  (
    case
      when lt.text_hash = tt.hash and lt.lang = p.lang then lt.translation
      else tt.text
    end
  ) title,
  (
    case
      when ld.text_hash = td.hash and ld.lang = p.lang then ld.translation
      else td.text
    end
  ) description,
  s.image_path,
  s.user_level,
  s.price_rub,
  p.user_id,
  (
    case
      when s.user_level > p.level then 'blocked'
      when s.price_rub > p.money_rub then 'notAvailable'
      else 'available'
    end
  ) status,
  (
    case
      when s.user_level > p.level then (
        select text from texts where alias = 'insufficientLevel'
      )
      when s.price_rub > p.money_rub then (
        select text from texts where alias = 'insufficientFunds'
      )
      else (
        select text from texts where alias = 'available'
      )
    end
  ) message
from housing s
left join texts tt on s.title = tt.alias
left join texts td on s.description = td.alias
left join locales lt on s.title = lt.alias
left join locales ld on s.description = ld.alias
left join profiles p on true
order by id, user_id;

create or replace view job_view as
select
  s.id,
  (
    case
      when lt.text_hash = tt.hash and lt.lang = p.lang then lt.translation
      else tt.text
    end
  ) title,
  s.type,
  s.user_level,
  s.price_rub,
  s.price_btc,
  s.required_software,
  s.work_hack,
  s.xp,
  s.moves,
  s.health,
  s.alcohol,
  s.mood,
  p.user_id,
  (
    case
      when user_level > level then 'blocked'
      when not (required_software <@ installed_software) then 'notAvailable'
      else 'available'
    end
  ) status,
  (
    case
      when user_level > level then (
        select text from texts where alias = 'insufficientLevel'
      )
      when not (required_software <@ installed_software) then (
        select text from texts where alias = 'insufficientSoftware'
      )
      else (
        select text from texts where alias = 'available'
      )
    end
  ) message
from job s
left join texts tt on s.title = tt.alias
left join locales lt on s.title = lt.alias
left join profiles p on true
order by user_level, type desc, user_id;

create or replace view longterm_job_view as
select
  s.id,
  (
    case
      when lt.text_hash = tt.hash and lt.lang = p.lang then lt.translation
      else tt.text
    end
  ) title,
  (
    case
      when ld.text_hash = td.hash and ld.lang = p.lang then ld.translation
      else td.text
    end
  ) description,
  s.image_path,
  s.user_level,
  s.price_rub,
  s.price_btc,
  s.work_hack,
  s.xp,
  s.time,
  s.moves,
  s.health,
  s.alcohol,
  s.mood,
  p.user_id,
  (
    case
      when user_level > level then 'blocked'
      else 'available'
    end
  ) status,
  (
    case
      when user_level > level then (
        select text from texts where alias = 'insufficientLevel'
      )
      else (
        select text from texts where alias = 'available'
      )
    end
  ) message
from longterm_job s
left join texts tt on s.title = tt.alias
left join texts td on s.description = td.alias
left join locales lt on s.title = lt.alias
left join locales ld on s.description = ld.alias
left join profiles p on true
order by id, user_id;

create or replace view news_view as
select
  s.*,
  p.user_id,
  (
    s.id = any (p.read_news)
  ) read
from news s, profiles p
order by date desc;

create or replace view software_view as
select
  s.id,
  (
    case
      when lt.text_hash = tt.hash and lt.lang = p.lang then lt.translation
      else tt.text
    end
  ) title,
  (
    case
      when ls.text_hash = td.hash and ls.lang = p.lang then ls.translation
      else ts.text
    end
  ) short_description,
  (
    case
      when ld.text_hash = td.hash and ld.lang = p.lang then ld.translation
      else td.text
    end
  ) description,
  s.image_path,
  s.user_level,
  s.price_rub,
  s.hardware_level,
  (
    s.id = any (p.installed_software)
  ) purchased,
  p.user_id,
  (
    case
      when s.user_level > p.level then 'blocked'
      when s.price_rub > p.money_rub or p.hardware_level < s.hardware_level then 'notAvailable'
      else 'available'
    end
  ) status,
  (
    case
      when s.user_level > p.level then (
        select text from texts where alias = 'insufficientLevel'
      )
      when p.hardware_level < s.hardware_level then (
        select text from texts where alias = 'insufficientHardware'
      )
      when s.price_rub > p.money_rub then (
        select text from texts where alias = 'insufficientFunds'
      )
      else (
        select text from texts where alias = 'available'
      )
    end
  ) message
from software s
left join texts tt on s.title = tt.alias
left join texts ts on s.short_description = ts.alias
left join texts td on s.description = td.alias
left join locales lt on s.title = lt.alias
left join locales ls on s.short_description = ls.alias
left join locales ld on s.description = ld.alias
left join profiles p on true
order by id, user_id;