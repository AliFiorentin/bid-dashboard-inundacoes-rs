# SDD Progress Ledger — Validação Pipeline BID
# Baseline: 057c61e

## Tasks
- [ ] Task 1: check_bases.py — validação CSVs (Fase 0+1)
- [ ] Task 2: check_geojson.py — validação GeoJSONs + contrato (Fase 2)
- [ ] Task 3: Correções scripts + reprocessamento (Fase 3)
- [ ] Task 4: Revalidação + check_logic.md (Fase 4)

## Completed
- Task 1: complete (commits 057c61e..4d0cbdd, review clean) — check_bases.py: 32 OK, 8 WARN, 1 FAIL (bug área agricultura confirmado)
- Task 2: complete (commit 6de4ae5, review clean) — check_geojson.py: 141 OK, 28 WARN, 0 FAIL; RG agri 2 features confirmado correto
- Task 3: complete (commit 10b28e8, review clean) — 8 correções aplicadas: acento ×5 (config), CNES_ZIP path, pixel area lat_center, filtro RAIS município, no_razao_social alias, make_limite(), mancha_rs_enchente_2024.geojson
- Task 4: complete (commit 5ce9a7a, review clean) — check_bases 33/7/0, check_geojson 169/0/0; check_logic.md escrito; threshold área → 20%
