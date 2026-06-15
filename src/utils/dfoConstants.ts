// ============================================================
// dfoConstants.ts
// DFO ELOG Form 234 — MAR Subform 90 constants
// Generated from official DFO reference tables (2026-04-30)
// DO NOT hand-edit code IDs — they come directly from DFO CSVs
// ============================================================

import { MV_PORT, MV_PROVINCE } from '../data/reftables';

// ─── Hardcoded header values ────────────────────────────────
export const DFO_FORM_VER_ID = 234;
export const DFO_REG_ID = 1004;        // Maritimes
export const DFO_SUBFORM_ID = 90;      // MAR - Lobster
export const DFO_TGT_SPECIES_ID = 1312; // Lobster
export const DFO_GEAR_ID = 925;        // Pot/Trap (display as "Pot/Trap" per Rule 270)

// TEST value. DFO confirmed only client software version 0 qualifies for testing
// (GENERAL_INFO.SOFT_VER = 0). MUST be swapped to the DFO-assigned qualified version
// before production.
export const DFO_SOFT_VER = '0';

// LobsterLog service-provider company ID (GENERAL_INFO.CIE_ID). Same for every user —
// identifies the software/company, not the fisher. DFO-assigned (Ticket #2126).
export const DFO_CIE_ID = '44542';

// ─── Fishing Management Areas — MAR Subform 90 ──────────────
// LFAs 27-38 require LGRID_ID (Rule 619)
// LFAs 40, 41 do NOT require LGRID_ID
// Area 38b requires LGRID_ID + GPS + HLIN/HLOUT + NB_SPCMN_BRD
export const DFO_FMA_LIST = [
  { codeId: 1581, label: 'LFA 27' },
  { codeId: 1582, label: 'LFA 28' },
  { codeId: 1583, label: 'LFA 29' },
  { codeId: 1584, label: 'LFA 30' },
  { codeId: 1585, label: 'LFA 31a' },
  { codeId: 1586, label: 'LFA 31b' },
  { codeId: 1587, label: 'LFA 32' },
  { codeId: 1588, label: 'LFA 33' },
  { codeId: 1589, label: 'LFA 34' },
  { codeId: 1590, label: 'LFA 35' },
  { codeId: 1591, label: 'LFA 36' },
  { codeId: 1592, label: 'LFA 37' },
  { codeId: 1593, label: 'LFA 38' },
  { codeId: 1594, label: 'LFA 40' },
  { codeId: 1595, label: 'LFA 41' },
  { codeId: 28599, label: 'Area 38b' },
] as const;

// LFAs that require LGRID_ID (Rule 619)
export const DFO_FMA_LGRID_REQUIRED = new Set([
  1581, 1582, 1583, 1584, 1585, 1586, 1587,
  1588, 1589, 1590, 1591, 1592, 1593,
]);

// LFAs that require HLIN + HLOUT (Rules 2024/2025)
export const DFO_FMA_HLIN_REQUIRED = new Set([28599, 1595]);

// LFA where GPS lat/long is mandatory (Rule 3059)
export const DFO_FMA_GPS_REQUIRED = new Set([28599]);

// LFA where NB_SPCMN_BRD (berried females) is mandatory (Rule 654)
export const DFO_FMA_BERRIED_REQUIRED = new Set([28599]);

// ─── Lobster Settlement Grids per FMA ───────────────────────
// Key = FMA codeId, Value = array of { codeId, display }
// codeId goes in XML; display is what the fisherman sees
export const DFO_LGRID_BY_FMA: Record<number, Array<{ codeId: number; display: number }>> = {
  "1581": [
    {
      "codeId": 29340,
      "display": 348
    },
    {
      "codeId": 29341,
      "display": 349
    },
    {
      "codeId": 29342,
      "display": 350
    },
    {
      "codeId": 29343,
      "display": 351
    },
    {
      "codeId": 29344,
      "display": 352
    },
    {
      "codeId": 29345,
      "display": 353
    },
    {
      "codeId": 29346,
      "display": 354
    },
    {
      "codeId": 29347,
      "display": 355
    },
    {
      "codeId": 29348,
      "display": 356
    },
    {
      "codeId": 29349,
      "display": 357
    },
    {
      "codeId": 29350,
      "display": 358
    },
    {
      "codeId": 29351,
      "display": 359
    },
    {
      "codeId": 29352,
      "display": 360
    },
    {
      "codeId": 29353,
      "display": 361
    },
    {
      "codeId": 29354,
      "display": 362
    },
    {
      "codeId": 29355,
      "display": 363
    },
    {
      "codeId": 29356,
      "display": 364
    }
  ],
  "1582": [
    {
      "codeId": 29357,
      "display": 365
    },
    {
      "codeId": 29358,
      "display": 366
    },
    {
      "codeId": 29359,
      "display": 367
    },
    {
      "codeId": 39676,
      "display": 368
    }
  ],
  "1583": [
    {
      "codeId": 29333,
      "display": 341
    },
    {
      "codeId": 29334,
      "display": 342
    },
    {
      "codeId": 29335,
      "display": 343
    },
    {
      "codeId": 29336,
      "display": 344
    }
  ],
  "1584": [
    {
      "codeId": 29337,
      "display": 345
    },
    {
      "codeId": 29338,
      "display": 346
    },
    {
      "codeId": 29339,
      "display": 347
    }
  ],
  "1585": [
    {
      "codeId": 29329,
      "display": 337
    },
    {
      "codeId": 29330,
      "display": 338
    },
    {
      "codeId": 29331,
      "display": 339
    },
    {
      "codeId": 29332,
      "display": 340
    }
  ],
  "1586": [
    {
      "codeId": 29323,
      "display": 331
    },
    {
      "codeId": 29324,
      "display": 332
    },
    {
      "codeId": 29325,
      "display": 333
    },
    {
      "codeId": 29326,
      "display": 334
    },
    {
      "codeId": 29327,
      "display": 335
    },
    {
      "codeId": 29328,
      "display": 336
    }
  ],
  "1587": [
    {
      "codeId": 29315,
      "display": 323
    },
    {
      "codeId": 29316,
      "display": 324
    },
    {
      "codeId": 29317,
      "display": 325
    },
    {
      "codeId": 29318,
      "display": 326
    },
    {
      "codeId": 29319,
      "display": 327
    },
    {
      "codeId": 29320,
      "display": 328
    },
    {
      "codeId": 29321,
      "display": 329
    },
    {
      "codeId": 29322,
      "display": 330
    }
  ],
  "1588": [
    {
      "codeId": 29293,
      "display": 301
    },
    {
      "codeId": 29294,
      "display": 302
    },
    {
      "codeId": 29295,
      "display": 303
    },
    {
      "codeId": 29296,
      "display": 304
    },
    {
      "codeId": 29297,
      "display": 305
    },
    {
      "codeId": 29298,
      "display": 306
    },
    {
      "codeId": 29299,
      "display": 307
    },
    {
      "codeId": 29300,
      "display": 308
    },
    {
      "codeId": 29301,
      "display": 309
    },
    {
      "codeId": 29302,
      "display": 310
    },
    {
      "codeId": 29303,
      "display": 311
    },
    {
      "codeId": 29304,
      "display": 312
    },
    {
      "codeId": 29305,
      "display": 313
    },
    {
      "codeId": 29306,
      "display": 314
    },
    {
      "codeId": 29307,
      "display": 315
    },
    {
      "codeId": 29308,
      "display": 316
    },
    {
      "codeId": 29309,
      "display": 317
    },
    {
      "codeId": 29310,
      "display": 318
    },
    {
      "codeId": 29311,
      "display": 319
    },
    {
      "codeId": 29312,
      "display": 320
    },
    {
      "codeId": 29313,
      "display": 321
    },
    {
      "codeId": 29314,
      "display": 322
    },
    {
      "codeId": 29360,
      "display": 469
    },
    {
      "codeId": 29361,
      "display": 470
    },
    {
      "codeId": 29362,
      "display": 471
    },
    {
      "codeId": 29363,
      "display": 472
    },
    {
      "codeId": 29364,
      "display": 473
    },
    {
      "codeId": 29365,
      "display": 474
    },
    {
      "codeId": 29366,
      "display": 475
    },
    {
      "codeId": 29367,
      "display": 476
    },
    {
      "codeId": 29368,
      "display": 477
    },
    {
      "codeId": 29369,
      "display": 478
    },
    {
      "codeId": 29370,
      "display": 479
    },
    {
      "codeId": 29371,
      "display": 480
    },
    {
      "codeId": 29372,
      "display": 481
    },
    {
      "codeId": 29373,
      "display": 482
    },
    {
      "codeId": 29374,
      "display": 483
    },
    {
      "codeId": 29375,
      "display": 484
    },
    {
      "codeId": 29376,
      "display": 485
    },
    {
      "codeId": 29377,
      "display": 486
    },
    {
      "codeId": 29378,
      "display": 487
    },
    {
      "codeId": 29379,
      "display": 488
    },
    {
      "codeId": 29380,
      "display": 489
    },
    {
      "codeId": 29381,
      "display": 490
    },
    {
      "codeId": 29382,
      "display": 491
    },
    {
      "codeId": 29383,
      "display": 492
    },
    {
      "codeId": 29384,
      "display": 493
    },
    {
      "codeId": 29385,
      "display": 494
    },
    {
      "codeId": 29386,
      "display": 495
    },
    {
      "codeId": 29387,
      "display": 496
    }
  ],
  "1589": [
    {
      "codeId": 29168,
      "display": 42
    },
    {
      "codeId": 29169,
      "display": 43
    },
    {
      "codeId": 29170,
      "display": 44
    },
    {
      "codeId": 29179,
      "display": 53
    },
    {
      "codeId": 29180,
      "display": 54
    },
    {
      "codeId": 29181,
      "display": 55
    },
    {
      "codeId": 29189,
      "display": 66
    },
    {
      "codeId": 29190,
      "display": 67
    },
    {
      "codeId": 29191,
      "display": 68
    },
    {
      "codeId": 29192,
      "display": 69
    },
    {
      "codeId": 29196,
      "display": 77
    },
    {
      "codeId": 29197,
      "display": 78
    },
    {
      "codeId": 29198,
      "display": 79
    },
    {
      "codeId": 29199,
      "display": 80
    },
    {
      "codeId": 29200,
      "display": 81
    },
    {
      "codeId": 29203,
      "display": 88
    },
    {
      "codeId": 29204,
      "display": 89
    },
    {
      "codeId": 29205,
      "display": 90
    },
    {
      "codeId": 29206,
      "display": 91
    },
    {
      "codeId": 29207,
      "display": 92
    },
    {
      "codeId": 29210,
      "display": 98
    },
    {
      "codeId": 29211,
      "display": 99
    },
    {
      "codeId": 29212,
      "display": 100
    },
    {
      "codeId": 29213,
      "display": 101
    },
    {
      "codeId": 29214,
      "display": 102
    },
    {
      "codeId": 29215,
      "display": 103
    },
    {
      "codeId": 29216,
      "display": 107
    },
    {
      "codeId": 29217,
      "display": 108
    },
    {
      "codeId": 29218,
      "display": 109
    },
    {
      "codeId": 29219,
      "display": 110
    },
    {
      "codeId": 29220,
      "display": 111
    },
    {
      "codeId": 29221,
      "display": 112
    },
    {
      "codeId": 29222,
      "display": 113
    },
    {
      "codeId": 29223,
      "display": 114
    },
    {
      "codeId": 29224,
      "display": 118
    },
    {
      "codeId": 29225,
      "display": 119
    },
    {
      "codeId": 29226,
      "display": 120
    },
    {
      "codeId": 29227,
      "display": 121
    },
    {
      "codeId": 29228,
      "display": 122
    },
    {
      "codeId": 29229,
      "display": 123
    },
    {
      "codeId": 29230,
      "display": 124
    },
    {
      "codeId": 29231,
      "display": 125
    },
    {
      "codeId": 29232,
      "display": 126
    },
    {
      "codeId": 29233,
      "display": 127
    },
    {
      "codeId": 29234,
      "display": 132
    },
    {
      "codeId": 29235,
      "display": 133
    },
    {
      "codeId": 29236,
      "display": 134
    },
    {
      "codeId": 29237,
      "display": 135
    },
    {
      "codeId": 29238,
      "display": 136
    },
    {
      "codeId": 29239,
      "display": 137
    },
    {
      "codeId": 29240,
      "display": 138
    },
    {
      "codeId": 29241,
      "display": 139
    },
    {
      "codeId": 29242,
      "display": 140
    },
    {
      "codeId": 29243,
      "display": 141
    },
    {
      "codeId": 29244,
      "display": 148
    },
    {
      "codeId": 29245,
      "display": 149
    },
    {
      "codeId": 29246,
      "display": 150
    },
    {
      "codeId": 29247,
      "display": 151
    },
    {
      "codeId": 29248,
      "display": 152
    },
    {
      "codeId": 29249,
      "display": 153
    },
    {
      "codeId": 29250,
      "display": 154
    },
    {
      "codeId": 29251,
      "display": 155
    },
    {
      "codeId": 29252,
      "display": 156
    },
    {
      "codeId": 29253,
      "display": 157
    },
    {
      "codeId": 29254,
      "display": 158
    },
    {
      "codeId": 29255,
      "display": 159
    },
    {
      "codeId": 29257,
      "display": 167
    },
    {
      "codeId": 29258,
      "display": 168
    },
    {
      "codeId": 29259,
      "display": 169
    },
    {
      "codeId": 29260,
      "display": 170
    },
    {
      "codeId": 29261,
      "display": 171
    },
    {
      "codeId": 29262,
      "display": 172
    },
    {
      "codeId": 29263,
      "display": 173
    },
    {
      "codeId": 29264,
      "display": 174
    },
    {
      "codeId": 29265,
      "display": 175
    },
    {
      "codeId": 29266,
      "display": 176
    },
    {
      "codeId": 29267,
      "display": 177
    },
    {
      "codeId": 29268,
      "display": 185
    },
    {
      "codeId": 29269,
      "display": 186
    },
    {
      "codeId": 29270,
      "display": 187
    },
    {
      "codeId": 29271,
      "display": 188
    },
    {
      "codeId": 29272,
      "display": 189
    },
    {
      "codeId": 29273,
      "display": 190
    },
    {
      "codeId": 29274,
      "display": 191
    },
    {
      "codeId": 29275,
      "display": 192
    },
    {
      "codeId": 29276,
      "display": 193
    },
    {
      "codeId": 29277,
      "display": 194
    },
    {
      "codeId": 29278,
      "display": 195
    },
    {
      "codeId": 29279,
      "display": 196
    },
    {
      "codeId": 29280,
      "display": 204
    },
    {
      "codeId": 29281,
      "display": 205
    },
    {
      "codeId": 29282,
      "display": 206
    },
    {
      "codeId": 29283,
      "display": 207
    },
    {
      "codeId": 29284,
      "display": 208
    },
    {
      "codeId": 29285,
      "display": 209
    },
    {
      "codeId": 29286,
      "display": 210
    },
    {
      "codeId": 29287,
      "display": 211
    },
    {
      "codeId": 29288,
      "display": 212
    },
    {
      "codeId": 29289,
      "display": 213
    },
    {
      "codeId": 29290,
      "display": 214
    },
    {
      "codeId": 29291,
      "display": 223
    },
    {
      "codeId": 29292,
      "display": 224
    }
  ],
  "1590": [
    {
      "codeId": 29136,
      "display": 1
    },
    {
      "codeId": 29137,
      "display": 2
    },
    {
      "codeId": 29138,
      "display": 3
    },
    {
      "codeId": 29141,
      "display": 6
    },
    {
      "codeId": 29142,
      "display": 7
    },
    {
      "codeId": 29146,
      "display": 11
    },
    {
      "codeId": 29147,
      "display": 12
    },
    {
      "codeId": 29148,
      "display": 13
    },
    {
      "codeId": 29149,
      "display": 14
    },
    {
      "codeId": 29150,
      "display": 15
    },
    {
      "codeId": 29151,
      "display": 16
    },
    {
      "codeId": 29152,
      "display": 17
    },
    {
      "codeId": 29153,
      "display": 18
    },
    {
      "codeId": 29154,
      "display": 19
    },
    {
      "codeId": 29155,
      "display": 20
    },
    {
      "codeId": 29158,
      "display": 32
    },
    {
      "codeId": 29159,
      "display": 33
    },
    {
      "codeId": 29160,
      "display": 34
    },
    {
      "codeId": 29161,
      "display": 35
    },
    {
      "codeId": 29162,
      "display": 36
    },
    {
      "codeId": 29170,
      "display": 44
    },
    {
      "codeId": 29171,
      "display": 45
    },
    {
      "codeId": 29172,
      "display": 46
    },
    {
      "codeId": 29173,
      "display": 47
    },
    {
      "codeId": 29181,
      "display": 55
    },
    {
      "codeId": 29182,
      "display": 56
    },
    {
      "codeId": 29183,
      "display": 57
    }
  ],
  "1591": [
    {
      "codeId": 29139,
      "display": 4
    },
    {
      "codeId": 29140,
      "display": 5
    },
    {
      "codeId": 29141,
      "display": 6
    },
    {
      "codeId": 29143,
      "display": 8
    },
    {
      "codeId": 29144,
      "display": 9
    },
    {
      "codeId": 29145,
      "display": 10
    },
    {
      "codeId": 29146,
      "display": 11
    },
    {
      "codeId": 29147,
      "display": 12
    },
    {
      "codeId": 29148,
      "display": 13
    },
    {
      "codeId": 39677,
      "display": 25
    },
    {
      "codeId": 39678,
      "display": 26
    },
    {
      "codeId": 39679,
      "display": 27
    },
    {
      "codeId": 39680,
      "display": 28
    },
    {
      "codeId": 39681,
      "display": 29
    },
    {
      "codeId": 29156,
      "display": 30
    },
    {
      "codeId": 29157,
      "display": 31
    },
    {
      "codeId": 29158,
      "display": 32
    },
    {
      "codeId": 29159,
      "display": 33
    },
    {
      "codeId": 29160,
      "display": 34
    },
    {
      "codeId": 29163,
      "display": 37
    },
    {
      "codeId": 29164,
      "display": 38
    },
    {
      "codeId": 29165,
      "display": 39
    },
    {
      "codeId": 29166,
      "display": 40
    },
    {
      "codeId": 29167,
      "display": 41
    },
    {
      "codeId": 29168,
      "display": 42
    },
    {
      "codeId": 29169,
      "display": 43
    },
    {
      "codeId": 29170,
      "display": 44
    },
    {
      "codeId": 29171,
      "display": 45
    },
    {
      "codeId": 29175,
      "display": 49
    }
  ],
  "1592": [
    {
      "codeId": 29164,
      "display": 38
    },
    {
      "codeId": 29165,
      "display": 39
    },
    {
      "codeId": 29166,
      "display": 40
    },
    {
      "codeId": 29167,
      "display": 41
    },
    {
      "codeId": 29168,
      "display": 42
    }
  ],
  "1593": [
    {
      "codeId": 29165,
      "display": 39
    },
    {
      "codeId": 29166,
      "display": 40
    },
    {
      "codeId": 29167,
      "display": 41
    },
    {
      "codeId": 29168,
      "display": 42
    },
    {
      "codeId": 29175,
      "display": 49
    },
    {
      "codeId": 29176,
      "display": 50
    },
    {
      "codeId": 29177,
      "display": 51
    },
    {
      "codeId": 29178,
      "display": 52
    },
    {
      "codeId": 29179,
      "display": 53
    },
    {
      "codeId": 29184,
      "display": 61
    },
    {
      "codeId": 29185,
      "display": 62
    },
    {
      "codeId": 29186,
      "display": 63
    },
    {
      "codeId": 29187,
      "display": 64
    },
    {
      "codeId": 29188,
      "display": 65
    },
    {
      "codeId": 29189,
      "display": 66
    },
    {
      "codeId": 29193,
      "display": 74
    },
    {
      "codeId": 29194,
      "display": 75
    },
    {
      "codeId": 29195,
      "display": 76
    },
    {
      "codeId": 29196,
      "display": 77
    },
    {
      "codeId": 29197,
      "display": 78
    },
    {
      "codeId": 29198,
      "display": 79
    },
    {
      "codeId": 29201,
      "display": 86
    },
    {
      "codeId": 29202,
      "display": 87
    },
    {
      "codeId": 29203,
      "display": 88
    },
    {
      "codeId": 29204,
      "display": 89
    },
    {
      "codeId": 29208,
      "display": 96
    },
    {
      "codeId": 29209,
      "display": 97
    },
    {
      "codeId": 29210,
      "display": 98
    },
    {
      "codeId": 29211,
      "display": 99
    },
    {
      "codeId": 29216,
      "display": 107
    },
    {
      "codeId": 29217,
      "display": 108
    }
  ]
};

// ─── Bait Types — MAR Subform 90 (Rule 239b) ────────────────
// BT_COND_ID is BLOCKED for Waste/Electronic/Synthetic (Rule 3060)
// BT_COND_ID is MANDATORY for all other bait types
export const DFO_BAIT_TYPE_LIST = [
  { codeId: 814,   label: 'Other' },
  { codeId: 1266,  label: 'Alewife' },
  { codeId: 1268,  label: 'Monkfish' },
  { codeId: 1277,  label: 'Capelin' },
  { codeId: 1283,  label: 'Clams, Unspecified' },
  { codeId: 1284,  label: 'Cod, Atlantic' },
  { codeId: 1286,  label: 'Crab, Jonah' },
  { codeId: 1287,  label: 'Crab, Rock' },
  { codeId: 1289,  label: 'Crab, Red' },
  { codeId: 1293,  label: 'Spiny Dogfish' },
  { codeId: 1299,  label: 'Flatfishes, not specified' },
  { codeId: 1300,  label: 'Halibut, Greenland' },
  { codeId: 1303,  label: 'Haddock' },
  { codeId: 1304,  label: 'Halibut, Atlantic' },
  { codeId: 1315,  label: 'Mackerel, Atlantic' },
  { codeId: 1325,  label: 'Plaice, American' },
  { codeId: 1326,  label: 'Pollock' },
  { codeId: 1345,  label: 'Shad, American' },
  { codeId: 1917,  label: 'Crab, Green' },
  { codeId: 1921,  label: 'Cunner' },
  { codeId: 1947,  label: 'Menhaden, Atlantic' },
  { codeId: 1961,  label: 'Sculpin, Shorthorn' },
  { codeId: 3392,  label: 'Herring, Atlantic' },
  { codeId: 4408,  label: 'Herring, Pacific' },
  { codeId: 14714, label: 'Sculpins (COTTIDAE)' },
  { codeId: 16349, label: 'Silverside, Atlantic' },
  { codeId: 16356, label: 'Hakes' },
  { codeId: 16553, label: 'Sculpin, Longhorn' },
  { codeId: 18398, label: 'Redfishes' },
  { codeId: 19014, label: 'Squids' },
  { codeId: 19056, label: 'Tunas, Unspecified' },
  { codeId: 38503, label: 'Waste' },
  { codeId: 39777, label: 'Electronic bait' },
  { codeId: 39795, label: 'Synthetic bait' },
] as const;

// Bait types where BT_COND_ID must be BLOCKED (Rule 3060)
export const DFO_BAIT_NO_CONDITION = new Set([38503, 39777, 39795]);

// ─── Bait Conditions ────────────────────────────────────────
export const DFO_BAIT_CONDITION_LIST = [
  { codeId: 1109,  label: 'Fresh' },
  { codeId: 1232,  label: 'Frozen' },
  { codeId: 37125, label: 'Salted' },
] as const;

// ─── Catch / PCONS Species — MAR Subform 90 (Rules 974c, 975c) ──
export const DFO_MAR_SPECIES_LIST = [
  { codeId: 1312,  label: 'Lobster' },
  { codeId: 1287,  label: 'Crab, Rock' },
  { codeId: 1917,  label: 'Crab, Green' },
  { codeId: 1286,  label: 'Crab, Jonah' },
  { codeId: 1921,  label: 'Cunner' },
  { codeId: 14714, label: 'Sculpins (COTTIDAE)' },  // display as "Chabots (COTTIDAE)/Chaboisseaux" in French per Rule 272
] as const;

// ─── SAR Species (Rule 7) ────────────────────────────────────
export const DFO_SAR_SPECIES_LIST = [
  { codeId: 1363,  label: 'Bass, Striped' },
  { codeId: 14009, label: 'Shark, White' },
  { codeId: 10561, label: 'Turtle, Leatherback Sea' },
  { codeId: 4561,  label: 'Turtle, Loggerhead Sea' },
  { codeId: 1375,  label: 'Wolffish, Northern' },
  { codeId: 1382,  label: 'Wolffish, Spotted' },
] as const;

// ─── Gear Subtypes for Pot/Trap (Rule 608x) ─────────────────
export const DFO_GEAR_SUBTYPE_LIST = [
  { codeId: 39684, label: 'Wooden traps' },
  { codeId: 39685, label: 'Wire mesh traps' },
  { codeId: 39686, label: 'Wire mesh and wooden traps' },
] as const;

// ─── Trap Sizes (Rule 611) ───────────────────────────────────
export const DFO_TRAP_SIZE_LIST = [
  { codeId: 39682, label: 'Standard' },
  { codeId: 39683, label: 'Large' },
] as const;

// ─── Species product form (hardcoded = Round for lobster) ───
export const DFO_SPECIE_FRM_ID = 4691; // Round

// ─── HLIN Companies (Rule 27) ───────────────────────────────
export const DFO_HLIN_COMPANY_LIST = [
  { codeId: 11682, label: 'Resmar' },
  { codeId: 11683, label: 'Seaweigh' },
  { codeId: 25095, label: 'Atlantic Catch Data Ltd.' },
  { codeId: 25097, label: 'Baywatch Dockside Monitoring' },
  { codeId: 25098, label: 'Chéticamp Monitoring Association' },
  { codeId: 25105, label: 'Island Weigh 95 Inc.' },
  { codeId: 25107, label: 'Pèse-Pêche Inc.' },
  { codeId: 38498, label: 'Sea Tracker Dockside Monitoring' },
  { codeId: 25101, label: "Fish Harvesters' Resources Centre" },
  { codeId: 39494, label: 'Ocean Catch Monitoring Inc.' },
  { codeId: 25096, label: 'Barrington Catch Monitoring Centre Association' },
] as const;

// ─── HLOUT Companies (Rule 93) ──────────────────────────────
// Note: code 25110 label overridden by Rule 663
export const DFO_HLOUT_COMPANY_LIST = [
  { codeId: 25110, label: 'DFO Maritimes – Interactive Voice Recognition (IVR) system' },
  { codeId: 25095, label: 'Atlantic Catch Data Ltd.' },
  { codeId: 25096, label: 'Barrington Catch Monitoring Centre Association' },
  { codeId: 25097, label: 'Baywatch Dockside Monitoring' },
] as const;

// ─── PCONS Species sizes (Rules 651a, 651b, 283a-d) ─────────
// For Lobster (1312): Small/Canner (826) or Large/Market (828)
// For all other species: Unsized (10670)
export const DFO_PCONS_LOBSTER_SIZE_LIST = [
  { codeId: 826, label: 'Small/Canner' },   // Rule 283c override
  { codeId: 828, label: 'Large/Market' },   // Rule 283a override
] as const;
export const DFO_PCONS_OTHER_SIZE_ID = 10670; // Unsized

// ─── MAR Ports (NS, NB, PEI) ────────────────────────────────
// DFO_MAR_PORT_LIST — Maritimes port set (NS + NB + PEI). Formerly a hand-typed
// 2,229-row literal; now a filtered VIEW of the generated MV_PORT table, proven row-for-row
// identical (codeId + name + province) to the old literal. Province name resolved from
// MV_PROVINCE by code. Shape { codeId, name, province } preserved for existing consumers.
// Rule 3063: display both port name AND province name.
const MAR_PROV_CODE_IDS = new Set<number>([180 /* NS */, 176 /* NB */, 188 /* PEI */]);
const DFO_PROVINCE_NAME_EN = new Map<number, string>(MV_PROVINCE.map(p => [p.codeId, p.descEn]));
export const DFO_MAR_PORT_LIST: Array<{ codeId: number; name: string; province: string }> =
  MV_PORT
    .filter(p => p.provCodeId != null && MAR_PROV_CODE_IDS.has(p.provCodeId))
    .map(p => ({ codeId: p.codeId, name: p.nameEn, province: DFO_PROVINCE_NAME_EN.get(p.provCodeId as number) ?? '' }));

// ============================================================
// MULTI-REGION EXTENSION — Subforms 88 (QC), 89 (GLF), 91 (NL)
// All new exports — existing MAR exports above are unchanged
// ============================================================

// ─── 1. Region / Subform Registry ───────────────────────────
export const DFO_SUBFORM_REGISTRY: Record<number, {
  subformId: number;
  regId: number;
  label: string;
  regionLabel: string;
}> = {
  88: { subformId: 88, regId: 1006, label: 'QC - Lobster',  regionLabel: 'Quebec' },
  89: { subformId: 89, regId: 1014, label: 'GLF - Lobster', regionLabel: 'Gulf' },
  90: { subformId: 90, regId: 1004, label: 'MAR - Lobster', regionLabel: 'Maritimes' },
  91: { subformId: 91, regId: 1002, label: 'NL - Lobster',  regionLabel: 'Newfoundland and Labrador' },
};

// ─── 1b. FMA-conditional rule sets (Standard v6.1 / Fact Sheet 234) ──────────
// FMA 38b — gates Rules 3059 (LAT/LONG), 654/655 (NB_SPCMN_BRD), 660/661 (HLIN)
export const DFO_FMA_38B = 28599;

// Rules 623/624: QC LFAs 19a*/19b/19c*/20*/21* where NB_VNTCH is MANDATORY;
// blocked in every other FMA.
export const DFO_FMA_NB_VNTCH = new Set<number>([
  25656, 25657, 25658, 25636, 25659, 25660,                       // LFA 19a1/19a3/19a2/19b/19c1/19c2
  25661, 25662, 25673, 25674, 25672, 25675, 25676, 25677, 25678,  // LFA 20a1-20a7
  25679, 25680, 25663, 25664, 25665, 25666, 25671, 25667, 25668,  // LFA 20a8-20b6
  25670, 25669,                                                   // LFA 20b7/20b8
  25635, 25634,                                                   // LFA 21a/21b
]);

// Rules 625/626: LFAs 01-14c plus the Rule 623 set, where NB_VNTCH_YOU is
// MANDATORY; blocked in every other FMA.
export const DFO_FMA_NB_VNTCH_YOU = new Set<number>([
  2071, 1652, 1653, 2073, 1654, 1655, 2075, 2077, 2079,           // LFA 01-08
  39674, 39675, 2083, 2085, 2087, 2089, 2091, 2093, 2095, 2097,   // LFA 09a-14c
  ...DFO_FMA_NB_VNTCH,
]);

// ─── 2. Subform Field Config ─────────────────────────────────
// true = required | false = blocked | undefined = optional
// Source: Subforms_requirements_234.xlsx
// visible: form field keys shown for this subform
// required: form field keys that must be filled before saving
export interface SubformFieldConfig {
  visible: string[];
  required: string[];
}

export const DFO_SUBFORM_FIELD_CONFIG: Record<number, SubformFieldConfig> = {
  // ── QC (subform 88) ─────────────────────────────────────
  88: {
    visible:  ['sailTime', 'haulStartTime', 'haulEndTime', 'landingTime', 'soakDuration', 'lgridCodeId', 'crewNb', 'mammalIncident', 'sarIncident', 'lostGear', 'catchWeight', 'trapHauls', 'fmaId', 'departurePort', 'portId'],
    required: ['fmaId', 'catchWeight', 'trapHauls', 'crewNb', 'portId'],
  },
  // ── GLF (subform 89) ────────────────────────────────────
  // portId (LANDING.PORT_ID) is XSD-mandatory for every subform; GLF default filter
  // pending Kane's blocked-vs-mandatory note, but the schema requires the element.
  89: {
    visible:  ['sailTime', 'haulStartTime', 'haulEndTime', 'landingTime', 'soakDuration', 'lgridCodeId', 'mammalIncident', 'sarIncident', 'lostGear', 'catchWeight', 'trapHauls', 'fmaId', 'departurePort', 'portId'],
    required: ['fmaId', 'catchWeight', 'trapHauls', 'portId'],
  },
  // ── MAR (subform 90) ────────────────────────────────────
  90: {
    visible:  ['sailTime', 'haulStartTime', 'haulEndTime', 'landingTime', 'lgridCodeId', 'baitEntries', 'crewNb', 'mammalIncident', 'sarIncident', 'lostGear', 'catchWeight', 'trapHauls', 'fmaId', 'departurePort', 'portId', 'nbSpcmnBrd', 'hlin', 'hlout'],
    required: ['fmaId', 'catchWeight', 'trapHauls', 'crewNb', 'baitEntries', 'portId', 'hlinCompany', 'hlinConfirmNo', 'hloutCompany', 'hloutConfirmNo'],
  },
  // ── NL (subform 91) ─────────────────────────────────────
  // trapSize (EFFORT_DETAIL.TRP_SZ_ID) mandatory for NL only — Subforms_requirements_234.xlsx
  // row 79; blocked for 88/89/90 (absent from their config = not rendered, not required).
  91: {
    visible:  ['sailTime', 'haulStartTime', 'haulEndTime', 'landingTime', 'soakDuration', 'lgridCodeId', 'mammalIncident', 'sarIncident', 'lostGear', 'catchWeight', 'trapHauls', 'fmaId', 'departurePort', 'portId', 'trapSize'],
    required: ['fmaId', 'catchWeight', 'trapHauls', 'portId', 'trapSize'],
  },
};

// ─── 3. FMA Lists for QC, GLF, NL ───────────────────────────

// QC LFAs (subform 88) — Appendix A
export const DFO_FMA_LIST_QC = [
  { codeId: 25640, label: 'LFA 17b' },
  { codeId: 25656, label: 'LFA 19a1' },
  { codeId: 25658, label: 'LFA 19a2' },
  { codeId: 25657, label: 'LFA 19a3' },
  { codeId: 25636, label: 'LFA 19b' },
  { codeId: 25659, label: 'LFA 19c1' },
  { codeId: 25660, label: 'LFA 19c2' },
  { codeId: 25662, label: 'LFA 20a10' },
  { codeId: 25661, label: 'LFA 20a1' },
  { codeId: 25673, label: 'LFA 20a2' },
  { codeId: 25672, label: 'LFA 20a3a' },
  { codeId: 25674, label: 'LFA 20a3' },
  { codeId: 25675, label: 'LFA 20a4' },
  { codeId: 25676, label: 'LFA 20a5' },
  { codeId: 25677, label: 'LFA 20a6' },
  { codeId: 25678, label: 'LFA 20a7' },
  { codeId: 25679, label: 'LFA 20a8' },
  { codeId: 25663, label: 'LFA 20a9a' },
  { codeId: 25680, label: 'LFA 20a9' },
  { codeId: 25664, label: 'LFA 20b1' },
  { codeId: 25665, label: 'LFA 20b2' },
  { codeId: 25666, label: 'LFA 20b3' },
  { codeId: 25671, label: 'LFA 20b4' },
  { codeId: 25667, label: 'LFA 20b5' },
  { codeId: 25668, label: 'LFA 20b6' },
  { codeId: 25670, label: 'LFA 20b7' },
  { codeId: 25669, label: 'LFA 20b8' },
  { codeId: 25635, label: 'LFA 21a' },
  { codeId: 25634, label: 'LFA 21b' },
  { codeId: 1534,  label: 'LFA 22' },
  { codeId: 25641, label: 'LFA 17a' },
  { codeId: 25626, label: 'LFA 18a' },
  { codeId: 25627, label: 'LFA 18b' },
  { codeId: 25628, label: 'LFA 18c' },
  { codeId: 25629, label: 'LFA 18d' },
  { codeId: 25630, label: 'LFA 18e' },
  { codeId: 25631, label: 'LFA 18f' },
  { codeId: 25632, label: 'LFA 18g' },
  { codeId: 25633, label: 'LFA 18h' },
  { codeId: 25637, label: 'LFA 18i' },
] as const;

// Gulf LFAs (subform 89) — Appendix A
export const DFO_FMA_LIST_GLF = [
  { codeId: 1526,  label: 'LFA 15' },
  { codeId: 1527,  label: 'LFA 16' },
  { codeId: 25641, label: 'LFA 17a' },
  { codeId: 39522, label: 'LFA 23a' },
  { codeId: 39523, label: 'LFA 23b' },
  { codeId: 39524, label: 'LFA 23c' },
  { codeId: 39525, label: 'LFA 23d' },
  { codeId: 1577,  label: 'LFA 24' },
  { codeId: 1578,  label: 'LFA 25' },
  { codeId: 39526, label: 'LFA 26a1' },
  { codeId: 39527, label: 'LFA 26a2' },
  { codeId: 39528, label: 'LFA 26a3' },
  { codeId: 39529, label: 'LFA 26b-North' },
  { codeId: 39530, label: 'LFA 26b-South' },
] as const;

// NL LFAs (subform 91) — Appendix A
export const DFO_FMA_LIST_NL = [
  { codeId: 2071,  label: 'LFA 01' },
  { codeId: 1652,  label: 'LFA 02' },
  { codeId: 1653,  label: 'LFA 03' },
  { codeId: 2073,  label: 'LFA 04a' },
  { codeId: 1654,  label: 'LFA 04b' },
  { codeId: 1655,  label: 'LFA 05' },
  { codeId: 2075,  label: 'LFA 06' },
  { codeId: 2077,  label: 'LFA 07' },
  { codeId: 2079,  label: 'LFA 08' },
  { codeId: 39674, label: 'LFA 09a' },
  { codeId: 39675, label: 'LFA 09b' },
  { codeId: 2083,  label: 'LFA 10' },
  { codeId: 2085,  label: 'LFA 11' },
  { codeId: 2087,  label: 'LFA 12' },
  { codeId: 2089,  label: 'LFA 13a' },
  { codeId: 2091,  label: 'LFA 13b' },
  { codeId: 2093,  label: 'LFA 14a' },
  { codeId: 2095,  label: 'LFA 14b' },
  { codeId: 2097,  label: 'LFA 14c' },
] as const;

// ─── 4. Bait Types for QC / GLF / NL (Rule 239a) ────────────
export const DFO_BAIT_TYPE_LIST_QC_GLF_NL = [
  { codeId: 1298,  label: 'Flounder, Winter' },
  { codeId: 1359,  label: 'Squid, Illex' },
  { codeId: 1385,  label: 'Flounder, Yellowtail' },
  { codeId: 39795, label: 'Synthetic bait' },
  { codeId: 16349, label: 'Silverside, Atlantic' },
  { codeId: 1961,  label: 'Sculpin, Shorthorn' },
  { codeId: 1287,  label: 'Crab, Rock' },
  { codeId: 38503, label: 'Waste' },
  { codeId: 1266,  label: 'Alewife' },
  { codeId: 3392,  label: 'Herring, Atlantic' },
  { codeId: 38506, label: 'Missing in the list' },
  { codeId: 1315,  label: 'Mackerel, Atlantic' },
  { codeId: 1299,  label: 'Flatfishes, not specified' },
  { codeId: 4311,  label: 'Groundfish, Unspecified' },
  { codeId: 18398, label: 'Redfishes' },
  { codeId: 1921,  label: 'Cunner' },
] as const;

// QC/GLF (subforms 88, 89): BT_COND_ID mandatory for these bait types (Rule 984)
export const DFO_BAIT_COND_REQUIRED_QC_GLF = new Set([3392, 1315]);

// NL (subform 91): BT_COND_ID always blocked
export const DFO_BAIT_COND_BLOCKED_NL = true;

// ─── 5. Catch Species by Subform ────────────────────────────

// QC + NL (subforms 88, 91 — Rule 975a)
export const DFO_CATCH_SPECIES_QC_NL = [
  { codeId: 1363,  label: 'Bass, Striped' },
  { codeId: 16683, label: 'Burbot' },
  { codeId: 1277,  label: 'Capelin' },
  { codeId: 1280,  label: 'Clams, Northern Propeller' },
  { codeId: 1284,  label: 'Cod, Atlantic' },
  { codeId: 1302,  label: 'Cod, Greenland' },
  { codeId: 1917,  label: 'Crab, Green' },
  { codeId: 1286,  label: 'Crab, Jonah' },
  { codeId: 1311,  label: 'Crab, Norway King' },
  { codeId: 1288,  label: 'Crab, Queen Snow' },
  { codeId: 1287,  label: 'Crab, Rock' },
  { codeId: 1290,  label: 'Crab, Spider' },
  { codeId: 1285,  label: 'Crab, Unspecified' },
  { codeId: 1921,  label: 'Cunner' },
  { codeId: 1296,  label: 'Eel, American' },
  { codeId: 1299,  label: 'Flatfishes, not specified' },
  { codeId: 1373,  label: 'Flounder, Witch' },
  { codeId: 1303,  label: 'Haddock' },
  { codeId: 1304,  label: 'Halibut, Atlantic' },
  { codeId: 1300,  label: 'Halibut, Greenland' },
  { codeId: 3392,  label: 'Herring, Atlantic' },
  { codeId: 1941,  label: 'Kelp (Brown Algae)' },
  { codeId: 1312,  label: 'Lobster' },
  { codeId: 1314,  label: 'Lumpfish' },
  { codeId: 14869, label: 'Lumpfishes (Cyclopteridae)' },
  { codeId: 1321,  label: 'Pout, Ocean' },
  { codeId: 14714, label: 'Sculpins (COTTIDAE)' },
  { codeId: 1340,  label: 'Sea Cucumber' },
  { codeId: 15152, label: 'Sea Raven' },
  { codeId: 1370,  label: 'Sea Urchins' },
  { codeId: 18238, label: 'Seaweeds, Red' },
  { codeId: 16349, label: 'Silverside, Atlantic' },
  { codeId: 1293,  label: 'Spiny Dogfish' },
  { codeId: 1367,  label: 'Tomcod, Atlantic' },
  { codeId: 1985,  label: 'Whelk' },
  { codeId: 1383,  label: 'Wolffish, Atlantic' },
] as const;

// GLF (subform 89 — Rule 975b)
export const DFO_CATCH_SPECIES_GLF = [
  { codeId: 1921,  label: 'Cunner' },
  { codeId: 1312,  label: 'Lobster' },
  { codeId: 1287,  label: 'Crab, Rock' },
  { codeId: 14714, label: 'Sculpins (COTTIDAE)' },
] as const;

// MAR catch species: DFO_MAR_SPECIES_LIST (existing, do not duplicate)

// ─── 6. PCONS Species by Subform ────────────────────────────

// QC + NL (subforms 88, 91 — Rule 974a)
export const DFO_PCONS_SPECIES_QC_NL = [
  { codeId: 1287, label: 'Crab, Rock' },
  { codeId: 1312, label: 'Lobster' },
] as const;

// GLF (subform 89 — Rule 974b)
export const DFO_PCONS_SPECIES_GLF = [
  { codeId: 1921,  label: 'Cunner' },
  { codeId: 1312,  label: 'Lobster' },
  { codeId: 1287,  label: 'Crab, Rock' },
  { codeId: 14714, label: 'Sculpins (COTTIDAE)' },
] as const;

// MAR PCONS species: DFO_MAR_SPECIES_LIST (existing, do not duplicate)

// ─── 7. Helper Functions ────────────────────────────────────

export function getDfoFmaList(subformId: number) {
  switch (subformId) {
    case 88: return DFO_FMA_LIST_QC;
    case 89: return DFO_FMA_LIST_GLF;
    case 91: return DFO_FMA_LIST_NL;
    case 90:
    default: return DFO_FMA_LIST;
  }
}

export function getDfoBaitTypeList(subformId: number) {
  switch (subformId) {
    case 88:
    case 89:
    case 91: return DFO_BAIT_TYPE_LIST_QC_GLF_NL;
    case 90:
    default: return DFO_BAIT_TYPE_LIST;
  }
}

export function getDfoCatchSpeciesList(subformId: number) {
  switch (subformId) {
    case 89: return DFO_CATCH_SPECIES_GLF;
    case 88:
    case 91: return DFO_CATCH_SPECIES_QC_NL;
    case 90:
    default: return DFO_MAR_SPECIES_LIST;
  }
}

export function getDfoPconsSpeciesList(subformId: number) {
  switch (subformId) {
    case 89: return DFO_PCONS_SPECIES_GLF;
    case 88:
    case 91: return DFO_PCONS_SPECIES_QC_NL;
    case 90:
    default: return DFO_MAR_SPECIES_LIST;
  }
}