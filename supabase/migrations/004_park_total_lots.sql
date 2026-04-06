-- Add static total lot counts to parks table
alter table parks add column if not exists total_lots integer not null default 0;

update parks set total_lots = 51  where slug = 'chef-one';
update parks set total_lots = 31  where slug = 'country-estates';
update parks set total_lots = 67  where slug = 'glen-echo';
update parks set total_lots = 54  where slug = 'lafayette-pinhook';
update parks set total_lots = 56  where slug = 'lucky-acadian';
update parks set total_lots = 82  where slug = 'lucky-oak';
update parks set total_lots = 84  where slug = 'lucky-pecan';
update parks set total_lots = 44  where slug = 'malapart-oaks';
update parks set total_lots = 67  where slug = 'messer-community';
update parks set total_lots = 40  where slug = 'muscle-shoals';
update parks set total_lots = 102 where slug = 'oakview-mhc';
update parks set total_lots = 45  where slug = 'parkwood';
update parks set total_lots = 144 where slug = 'pecanland';
update parks set total_lots = 51  where slug = 'rainbow-terrace';
update parks set total_lots = 84  where slug = 'remwood';
update parks set total_lots = 53  where slug = 'satsuma-heights';
update parks set total_lots = 35  where slug = 'shady-pines';
update parks set total_lots = 92  where slug = 'sidlenie';
update parks set total_lots = 37  where slug = 'sonnier';
update parks set total_lots = 30  where slug = 'steele-creek';

-- Backfill any existing snapshots to use the correct total from parks
update vacancy_snapshots vs
set total_units = p.total_lots
from parks p
where vs.park_id = p.id;
