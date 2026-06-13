ARCHIVED June 11 2026 — historical/reference; see CLAUDE.md for current status.

# DFO ELOG_reftables — Full File Inventory (generated June 11 2026)

Source: ~/Desktop/DFO/ELOG_reftables/ (all CSVs Latin-1 encoded). Format per file:
filename | data rows, column headers, first 3 rows. Analysis in session notes.

```
### List_of_MV_tables-Liste_des_tables_MV.csv | rows=111
cols: MV_NAME,DESC_FRE,DESC_ENG
   MV_BAIT_CATEGORY | Table des catégories d'appâts | Table of bait categories
   MV_BAIT_CONDITION | Table des conditions possibles des appât | Table of bait conditions
   MV_BAIT_FASTENER | Table des mécanismes d'attache des appât | Table of bait fasteners
### MV_BAIT_CATEGORY_rel2.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   11881 | Vivant | Alive
   11883 | Mort | Dead
   39742 | Matériel synthétique | Synthetic Material
### MV_BAIT_CONDITION_rel2.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   1109 | Frais | Fresh
   1232 | Congelé | Frozen
   37125 | Salé | Salted
### MV_BAIT_FASTENER_rel3.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   25132 | Pot | Jars
   25134 | Pince/Crochet | Clips/hooks
   25136 | Poche | Bag
### MV_BAIT_PROVENANCE_rel1.csv | rows=0
cols: CODE_ID,DESC_FRE,DESC_ENG
### MV_BAIT_TYPE_rel8.csv | rows=63
cols: CODE_ID,DESC_FRE,DESC_ENG
   814 | Autres | Other
   1266 | Gaspareau | Alewife
   1268 | Baudroie d'Amérique | Monkfish
### MV_BED_RECOMMENDATION_rel3.csv | rows=5
cols: CODE_ID,DESC_FRE,DESC_ENG
   38015 | Retirer ce banc, non viable | Delete bed, not viable
   38017 | Diminuer l'effort de pêche (surpêche) | Overfished - bed needs a rest
   38019 | Diminuer le quota pour ce banc | Decrease bed quota
### MV_CARDINAL_POINTS_rel3.csv | rows=16
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   25200 | N | Nord | N | North
   25201 | NNE | Nord-Nord-est | NNE | North-Northeast
   25202 | NE | Nord-Est | NE | Northeast
### MV_CATCH_MODE_rel3.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   37201 | Pris par les branchies | Gilled
   37203 | Emmêlé | Tangled
   37205 | Non spécifié | Unspecified
### MV_CATCH_USAGE_rel1.csv | rows=11
cols: CODE_ID,DESC_FRE,DESC_ENG
   37810 | Échantillon pour ACIA (Agence Canadienne | CFIA sample (Canadian Food Inspection Ag
   37812 | Échantillon (pour contrôle de qualité) | Sample (for quality control)
   37814 | Partage avec l'équipage (donné ou vendu) | Crew share (given or sold)
### MV_COLOR_rel3.csv | rows=10
cols: CODE_ID,DESC_FRE,DESC_ENG
   38352 | Rouge | Red
   38353 | Bleu | Blue
   38354 | Vert | Green
### MV_COMMUNITIES_rel4.csv | rows=5804
cols: CODE_ID,DESC_FRE,DESC_ENG,LATITUDE,LONGITUDE,PROVINCE_CODE_ID,PROVINCE_DESC_FRE,PROVINCE_DESC_ENG
   19128 | PENDER ISLAND | PENDER ISLAND | 48.78055556 | -123.2805556 | 172 | Colombie-Britannique | British Columbia
   19129 | PENNY | PENNY | 53.85 | -121.2833333 | 172 | Colombie-Britannique | British Columbia
   19130 | PENTICTON | PENTICTON | 49.5 | -119.5833333 | 172 | Colombie-Britannique | British Columbia
### MV_CONFIDENCE_LEVEL_rel3.csv | rows=4
cols: CODE_ID,DESC_FRE,DESC_ENG
   39597 | Certain | Certain
   39598 | Confiant | Probable
   39599 | Moyennement confiant | Possible
### MV_CONTAINER_TYPE_rel4.csv | rows=9
cols: CODE_ID,DESC_FRE,DESC_ENG
   37876 | Sac(s) | Bag(s)
   37878 | Boîte(s) | Box(es)
   37880 | Bac(s) | Tub(s)
### MV_CURRENCIES_rel1.csv | rows=2
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   11831 | CDN | Dollar canadien et Cent | CDN | Canadian Dollars and cents
   37871 | USD | Dollar américain et cents | USD | U.S. dollar and cents
### MV_DATA_SOURCE_rel2.csv | rows=9
cols: CODE_ID,DESC_FRE,DESC_ENG
   38364 | Pêcheur via un journal de bord électroni | Fisherman thru an electronic logbook
   38366 | Pêcheur via un journal de bord papier -  | Fisherman thru a paper logbook - data ca
   38368 | Pêcheur via un journal de bord papier -  | Fisherman thru a paper logbook - data ca
### MV_DFO_AREA_OFFICE_rel4.csv | rows=12
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   29051 | GAS | Gaspésie | GAS | Gaspesia
   29053 | IDM | Iles-de-la-Madeleine | MI | Magdalen Island
   29055 | CN | Côte-Nord | NS | North-Shore
### MV_DFO_REGION_rel3.csv | rows=6
cols: CODE_ID,DESC_FRE,DESC_ENG
   1002 | Terre-Neuve-et-Labrador | Newfoundland and Labrador
   1004 | Maritimes | Maritimes
   1006 | Québec | Quebec
### MV_DIGGING_EASINESS_rel3.csv | rows=4
cols: CODE_ID,DESC_FRE,DESC_ENG
   38007 | Impossible à creuser | Not possible to dig
   38009 | Difficile | Difficult
   38011 | Modéré | Moderate
### MV_DIVER_FISHING_METHOD_rel3.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   37865 | Récolte manuelle | Manual harvest
   37867 | Récolte manuelle avec outil à main | Manual harvest using handtool
   37869 | Récolte manuelle à partir de casier(s) | Manual harvest from trap(s)
### MV_ELOG_FLEETS_rel5.csv | rows=54
cols: CODE_ID,DESC_FRE,DESC_ENG
   39687 | Anguille - Casiers à anguille | Eels - Eel pot
   39688 | Buccin - Casiers | Whelk - Traps
   39689 | Buccin - Drague | Whelk - Dredges
### MV_ENCOUNTER_TYPE_rel2.csv | rows=2
cols: CODE_ID,DESC_FRE,DESC_ENG
   43827 | Mortalité | Mortality
   43828 | Brèche dans le système | System breach
### MV_FISHING_METHOD_rel7.csv | rows=11
cols: CODE_ID,DESC_FRE,DESC_ENG
   921 | Canne et moulinet (chumming) | Rod and reel (chumming)
   923 | Canne et moulinet (pêche à la cuiller) | Rod and reel (trolling)
   37207 | Un seul casier par ligne | Single
### MV_FISHING_TYPE_rel3.csv | rows=14
cols: CODE_ID,DESC_FRE,DESC_ENG
   38426 | Pêche commerciale | Commercial fishery
   38427 | Pêche exploratoire | Exploratory fishery
   38428 | Pêche sentinelle | Sentinel fishery
### MV_FISH_MARK_TYPE_rel3.csv | rows=17
cols: CODE_ID,DESC_FRE,DESC_ENG
   37157 | Inconnu | Unknown
   37158 | Nageoire adipeuse coupée | Adipose fin clipped
   37159 | Nageoire adipeuse non-coupée | Adipose fin unclipped
### MV_FLEET_rel3.csv | rows=4
cols: CODE_ID,DESC_FRE,DESC_ENG
   37847 | Pétoncle - Flottille Full Bay" de la Bai | Scallops - Full Bay of Fundy fleet
   37849 | Pétoncle - Flottille Mid Bay" de la Baie | Scallops - Mid Bay of Fundy fleet
   37851 | Pétoncle - Flottille Upper Bay" de la Ba | Scallops - Upper Bay of Fundy fleet
### MV_FMA_rel30.csv | rows=2079
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   1474 | 2 | Pétoncle - Zone de pêche 2 | 2 | Scallop Fishing Area 2
   1475 | 4 | Phoque- Zone de pêche 04 | 4 | Seal Area 04
   1476 | 5 | Phoque- Zone de pêche 05 | 5 | Seal Area 05
### MV_FORM_TYPE_rel23.csv | rows=40
cols: CODE_ID,DESC_FRE,DESC_ENG
   24930 | JBE - Journal de bord - Chaluts | ELOG - Logbook - Trawls
   24932 | Formulaire homard - détaillé par sous-zo | Lobster form - detailed by unit area
   25092 | Formulaire homard - détaillé par traits | Lobster form - detailed by tows
### MV_FORM_VERSION_rel30.csv | rows=33
cols: FORM_VERSION_ID,FORM_TYPE_CODE_ID,FORM_VERSION,DESC_FRE,DESC_ENG,START_DATE,END_DATE,REGION_ID
   6 | 999999999 | 1 | ODS-Utilisation de permis | ODS-Licence usages | 2011-01-01 00:00:00 |  | 
   32 | 24930 | 6 | JBE - Journal de bord - Chaluts | ELOG - Logbook - Trawls | 2012-01-01 00:00:00 | 2014-06-30 23:59:59 | 1006
   37 | 29392 | 4 | JBE - Journal de bord - Casiers (homard) | ELOG - Logbook - Traps (lobster) | 2012-01-01 00:00:00 | 2017-12-31 23:59:59 | 1006
### MV_GEAR_DESCRIPTION_rel13.csv | rows=147
cols: CODE_ID,DESC_FRE,DESC_ENG,GEAR_CLASS_DESC_FRE,GEAR_CLASS_DESC_ENG
   876 | Chalut de fond à panneaux | Bottom otter trawl | M | M
   877 | Chalut de fond à panneaux (de côté) | Bottom otter trawl (side) | M | M
   878 | Chalut de fond à panneaux (arrière) | Bottom otter trawl (stern) | M | M
### MV_GEAR_HANG_RATIO_rel3.csv | rows=9
cols: CODE_ID,DESC_FRE,DESC_ENG
   37127 | 1 : 1 | 1 : 1
   37129 | 1.25 : 1 | 1.25 : 1
   37131 | 1.5 : 1 | 1.5 : 1
### MV_GEAR_SELECTIVITY_DEVICE_rel4.csv | rows=8
cols: CODE_ID,DESC_FRE,DESC_ENG
   11643 | Grille Nordmore | Separator (Nordmore) grate
   11644 | Fisheye | Fisheye
   11645 | Gulf Fisheye | Gulf Fisheye
### MV_GEAR_SUBTYPE_rel7.csv | rows=44
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG,GEAR_CODE_ID
   36438 |  | A hameçons fixes (conventionnelle) |  | with fixed hooks (conventional) | 914
   36440 |  | Autoline |  | Autoline | 914
   36442 |  | A agraffe |  | with snap | 914
### MV_GRID_rel1.csv | rows=5272
cols: CODE_ID,DESC_FRE,DESC_ENG
   29406 | 3LK20 | 3LK20
   29407 | 3LK21 | 3LK21
   29408 | 3LK23 | 3LK23
### MV_HARPOON_FISHING_METHOD_rel3.csv | rows=2
cols: CODE_ID,DESC_FRE,DESC_ENG
   37886 | Harpon(s) seulement | Harpoon(s) only
   37888 | Harpon(s) et palangre(s) | Harpoon(s) and longline(s)
### MV_HOOK_BRAND_rel2.csv | rows=16
cols: CODE_ID,DESC_FRE,DESC_ENG
   39625 | Eagle Claw | Eagle Claw
   39626 | Gamakatsu | Gamakatsu
   39627 | Mustad | Mustad
### MV_HOOK_SIZE_rel3.csv | rows=36
cols: CODE_ID,DESC_FRE,DESC_ENG
   36458 | 20/0 | 20/0
   36460 | 19/0 | 19/0
   36462 | 18/0 | 18/0
### MV_HOOK_TYPE_rel5.csv | rows=8
cols: CODE_ID,DESC_FRE,DESC_ENG
   36446 | Hameçon circulaire | Circular hook
   36448 | Hameçon en forme de J | J hook
   36450 | Hameçon plombé | Weighted hook
### MV_HUNTING_FISHING_LOCATION_rel3.csv | rows=4
cols: CODE_ID,DESC_FRE,DESC_ENG
   37961 | En bordure de la banquise | Flow edge
   37963 | En eaux libres | Open water
   37965 | Fissure dans la glace | Ice crack
### MV_INCIDENT_TYPE_rel4.csv | rows=8
cols: CODE_ID,DESC_FRE,DESC_ENG
   39609 | Animaux morts | Dead animal
   39610 | Empêtrement | Entanglement
   39611 | Collision | Collision
### MV_KELP_DENSITY_rel3.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   29400 | Moins de 1 au mètre carré | Less than 1 per square meter
   29402 | 1 à 10 au mètre carré | 1 to 10 per square meter
   29404 | Plus de 10 au mètre carré | More than 10 per square meter
### MV_LANGUAGE_rel3.csv | rows=2
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   3342 | A | Anglais | E | English
   3344 | F | Français | F | French
### MV_LCSG_VS_FMA_rel3.csv | rows=290
cols: LGRID_CODE_ID,LGRID_DESC_FRE,LGRID_DESC_ENG,FMA_CODE_ID,FMA_DESC_FRE,FMA_DESC_ENG
   29136 | 1 | 1 | 1590 | Homard - Zone de pêche 35 | Lobster Fishing Area 35
   29137 | 2 | 2 | 1590 | Homard - Zone de pêche 35 | Lobster Fishing Area 35
   29138 | 3 | 3 | 1590 | Homard - Zone de pêche 35 | Lobster Fishing Area 35
### MV_LICENCE_SUBTYPE_rel5.csv | rows=11
cols: CODE_ID,DESC_FRE,DESC_ENG
   10518 | AE - Semi-hauturière | EA - Midshore
   10520 | AE - Hauturière | EA - Offshore
   43248 | Hareng/Maquereau Appât | Herring/Mackerel Bait
### MV_LOBSTER_GRID_rel4.csv | rows=258
cols: CODE_ID,DESC_FRE,DESC_ENG
   29136 | 1 | 1
   29137 | 2 | 2
   29138 | 3 | 3
### MV_LOST_GEAR_STATUS_rel3.csv | rows=5
cols: CODE_ID,DESC_FRE,DESC_ENG
   39581 | Perdu(s) | Lost
   39583 | Trouvé(s) | Found
   39584 | Récupéré(s) en entier | Fully recovered
### MV_MARINE_MAMMAL_ACT_rel3.csv | rows=9
cols: CODE_ID,DESC_FRE,DESC_ENG
   37920 | Saut | Breach
   37922 | Tête sortie de l'eau | Spyhop
   37924 | Marsouinage | Porpoising
### MV_MARKET_QUALITY_rel3.csv | rows=4
cols: CODE_ID,DESC_FRE,DESC_ENG
   38025 | Excellente qualité | Excellent quality
   38027 | Bonne qualité | Good quality
   38029 | Qualité acceptable | Fair quality
### MV_MATERIAL_TYPE_rel3.csv | rows=4
cols: CODE_ID,DESC_FRE,DESC_ENG
   39739 | Fer | Iron
   39740 | Fer et Acier inoxydable | Iron and Stainless
   39741 | Acier Inoxydable | Stainless
### MV_MESH_TYPE_rel1.csv | rows=6
cols: CODE_ID,DESC_FRE,DESC_ENG
   1125 | Losange sans noeuds | Diamond without knots
   1159 | Carrée sans noeuds | Square without knots
   1161 | Losange avec noeuds | Diamond with knots
### MV_MM_LENGTH_CATEGORY_rel4.csv | rows=9
cols: CODE_ID,DESC_FRE,DESC_ENG
   39601 | < 1 m (<3 pi) | < 1 m (<3 ft)
   39602 | 1 m - 1.5 m (3-5 pi) | 1 m - 1.5 m (3-5 ft)
   39603 | 1.5 m - 2 m (5-7 pi) | 1.5 m - 2 m (5-7 ft)
### MV_MM_SPECIMENS_CONDITION_rel3.csv | rows=5
cols: CODE_ID,DESC_FRE,DESC_ENG
   11883 | Mort | Dead
   39589 | Semble en bonne santé | Appears healthy
   39590 | Malade | Sick
### MV_MUFZ_rel1.csv | rows=112
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   44364 | 87 | Guysborough - South Moosehead Excl Area  | 87 | Guysborough - South Moosehead Excl Area 
   44365 | 88 | Guysborough - Torbay Excl Area - 88 | 88 | Guysborough - Torbay Excl Area - 88
   44366 | 89 | Guysborough - West Port Bick Excl Area - | 89 | Guysborough - West Port Bick Excl Area -
### MV_NAFO_DIVISION_SUBDIVISION_rel4.csv | rows=196
cols: CODE_ID,DESC_FRE,DESC_ENG
   957 | 0A | 0A
   958 | 0B | 0B
   959 | 1B | 1B
### MV_NET_TYPE_rel3.csv | rows=4
cols: CODE_ID,DESC_FRE,DESC_ENG
   37117 | Câblé Alaska | Alaska twist
   37119 | Multi-filaments | Multi-strands net
   37121 | Monofilament | Monofilament net
### MV_NOAA_MM_SPECIES_rel3.csv | rows=46
cols: NOAA_SPECIES_CODE,DESC_FRE,DESC_ENG
   130 | Phoque barbu | Bearded Seal
   124 | Phoque gris | Gray Seal
   115 | Phoque commun | Harbour Seal
### MV_NOT_FISHING_REASON_rel2.csv | rows=30
cols: CODE_ID,DESC_FRE,DESC_ENG
   25138 | Conditions météorologiques défavorables | Adverse weather conditions
   25139 | Au port - Ravitaillement en combustible  | In port - refueling and/or provisioning
   25140 | Au port - Réparations | In port - repairing
### MV_NUMBER_PER_SURFACE_rel3.csv | rows=8
cols: CODE_ID,DESC_FRE,DESC_ENG
   29400 | Moins de 1 au mètre carré | Less than 1 per square meter
   29402 | 1 à 10 au mètre carré | 1 to 10 per square meter
   29404 | Plus de 10 au mètre carré | More than 10 per square meter
### MV_ORGAN_rel3.csv | rows=6
cols: CODE_ID,DESC_FRE,DESC_ENG
   37941 | Foie | Liver
   37943 | Rein | Kidney
   37945 | Peau | Skin
### MV_OUTFITTERS_rel1.csv | rows=0
cols: CODE_ID,DESC_FRE,DESC_ENG
### MV_PAC_FMA_VS_PFMA_rel2.csv | rows=648
cols: FMA_CODE_ID,FMA_DESC_FRE,FMA_DESC_ENG,PFMA_CODE_ID,PFMA_DESC_FRE,PFMA_DESC_ENG
   25505 | Poisson de fond - Zone de pêche du Pacif | Pacific Groundfish Fishing Area 5D | 27758 | Zone de gestion des pêches du Pacifique  | Pacific Fish Management Area 103
   25503 | Poisson de fond - Zone de pêche du Pacif | Pacific Groundfish Fishing Area 5B | 27764 | Zone de gestion des pêches du Pacifique  | Pacific Fish Management Area 109
   25503 | Poisson de fond - Zone de pêche du Pacif | Pacific Groundfish Fishing Area 5B | 27765 | Zone de gestion des pêches du Pacifique  | Pacific Fish Management Area 110
### MV_PARTNERSHIP_TYPE_rel1.csv | rows=2
cols: CODE_ID,DESC_FRE,DESC_ENG
   39468 | Aucun | None
   39469 | Entente de partenariat (buddy up) | Buddy-up
### MV_PFMA_rel4.csv | rows=711
cols: CODE_ID,DESC_FRE,DESC_ENG
   27727 | Zone de gestion des pêches du Pacifique  | Pacific Fish Management Area 10
   27728 | Zone de gestion des pêches du Pacifique  | Pacific Fish Management Area 11
   27729 | Zone de gestion des pêches du Pacifique  | Pacific Fish Management Area 12
### MV_POPULATION_DENSITY_rel2.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   43824 | Faible densité | Light density
   43825 | Densité moyenne | Medium density
   43826 | Forte densité | Heavy density
### MV_PORT_rel7.csv | rows=3970
cols: CODE_ID,DESC_FRE,DESC_ENG,PROV_CODE_ID,PROV_DESC_FRE,PROV_DESC_ENG
   2599 | NUUK (GODTHAAB) | NUUK (GODTHAAB) |  |  | 
   19128 | PENDER ISLAND | PENDER ISLAND | 172 | Colombie-Britannique | British Columbia
   19130 | PENTICTON | PENTICTON | 172 | Colombie-Britannique | British Columbia
### MV_PRESERVATION_METHOD_rel3.csv | rows=6
cols: CODE_ID,DESC_FRE,DESC_ENG
   1109 | Frais | Fresh
   1230 | Sur glace | Iced
   1232 | Congelé | Frozen
### MV_PROVINCE_rel3.csv | rows=13
cols: CODE_ID,DESC_FRE,DESC_ENG
   170 | Alberta | Alberta
   172 | Colombie-Britannique | British Columbia
   174 | Manitoba | Manitoba
### MV_QTY_EVALUATION_METHOD_rel3.csv | rows=2
cols: CODE_ID,DESC_FRE,DESC_ENG
   38141 | Quantité estimée | Estimated quantity
   38143 | Quantité réelle | Actual quantity
### MV_QUOTA_AREA_rel3.csv | rows=511
cols: CODE_ID,DESC_FRE,DESC_ENG,GROUP_CODE_ID,GROUP_DESC_FRE,GROUP_DESC_ENG
   43844 | Pacifique - Zones de gestion par quota - | Pacific - Quota Area - Geoduck - CCA02 S | 3408 | Panope - Zones de pêche du Pacifique | Pacific Geoduck Area
   43845 | Pacifique - Zones de gestion par quota - | Pacific - Quota Area - Geoduck - CCA03 T | 3408 | Panope - Zones de pêche du Pacifique | Pacific Geoduck Area
   43846 | Pacifique - Zones de gestion par quota - | Pacific - Quota Area - Geoduck - CCA04 A | 3408 | Panope - Zones de pêche du Pacifique | Pacific Geoduck Area
### MV_QUOTA_TYPE_rel3.csv | rows=3
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   39470 |  | Quota individuel transférable |  | Individual transferable quota
   39471 |  | Allocation par entreprise |  | Enterprise allocation
   39472 |  | Compétitif |  | Competitive
### MV_REFERENCE_UNIT_rel1.csv | rows=5
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   38170 | /lb | par livre | /lb | per pound
   38172 | /kg | par kilo | /kg | per kilogram
   38174 | /t | par tonne US | /t | per ton US
### MV_RELATIVE_LOCATION_rel3.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   38145 | À(de) droite | On the right side
   38147 | Au centre | In center
   38149 | À(de) gauche | On the left side
### MV_RESPONSE_rel1.csv | rows=2
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   11617 | O | Oui | Y | Yes
   11619 | N | Non | N | No
### MV_SAR_CONTEXT_rel3.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   39464 | Observation seulement (aucune capture) | Observation only (not caught)
   39465 | Spécimen(s) capturé(s) puis remis à l'ea | Specimen caught then released at sea
   39466 | Spécimen(s) capturé(s) puis conservé(s) | Specimen caught and kept
### MV_SAR_LIST_rel8.csv | rows=16
cols: CODE_ID,DESC_FRE,DESC_ENG
   1335 | Requin pèlerin | Shark, Basking
   1337 | Requin bleu | Shark, Blue
   1344 | Laimargue | Shark, Greenland
### MV_SCALLOP_PRODUCTION_AREA_rel3.csv | rows=12
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   28600 | 1 | App (baie de fundy) - 1 | 1 | Spa (Bay Of Fundy) - 1
   28601 | 2 | App (baie de fundy) - 2 | 2 | Spa (Bay Of Fundy) - 2
   28602 | 3 | App (baie de fundy) - 3 | 3 | Spa (Bay Of Fundy) - 3
### MV_SEA_BOTTOM_TYPE_rel3.csv | rows=25
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   11621 | 1 | Roche-mère | 1 | Rock
   11622 | 2 | Gros bloc | 2 | Boulder
   11623 | 3 | Cailloux | 3 | Gravel
### MV_SEA_OTTERS_PRESENCE_rel2.csv | rows=5
cols: CODE_ID,DESC_FRE,DESC_ENG
   39807 | Aucun trou, aucune loutre | No holes, no otters
   39808 | Aucun trou, loutre(s) observée(s) | No holes, otters seen
   39809 | Nombre minime de trous, quota atteignabl | Minimal # holes, quota achievable
### MV_SERVICE_PROVIDER_rel33.csv | rows=83
cols: CODE_ID,DESC_FRE,DESC_ENG
   11682 | Res-mar Inc. | Res-mar Inc.
   11683 | Seaweigh | Seaweigh
   11684 | Biorex | Biorex
### MV_SEXUAL_MATURITY_rel3.csv | rows=7
cols: CODE_ID,DESC_FRE,DESC_ENG
   38151 | Inconnu/non fourni | Unknown/not supplied
   38153 | Mâle - Stade de maturité 1 | Male - Maturity Stage 1
   38155 | Mâle - Stade de maturité 2 | Male - Maturity Stage 2
### MV_SEX_rel3.csv | rows=5
cols: CODE_ID,DESC_FRE,DESC_ENG
   4713 | Mâle | Male
   4715 | Femelle | Female
   11170 | Inconnu | Unknown
### MV_SIZE_CATEGORY_LENGTH_rel4.csv | rows=4
cols: CODE_ID,DESC_FRE,DESC_ENG
   37183 | Poisson ayant une longueur supérieure ou | Fish is greater than or equal to the leg
   37184 | Poisson ayant une longueur inférieure à  | Fish is smaller than the legal size-limi
   37185 | Truite arc-en-ciel ayant une longueur in | ONCORHYNCHUS MYKISS less than 50 cm in l
### MV_SIZE_CATEGORY_WEIGHT_rel3.csv | rows=9
cols: CODE_ID,DESC_FRE,DESC_ENG
   37174 | Moins de 3 livres | Less than 3 lbs
   37175 | Non définie | Undefined
   37176 | 3 à 4 livres | 3 to 4 lbs
### MV_SIZE_rel2.csv | rows=2
cols: 
   
   
### MV_SPECIES_LIFE_CYCLE_rel4.csv | rows=23
cols: CODE_ID,DESC_FRE,DESC_ENG
   4615 | Blanchon | Whitecoat
   4617 | Guenillou | Ragged Jacket
   4619 | Brasseur | Beater
### MV_SPECIES_PACKAGING_METHOD_rel3.csv | rows=2
cols: CODE_ID,DESC_FRE,DESC_ENG
   37111 | Vrac | Bulk
   37113 | Sacs | Bags
### MV_SPECIES_PRODUCT_FORM_rel6.csv | rows=126
cols: CODE_ID,DESC_FRE,DESC_ENG
   1111 | Oeufs | Roe
   2001 | Caviar | Caviar
   2003 | Huile de foies | Liver Oil
### MV_SPECIES_QUALITY_rel4.csv | rows=7
cols: CODE_ID,DESC_FRE,DESC_ENG
   37855 | Grade A | Grade A
   37857 | Grade B | Grade B
   37859 | Grade C | Grade C
### MV_SPECIES_SIZE_rel2.csv | rows=8
cols: CODE_ID,DESC_FRE,DESC_ENG
   825 | Très petit | Extra Small
   826 | Petit | Small
   827 | Moyen | Medium
### MV_SPECIES_TREATMENT_rel5.csv | rows=28
cols: CODE_ID,DESC_FRE,DESC_ENG
   1109 | Frais | Fresh
   1230 | Sur glace | Iced
   1232 | Congelé | Frozen
### MV_SPECIES_rel48.csv | rows=435
cols: CODE_ID,DESC_FRE,DESC_ENG
   808 | Poissons de fond | Groundfish
   810 | Pélagiques | Pelagics
   814 | Autres | Other
### MV_SPECIMENS_CONDITION_rel1.csv | rows=4
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   11881 | V | Vivant | A | Alive
   11883 | M | Mort | D | Dead
   37910 | PV | La plupart sont vivants | MA | Most alive
### MV_SPECIMEN_DENSITY_rel3.csv | rows=7
cols: CODE_ID,DESC_FRE,DESC_ENG
   29400 | Moins de 1 au mètre carré | Less than 1 per square meter
   29404 | Plus de 10 au mètre carré | More than 10 per square meter
   38125 | 0 par mètre carré | 0 per square meter
### MV_SPECIMEN_PRESENCE_rel3.csv | rows=4
cols: CODE_ID,DESC_FRE,DESC_ENG
   38037 | Aucun | None
   38039 | Peu | Few
   38041 | Moyenne | Multiple
### MV_STAT_DISTRICT_SECTION_rel8.csv | rows=199
cols: CODE_ID,DESC_FRE,DESC_ENG,STAT_AREA_ID,STAT_AREA_DESC_FRE,STAT_AREA_DESC_ENG
   38063 | 1 - Cape Norman à Cape Bauld | 1 - Cape Norman to Cape Bauld | 38047 | Secteur A | Area A
   38064 | 2 - Cape Bauld à Lobster Point | 2 - Cape Bauld to Lobster Point | 38047 | Secteur A | Area A
   38065 | 3 - Lobster Point à Cape Fox | 3 - Lobster Point to Cape Fox | 38047 | Secteur A | Area A
### MV_STAT_SECTION_VS_DFO_REGION_rel5.csv | rows=204
cols: STAT_SECT_CODE_ID,STAT_SECT_DESC_FRE,STAT_SECT_DESC_ENG,DFO_REGION_CODE_ID,DFO_REGION_DESC_FRE,DFO_REGION_DESC_ENG
   38063 | 1 - Cape Norman à Cape Bauld | 1 - Cape Norman to Cape Bauld | 1002 | Terre-Neuve | Newfoundland
   38064 | 2 - Cape Bauld à Lobster Point | 2 - Cape Bauld to Lobster Point | 1002 | Terre-Neuve | Newfoundland
   38065 | 3 - Lobster Point à Cape Fox | 3 - Lobster Point to Cape Fox | 1002 | Terre-Neuve | Newfoundland
### MV_STAT_SECTION_VS_FMA_rel6.csv | rows=64
cols: STAT_SECT_CODE_ID,STAT_SECT_DESC_FRE,STAT_SECT_DESC_ENG,FMA_CODE_ID,FMA_DESC_FRE,FMA_DESC_ENG
   38063 | Section #01: 1 - Cape Norman à Cape Baul | Section #01: 1 - Cape Norman to Cape Bau | 2097 | Homard - Zone de pêche 14c | Lobster Fishing Area 14c
   38064 | Section #02: 2 - Cape Bauld à Lobster Po | Section #02: 2 - Cape Bauld to Lobster P | 1653 | Homard - Zone de pêche 03 | Lobster Fishing Area 03
   38065 | Section #03: 3 - Lobster Point à Cape Fo | Section #03: 3 - Lobster Point to Cape F | 1653 | Homard - Zone de pêche 03 | Lobster Fishing Area 03
### MV_STAT_SECTION_VS_PROVINCE_rel4.csv | rows=199
cols: STAT_SECT_CODE_ID,STAT_SECT_DESC_FRE,STAT_SECT_DESC_ENG,PROVINCE_CODE_ID,PROVINCE_DESC_FRE,PROVINCE_DESC_ENG
   38063 | 1 - Cape Norman à Cape Bauld | 1 - Cape Norman to Cape Bauld | 178 | Terre-Neuve-et-Labrador | Newfoundland and Labrador
   38064 | 2 - Cape Bauld à Lobster Point | 2 - Cape Bauld to Lobster Point | 178 | Terre-Neuve-et-Labrador | Newfoundland and Labrador
   38065 | 3 - Lobster Point à Cape Fox | 3 - Lobster Point to Cape Fox | 178 | Terre-Neuve-et-Labrador | Newfoundland and Labrador
### MV_SUBFORMS_rel18.csv | rows=104
cols: SUBFORM_ID,DESC_FRE,DESC_ENG,START_DATE,END_DATE,FORM_VERSION_ID
   1 | GLF - Crevette | GLF - Shrimp | 2021-06-23 00:00:00 |  | 229
   2 | MAR - Crevette - Engins mobiles | MAR - Shrimp - Mobile Gear | 2021-06-23 00:00:00 |  | 229
   3 | MAR - Crevette - Trappe | MAR - Shrimp - Trap | 2021-06-23 00:00:00 |  | 229
### MV_SUB_AREA_rel3.csv | rows=621
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG,FMA_CODE_ID
   27738 | 21 | Zone de gestion des pêches du Pacifique  | 21 | Pacific Fish Management Area 21 | 3538
   27739 | 22 | Zone de gestion des pêches du Pacifique  | 22 | Pacific Fish Management Area 22 | 3538
   27758 | 103 | Zone de gestion des pêches du Pacifique  | 103 | Pacific Fish Management Area 103 | 3534
### MV_SWELL_HEIGHT_rel4.csv | rows=6
cols: CODE_ID,DESC_FRE,DESC_ENG
   37786 | 0 à 1 mètre   (0" à 3' 3") | 0 to 1 meter   (0" to 3' 3")
   37788 | 1 à 2 mètres (3' 3" à 6' 6") | 1 to 2 meters (3' 3" to 6' 6")
   37790 | 2 à 3 mètres (6' 6" à 9' 10") | 2 to 3 meters (6' 6" to 9' 10")
### MV_TRAP_FISHING_METHOD_rel3.csv | rows=2
cols: CODE_ID,DESC_FRE,DESC_ENG
   37207 | Un seul casier par ligne | Single
   37209 | Plusieurs casiers par ligne | Ground line
### MV_TRAP_SIZE_rel2.csv | rows=8
cols: CODE_ID,DESC_FRE,DESC_ENG
   25251 | 3 pieds | 3 feet
   25253 | 4 pieds | 4 feet
   25255 | 6 pieds | 6 feet
### MV_TRAP_SUBTYPE_rel7.csv | rows=19
cols: CODE_ID,DESC_FRE,DESC_ENG
   37802 | Casier à homard avec entrée(s) sur le de | Top Entry lobster trap
   37836 | Casier à homard | Lobster trap
   37837 | Casier à crevette | Shrimp trap
### MV_TRAWL_CONFIG_rel1.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   37985 | Chalut simple | Single trawl
   37987 | Chalut double | Double trawl
   37989 | Chalut triple | Triple trawl
### MV_TYPE_OF_SALE_rel1.csv | rows=2
cols: CODE_ID,DESC_FRE,DESC_ENG
   38295 | Vente à un particulier | Private sale (dock sale)
   38297 | Vente à une compagnie/à une usine | Processor sale
### MV_UNITS_OF_MEASURE_rel2.csv | rows=58
cols: CODE_ID,ABBRV_FRE,DESC_FRE,ABBRV_ENG,DESC_ENG
   52 | TM | Tonnes métriques | MT | Tonnes (Metric)
   53 |  | Pas sur la liste |  | Not on the list
   54 |  | Articles/Pièces |  | Items/Pieces
### MV_VESSEL_ACTIVITY_rel3.csv | rows=7
cols: CODE_ID,DESC_FRE,DESC_ENG
   1113 | Pêche | Fishing
   1135 | Déplacements lents / à l'ancre | Jogging
   1137 | En déplacement | Steaming
### MV_WATERBODIES_rel4.csv | rows=490
cols: CODE_ID,WB_NUM_FRE,DESC_FRE,WB_NUM_ENG,DESC_ENG,FMA_CODE_ID,FMA_DESC_FRE,FMA_DESC_ENG
   42755 | 107 | (Centre Arctique, plan d'eau #107) - Lac | 107 | (Central Arctic, waterbody #107) - Unnam |  | (Centre Arctique, plan d'eau #107) - Lac | (Central Arctic, waterbody #107) - Unnam
   42756 | 108 | (Centre Arctique, plan d'eau #108) - Lac | 108 | (Central Arctic, waterbody #108) - Unnam |  | (Centre Arctique, plan d'eau #108) - Lac | (Central Arctic, waterbody #108) - Unnam
   42757 | 109 | (Centre Arctique, plan d'eau #109) - Lac | 109 | (Central Arctic, waterbody #109) - Unnam |  | (Centre Arctique, plan d'eau #109) - Lac | (Central Arctic, waterbody #109) - Unnam
### MV_WATER_DEPTH_CATEGORY_rel2.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   43789 | Surface | Surface
   43790 | Mi-profondeur | Midwater
   43791 | Fond | Bottom
### MV_WEATHER_CONDITIONS_rel2.csv | rows=6
cols: CODE_ID,DESC_FRE,DESC_ENG
   25194 | Ensoleillé | Sunny
   25196 | Pluvieux | Rainy
   25198 | Nuageux | Cloudy
### MV_WIND_SPEED_INTERVAL_rel3.csv | rows=8
cols: CODE_ID,DESC_FRE,DESC_ENG
   25257 | 0 à 4 noeud(s) | 0 to 4 knot(s)
   25259 | 5 à 9 noeuds | 5 to 9 knots
   25261 | 10 à 14 noeuds | 10 to 14 knots
### MV_WOUND_SEVERITY_rel3.csv | rows=3
cols: CODE_ID,DESC_FRE,DESC_ENG
   37951 | Blessure légère | Minor wound
   37953 | Blessure grave | Severe wound
   37955 | Blessure mortelle | Mortal wound
### SPECIES_GRID_NAFO_FMA.CSV | rows=12372
cols: SPECIES_ID,GRID_ID,NAFO_ID,FMA_ID
   808 | 33203 | 11767 | 25805
   808 | 33204 | 11767 | 25805
   808 | 33205 | 11767 | 25805
```