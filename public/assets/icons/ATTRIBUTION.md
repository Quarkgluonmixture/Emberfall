# Icon attribution

All icons in this folder are from [game-icons.net](https://game-icons.net),
licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
Fetched 2026-06-11 from the [game-icons/icons](https://github.com/game-icons/icons)
repository; the baked black background rect was stripped so each file is a
white glyph on transparency (tint via CSS `filter` or use as a mask).

Authors: **Lorc**, **Delapouite**, **Skoll**, **Zeromancer**, **Guard13007**.

| File | Source icon | Author |
| --- | --- | --- |
| event_warDeclared.svg | crossed-swords | Lorc |
| event_skirmish.svg | sword-clash | Lorc |
| event_capture.svg | flying-flag | Lorc |
| event_plague.svg | rat | Delapouite |
| event_plagueEnd.svg | heart-plus | Zeromancer |
| event_famine.svg | wheat | Lorc |
| event_famineEnd.svg | cornucopia | Delapouite |
| event_wildfire.svg | wildfires | Lorc |
| event_flood.svg | flood | Delapouite |
| event_goldenAge.svg | laurels | Lorc |
| event_collapse.svg | castle-ruins | Delapouite |
| event_civFell.svg | ancient-ruins | Delapouite |
| event_migration.svg | footsteps | Skoll |
| event_schism.svg | broken-tablet | Lorc |
| event_succession.svg | crown | Lorc |
| event_founding.svg | camping-tent | Delapouite |
| event_village.svg | village | Delapouite |
| event_town.svg | castle | Delapouite |
| event_peace.svg | dove | Lorc |
| event_alliance.svg | shaking-hands | Delapouite |
| event_tradeOpened.svg | caravan | Delapouite |
| event_rivalry.svg | angry-eyes | Delapouite |
| event_incidentBad.svg | fist | Lorc |
| event_incidentGood.svg | present | Delapouite |
| season_spring.svg | sprout | Lorc |
| season_summer.svg | sun | Lorc |
| season_autumn.svg | oak-leaf | Delapouite |
| season_winter.svg | snowflake-1 | Lorc |
| ui_play.svg | play-button | Guard13007 |
| ui_pause.svg | pause-button | Guard13007 |
| ui_speed.svg | fast-forward-button | Delapouite |
| ui_save.svg | save | Delapouite |
| ui_load.svg | load | Delapouite |
| ui_history.svg | scroll-unfurled | Lorc |
| ui_debug.svg | gears | Lorc |

Event file names match the sim's chronicle event kinds; kinds without their
own file borrow a neighbor in `src/ui/icons.ts` (`wildfireWild` → wildfire,
`rebirth` → founding, `resettleRuin` → migration, `relationsCooled` →
season_winter). The second batch (village…incidentGood, fetched 2026-06-11)
covers the remaining chronicle kinds.
| action_gather.svg | axe-in-stump | Lorc |
| action_build.svg | claw-hammer | Lorc |
| action_trade.svg | two-coins | Delapouite |
| action_rest.svg | night-sleep | Delapouite |
| action_fight.svg | crossed-swords (copy of event_warDeclared) | Lorc |
| action_flee.svg | footsteps (copy of event_migration) | Skoll |
| action_farm.svg | wheat (copy of event_famine) | Lorc |
