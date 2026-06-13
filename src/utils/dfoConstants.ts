// ============================================================
// dfoConstants.ts
// DFO ELOG Form 234 — MAR Subform 90 constants
// Generated from official DFO reference tables (2026-04-30)
// DO NOT hand-edit code IDs — they come directly from DFO CSVs
// ============================================================

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
// 2,229 ports — used for TRIP.PORT_ID and LANDING.PORT_ID
// Rule 3063: display both port name AND province name
export const DFO_MAR_PORT_LIST: Array<{ codeId: number; name: string; province: string }> = [
  {
    "codeId": 19322,
    "name": "ABOITEAU",
    "province": "New Brunswick"
  },
  {
    "codeId": 19323,
    "name": "ABOUJAGANE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19324,
    "name": "ALDERWOOD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19325,
    "name": "ALDOUANE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19326,
    "name": "ALLARDVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19327,
    "name": "ALMA",
    "province": "New Brunswick"
  },
  {
    "codeId": 19328,
    "name": "AMOS POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19329,
    "name": "ANSE-BLEUE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19330,
    "name": "ARMSTRONG BROOK",
    "province": "New Brunswick"
  },
  {
    "codeId": 19331,
    "name": "ATHOLVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19332,
    "name": "AULAC",
    "province": "New Brunswick"
  },
  {
    "codeId": 19333,
    "name": "BABINEAU",
    "province": "New Brunswick"
  },
  {
    "codeId": 19334,
    "name": "BACK BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 19335,
    "name": "BAIE DE PETIT POKEMOUCHE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19336,
    "name": "BAIE STE. ANNE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19337,
    "name": "BAIE VERTE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19338,
    "name": "BAINS CORNER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19339,
    "name": "BALMORAL",
    "province": "New Brunswick"
  },
  {
    "codeId": 19340,
    "name": "BARACHOIS",
    "province": "New Brunswick"
  },
  {
    "codeId": 19341,
    "name": "BARKER'S POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19342,
    "name": "BARRYVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19343,
    "name": "BARTIBOG BRIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19344,
    "name": "BAS CAP PELE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19345,
    "name": "BAS CARAQUET",
    "province": "New Brunswick"
  },
  {
    "codeId": 19346,
    "name": "BAS NEGUAC",
    "province": "New Brunswick"
  },
  {
    "codeId": 19347,
    "name": "BASS RIVER (GLOUCESTER)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19348,
    "name": "BASS RIVER (KENT)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19349,
    "name": "BATHURST",
    "province": "New Brunswick"
  },
  {
    "codeId": 19350,
    "name": "BAY DU VIN RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19351,
    "name": "BAYFIELD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19352,
    "name": "BAYSIDE (BOTSFORD)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19353,
    "name": "BAYSIDE (POINT CROIX)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19354,
    "name": "BAYSWATER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19355,
    "name": "BEAUDIN ROAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19356,
    "name": "BEAUMONT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19357,
    "name": "BEAVER HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 19358,
    "name": "BEDEC",
    "province": "New Brunswick"
  },
  {
    "codeId": 19359,
    "name": "BEERSVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19360,
    "name": "BELLEDUNE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19361,
    "name": "BELLEDUNE RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19362,
    "name": "BELLEISLE BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 19363,
    "name": "BELLIVEAU VILLAGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19364,
    "name": "BELLS MILLS",
    "province": "New Brunswick"
  },
  {
    "codeId": 19365,
    "name": "BENJAMIN RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19366,
    "name": "BERESFORD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19367,
    "name": "BERTRAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 19368,
    "name": "BETHEL",
    "province": "New Brunswick"
  },
  {
    "codeId": 19369,
    "name": "BIG COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19370,
    "name": "BIG TRACADIE RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19371,
    "name": "BIRCH COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19372,
    "name": "BLACK LAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 19373,
    "name": "BLACK POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19374,
    "name": "BLACK RIVER (NORTHUMBERLAND)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19375,
    "name": "BLACK RIVER (ST. JOHN)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19849,
    "name": "BLACK RIVER BRIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19850,
    "name": "BLACK'S HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 19851,
    "name": "BLACKVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19852,
    "name": "BLANCHARD SETTLEMENT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19853,
    "name": "BLISS ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 19854,
    "name": "BLOOMFIELD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19855,
    "name": "BLOOMFIELD RIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19856,
    "name": "BOCABEC",
    "province": "New Brunswick"
  },
  {
    "codeId": 19857,
    "name": "BOIS BLANC",
    "province": "New Brunswick"
  },
  {
    "codeId": 19858,
    "name": "BOTSFORD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19859,
    "name": "BOUCTOUCHE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19860,
    "name": "BOUCTOUCHE BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 19861,
    "name": "BOUCTOUCHE RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19862,
    "name": "BOUDREAU VILLAGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19863,
    "name": "BOURGEOIS MILLS",
    "province": "New Brunswick"
  },
  {
    "codeId": 19866,
    "name": "BRANSFIELD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19867,
    "name": "BRANTVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19868,
    "name": "BREAU VILLAGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19869,
    "name": "BRIDGEDALE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19870,
    "name": "BROWN'S FLATS",
    "province": "New Brunswick"
  },
  {
    "codeId": 19871,
    "name": "BROWNS YARD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19872,
    "name": "BRYENTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 19873,
    "name": "BULGARIA (KENT)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19874,
    "name": "BULGARIA (NORTHUMBERLAND)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19875,
    "name": "BURNT CHURCH",
    "province": "New Brunswick"
  },
  {
    "codeId": 19876,
    "name": "BURTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 19877,
    "name": "BUSHVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19878,
    "name": "CAIN POINT (GLOUCESTER)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19879,
    "name": "CAIN POINT (NORTHUMBERLAND)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19880,
    "name": "CAISSIE VILLAGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19881,
    "name": "CAISSIE'S CAPE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19882,
    "name": "CALLANDAR'S BEACH",
    "province": "New Brunswick"
  },
  {
    "codeId": 19883,
    "name": "CAMBRIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19884,
    "name": "CAMEROUN BRIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19885,
    "name": "CAMPBELL RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19886,
    "name": "CAMPBELLTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 19887,
    "name": "CAMPOBELLO ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 19888,
    "name": "CANOBIE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19889,
    "name": "CAP BATEAU",
    "province": "New Brunswick"
  },
  {
    "codeId": 19890,
    "name": "CAP LUMIERE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19891,
    "name": "CAP PELE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19892,
    "name": "CAP ST. LOUIS",
    "province": "New Brunswick"
  },
  {
    "codeId": 19893,
    "name": "CAPE BIMET",
    "province": "New Brunswick"
  },
  {
    "codeId": 19894,
    "name": "CAPE ENRAGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19895,
    "name": "CAPE SPENCER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19896,
    "name": "CAPE TORMENTINE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19897,
    "name": "CARAQUET",
    "province": "New Brunswick"
  },
  {
    "codeId": 19898,
    "name": "CARAQUET BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 19899,
    "name": "CARRON POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19900,
    "name": "CARTER'S POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19901,
    "name": "CASSILIS",
    "province": "New Brunswick"
  },
  {
    "codeId": 19902,
    "name": "CASTALIA",
    "province": "New Brunswick"
  },
  {
    "codeId": 19903,
    "name": "CENTRAL GREENWICH",
    "province": "New Brunswick"
  },
  {
    "codeId": 19904,
    "name": "CENTRAL NORTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 19905,
    "name": "CENTRE NAPAN",
    "province": "New Brunswick"
  },
  {
    "codeId": 19906,
    "name": "CENTRE ST. SIMON",
    "province": "New Brunswick"
  },
  {
    "codeId": 19907,
    "name": "CHAMCOOK",
    "province": "New Brunswick"
  },
  {
    "codeId": 19908,
    "name": "CHANCE HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 19909,
    "name": "CHARLO",
    "province": "New Brunswick"
  },
  {
    "codeId": 19910,
    "name": "CHARLO RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19911,
    "name": "CHATHAM",
    "province": "New Brunswick"
  },
  {
    "codeId": 19912,
    "name": "CHATHAM HEAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19913,
    "name": "CHELMSFORD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19914,
    "name": "CHERRY HILL",
    "province": "New Brunswick"
  },
  {
    "codeId": 19915,
    "name": "CHIASSON",
    "province": "New Brunswick"
  },
  {
    "codeId": 19916,
    "name": "CHIASSON OFFICE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19917,
    "name": "CHIPMAN",
    "province": "New Brunswick"
  },
  {
    "codeId": 19918,
    "name": "CHOCOLATE COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19920,
    "name": "CLAIRE FONTAINE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19921,
    "name": "CLIFTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 19923,
    "name": "COAL CREEK",
    "province": "New Brunswick"
  },
  {
    "codeId": 19924,
    "name": "COCAGNE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19925,
    "name": "COCAGNE BAR",
    "province": "New Brunswick"
  },
  {
    "codeId": 19926,
    "name": "COCAGNE BRIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19927,
    "name": "COCAGNE CAPE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19928,
    "name": "COCAGNE RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19929,
    "name": "CODYS",
    "province": "New Brunswick"
  },
  {
    "codeId": 19930,
    "name": "COLES ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 19931,
    "name": "COMEAU POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19932,
    "name": "CORMIER VILLAGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19933,
    "name": "CORMIERVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19934,
    "name": "COTE POIRIER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19935,
    "name": "COTE STE. ANNE/CHOCKPISH",
    "province": "New Brunswick"
  },
  {
    "codeId": 19936,
    "name": "COTEAU ROAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19937,
    "name": "COVE DELL",
    "province": "New Brunswick"
  },
  {
    "codeId": 19938,
    "name": "COX'S POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19939,
    "name": "COY TOWN",
    "province": "New Brunswick"
  },
  {
    "codeId": 19940,
    "name": "CREEK RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19941,
    "name": "CROW HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 19942,
    "name": "CULLIGAN",
    "province": "New Brunswick"
  },
  {
    "codeId": 19943,
    "name": "CUMBERLAND BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 19944,
    "name": "CUMMING COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19945,
    "name": "DALHOUSIE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19946,
    "name": "DALHOUSIE JUNCTION",
    "province": "New Brunswick"
  },
  {
    "codeId": 19947,
    "name": "DARK HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 19948,
    "name": "DARLINGTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 19949,
    "name": "DEADMAN'S HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 19950,
    "name": "DEER ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 19951,
    "name": "DERBY",
    "province": "New Brunswick"
  },
  {
    "codeId": 19952,
    "name": "DERBY JUNCTION",
    "province": "New Brunswick"
  },
  {
    "codeId": 19953,
    "name": "DIEPPE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19954,
    "name": "DIGDEGUASH",
    "province": "New Brunswick"
  },
  {
    "codeId": 19955,
    "name": "DIPPER HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 19956,
    "name": "DIXON POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19957,
    "name": "DOAKTOWN",
    "province": "New Brunswick"
  },
  {
    "codeId": 19958,
    "name": "DORCHESTER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19959,
    "name": "DOUGLAS",
    "province": "New Brunswick"
  },
  {
    "codeId": 19960,
    "name": "DOUGLAS HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 19961,
    "name": "DOUGLASTOWN",
    "province": "New Brunswick"
  },
  {
    "codeId": 19963,
    "name": "DOYLES BROOK",
    "province": "New Brunswick"
  },
  {
    "codeId": 19964,
    "name": "DRURY COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19965,
    "name": "DUGAS",
    "province": "New Brunswick"
  },
  {
    "codeId": 19966,
    "name": "DUGUAYS POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19967,
    "name": "DUPUIS CORNER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19968,
    "name": "DURHAM CENTRE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19969,
    "name": "EAST BATHURST",
    "province": "New Brunswick"
  },
  {
    "codeId": 19970,
    "name": "EAST GALLOWAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 19972,
    "name": "EAST POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19973,
    "name": "EDGETT LANDING",
    "province": "New Brunswick"
  },
  {
    "codeId": 19974,
    "name": "EEL RIVER (KENT)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19975,
    "name": "EEL RIVER (RESTIGOUCHE)",
    "province": "New Brunswick"
  },
  {
    "codeId": 19976,
    "name": "EEL RIVER BAR",
    "province": "New Brunswick"
  },
  {
    "codeId": 19977,
    "name": "EEL RIVER BRIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19978,
    "name": "EEL RIVER CROSSING",
    "province": "New Brunswick"
  },
  {
    "codeId": 19979,
    "name": "EGG ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 19980,
    "name": "ELM HILL",
    "province": "New Brunswick"
  },
  {
    "codeId": 19981,
    "name": "ESCUMINAC",
    "province": "New Brunswick"
  },
  {
    "codeId": 19982,
    "name": "ESCUMINAC POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 19983,
    "name": "EVANDALE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19984,
    "name": "EVANGELINE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19985,
    "name": "FAIRHAVEN",
    "province": "New Brunswick"
  },
  {
    "codeId": 19987,
    "name": "FERRY ROAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19988,
    "name": "FIVE FATHOM HOLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19989,
    "name": "FOLEY'S COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19990,
    "name": "FONTAINE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19991,
    "name": "FOUR ROADS",
    "province": "New Brunswick"
  },
  {
    "codeId": 19992,
    "name": "FOX CREEK",
    "province": "New Brunswick"
  },
  {
    "codeId": 19993,
    "name": "FOX ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 19994,
    "name": "FOX RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 19995,
    "name": "FREDERICTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 19996,
    "name": "FREDERICTON ROAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 19997,
    "name": "FRENCH LAKE",
    "province": "New Brunswick"
  },
  {
    "codeId": 19998,
    "name": "FRY'S ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 19999,
    "name": "GAGETOWN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20000,
    "name": "GARNET SETTLEMENT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20001,
    "name": "GLENWOOD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20003,
    "name": "GRAND BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20004,
    "name": "GRAND DIGUE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20005,
    "name": "GRAND DUNE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20006,
    "name": "GRAND FALLS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20007,
    "name": "GRAND HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 20008,
    "name": "GRAND LAKE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20009,
    "name": "GRAND MANAN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20010,
    "name": "GRAND MANAN ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 20011,
    "name": "GRAND RUISSEAU",
    "province": "New Brunswick"
  },
  {
    "codeId": 20012,
    "name": "GRANDE ALDOUANE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20013,
    "name": "GRANDE-ANSE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20014,
    "name": "GREENWICH HILL",
    "province": "New Brunswick"
  },
  {
    "codeId": 20015,
    "name": "GUIMOND VILLAGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20016,
    "name": "GULL COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20017,
    "name": "HAGGARTY COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20018,
    "name": "HAMPSTEAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20019,
    "name": "HAMPTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20020,
    "name": "HARDING'S POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20021,
    "name": "HARDWICKE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20022,
    "name": "HARTS LAKE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20023,
    "name": "HARVEY BANK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20024,
    "name": "HATFIELD POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20025,
    "name": "HAWKES POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20026,
    "name": "HAYESVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20027,
    "name": "HEAD HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 20028,
    "name": "HENDERSON SETTLEMENT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20029,
    "name": "HERON ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 20030,
    "name": "HEXHAM",
    "province": "New Brunswick"
  },
  {
    "codeId": 20031,
    "name": "HILLSBOROUGH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20032,
    "name": "HOPEWELL CAPE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20033,
    "name": "HUNTER'S FERRY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20034,
    "name": "INDIAN ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 20035,
    "name": "INDIAN LAKE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20036,
    "name": "INDIAN POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20037,
    "name": "INDIANTOWN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20038,
    "name": "INGALL'S HEAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20039,
    "name": "INKERMAN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20040,
    "name": "INKERMAN FERRY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20041,
    "name": "JACQUET RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20042,
    "name": "JANEVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20043,
    "name": "JEMSEG",
    "province": "New Brunswick"
  },
  {
    "codeId": 20044,
    "name": "JOHNSON MILLS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20045,
    "name": "KARS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20046,
    "name": "KEDGWICK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20047,
    "name": "KEYHOLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20048,
    "name": "KINGSCLEAR",
    "province": "New Brunswick"
  },
  {
    "codeId": 20049,
    "name": "KINGSTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20050,
    "name": "KIRKWOOD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20051,
    "name": "KOUCHIBOUGUAC",
    "province": "New Brunswick"
  },
  {
    "codeId": 20052,
    "name": "KOUCHIBOUGUAC RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20068,
    "name": "L'ETANG",
    "province": "New Brunswick"
  },
  {
    "codeId": 20069,
    "name": "L'ETETE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20053,
    "name": "LAKESIDE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20054,
    "name": "LAKEVILLE CORNER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20055,
    "name": "LAMBERTVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20056,
    "name": "LAMEQUE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20057,
    "name": "LANDRY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20058,
    "name": "LANDS END",
    "province": "New Brunswick"
  },
  {
    "codeId": 20059,
    "name": "LE GOULET",
    "province": "New Brunswick"
  },
  {
    "codeId": 20060,
    "name": "LEBOUTHILLIER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20061,
    "name": "LEECH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20062,
    "name": "LEGACEVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20063,
    "name": "LEGER BROOK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20064,
    "name": "LEGERE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20065,
    "name": "LEONARDVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20066,
    "name": "LEPREAU",
    "province": "New Brunswick"
  },
  {
    "codeId": 20067,
    "name": "LEPREAU POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20070,
    "name": "LEWISVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20071,
    "name": "LITTLE ALDOUANE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20072,
    "name": "LITTLE LAMEQUE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20073,
    "name": "LITTLE LEPREAU (CHARLOTTE)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20074,
    "name": "LITTLE LEPREAU (ST. JOHN)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20075,
    "name": "LITTLE POKEMOUCHE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20076,
    "name": "LITTLE QUARRY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20077,
    "name": "LITTLE SHEMOGUE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20078,
    "name": "LITTLE TRACADIE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20079,
    "name": "LOGGIECROFT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20080,
    "name": "LOGGIEVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20081,
    "name": "LONG REACH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20082,
    "name": "LORDS COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20083,
    "name": "LORNEVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20084,
    "name": "LOSIER SETTLEMENT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20085,
    "name": "LOWER BURTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20086,
    "name": "LOWER CAMBRIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20087,
    "name": "LOWER DERBY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20088,
    "name": "LOWER ESCUMINAC",
    "province": "New Brunswick"
  },
  {
    "codeId": 20089,
    "name": "LOWER JEMSEG",
    "province": "New Brunswick"
  },
  {
    "codeId": 20090,
    "name": "LOWER KARS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20091,
    "name": "LOWER NAPAN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20092,
    "name": "LOWER NEWCASTLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20093,
    "name": "LOWER NORTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20094,
    "name": "LOWER POINT SAPIN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20095,
    "name": "LOWER ST. LOUIS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20096,
    "name": "LOWER ST. MARY'S",
    "province": "New Brunswick"
  },
  {
    "codeId": 20097,
    "name": "MACES BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20098,
    "name": "MACTAQUAC RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20099,
    "name": "MAIN RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20100,
    "name": "MAISONNETTE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20101,
    "name": "MALPEQUE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20102,
    "name": "MALPEQUE BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20103,
    "name": "MANUELS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20104,
    "name": "MAPLE GREEN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20105,
    "name": "MAQUAPIT LAKE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20106,
    "name": "MARTIN HEAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20107,
    "name": "MASCARENE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20108,
    "name": "MAUGERVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20109,
    "name": "MCCARTHY'S POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20110,
    "name": "MCEACHERN POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20111,
    "name": "MCKINLEYVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20112,
    "name": "MCLEOD SIDING",
    "province": "New Brunswick"
  },
  {
    "codeId": 20113,
    "name": "MEDUCTIC",
    "province": "New Brunswick"
  },
  {
    "codeId": 20114,
    "name": "MEEHAN'S COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20115,
    "name": "MELROSE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20116,
    "name": "MEMRAMCOOK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20117,
    "name": "MIDDLE CARAQUET",
    "province": "New Brunswick"
  },
  {
    "codeId": 20118,
    "name": "MILFORD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20119,
    "name": "MILL BANK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20121,
    "name": "MILL COVE (QUEENS)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20122,
    "name": "MILLEDGEVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20123,
    "name": "MILLER BROOK WHARF",
    "province": "New Brunswick"
  },
  {
    "codeId": 20124,
    "name": "MILLERTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20125,
    "name": "MILTOWN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20126,
    "name": "MINTO",
    "province": "New Brunswick"
  },
  {
    "codeId": 20127,
    "name": "MIRAMICHI",
    "province": "New Brunswick"
  },
  {
    "codeId": 20128,
    "name": "MIRAMICHI BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20129,
    "name": "MIRAMICHI RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20130,
    "name": "MISCOU (GLOUCESTER)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20131,
    "name": "MISCOU CENTRE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20132,
    "name": "MISCOU HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 20133,
    "name": "MISCOU ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 20134,
    "name": "MISCOU LIGHT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20135,
    "name": "MISCOU PLAIN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20136,
    "name": "MISCOU POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20137,
    "name": "MISPEC",
    "province": "New Brunswick"
  },
  {
    "codeId": 20138,
    "name": "MONCTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20139,
    "name": "MOORE'S MILLS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20140,
    "name": "MOOSE ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 20141,
    "name": "MORAIS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20142,
    "name": "MORAIS OFFICE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20143,
    "name": "MORRISDALE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20144,
    "name": "MORROW BRIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20145,
    "name": "MOTTS WHARF",
    "province": "New Brunswick"
  },
  {
    "codeId": 20146,
    "name": "MOUTH OF KESWICK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20147,
    "name": "MUNDLEVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20148,
    "name": "MURRAY CORNER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20149,
    "name": "MUSQUASH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20150,
    "name": "NAPAN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20151,
    "name": "NAPAN BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20152,
    "name": "NAPAN RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20153,
    "name": "NARROWS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20154,
    "name": "NASH CREEK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20155,
    "name": "NASHWAAKSIS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20157,
    "name": "NB MOBILE HERRING USA",
    "province": "New Brunswick"
  },
  {
    "codeId": 20158,
    "name": "NEGUAC",
    "province": "New Brunswick"
  },
  {
    "codeId": 20159,
    "name": "NELSON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20160,
    "name": "NEW BANDON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20161,
    "name": "NEW HORTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20162,
    "name": "NEW JERSEY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20163,
    "name": "NEW MILLS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20164,
    "name": "NEW RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20165,
    "name": "NEWCASTLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20166,
    "name": "NEWCASTLE CREEK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20167,
    "name": "NICHOLAS RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20168,
    "name": "NIGADOO",
    "province": "New Brunswick"
  },
  {
    "codeId": 20169,
    "name": "NORDIN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20170,
    "name": "NORTH ESK BOOM",
    "province": "New Brunswick"
  },
  {
    "codeId": 20171,
    "name": "NORTH HEAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20172,
    "name": "NORTH ROAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20173,
    "name": "NORTHERN HARBOUR",
    "province": "New Brunswick"
  },
  {
    "codeId": 20174,
    "name": "NORTHWEST BRIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20175,
    "name": "NORTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20176,
    "name": "NOTRE DAME",
    "province": "New Brunswick"
  },
  {
    "codeId": 20177,
    "name": "OAK BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20178,
    "name": "OAK POINT (KINGS)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20179,
    "name": "OAK POINT (NORTHUMBERLAND)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20180,
    "name": "OROMOCTO",
    "province": "New Brunswick"
  },
  {
    "codeId": 20181,
    "name": "OVEN HEAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20182,
    "name": "OYSTER RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20183,
    "name": "PAQUETVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20184,
    "name": "PARTRIDGE ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 20185,
    "name": "PEACOCK COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20186,
    "name": "PENNFIELD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20187,
    "name": "PENNFIELD RIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20188,
    "name": "PETER'S MILLS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20189,
    "name": "PETIT CAP",
    "province": "New Brunswick"
  },
  {
    "codeId": 20190,
    "name": "PETIT ROCHER NORD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20191,
    "name": "PETIT SHIPPAGAN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20195,
    "name": "PETIT-ROCHER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20192,
    "name": "PETITCODIAC",
    "province": "New Brunswick"
  },
  {
    "codeId": 20193,
    "name": "PETITCODIAC RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20194,
    "name": "PETITE-RIVIERE-DE-L'ILE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20196,
    "name": "PIGEON HILL",
    "province": "New Brunswick"
  },
  {
    "codeId": 20198,
    "name": "POCOLOGAN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20199,
    "name": "POINT ALEXANDER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20200,
    "name": "POINT AU CARR",
    "province": "New Brunswick"
  },
  {
    "codeId": 20201,
    "name": "POINT CANOT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20202,
    "name": "POINT GARDINER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20203,
    "name": "POINT LA NIM",
    "province": "New Brunswick"
  },
  {
    "codeId": 20204,
    "name": "POINT LEPREAU",
    "province": "New Brunswick"
  },
  {
    "codeId": 20205,
    "name": "POINT ROCHEUSE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20206,
    "name": "POINT SAPIN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20207,
    "name": "POINTE BRULE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20208,
    "name": "POINTE DU CHENE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20209,
    "name": "POINTE-VERTE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20210,
    "name": "POKEMOUCHE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20211,
    "name": "POKEMOUCHE JUNCTION",
    "province": "New Brunswick"
  },
  {
    "codeId": 20212,
    "name": "POKEMOUCHE RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20213,
    "name": "POKESHAW",
    "province": "New Brunswick"
  },
  {
    "codeId": 20214,
    "name": "POKESUDIE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20215,
    "name": "POKESUDIE ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 20216,
    "name": "POKIOK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20218,
    "name": "PONT LAFRANCE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20219,
    "name": "PONT LANDRY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20220,
    "name": "PONTGRAVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20221,
    "name": "PORT ELGIN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20222,
    "name": "PORTAGE RIVER (KENT)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20223,
    "name": "PORTAGE RIVER (NORTHUMBERLAND)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20224,
    "name": "PRE D'EN HAUT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20225,
    "name": "PRINCE OF WALES",
    "province": "New Brunswick"
  },
  {
    "codeId": 20227,
    "name": "QUARRYVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20228,
    "name": "QUEENSTOWN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20230,
    "name": "RED BANK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20231,
    "name": "RED HEAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20232,
    "name": "RED HEAD COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20233,
    "name": "RENFORTH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20234,
    "name": "RESTIGOUCHE RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20235,
    "name": "REXTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20236,
    "name": "REXTON CAPE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20237,
    "name": "RICHARDSON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20238,
    "name": "RICHIBOUCTO",
    "province": "New Brunswick"
  },
  {
    "codeId": 20239,
    "name": "RICHIBOUCTO CAPE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20240,
    "name": "RICHIBOUCTO VILLAGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20241,
    "name": "RIORDEN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20242,
    "name": "RIPPLES",
    "province": "New Brunswick"
  },
  {
    "codeId": 20243,
    "name": "RIVERSIDE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20244,
    "name": "RIVERVIEW",
    "province": "New Brunswick"
  },
  {
    "codeId": 20245,
    "name": "RIVIERE DES CACHES",
    "province": "New Brunswick"
  },
  {
    "codeId": 20246,
    "name": "RIVIERE RICHIBUCTOU",
    "province": "New Brunswick"
  },
  {
    "codeId": 20247,
    "name": "RIVIERE TABUSINTAC",
    "province": "New Brunswick"
  },
  {
    "codeId": 20248,
    "name": "ROBICHAUD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20249,
    "name": "ROBICHAUD SPLIT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20250,
    "name": "ROCKPORT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20251,
    "name": "ROGERSVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20252,
    "name": "ROTHESAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20253,
    "name": "SACKVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20254,
    "name": "SAINT JOHN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20255,
    "name": "SALMON BEACH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20256,
    "name": "SALMON RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20257,
    "name": "SAND POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20258,
    "name": "SAUMAREZ",
    "province": "New Brunswick"
  },
  {
    "codeId": 20259,
    "name": "SAVOY LANDING",
    "province": "New Brunswick"
  },
  {
    "codeId": 20260,
    "name": "SCOTCHTOWN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20261,
    "name": "SEAL COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20262,
    "name": "SEASIDE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20263,
    "name": "SEELY COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20264,
    "name": "SHEDIAC",
    "province": "New Brunswick"
  },
  {
    "codeId": 20265,
    "name": "SHEDIAC BRIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20266,
    "name": "SHEFFIELD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20267,
    "name": "SHEILA",
    "province": "New Brunswick"
  },
  {
    "codeId": 20268,
    "name": "SHEMOGUE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20269,
    "name": "SHIPPAGAN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20270,
    "name": "SHIPPEGAN GULLY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20271,
    "name": "SHIPPEGAN ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 20272,
    "name": "SIX ROADS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20273,
    "name": "SOCILE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20274,
    "name": "SOUTH BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20275,
    "name": "SOUTH ESK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20276,
    "name": "SOUTH MUSQUASH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20277,
    "name": "SOUTH NELSON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20278,
    "name": "SOUTH RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20279,
    "name": "SPRINGHILL",
    "province": "New Brunswick"
  },
  {
    "codeId": 20280,
    "name": "SPRUCE LAKE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20281,
    "name": "ST. ANDRE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20282,
    "name": "ST. ANDREWS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20283,
    "name": "ST. ANTOINE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20284,
    "name": "ST. CECILE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20285,
    "name": "ST. CHARLES",
    "province": "New Brunswick"
  },
  {
    "codeId": 20286,
    "name": "ST. EDOUARD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20287,
    "name": "ST. FRANCOIS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20288,
    "name": "ST. GEORGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20289,
    "name": "ST. GREGOIRE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20290,
    "name": "ST. IGNACE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20291,
    "name": "ST. ISIDORE (GLOUCESTER-68)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20292,
    "name": "ST. JOSEPH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20293,
    "name": "ST. LEOLIN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20294,
    "name": "ST. LOUIS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20295,
    "name": "ST. LOUIS GULLY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20296,
    "name": "ST. MARTINS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20297,
    "name": "ST. MAURICE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20298,
    "name": "ST. NICHOLAS DE KENT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20299,
    "name": "ST. OLIVIER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20300,
    "name": "ST. RAPHAEL SUR MER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20301,
    "name": "ST. SIMON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20302,
    "name": "ST. STEPHEN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20303,
    "name": "ST. THOMAS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20304,
    "name": "ST.ISIDORE (GLOUCESTER-66)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20305,
    "name": "STE MARIE/ST.RAPHAEL (GLOCESTER)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20306,
    "name": "STE. ANNE DE KENT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20307,
    "name": "STE. ANNE DU BOCAGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20308,
    "name": "STE. ANNE SHORE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20309,
    "name": "STE. MARIE (KENT)",
    "province": "New Brunswick"
  },
  {
    "codeId": 20310,
    "name": "STONEHAVEN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20311,
    "name": "STRATHADAM",
    "province": "New Brunswick"
  },
  {
    "codeId": 20312,
    "name": "STUART COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20313,
    "name": "STUARTTOWN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20314,
    "name": "SUNNY CORNER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20315,
    "name": "SUSSEX",
    "province": "New Brunswick"
  },
  {
    "codeId": 20316,
    "name": "SWAN CREEK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20317,
    "name": "SYPHERS COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20318,
    "name": "TABUSINTAC",
    "province": "New Brunswick"
  },
  {
    "codeId": 20319,
    "name": "TARGETVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20322,
    "name": "THE CEDARS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20323,
    "name": "THOMAS CREEK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20324,
    "name": "THREE ISLANDS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20325,
    "name": "TRACADIE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20326,
    "name": "TRACADIE BAY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20327,
    "name": "TRACADIE BEACH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20328,
    "name": "TRACADIE RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20329,
    "name": "TROUT STREAM",
    "province": "New Brunswick"
  },
  {
    "codeId": 20330,
    "name": "TURGEON RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20331,
    "name": "TWO RIVERS",
    "province": "New Brunswick"
  },
  {
    "codeId": 20332,
    "name": "TYNEMOUTH CRK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20333,
    "name": "UPPER BURTON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20334,
    "name": "UPPER CAPE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20335,
    "name": "UPPER CARAQUET",
    "province": "New Brunswick"
  },
  {
    "codeId": 20336,
    "name": "UPPER CHARLO",
    "province": "New Brunswick"
  },
  {
    "codeId": 20337,
    "name": "UPPER DERBY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20338,
    "name": "UPPER GAGETOWN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20339,
    "name": "UPPER JEMSEG",
    "province": "New Brunswick"
  },
  {
    "codeId": 20340,
    "name": "UPPER LAMEQUE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20341,
    "name": "UPPER POKEMOUCHE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20342,
    "name": "UPPER RIVER",
    "province": "New Brunswick"
  },
  {
    "codeId": 20343,
    "name": "UPPER ROCKFORT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20344,
    "name": "UPPER SHEILA",
    "province": "New Brunswick"
  },
  {
    "codeId": 20345,
    "name": "UPPER SHIPPEGAN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20346,
    "name": "UPPER ST. SIMON",
    "province": "New Brunswick"
  },
  {
    "codeId": 20347,
    "name": "VAL COMEAU",
    "province": "New Brunswick"
  },
  {
    "codeId": 20349,
    "name": "VICTORIA BRIDGE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20350,
    "name": "VICTORIA WHARF",
    "province": "New Brunswick"
  },
  {
    "codeId": 20351,
    "name": "WASHADEMOAK LAKE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20352,
    "name": "WATERBOROUGH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20353,
    "name": "WATERSIDE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20354,
    "name": "WATERVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20355,
    "name": "WAUGH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20356,
    "name": "WELCH COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20357,
    "name": "WELSFORD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20358,
    "name": "WELSHPOOL",
    "province": "New Brunswick"
  },
  {
    "codeId": 20359,
    "name": "WEST ST. JOHN",
    "province": "New Brunswick"
  },
  {
    "codeId": 20360,
    "name": "WESTFIELD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20361,
    "name": "WHITE HEAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20362,
    "name": "WHITE'S COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20363,
    "name": "WHITNEY",
    "province": "New Brunswick"
  },
  {
    "codeId": 20364,
    "name": "WHITNEYVILLE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20365,
    "name": "WILSON'S BEACH",
    "province": "New Brunswick"
  },
  {
    "codeId": 20366,
    "name": "WILSON'S POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20367,
    "name": "WOLVE'S ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 20368,
    "name": "WOOD ISLAND",
    "province": "New Brunswick"
  },
  {
    "codeId": 20369,
    "name": "WOOD POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20370,
    "name": "WOODMAN'S POINT",
    "province": "New Brunswick"
  },
  {
    "codeId": 20371,
    "name": "WOODSIDE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20372,
    "name": "WOODSTOCK",
    "province": "New Brunswick"
  },
  {
    "codeId": 20373,
    "name": "WOODWARDS COVE",
    "province": "New Brunswick"
  },
  {
    "codeId": 20374,
    "name": "YOUNG COVE ROAD",
    "province": "New Brunswick"
  },
  {
    "codeId": 20913,
    "name": "ABBOTT'S HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20914,
    "name": "ABERCROMBIE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20915,
    "name": "ABERDEEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20916,
    "name": "ABRAM'S RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20917,
    "name": "ADMIRAL ROCK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20918,
    "name": "ADVOCATE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20919,
    "name": "ADVOCATE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20920,
    "name": "AFTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20921,
    "name": "ALBA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20922,
    "name": "ALDER POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20923,
    "name": "ALLENDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20924,
    "name": "AMHERST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20925,
    "name": "AMHERST SHORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20926,
    "name": "AMIRAULT'S HILL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20927,
    "name": "ANNAPOLIS RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20928,
    "name": "ANNAPOLIS ROYAL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20929,
    "name": "ANTIGONISH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20930,
    "name": "ANTIGONISH HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20931,
    "name": "APPLE RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20932,
    "name": "ARCADIA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20933,
    "name": "ARDNESS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20934,
    "name": "ARGYLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20935,
    "name": "ARGYLE HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20936,
    "name": "ARGYLE SOUND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20937,
    "name": "ARICHAT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20938,
    "name": "ARISAIG",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20939,
    "name": "ARMDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20940,
    "name": "ASHMORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20941,
    "name": "ASPEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20942,
    "name": "ASPOTOGAN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20943,
    "name": "ASPY BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20944,
    "name": "ATWOOD'S BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20945,
    "name": "AUBURNDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20946,
    "name": "AULD'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20947,
    "name": "AVON RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20948,
    "name": "AVONDALE (HANTS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20949,
    "name": "AVONDALE (PICTOU)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20950,
    "name": "AVONDALE STATION",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20951,
    "name": "AVONPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20952,
    "name": "AYLESFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20953,
    "name": "BACCARO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20954,
    "name": "BADDECK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20955,
    "name": "BAILEY'S BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20956,
    "name": "BALD ROCK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20957,
    "name": "BALEINE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20958,
    "name": "BALLANTYNE'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20959,
    "name": "BALLS CREEK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20960,
    "name": "BANG'S FALLS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20961,
    "name": "BANKS ROAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20962,
    "name": "BARACHOIS (GUYSBOROUGH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20963,
    "name": "BARACHOIS HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20964,
    "name": "BARKHOUSE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20965,
    "name": "BARNEY'S RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20966,
    "name": "BARRACHOIS (COLCHESTER)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20967,
    "name": "BARRINGTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20968,
    "name": "BARRINGTON HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20969,
    "name": "BARRINGTON PASSAGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20970,
    "name": "BARRINGTON RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20971,
    "name": "BARRINGTON WEST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20972,
    "name": "BARRIOS BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20973,
    "name": "BARRONSFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20974,
    "name": "BARSS CORNER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20975,
    "name": "BARTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20976,
    "name": "BASS RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20977,
    "name": "BATESTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20978,
    "name": "BAXTER'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20979,
    "name": "BAXTER'S HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20980,
    "name": "BAY HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 20981,
    "name": "BAY ST. LAWRENCE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21514,
    "name": "BAYFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21515,
    "name": "BAYPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21516,
    "name": "BAYSIDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21517,
    "name": "BAYSWATER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21518,
    "name": "BAYVIEW (DIGBY)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21519,
    "name": "BAYVIEW (PICTOU)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21520,
    "name": "BEACH HILL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21521,
    "name": "BEACH MEADOWS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21522,
    "name": "BEAR COVE (DIGBY)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21523,
    "name": "BEAR COVE (VICTORIA)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21524,
    "name": "BEAR FALLS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21525,
    "name": "BEAR ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21526,
    "name": "BEAR POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21527,
    "name": "BEAR RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21528,
    "name": "BEAVER COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21529,
    "name": "BEAVER HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21530,
    "name": "BEAVER ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21531,
    "name": "BEAVER RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21532,
    "name": "BEAVERBANK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21533,
    "name": "BEDFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21534,
    "name": "BEECH HILL (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21535,
    "name": "BEECH HILL (QUEENS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21536,
    "name": "BELLE COTE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21537,
    "name": "BELLE MARCHE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21538,
    "name": "BELLEVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21539,
    "name": "BELLIVEAU COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21540,
    "name": "BELLS ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21541,
    "name": "BEN EOIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21542,
    "name": "BERWICK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21543,
    "name": "BICKERTON WEST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21544,
    "name": "BIG BRAS D'OR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21545,
    "name": "BIG GLACE BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21546,
    "name": "BIG HARBOUR (INVERNESS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21547,
    "name": "BIG HARBOUR (VICTORIA)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21548,
    "name": "BIG HARBOUR ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21549,
    "name": "BIG ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21550,
    "name": "BIG LORRAINE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21551,
    "name": "BIG POND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21552,
    "name": "BIG TANCOOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21553,
    "name": "BIRCH PLAINS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21554,
    "name": "BIRCHTOWN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21555,
    "name": "BIRCHY HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21556,
    "name": "BLACK HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21557,
    "name": "BLACK POINT (CAPE BRETON)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21558,
    "name": "BLACK POINT (HALIFAX - 23)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21559,
    "name": "BLACK POINT (HALIFAX -22)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21560,
    "name": "BLACK POINT (PICTOU)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21561,
    "name": "BLACK POINT (VICTORIA)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21562,
    "name": "BLACK RIVER (RICHMOND)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21563,
    "name": "BLACK ROCK (KINGS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21564,
    "name": "BLACK ROCK (LUNEBURG)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21565,
    "name": "BLANCHE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21566,
    "name": "BLANDFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21567,
    "name": "BLIND BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21568,
    "name": "BLOCKHOUSE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21569,
    "name": "BLUE ROCKS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21570,
    "name": "BOAR'S HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21571,
    "name": "BOISDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21572,
    "name": "BOUDREAUVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21573,
    "name": "BOULARDERIE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21574,
    "name": "BOUTILIER'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21575,
    "name": "BOUTILIER'S POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21576,
    "name": "BOYLSTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21577,
    "name": "BRAMBER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21578,
    "name": "BRANCH LA HAVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21579,
    "name": "BRAS D'OR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21580,
    "name": "BRASS HILL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21581,
    "name": "BRIDGEPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21582,
    "name": "BRIDGETOWN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21583,
    "name": "BRIDGEWATER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21584,
    "name": "BRIER ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21585,
    "name": "BRIERLY BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21586,
    "name": "BRIGHTON (DIGBY)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21587,
    "name": "BRITON COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21588,
    "name": "BROAD COVE (DIGBY)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21589,
    "name": "BROAD COVE (LUNEBURG)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21590,
    "name": "BROAD COVE BANKS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21591,
    "name": "BROAD COVE MARSH (INVERNESS-02)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21593,
    "name": "BROOKFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21594,
    "name": "BROOKLYN (QUEENS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21595,
    "name": "BROOKLYN (YARMOUTH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21596,
    "name": "BRULE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21597,
    "name": "BRULE POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21598,
    "name": "BUCKLAW",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21599,
    "name": "BURLINGTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21600,
    "name": "BUSH ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21601,
    "name": "CALLINGWOOD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21602,
    "name": "CAMBRIDGE (HANTS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21603,
    "name": "CAMBRIDGE (KINGS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21604,
    "name": "CAMP COVE (LOWER ARGYLE)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21605,
    "name": "CANADA CREEK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21606,
    "name": "CANDLE BOX ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21607,
    "name": "CANNES",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21608,
    "name": "CANNING",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21609,
    "name": "CANSO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21610,
    "name": "CAP LE MOINE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21611,
    "name": "CAPE ARGOS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21612,
    "name": "CAPE AUGET",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21613,
    "name": "CAPE DAUPHIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21614,
    "name": "CAPE DOR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21615,
    "name": "CAPE EGMONT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21616,
    "name": "CAPE FORCHU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21617,
    "name": "CAPE GEORGE (ANTIGONISH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21618,
    "name": "CAPE GEORGE (RICHMOND)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21619,
    "name": "CAPE GEORGE PT.",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21620,
    "name": "CAPE JOHN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21621,
    "name": "CAPE MORIEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21622,
    "name": "CAPE NEGRO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21623,
    "name": "CAPE NORTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21624,
    "name": "CAPE ROUGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21625,
    "name": "CAPE SABLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21626,
    "name": "CAPE SAMBRO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21627,
    "name": "CAPE ST. MARYS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21628,
    "name": "CAPELIN COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21629,
    "name": "CAPSTICK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21630,
    "name": "CARIBOU HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21631,
    "name": "CARIBOU LITTLE ENTRANCE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21632,
    "name": "CARIBOU RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21633,
    "name": "CARIBOU/FERRY WHARF",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21634,
    "name": "CARLETON VILLAGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21635,
    "name": "CARLTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21638,
    "name": "CARR'S BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21636,
    "name": "CARRIBOU ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21637,
    "name": "CARRINGTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21639,
    "name": "CARTERS COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21640,
    "name": "CASTLE BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21641,
    "name": "CENTRAL ARGYLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21642,
    "name": "CENTRAL CHEBOGUE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21643,
    "name": "CENTRAL EAST PUBNICO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21644,
    "name": "CENTRAL GROVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21645,
    "name": "CENTRAL PORT MOUTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21646,
    "name": "CENTRAL WOODS HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21647,
    "name": "CENTRE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21648,
    "name": "CENTRE BURLINGTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21649,
    "name": "CENTREVILLE (DIGBY)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21650,
    "name": "CENTREVILLE (KINGS-40)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21651,
    "name": "CENTREVILLE (KINGS-41)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21652,
    "name": "CENTREVILLE (SHELBURNE)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21653,
    "name": "CHANCE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21654,
    "name": "CHAPEL COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21655,
    "name": "CHAPEL ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21656,
    "name": "CHARLESTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21657,
    "name": "CHARLESVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21658,
    "name": "CHARLOS COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21659,
    "name": "CHEBOGUE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21660,
    "name": "CHEBOGUE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21661,
    "name": "CHEBOGUE POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21662,
    "name": "CHEGGOGIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21663,
    "name": "CHELSEA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21664,
    "name": "CHERRY HILL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21665,
    "name": "CHESTER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21666,
    "name": "CHESTER BASIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21667,
    "name": "CHETICAMP",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21668,
    "name": "CHETICAMP ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21669,
    "name": "CHETICAMP POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21670,
    "name": "CHEZZETCOOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21671,
    "name": "CHEZZETCOOK INLET",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21672,
    "name": "CHIMNEY CORNER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21673,
    "name": "CHIPMAN BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21674,
    "name": "CHRISTMAS ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21675,
    "name": "CHURCH POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21676,
    "name": "CHURCHOVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21677,
    "name": "CLAM BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21678,
    "name": "CLAM HARBOUR (GUYSBOROUGH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21679,
    "name": "CLAM HARBOUR (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21680,
    "name": "CLAM POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21681,
    "name": "CLARKS HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21682,
    "name": "CLEARLANDS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21683,
    "name": "CLEMENTSPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21684,
    "name": "CLEMENTSVALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21685,
    "name": "CLEVELAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21686,
    "name": "CLYDE RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21687,
    "name": "COALBURN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21688,
    "name": "CODDLE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21689,
    "name": "COFFINS ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21690,
    "name": "COFFINSCROFT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21691,
    "name": "COGMAGUN RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21692,
    "name": "COLDBROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21693,
    "name": "COLE HARBOUR (GUYSBOROUGH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21694,
    "name": "COLE HARBOUR (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21695,
    "name": "COLEMAN'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21696,
    "name": "COLINDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21697,
    "name": "COMEAU HILL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21698,
    "name": "COMEAUVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21699,
    "name": "COMMON COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21700,
    "name": "CONCESSION",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21701,
    "name": "CONQUERALL BANK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21702,
    "name": "CONQUERALL MILLS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21703,
    "name": "CONWAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21704,
    "name": "COOK'S BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21705,
    "name": "COOK'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21706,
    "name": "CORKUM'S ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21707,
    "name": "COTTAGE COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21708,
    "name": "COUNTRY HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21709,
    "name": "COW BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21710,
    "name": "COXHEATH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21711,
    "name": "CRAIGMORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21712,
    "name": "CRANBURY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21713,
    "name": "CREIGNISH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21714,
    "name": "CRESCENT BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21715,
    "name": "CRIBBENS POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21716,
    "name": "CRIPPLE CREEK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21717,
    "name": "CROSS ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21718,
    "name": "CROUSETOWN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21719,
    "name": "CROWELL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21720,
    "name": "CULLODEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21737,
    "name": "D'ESCOUSSE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21721,
    "name": "DANESVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21722,
    "name": "DANIELS HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21723,
    "name": "DARK COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21724,
    "name": "DARLING LAKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21725,
    "name": "DARTMOUTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21726,
    "name": "DAY SPRING",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21727,
    "name": "DAYTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21728,
    "name": "DEBAIE COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21729,
    "name": "DEEP BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21730,
    "name": "DEEP COVE (CAPE BRETON)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21731,
    "name": "DEEP COVE (LUNEBURG)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21732,
    "name": "DEEP COVE ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21733,
    "name": "DEEPDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21734,
    "name": "DELAP'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21735,
    "name": "DELHAVEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21736,
    "name": "DENNIS POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21738,
    "name": "DIGBY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21739,
    "name": "DILIGENT RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21740,
    "name": "DINGWALL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21742,
    "name": "DOCTOR'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21741,
    "name": "DOCTORS BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21743,
    "name": "DODGE BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21744,
    "name": "DOG ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21745,
    "name": "DOMINION",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21746,
    "name": "DONKIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21747,
    "name": "DORT'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21748,
    "name": "DOVER (GUYSBOROUGH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21749,
    "name": "DOVER (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21750,
    "name": "DOVER CORNER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21751,
    "name": "DOWNING COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21752,
    "name": "DRUMHEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21753,
    "name": "DUBLIN SHORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21754,
    "name": "DUNCAN'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21755,
    "name": "DUNDEE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21756,
    "name": "DUNVEGAN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21757,
    "name": "DUTCH BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21758,
    "name": "EAGLE HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21759,
    "name": "EAST ADVOCATE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21760,
    "name": "EAST BACCARO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21761,
    "name": "EAST BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21762,
    "name": "EAST BERLIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21763,
    "name": "EAST CHESTER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21764,
    "name": "EAST CHEZZETCOOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21765,
    "name": "EAST CLIFFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21766,
    "name": "EAST DOVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21767,
    "name": "EAST FERRY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21768,
    "name": "EAST GREEN HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21769,
    "name": "EAST HAVRE BOUCHER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21770,
    "name": "EAST IRONBOUND ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21771,
    "name": "EAST JEDDORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21772,
    "name": "EAST JORDAN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21773,
    "name": "EAST LA HAVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21774,
    "name": "EAST LAWRENCETOWN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21775,
    "name": "EAST LINDEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21776,
    "name": "EAST NOEL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21777,
    "name": "EAST PETPESWICK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21778,
    "name": "EAST PORT FELIX",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21779,
    "name": "EAST PORT HEBERT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21780,
    "name": "EAST PORT MEDWAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21781,
    "name": "EAST PUBNICO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21782,
    "name": "EAST QUINAN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21783,
    "name": "EAST QUODDY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21784,
    "name": "EAST RAGGED ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21785,
    "name": "EAST RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21786,
    "name": "EAST RIVER POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21787,
    "name": "EAST SABLE RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21788,
    "name": "EAST SANDY COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21789,
    "name": "EAST SHIP HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21790,
    "name": "EAST TRACADIE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21791,
    "name": "EAST WALLACE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21792,
    "name": "EAST WALTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21793,
    "name": "EASTERN PASSAGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21794,
    "name": "EASTERN POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21795,
    "name": "ECONOMY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21796,
    "name": "ECUM SECUM",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21797,
    "name": "ECUM SECUM BRIDGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21798,
    "name": "ECUM SECUM INLET",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21799,
    "name": "ECUM SECUM WEST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21800,
    "name": "EEL BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21801,
    "name": "EGERTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21802,
    "name": "EGG ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21803,
    "name": "EGYPT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21804,
    "name": "ELLENWOOD ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21805,
    "name": "ELMSDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21806,
    "name": "ENFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21807,
    "name": "ENGLISHTOWN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21808,
    "name": "ESKASONI",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21809,
    "name": "ESTMERE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21810,
    "name": "ESTONIA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21811,
    "name": "EVANS ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21812,
    "name": "EVANSTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21813,
    "name": "FALLS POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21814,
    "name": "FALMOUTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21815,
    "name": "FALSE BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21816,
    "name": "FAROE ISLANDS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21817,
    "name": "FAUXBOURG",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21818,
    "name": "FELTZEN SOUTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21819,
    "name": "FENWICK, N.S.",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21820,
    "name": "FERGUSON LAKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21821,
    "name": "FERGUSONS COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21822,
    "name": "FIDDLE HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21823,
    "name": "FINLAY POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21824,
    "name": "FIRST PENINSULA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21825,
    "name": "FIRST SOUTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21826,
    "name": "FISHERMAN'S HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21827,
    "name": "FIVE ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21828,
    "name": "FLAT ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21829,
    "name": "FLAT POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21830,
    "name": "FLORENCE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21831,
    "name": "FORBES POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21832,
    "name": "FORRESTALL POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21833,
    "name": "FORT ELLIS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21834,
    "name": "FOURCHU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21835,
    "name": "FOX BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21836,
    "name": "FOX HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21837,
    "name": "FOX ISLAND (GUYSBOROUGH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21838,
    "name": "FOX ISLAND (LUNENBURG)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21839,
    "name": "FOX ISLAND MAIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21840,
    "name": "FOX POINT (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21841,
    "name": "FOX POINT (LUNENBURG)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21842,
    "name": "FRAMBOISE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21843,
    "name": "FRANKVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21844,
    "name": "FRASER'S MOUNTAIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21845,
    "name": "FRASERVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21846,
    "name": "FREEPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21847,
    "name": "FRENCH COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21848,
    "name": "FRENCH RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21849,
    "name": "FRENCH VILLAGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21850,
    "name": "FRIAR'S HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21851,
    "name": "FROG POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21852,
    "name": "GABAROUSE BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21853,
    "name": "GABARUS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21854,
    "name": "GAETZ BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21855,
    "name": "GARDEN LOTS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21856,
    "name": "GASPEREAU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21857,
    "name": "GAVELTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21858,
    "name": "GAYS RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21859,
    "name": "GEGOGAN HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21860,
    "name": "GEORGE'S RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21861,
    "name": "GEORGEVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21862,
    "name": "GERMANY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21863,
    "name": "GILBERT'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21864,
    "name": "GILLISDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21865,
    "name": "GLACE BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21866,
    "name": "GLEN HAVEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21867,
    "name": "GLEN KEEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21868,
    "name": "GLEN MARGARET",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21869,
    "name": "GLENWOOD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21870,
    "name": "GOLD RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21871,
    "name": "GOLDBORO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21872,
    "name": "GRACIEVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21873,
    "name": "GRAFTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21874,
    "name": "GRAND DESERT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21875,
    "name": "GRAND ETANG",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21876,
    "name": "GRAND GREVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21877,
    "name": "GRAND NARROWS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21878,
    "name": "GRAND RIVER (RICHMOND-08))",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21879,
    "name": "GRAND RIVER (RICHMOND-09)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21880,
    "name": "GRANDIQUE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21881,
    "name": "GRANTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21882,
    "name": "GRANTVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21883,
    "name": "GRANVILLE BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21884,
    "name": "GRANVILLE FERRY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21885,
    "name": "GREAT BRAS D'OR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21886,
    "name": "GREAT VILLAGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21887,
    "name": "GREEN BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21888,
    "name": "GREEN HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21889,
    "name": "GREENFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21890,
    "name": "GREENVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21891,
    "name": "GREENWOLD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21892,
    "name": "GRIFFIN COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21893,
    "name": "GRIFFIN'S BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21894,
    "name": "GROSSES COQUES",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21895,
    "name": "GROVES POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21896,
    "name": "GULF SHORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21897,
    "name": "GULLIVER'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21898,
    "name": "GUNNING COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21899,
    "name": "GUYSBOROUGH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21900,
    "name": "GUYSBOROUGH INTERVALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21901,
    "name": "HABITANT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21902,
    "name": "HACKETT'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21903,
    "name": "HADLEYVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21904,
    "name": "HALF ISLAND COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21905,
    "name": "HALFWAY COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21906,
    "name": "HALIFAX",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21907,
    "name": "HALL'S HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21908,
    "name": "HAMPTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21909,
    "name": "HANTSPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21910,
    "name": "HARBOUR VIEW",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21911,
    "name": "HARBOURVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21912,
    "name": "HARPELVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21913,
    "name": "HARRIGAN COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21914,
    "name": "HARRINGTON BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21915,
    "name": "HARRIS ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21916,
    "name": "HARTZ POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21917,
    "name": "HAVRE BOUCHER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21918,
    "name": "HAWKER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21919,
    "name": "HAY COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21920,
    "name": "HAZEL HILL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21921,
    "name": "HEAD JEDDORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21922,
    "name": "HEAD OF CHEZZETCOOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21923,
    "name": "HEAD OF ST. MARGARET'S",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21924,
    "name": "HEATHERTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21925,
    "name": "HEBBVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21926,
    "name": "HEBRON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21927,
    "name": "HECKMAN ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21928,
    "name": "HERMAN'S ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21929,
    "name": "HERRING COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21930,
    "name": "HIGHLAND VILLAGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21931,
    "name": "HILLSBURN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21932,
    "name": "HOMEVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21933,
    "name": "HORTONVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21935,
    "name": "HUBBARD'S POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21934,
    "name": "HUBBARDS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21936,
    "name": "HUNT'S POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21937,
    "name": "HURLBURT FALLS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21938,
    "name": "HUSTON BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21939,
    "name": "ILE SAINT-PIERRE (FRANCE)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21940,
    "name": "INDIAN BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21941,
    "name": "INDIAN FALLS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21942,
    "name": "INDIAN HARBOUR (GUYSBOROUGH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21943,
    "name": "INDIAN HARBOUR (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21944,
    "name": "INDIAN HARBOUR LAKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21945,
    "name": "INDIAN PATH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21946,
    "name": "INDIAN POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21947,
    "name": "INGOMAR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21948,
    "name": "INGONISH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21949,
    "name": "INGONISH BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21950,
    "name": "INGONISH CENTRE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21951,
    "name": "INGONISH FERRY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21952,
    "name": "INGONISH HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21953,
    "name": "INGRAMPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21954,
    "name": "INVERNESS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21955,
    "name": "INVERSIDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21956,
    "name": "IONA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21957,
    "name": "IRISH COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21958,
    "name": "IRISH VALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21959,
    "name": "IRON MINES",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21960,
    "name": "IRONBOUND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21961,
    "name": "ISAAC'S HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21962,
    "name": "ITALY CROSS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21963,
    "name": "JAMES RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21964,
    "name": "JANSON COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21965,
    "name": "JANVRINS HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21966,
    "name": "JEDDORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21967,
    "name": "JEDDORE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21968,
    "name": "JERSEY COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21969,
    "name": "JOGGIN BRIDGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21970,
    "name": "JOGGINS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21971,
    "name": "JOHN'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21972,
    "name": "JOHN'S HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21973,
    "name": "JOHN'S ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21974,
    "name": "JOHNSON HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21975,
    "name": "JOHNSTOWN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21976,
    "name": "JONES HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21977,
    "name": "JORDAN BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21978,
    "name": "JORDAN BRANCH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21979,
    "name": "JORDAN FALLS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21980,
    "name": "JORDAN FERRY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21981,
    "name": "JORDAN RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21982,
    "name": "JORDANVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21983,
    "name": "JUDIQUE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21984,
    "name": "JUDIQUE NORTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21985,
    "name": "JUDIQUE POND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21986,
    "name": "JUDIQUE SOUTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21987,
    "name": "KALBEC",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21988,
    "name": "KARSDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21989,
    "name": "KELLEY'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21990,
    "name": "KEMPT HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21991,
    "name": "KEMPT SHORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21992,
    "name": "KEMPTVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21993,
    "name": "KENSINGTON COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21994,
    "name": "KENTVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21995,
    "name": "KETCH HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21996,
    "name": "KINGS HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21997,
    "name": "KINGS POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21998,
    "name": "KINGSBURG",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21999,
    "name": "KINGSPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22000,
    "name": "KINGSTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22001,
    "name": "KIRKMOUNT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22015,
    "name": "L'ARCHEVEQUE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22016,
    "name": "L'ARDOISE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22017,
    "name": "L'ARDOISE WEST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22003,
    "name": "LAHAVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22004,
    "name": "LAHAVE ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22005,
    "name": "LAKE CENTRE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22006,
    "name": "LAKE CHARLOTTE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22007,
    "name": "LAKE DOUCET",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22008,
    "name": "LAKE ECHO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22009,
    "name": "LAKE MIDWAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22010,
    "name": "LAKESIDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22011,
    "name": "LAKEVALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22012,
    "name": "LAKEVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22013,
    "name": "LANARK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22014,
    "name": "LANTZ",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22018,
    "name": "LARRY'S RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22019,
    "name": "LATVIA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22020,
    "name": "LAWRENCETOWN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22021,
    "name": "LEDGE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22022,
    "name": "LEITCHES CREEK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22023,
    "name": "LEONARD'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22024,
    "name": "LEQUILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22025,
    "name": "LINDEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22026,
    "name": "LINGAN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22027,
    "name": "LINWOOD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22028,
    "name": "LISCOMB",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22029,
    "name": "LISCOMB MILLS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22030,
    "name": "LISMORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22031,
    "name": "LITCHFIELD COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22032,
    "name": "LITHUANIA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22033,
    "name": "LITTLE ANSE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22034,
    "name": "LITTLE BASS RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22035,
    "name": "LITTLE BRAS D'OR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22036,
    "name": "LITTLE BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22037,
    "name": "LITTLE DOVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22038,
    "name": "LITTLE HARBOUR (GUYSBOROUGH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22039,
    "name": "LITTLE HARBOUR (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22040,
    "name": "LITTLE HARBOUR (INVERNESS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22041,
    "name": "LITTLE HARBOUR (PICTOU)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22042,
    "name": "LITTLE HARBOUR (QUEENS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22043,
    "name": "LITTLE HARBOUR (RICHMOND)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22044,
    "name": "LITTLE HARBOUR (SHELBURNE)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22045,
    "name": "LITTLE HARBOUR (YARMOUTH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22046,
    "name": "LITTLE JUDIQUE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22047,
    "name": "LITTLE JUDIQUE PONDS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22048,
    "name": "LITTLE LISCOMB",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22049,
    "name": "LITTLE LORRAINE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22050,
    "name": "LITTLE NARROWS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22051,
    "name": "LITTLE POND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22052,
    "name": "LITTLE RIVER (DIGBY)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22053,
    "name": "LITTLE RIVER (VICTORIA)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22054,
    "name": "LITTLE RIVER HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22055,
    "name": "LITTLE TANCOOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22056,
    "name": "LIVERPOOL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22057,
    "name": "LIVINGSTONE'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22058,
    "name": "LIVINGSTONE'S POND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22059,
    "name": "LLOYD COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22060,
    "name": "LOBSTER BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22061,
    "name": "LOCH LOMOND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22062,
    "name": "LOCKEPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22063,
    "name": "LOGAN'S POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22064,
    "name": "LONG BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22065,
    "name": "LONG COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22066,
    "name": "LONG ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22067,
    "name": "LONG POINT (ANTIGONISH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22068,
    "name": "LONG POINT (INVERNESS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22069,
    "name": "LORNEVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22070,
    "name": "LOUIS HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22071,
    "name": "LOUISBOURG",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22072,
    "name": "LOUISDALE (PICTOU)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22073,
    "name": "LOUISDALE (RICHMOND)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22074,
    "name": "LOW POINT (CAPE BRETON)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22075,
    "name": "LOW POINT (INVERNESS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22076,
    "name": "LOWER ARGYLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22077,
    "name": "LOWER BLANDFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22078,
    "name": "LOWER BRANCH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22079,
    "name": "LOWER BURLINGTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22080,
    "name": "LOWER CLARKE'S HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22081,
    "name": "LOWER COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22082,
    "name": "LOWER EAST CHEZZETCOOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22083,
    "name": "LOWER EAST PUBNICO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22084,
    "name": "LOWER ECONOMY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22085,
    "name": "LOWER EEL BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22086,
    "name": "LOWER FIVE ISLANDS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22087,
    "name": "LOWER JORDAN BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22088,
    "name": "LOWER KINGSBURG",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22090,
    "name": "LOWER L'ARDOISE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22089,
    "name": "LOWER LAHAVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22091,
    "name": "LOWER POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22092,
    "name": "LOWER PROSPECT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22093,
    "name": "LOWER RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22094,
    "name": "LOWER ROSE BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22095,
    "name": "LOWER SACKVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22096,
    "name": "LOWER SANDY POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22097,
    "name": "LOWER SAULNIERVILL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22098,
    "name": "LOWER SHAG HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22099,
    "name": "LOWER SHIP HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22100,
    "name": "LOWER SURETTE ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22101,
    "name": "LOWER TANTALLON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22102,
    "name": "LOWER WASHABUCK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22103,
    "name": "LOWER WEDGEPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22104,
    "name": "LOWER WEST JEDDORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22105,
    "name": "LOWER WEST PUBNICO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22106,
    "name": "LOWER WHITEHEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22107,
    "name": "LOWER WOODS HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22108,
    "name": "LR THREE FATHOM HBR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22109,
    "name": "LUNENBURG",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22110,
    "name": "LYDGATE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22111,
    "name": "LYNCH'S RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22112,
    "name": "LYONS BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22113,
    "name": "MABOU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22114,
    "name": "MABOU HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22115,
    "name": "MABOU MINES",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22116,
    "name": "MACCAN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22117,
    "name": "MACDONALD LANDING",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22118,
    "name": "MACDONALD'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22120,
    "name": "MACDONALD'S COVE (PICTOU)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22119,
    "name": "MACDONALDS COVE (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22121,
    "name": "MACKEIGANS POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22122,
    "name": "MACNABS COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22123,
    "name": "MACPHERSON'S FERRY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22124,
    "name": "MADER'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22125,
    "name": "MAHONE BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22126,
    "name": "MAIN-A-DIEU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22127,
    "name": "MAITLAND (HANTS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22128,
    "name": "MAITLAND (LUNENBURG)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22129,
    "name": "MAITLAND BRIDGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22130,
    "name": "MALAGASH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22131,
    "name": "MALAGASH POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22132,
    "name": "MALAGASH STATION",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22133,
    "name": "MALAGAWATCH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22134,
    "name": "MALIGANT COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22135,
    "name": "MANASSETTE LAKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22136,
    "name": "MANCHESTER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22137,
    "name": "MARBLE MOUNTAIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22138,
    "name": "MARGAREE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22139,
    "name": "MARGAREE BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22140,
    "name": "MARGAREE FORKS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22141,
    "name": "MARGAREE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22142,
    "name": "MARGAREE ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22143,
    "name": "MARGAREE VALLEY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22144,
    "name": "MARGARETSVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22145,
    "name": "MARIE JOSEPH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22146,
    "name": "MARION BRIDGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22147,
    "name": "MARIOTT COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22148,
    "name": "MARKLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22149,
    "name": "MARSHALLTOWN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22150,
    "name": "MARSHVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22152,
    "name": "MARTIN'S BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22153,
    "name": "MARTIN'S POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22154,
    "name": "MARTIN'S RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22151,
    "name": "MARTINIQUE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22155,
    "name": "MARYVALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22156,
    "name": "MARYVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22157,
    "name": "MAVILETTE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22158,
    "name": "MAYFLOWER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22159,
    "name": "MCGRATH'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22160,
    "name": "MCKAY'S POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22161,
    "name": "MCKINNONS HARBOUR (VICTORIA)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22162,
    "name": "MCNUTTS ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22163,
    "name": "MEADOWVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22164,
    "name": "MEAGHERS GRANT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22165,
    "name": "MEAT COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22166,
    "name": "MEDFORD (KINGS-40)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22167,
    "name": "MEDFORD (KINGS-41)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22168,
    "name": "MEDWAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22169,
    "name": "MELANSON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22170,
    "name": "MELBOURNE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22171,
    "name": "MELFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22172,
    "name": "MELVIN COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22173,
    "name": "MERIGOMISH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22174,
    "name": "MERSEY POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22175,
    "name": "METEGHAN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22176,
    "name": "METEGHAN CENTRE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22177,
    "name": "METEGHAN RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22178,
    "name": "METEGHAN STATION",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22179,
    "name": "MIDDLE CAPE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22180,
    "name": "MIDDLE COUNTRY HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22181,
    "name": "MIDDLE EAST PUBNICO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22182,
    "name": "MIDDLE HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22183,
    "name": "MIDDLE LA HAVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22184,
    "name": "MIDDLE MILFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22185,
    "name": "MIDDLE POINT (CAPE BRETON)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22186,
    "name": "MIDDLE POINT (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22187,
    "name": "MIDDLE PORTER'S LAKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22188,
    "name": "MIDDLE RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22189,
    "name": "MIDDLE VILLAGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22190,
    "name": "MIDDLE WEST PUBNICO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22191,
    "name": "MIDDLETON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22192,
    "name": "MIDDLEWOOD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22193,
    "name": "MILFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22194,
    "name": "MILFORD HAVEN BRIDGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22195,
    "name": "MILL COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22196,
    "name": "MILL CREEK (CAPE BRETON)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22197,
    "name": "MILL CREEK (KINGS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22198,
    "name": "MILL POND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22199,
    "name": "MILL VILLAGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22200,
    "name": "MILTON (QUEENS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22201,
    "name": "MILTON (YARMOUTH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22202,
    "name": "MILTON HIGHLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22203,
    "name": "MINASVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22204,
    "name": "MINESVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22205,
    "name": "MINK COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22206,
    "name": "MINUDIE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22207,
    "name": "MIRA BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22208,
    "name": "MIRA ROAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22209,
    "name": "MITCHELL BAY (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22210,
    "name": "MITCHELL BAY (SHELBURNE)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22211,
    "name": "MOLEGA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22212,
    "name": "MONASTERY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22213,
    "name": "MONK'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22214,
    "name": "MONK'S HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22215,
    "name": "MOOSE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22216,
    "name": "MOOSE HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22217,
    "name": "MOOSE RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22218,
    "name": "MORAR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22219,
    "name": "MORDEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22220,
    "name": "MORIEN BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22221,
    "name": "MORRIS ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22222,
    "name": "MORRISON COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22223,
    "name": "MORRISON HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22224,
    "name": "MORRISTOWN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22225,
    "name": "MOSCHELLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22226,
    "name": "MOSER RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22227,
    "name": "MOSHER'S ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22228,
    "name": "MOUNT HANLEY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22229,
    "name": "MOUNT PLEASANT (DIGBY)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22230,
    "name": "MOUNT PLEASANT (LUNENBURG)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22231,
    "name": "MUD ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22232,
    "name": "MULGRAVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22233,
    "name": "MUNROE BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22234,
    "name": "MUNROE POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22235,
    "name": "MURPHY'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22236,
    "name": "MURPHY'S POND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22237,
    "name": "MUSHABOOM",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22238,
    "name": "MUSQUODOBOIT HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22239,
    "name": "MYERS POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22240,
    "name": "NARROW ENTRANCE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22241,
    "name": "NECUM TEUCH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22242,
    "name": "NEGRO HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22243,
    "name": "NEIL'S HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22244,
    "name": "NEW ABERDEEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22245,
    "name": "NEW CAMPBELLTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22246,
    "name": "NEW CHESTER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22247,
    "name": "NEW CORNWALL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22248,
    "name": "NEW COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22249,
    "name": "NEW EDINBURGH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22250,
    "name": "NEW GERMANY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22251,
    "name": "NEW GLASGOW",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22252,
    "name": "NEW HARBOUR (GUYSBOROUGH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22253,
    "name": "NEW HARBOUR (LUNENBURG)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22254,
    "name": "NEW HARRIS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22255,
    "name": "NEW HARRIS FORKS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22256,
    "name": "NEW HAVEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22257,
    "name": "NEW MINAS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22258,
    "name": "NEW ROSS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22259,
    "name": "NEW VICTORIA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22260,
    "name": "NEW WATERFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22261,
    "name": "NEWBURN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22262,
    "name": "NEWCOMBE'S BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22263,
    "name": "NEWELLTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22264,
    "name": "NEWPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22265,
    "name": "NEWPORT STATION",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22266,
    "name": "NINEVAH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22267,
    "name": "NOEL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22268,
    "name": "NORTH BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22269,
    "name": "NORTH CHEGGOGIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22270,
    "name": "NORTH EAST HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22271,
    "name": "NORTH EAST MABOU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22272,
    "name": "NORTH FOURCHU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22273,
    "name": "NORTH GUT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22274,
    "name": "NORTH HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22275,
    "name": "NORTH INGONISH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22276,
    "name": "NORTH RANGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22277,
    "name": "NORTH RIVER CENTRE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22278,
    "name": "NORTH SHORE (CUMBERLAND)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22279,
    "name": "NORTH SHORE (VICTORIA)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22280,
    "name": "NORTH SYDNEY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22281,
    "name": "NORTH WALLACE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22282,
    "name": "NORTH WEST ARM",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22283,
    "name": "NORTH WEST BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22284,
    "name": "NORTH WEST HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22285,
    "name": "NORTHEAST POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22286,
    "name": "NORTHPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22287,
    "name": "NORTHWEST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22288,
    "name": "NORTHWEST COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22289,
    "name": "NYANZA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22290,
    "name": "OAK PARK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22291,
    "name": "OAKLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22292,
    "name": "OGDEN'S POND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22293,
    "name": "OHIO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22294,
    "name": "OLD BARNS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22295,
    "name": "ORANGEDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22296,
    "name": "OSBORNE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22297,
    "name": "OSTREA LAKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22298,
    "name": "OTTAWA BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22299,
    "name": "OUTRAM",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22300,
    "name": "OVERTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22301,
    "name": "OWL'S HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22302,
    "name": "OWLS HEAD BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22303,
    "name": "OWLS HEAD HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22304,
    "name": "OXFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22305,
    "name": "OYSTER POND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22306,
    "name": "PADDY'S HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22307,
    "name": "PARADISE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22308,
    "name": "PARKER'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22309,
    "name": "PARRSBORO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22310,
    "name": "PARRSBORO ROAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22311,
    "name": "PARRSBORO SHORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22312,
    "name": "PARTRIDGE ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22313,
    "name": "PATH END",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22314,
    "name": "PAULS POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22315,
    "name": "PEAS BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22316,
    "name": "PEASE ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22317,
    "name": "PEGGY'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22318,
    "name": "PEMBROKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22319,
    "name": "PENNANT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22320,
    "name": "PENNANT HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22321,
    "name": "PENNANT POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22322,
    "name": "PENTZ",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22323,
    "name": "PEREAU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22324,
    "name": "PETIT DE GRAT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22325,
    "name": "PETIT ETANG",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22326,
    "name": "PETITE RIVIERE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22327,
    "name": "PETPESWICK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22328,
    "name": "PETPESWICK INLET",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22329,
    "name": "PHILLIP'S HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22330,
    "name": "PHINNEY COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22331,
    "name": "PICTOU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22332,
    "name": "PICTOU HARBOUR (PICTOU - 11)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22333,
    "name": "PICTOU HARBOUR (PICTOU - 12)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22334,
    "name": "PICTOU ISLAND EAST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22335,
    "name": "PICTOU ISLAND WEST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22336,
    "name": "PICTOU LANDING",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22337,
    "name": "PINEHURST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22338,
    "name": "PINEVALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22339,
    "name": "PINKNEY'S POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22340,
    "name": "PIPERS COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22341,
    "name": "PLASTER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22342,
    "name": "PLATEAU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22343,
    "name": "PLEASANT BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22344,
    "name": "PLEASANT HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22345,
    "name": "PLEASANT LAKE (YARMOUTH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22346,
    "name": "PLEASANT POINT (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21392,
    "name": "PLEASANT VALLEY (ANTIGONISH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21393,
    "name": "PLEASANT VALLEY (YARMOUTH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21394,
    "name": "PLEASANTFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21395,
    "name": "PLEASANTVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21396,
    "name": "PLYMOUTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21397,
    "name": "PLYMPTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21398,
    "name": "POINT ACONI",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21399,
    "name": "POINT CROSS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21400,
    "name": "POINT EDWARD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21401,
    "name": "POINT MICHAUD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21402,
    "name": "POINT PRIM",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21403,
    "name": "POINT TUPPER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21404,
    "name": "POIRIERVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21405,
    "name": "POLISH LANDINGS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21406,
    "name": "POMQUET",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21407,
    "name": "PONDVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21408,
    "name": "POPE'S HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21409,
    "name": "PORT BAN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21410,
    "name": "PORT BICKERTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21411,
    "name": "PORT CALEDONIA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21412,
    "name": "PORT CLYDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21413,
    "name": "PORT DUFFERIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21414,
    "name": "PORT FELIX",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21415,
    "name": "PORT GEORGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21416,
    "name": "PORT GREVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21417,
    "name": "PORT HASTINGS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21418,
    "name": "PORT HAWKESBURY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21419,
    "name": "PORT HEBERT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21420,
    "name": "PORT HILFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21421,
    "name": "PORT HOOD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21422,
    "name": "PORT HOOD ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21423,
    "name": "PORT HOWE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21424,
    "name": "PORT JOLI",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21425,
    "name": "PORT LA TOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21426,
    "name": "PORT LORNE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21427,
    "name": "PORT MAITLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21428,
    "name": "PORT MALCOLM",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21429,
    "name": "PORT MEDWAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21430,
    "name": "PORT MORIEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21431,
    "name": "PORT MOUTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21432,
    "name": "PORT PHILLIP",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21433,
    "name": "PORT RICHMOND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21434,
    "name": "PORT ROYAL (ANNAPOLIS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21435,
    "name": "PORT ROYAL (RICHMOND)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21436,
    "name": "PORT SAXON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21437,
    "name": "PORT SHOREHAM",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21438,
    "name": "PORT WADE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21439,
    "name": "PORT WILLIAMS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21440,
    "name": "PORTAPIQUE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21441,
    "name": "PORTER'S LAKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21442,
    "name": "PORTUGAL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21443,
    "name": "PORTUGUESE COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21444,
    "name": "POULAMOND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21445,
    "name": "PRIME BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21446,
    "name": "PRINGLES HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21447,
    "name": "PROSPECT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21448,
    "name": "PROSPECT POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21449,
    "name": "PUBNICO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21450,
    "name": "PUGWASH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21451,
    "name": "PUGWASH JUNCTION",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21452,
    "name": "PUGWASH POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21453,
    "name": "PUGWASH RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21454,
    "name": "PURCELL'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21455,
    "name": "QUEENSLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21456,
    "name": "QUEENSPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21457,
    "name": "QUINAN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21458,
    "name": "QUODDY INLET",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21459,
    "name": "RABBIT ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21460,
    "name": "RAM'S LEDGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21461,
    "name": "RED HEAD (GUYSBOROUGH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21462,
    "name": "RED HEAD (RICHMOND)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21463,
    "name": "RED ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21464,
    "name": "RED POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21465,
    "name": "RESERVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21466,
    "name": "REYNARDTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21467,
    "name": "REYNOLDSCROFT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21468,
    "name": "RHODES CORNER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21469,
    "name": "RIVER BENNETT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21470,
    "name": "RIVER BOURGEOIS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21471,
    "name": "RIVER BOURGEOIS SOUTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21472,
    "name": "RIVER DENYS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21473,
    "name": "RIVER HEBERT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21474,
    "name": "RIVER JOHN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21475,
    "name": "RIVER PHILIP",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21476,
    "name": "RIVER TILLARD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21477,
    "name": "RIVERPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21478,
    "name": "RIVERSIDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21479,
    "name": "RIVERVIEW",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21480,
    "name": "ROACH VALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21481,
    "name": "ROBBINS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21482,
    "name": "ROBERT ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21483,
    "name": "ROBERTA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21484,
    "name": "ROBINSONS COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21485,
    "name": "ROCCO POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21486,
    "name": "ROCKDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21487,
    "name": "ROCKINGHAM",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21488,
    "name": "ROCKLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21489,
    "name": "ROCKLEY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21490,
    "name": "ROCKVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21491,
    "name": "ROCKY BAY (RICHMOND)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21492,
    "name": "ROCKY BAY (VICTORIA)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21493,
    "name": "ROCKY RUN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21494,
    "name": "ROSE BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21495,
    "name": "ROSEWAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21496,
    "name": "ROSS COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21497,
    "name": "ROSS CREEK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21498,
    "name": "ROSS FERRY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21499,
    "name": "ROSSWAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21500,
    "name": "ROUND BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21501,
    "name": "ROUND HILL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21502,
    "name": "ROUND ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21503,
    "name": "ROXVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21504,
    "name": "RUGGED HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21505,
    "name": "RYAN'S CREEK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21506,
    "name": "SABLE RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21507,
    "name": "SABLE RIVER WEST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21508,
    "name": "SALMON RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21509,
    "name": "SALMON RIVER BRIDGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21510,
    "name": "SALTER'S FALLS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21511,
    "name": "SAMBRO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21512,
    "name": "SAMBRO HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 21513,
    "name": "SAMPSON COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22695,
    "name": "SAMSONVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22696,
    "name": "SAND BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22697,
    "name": "SAND COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22698,
    "name": "SAND POINT (COLCHESTER-10)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22699,
    "name": "SAND POINT (COLCHESTER-43)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22700,
    "name": "SAND POINT (GUYSBOROUGH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22701,
    "name": "SAND POINT (PICTOU)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22702,
    "name": "SAND RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22703,
    "name": "SANDFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22704,
    "name": "SANDY COVE (DIGBY)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22705,
    "name": "SANDY COVE (QUEENS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22706,
    "name": "SANDY POINT (SHELDURNE)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22708,
    "name": "SAULNIERVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22709,
    "name": "SCATARI ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22710,
    "name": "SCHOOL BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22711,
    "name": "SCHOONER POND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22712,
    "name": "SCOTSBURN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22713,
    "name": "SCOTSVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22714,
    "name": "SCOTT BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22715,
    "name": "SCOTTS COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22716,
    "name": "SEA WALL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22717,
    "name": "SEABRIGHT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22718,
    "name": "SEABROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22719,
    "name": "SEAFORTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22720,
    "name": "SEAL COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22721,
    "name": "SEAL HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22722,
    "name": "SEAL ISLAND (SHELBURNE)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22723,
    "name": "SEAL ISLAND (VICTORIA)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22724,
    "name": "SEAL POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22725,
    "name": "SEASBROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22726,
    "name": "SECOND PENINSULA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22727,
    "name": "SEFFERNVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22728,
    "name": "SHAD BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22729,
    "name": "SHAG HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22730,
    "name": "SHEEP ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22731,
    "name": "SHEET HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22732,
    "name": "SHEET HARBOUR PASSAGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22733,
    "name": "SHELBURNE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22734,
    "name": "SHENACADIE POND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22735,
    "name": "SHERBROOKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22736,
    "name": "SHEROSE ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22737,
    "name": "SHINIMICAS RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22738,
    "name": "SHIP HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22739,
    "name": "SHOAL COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22740,
    "name": "SHORT BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22741,
    "name": "SHUBENACADIE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22742,
    "name": "SHUBENACADIE EAST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22743,
    "name": "SHULIE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22744,
    "name": "SIGHT POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22745,
    "name": "SINCLAIR ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22746,
    "name": "SKINNER'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22747,
    "name": "SKIR DHU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22748,
    "name": "SLUICE POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22749,
    "name": "SMELT BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22750,
    "name": "SMITH COVE (DIGBY)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22751,
    "name": "SMITH COVE (HALIFAX)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22752,
    "name": "SMITHVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22753,
    "name": "SMOKY CAPE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22754,
    "name": "SOBER ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22755,
    "name": "SOLDIER'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22756,
    "name": "SOMERSET",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22757,
    "name": "SONORA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22758,
    "name": "SOUTH BAR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22759,
    "name": "SOUTH BROOKFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22760,
    "name": "SOUTH CHEGGOGIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22761,
    "name": "SOUTH COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22762,
    "name": "SOUTH EAST PASSAGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22763,
    "name": "SOUTH HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22764,
    "name": "SOUTH HAVEN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22765,
    "name": "SOUTH INGONISH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22766,
    "name": "SOUTH OHIO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22767,
    "name": "SOUTH RANGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22768,
    "name": "SOUTH RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22769,
    "name": "SOUTH SIDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22770,
    "name": "SOUTH WEST COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22771,
    "name": "SOUTH WEST MARGAREE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22772,
    "name": "SOUTH WEST PORT MOUTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22773,
    "name": "SOUTHHAMPTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22774,
    "name": "SOUTHSIDE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22775,
    "name": "SOUTHWEST COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22776,
    "name": "SPANISH SHIP BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22777,
    "name": "SPECTACLE ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22778,
    "name": "SPENCER'S ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22779,
    "name": "SPENCER'S POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22780,
    "name": "SPRINGFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22781,
    "name": "SPRINGHILL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22782,
    "name": "SPRY BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22783,
    "name": "SPRY HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22784,
    "name": "SPRYFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22785,
    "name": "SQUID COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22786,
    "name": "ST BENONI",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22787,
    "name": "ST FRANCES",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22788,
    "name": "ST FRANCIS HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22789,
    "name": "ST MARY'S",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22790,
    "name": "ST. ALPHONSE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22791,
    "name": "ST. ANDREW'S CHANNEL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22792,
    "name": "ST. ANN'S",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22793,
    "name": "ST. ANN'S BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22794,
    "name": "ST. BERNARD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22795,
    "name": "ST. CATHERINE'S RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22796,
    "name": "ST. CROIX COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22797,
    "name": "ST. CROIX RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22798,
    "name": "ST. ESPRIT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22799,
    "name": "ST. GEORGE'S CHANNEL",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22800,
    "name": "ST. JOSEPH DU MOINE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22801,
    "name": "ST. MARGARET'S BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22802,
    "name": "ST. MARGARET'S VILLAGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22803,
    "name": "ST. MARTIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22805,
    "name": "ST. MARY'S BAY (GUYSBOROUGH)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22804,
    "name": "ST. MARYS BAY (DIGBY)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22806,
    "name": "ST. MARYS RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22807,
    "name": "ST. PETERS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22808,
    "name": "ST. ROSE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22809,
    "name": "STE. ANNE DE RUISSEAU",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22810,
    "name": "STEEP CREEK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22811,
    "name": "STELLARTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22812,
    "name": "STEVES COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22813,
    "name": "STEWIACKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22814,
    "name": "STILLWATER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22815,
    "name": "STILLWATER LAKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22816,
    "name": "STONEHURST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22817,
    "name": "STONEHURST EAST",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22818,
    "name": "STONEY ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22819,
    "name": "STONEY POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22820,
    "name": "STORMONT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22821,
    "name": "SUGAR LOAF",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22822,
    "name": "SUMMERSIDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22823,
    "name": "SUMMERVILLE (HANTS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22824,
    "name": "SUMMERVILLE (QUEENS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22825,
    "name": "SUNNY BRAE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22826,
    "name": "SURETTE'S ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22827,
    "name": "SUTTYS BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22828,
    "name": "SWANSBURG",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22829,
    "name": "SWIM POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22830,
    "name": "SWORDFISH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22831,
    "name": "SYDNEY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22832,
    "name": "SYDNEY FORKS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22833,
    "name": "SYDNEY HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22834,
    "name": "SYDNEY MINES",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22835,
    "name": "SYDNEY RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22836,
    "name": "SYLVESTER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22837,
    "name": "T R BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22838,
    "name": "TANGIER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22839,
    "name": "TANNERS SETTLEMENT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22840,
    "name": "TANTALLON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22841,
    "name": "TARBOT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22842,
    "name": "TATAMAGOUCHE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22843,
    "name": "TAYLOR'S BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22844,
    "name": "TAYLOR'S HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22845,
    "name": "TERENCE BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22846,
    "name": "TERRE NOIRE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22847,
    "name": "THE HAWK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22848,
    "name": "THE LODGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22849,
    "name": "THE POINTS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22850,
    "name": "THOMASVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22851,
    "name": "THORBURN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22852,
    "name": "THORNE COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22853,
    "name": "THREE BROOKS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22854,
    "name": "THREE FATHOM HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22855,
    "name": "THREE ISLAND COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22856,
    "name": "THREE ISLANDS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22857,
    "name": "TIDDVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22858,
    "name": "TIDNISH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22859,
    "name": "TIDNISH BRIDGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22860,
    "name": "TIMBERLEA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22861,
    "name": "TIVERTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22862,
    "name": "TONEY RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22863,
    "name": "TORBAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22864,
    "name": "TRACADIE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22865,
    "name": "TRENTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22866,
    "name": "TROUT COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22867,
    "name": "TROY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22868,
    "name": "TRURO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22869,
    "name": "TUNA WHARF",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22870,
    "name": "TURPENTINE ISLAND",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22871,
    "name": "TUSKET",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22872,
    "name": "TUSKET FALLS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22873,
    "name": "TUSKET ISLANDS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22874,
    "name": "TWO ISLANDS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22875,
    "name": "TWO RIVERS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22876,
    "name": "UPPER BLANDFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22877,
    "name": "UPPER BRANCH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22878,
    "name": "UPPER CLEMENTS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22879,
    "name": "UPPER CLYDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22880,
    "name": "UPPER ECONOMY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22881,
    "name": "UPPER GRANVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22882,
    "name": "UPPER KINGSBURG",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22883,
    "name": "UPPER LAHAVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22884,
    "name": "UPPER LAWRENCETOWN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22885,
    "name": "UPPER MARGAREE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22886,
    "name": "UPPER MUSQUODOBOIT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22887,
    "name": "UPPER NORTHFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22888,
    "name": "UPPER ONSLOW",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22889,
    "name": "UPPER PORT LA TOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22890,
    "name": "UPPER PROSPECT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22891,
    "name": "UPPER SHAG HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22892,
    "name": "UPPER TANTALLON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22893,
    "name": "UPPER WEDGEPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22894,
    "name": "UPPER WEST PUBNICO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22895,
    "name": "UPPER WHITEHEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22896,
    "name": "UPPER WOODS HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22897,
    "name": "URBANIA",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22898,
    "name": "VALLEY MILLS",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22899,
    "name": "VICTORIA BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22900,
    "name": "VICTORIA HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22901,
    "name": "VICTORIA MINES",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22902,
    "name": "VILLAGEDALE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22903,
    "name": "VOGLER'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22904,
    "name": "WADDEN COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22905,
    "name": "WALDEGROVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22906,
    "name": "WALLACE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22907,
    "name": "WALLACE BAY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22908,
    "name": "WALLACE BRIDGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22909,
    "name": "WALLACE RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22910,
    "name": "WALLACE STATION",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22911,
    "name": "WALTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22912,
    "name": "WARD'S BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22913,
    "name": "WASHABUCK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22914,
    "name": "WATERFORD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22915,
    "name": "WATERSIDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22916,
    "name": "WATERVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22917,
    "name": "WATT SECTION",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22918,
    "name": "WAVERLEY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22919,
    "name": "WEAVER SETTLEMENT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22920,
    "name": "WEDGE POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22921,
    "name": "WEDGEPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22922,
    "name": "WELLINGTON",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22923,
    "name": "WENTZELLS LAKE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22924,
    "name": "WEST ADVOCATE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22925,
    "name": "WEST APPLE RIVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22926,
    "name": "WEST ARICHAT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22927,
    "name": "WEST ARM TRACADIE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22928,
    "name": "WEST BACCARO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22929,
    "name": "WEST BAY (INVERNESS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22930,
    "name": "WEST BAY (RICHMOND)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22931,
    "name": "WEST BERLIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22932,
    "name": "WEST CHEZZETCOOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22933,
    "name": "WEST COOKS COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22934,
    "name": "WEST DOVER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22935,
    "name": "WEST DUBLIN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22936,
    "name": "WEST GREEN HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22937,
    "name": "WEST HAVRE BOUCHER",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22938,
    "name": "WEST HEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22939,
    "name": "WEST JEDDORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22940,
    "name": "WEST LAHAVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22941,
    "name": "WEST LAWRENCETOWN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22942,
    "name": "WEST MABOU HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22943,
    "name": "WEST MIDDLE SABLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22944,
    "name": "WEST NORTHFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22945,
    "name": "WEST PENNANT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22946,
    "name": "WEST PETPESWICK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22947,
    "name": "WEST PLEASANT VALLEY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22948,
    "name": "WEST PORT CLYDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22949,
    "name": "WEST PORT HEBERT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22950,
    "name": "WEST PROSPECT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22951,
    "name": "WEST PUBNICO",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22952,
    "name": "WEST PUGWASH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22953,
    "name": "WEST QUODDY",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22954,
    "name": "WEST SANDY COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22955,
    "name": "WEST SHIP HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22956,
    "name": "WEST TRACADIE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22957,
    "name": "WESTERN HEAD (QUEENS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22958,
    "name": "WESTERN HEAD (SHELBURNE)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22959,
    "name": "WESTERN SHORE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22960,
    "name": "WESTFIELD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22961,
    "name": "WESTMOUNT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22962,
    "name": "WESTPORT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22963,
    "name": "WESTVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22964,
    "name": "WEYMOUTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22965,
    "name": "WEYMOUTH NORTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22966,
    "name": "WHALE COVE (DIGBY)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22967,
    "name": "WHALE COVE (INVERNESS)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22968,
    "name": "WHITE POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22969,
    "name": "WHITE POINT BEACH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22971,
    "name": "WHITE'S COVE (DIGBY-36)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22972,
    "name": "WHITE'S COVE (DIGBY-37)",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22970,
    "name": "WHITEHEAD",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22973,
    "name": "WHITESIDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22974,
    "name": "WHYCOCOMAGH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22975,
    "name": "WILEVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22976,
    "name": "WILLIAMS POINT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22977,
    "name": "WILMOT",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22978,
    "name": "WILSON'S COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22979,
    "name": "WINDSOR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22980,
    "name": "WINE HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22981,
    "name": "WITHROW BROOK",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22982,
    "name": "WOLFVILLE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22983,
    "name": "WOLFVILLE RIDGE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22984,
    "name": "WOODBURN",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22985,
    "name": "WOODS HARBOUR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22986,
    "name": "WOODSIDE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22987,
    "name": "WRECK COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22988,
    "name": "YARMOUTH",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22989,
    "name": "YARMOUTH BAR",
    "province": "Nova Scotia"
  },
  {
    "codeId": 22990,
    "name": "YOUNG COVE",
    "province": "Nova Scotia"
  },
  {
    "codeId": 23075,
    "name": "ABNEY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23076,
    "name": "ABRAMS VILLAGE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23077,
    "name": "ALBANY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23078,
    "name": "ALBERTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23079,
    "name": "ALBION",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23080,
    "name": "ALBION CROSS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23081,
    "name": "ALEXANDRA",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23082,
    "name": "ALLISTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23083,
    "name": "ALMA",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23084,
    "name": "ANGLO",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23085,
    "name": "ANGLO RUSTICO",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23086,
    "name": "ANNANDALE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23087,
    "name": "ARMADALE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23088,
    "name": "ARYGLE SHORE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23089,
    "name": "ASCENSION",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23090,
    "name": "ASHTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23091,
    "name": "BACK SHORE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23092,
    "name": "BALTIC",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23093,
    "name": "BAPTIST POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23094,
    "name": "BASIN HEAD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23095,
    "name": "BAY VIEW",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23096,
    "name": "BAYFIELD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23097,
    "name": "BEACH POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23098,
    "name": "BEAR RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23099,
    "name": "BEDEQUE BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23100,
    "name": "BEDFORD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23101,
    "name": "BELFAST",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23102,
    "name": "BELLE RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23103,
    "name": "BELMONT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23104,
    "name": "BENTICK COVE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23105,
    "name": "BIDEFORD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23106,
    "name": "BIG POND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23107,
    "name": "BIRCH HILL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23108,
    "name": "BLACK BANK",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23109,
    "name": "BLACK POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23110,
    "name": "BLACK POND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23111,
    "name": "BLOOMFIELD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23112,
    "name": "BORDEN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23113,
    "name": "BOTHWELL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23114,
    "name": "BOTTLE POINT -",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23115,
    "name": "BOUGHTON BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23116,
    "name": "BOUGHTON RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23117,
    "name": "BOYLES POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23118,
    "name": "BRACKLEY BEACH",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23119,
    "name": "BRAE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23120,
    "name": "BRAE HARBOUR",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23121,
    "name": "BRAE SHORE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23122,
    "name": "BREADALBANE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23123,
    "name": "BRIDGETOWN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23124,
    "name": "BRISTOL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23125,
    "name": "BROCKTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23126,
    "name": "BROOKS SHORE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23127,
    "name": "BROOKS WHARF",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23128,
    "name": "BRUDENELL RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23129,
    "name": "BUNBURY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23130,
    "name": "BURTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23131,
    "name": "CABLE HEAD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23132,
    "name": "CABLE HEAD EAST",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23133,
    "name": "CABLE HEAD WEST",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23134,
    "name": "CAMBRIDGE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23135,
    "name": "CAMPBELLS COVE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23136,
    "name": "CAMPBELLTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23137,
    "name": "CANAVOY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23138,
    "name": "CANOE COVE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23139,
    "name": "CAPE BEAR",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23140,
    "name": "CAPE EGMONT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23141,
    "name": "CAPE TRAVERSE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23142,
    "name": "CAPE WOLFE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23143,
    "name": "CARDIGAN BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23144,
    "name": "CARTIER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23145,
    "name": "CASCUMPEC",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23146,
    "name": "CASCUMPEC BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23147,
    "name": "CASCUMPEC HARBOUR",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23148,
    "name": "CASCUMPEC POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23149,
    "name": "CAVENDISH",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23150,
    "name": "CENTRAL BEDEQUE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23151,
    "name": "CHARLOTTETOWN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23152,
    "name": "CHELTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23153,
    "name": "CHEPSTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23154,
    "name": "CHERRY HILL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23155,
    "name": "CHERRY VALLEY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23156,
    "name": "CHURCH ROAD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23157,
    "name": "CLEARSPRING",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23158,
    "name": "CLERMONT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23159,
    "name": "COLEMAN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23160,
    "name": "CONWAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23161,
    "name": "CONWAY NARROWS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23162,
    "name": "CORNWALL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23163,
    "name": "COVEHEAD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23164,
    "name": "CRAPAUD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23165,
    "name": "CUMBERLAND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23166,
    "name": "CURRAN BAND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23167,
    "name": "DALVEY BEACH",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23168,
    "name": "DARNLEY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 23169,
    "name": "DE BLOIS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22347,
    "name": "DE GRAS MARCH",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22348,
    "name": "DILIGENT POND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22349,
    "name": "DINGWELL'S MILLS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22350,
    "name": "DUNBLANE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22351,
    "name": "DUNDAS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22352,
    "name": "DUNDEE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22353,
    "name": "DUNK RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22354,
    "name": "DUVAR",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22355,
    "name": "EAST BALTIC",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22356,
    "name": "EAST BIDEFORD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22357,
    "name": "EAST LAKE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22358,
    "name": "EAST POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22359,
    "name": "EAST RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22360,
    "name": "EBBSFLEET",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22361,
    "name": "EGLINGTON BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22362,
    "name": "EGMONT BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22363,
    "name": "ELDON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22364,
    "name": "ELLERSLIE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22365,
    "name": "ELLIS RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22366,
    "name": "ELMIRA",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22367,
    "name": "ELMSDALE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22368,
    "name": "ENMORE RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22369,
    "name": "FAIRVIEW",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22370,
    "name": "FISHING COVE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22371,
    "name": "FLAT RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22372,
    "name": "FOREST VIEW",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22373,
    "name": "FORT AUGUSTUS (QUEENS-86)",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22374,
    "name": "FORT AUGUSTUS (QUEENS-96)",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22375,
    "name": "FORTUNE (KINGS)",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22376,
    "name": "FORTUNE COVE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22377,
    "name": "FORTUNE RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22378,
    "name": "FOXLEY RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22379,
    "name": "FREELAND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22380,
    "name": "FREETOWN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22381,
    "name": "FRENCH RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22382,
    "name": "FRENCH RIVER NORTH",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22383,
    "name": "FRENCH RIVER SOUTH",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22384,
    "name": "GASPEREAUX",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22385,
    "name": "GEORGETOWN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22386,
    "name": "GLENFINNAN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22387,
    "name": "GLENGARRY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22388,
    "name": "GLENWOOD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22389,
    "name": "GOFFS BRIDGE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22390,
    "name": "GOOSE RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22391,
    "name": "GOWAN BRAE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22392,
    "name": "GRAHAM'S POND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22393,
    "name": "GRAND RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22394,
    "name": "GRAND TRACADIE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22395,
    "name": "GREEK RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22396,
    "name": "GREENMOUNT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22397,
    "name": "GREENWICH",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22398,
    "name": "GUERNSEY COVE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22399,
    "name": "HAMILTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22400,
    "name": "HAMPTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22401,
    "name": "HARDY'S CHANNEL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22402,
    "name": "HARPER ROAD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22403,
    "name": "HARRINGTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22404,
    "name": "HEBRON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22405,
    "name": "HERMANVILLE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22406,
    "name": "HIGGINS SHORE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22407,
    "name": "HIGGINS WHARF",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22408,
    "name": "HIGH BANK",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22409,
    "name": "HILLSBOROUGH BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22410,
    "name": "HOWARD'S COVE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22411,
    "name": "HOWE BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22412,
    "name": "HOWLAN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22413,
    "name": "HUNTER RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22414,
    "name": "INDIAN RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22415,
    "name": "INVERNESS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22416,
    "name": "IONA",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22417,
    "name": "JOHNSONS RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22418,
    "name": "JUDE'S POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22419,
    "name": "KENSINGTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22420,
    "name": "KILDARE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22421,
    "name": "KILMUIR",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22422,
    "name": "KINGSBORO",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22423,
    "name": "LAKEVILLE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22424,
    "name": "LAUNCHING",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22425,
    "name": "LENNOX ISLAND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22426,
    "name": "LEOVILLE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22427,
    "name": "LITTLE HARBOUR",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22428,
    "name": "LITTLE POND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22429,
    "name": "LITTLE SANDS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22430,
    "name": "LITTLE YORK",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22431,
    "name": "LLOYD'S CREEK",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22432,
    "name": "LONG CREEK",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22433,
    "name": "LOT 16",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22434,
    "name": "LOT 7",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22435,
    "name": "LOWER FREETOWN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22436,
    "name": "LOWER MONTAGUE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22437,
    "name": "LOWER ROLLO BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22438,
    "name": "MACAULAYS WHARF",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22439,
    "name": "MACHON POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22440,
    "name": "MALPEQUE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22441,
    "name": "MALPEQUE BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22442,
    "name": "MARGATE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22443,
    "name": "MARSHFIELD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22444,
    "name": "MAXIMVILLE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22445,
    "name": "MCNEILL'S MILLS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22446,
    "name": "MEADOWBROOK",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22447,
    "name": "MERMAID",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22448,
    "name": "MIDGELL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22449,
    "name": "MILBURN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22450,
    "name": "MILL COVE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22451,
    "name": "MILL RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22452,
    "name": "MILL TOWN CROSS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22454,
    "name": "MILL'S POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22453,
    "name": "MILLIGAN'S WHARF",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22455,
    "name": "MILO",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22456,
    "name": "MIMINEGASH",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22457,
    "name": "MIMINEGASH HARBOUR",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22458,
    "name": "MIMINEGASH RUN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22459,
    "name": "MINK RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22460,
    "name": "MISCOUCHE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22461,
    "name": "MONT CARMEL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22462,
    "name": "MONTAGUE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22463,
    "name": "MONTICELLO",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22464,
    "name": "MORELL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22465,
    "name": "MORELL REAR GREEN MEADOWS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22466,
    "name": "MOUNT BUCHANAN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22468,
    "name": "MOUNT PLEASANT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22469,
    "name": "MOUNT STEWART",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22470,
    "name": "MURPHY'S SHORE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22471,
    "name": "MURRAY HARBOUR",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22472,
    "name": "MURRAY HARBOUR NORTH",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22473,
    "name": "MURRAY RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22474,
    "name": "NAIL POND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22475,
    "name": "NAUFRAGE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22476,
    "name": "NEW ANNAN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22477,
    "name": "NEW DOMINION",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22478,
    "name": "NEW LONDON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22479,
    "name": "NEW LONDON BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22480,
    "name": "NEWPORT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22481,
    "name": "NINE MILE CREEK",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22482,
    "name": "NORTH BEDEQUE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22483,
    "name": "NORTH ENMORE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22484,
    "name": "NORTH LAKE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22485,
    "name": "NORTH POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22486,
    "name": "NORTH RIVER (QUEENS-85)",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22487,
    "name": "NORTH RIVER (QUEENS-88)",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22488,
    "name": "NORTH RUSTICO",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22489,
    "name": "NORTHAM",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22490,
    "name": "NORTHPORT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22491,
    "name": "NORWAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22493,
    "name": "O'LEARY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22492,
    "name": "OAK VALLEY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22494,
    "name": "ORWELL BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22495,
    "name": "OYSTER BED BRIDGE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22496,
    "name": "PALMER ROAD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22497,
    "name": "PANMURE ISLAND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22498,
    "name": "PARK CORNER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22499,
    "name": "PARKDALE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22500,
    "name": "PERCIVAL RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22501,
    "name": "PETERS ROAD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22502,
    "name": "PETERVILLE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22503,
    "name": "PHEE SHORE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22504,
    "name": "PINETTE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22505,
    "name": "PIUSVILLE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22506,
    "name": "PLEASANT GROVE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22507,
    "name": "PLEASANT VIEW",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22508,
    "name": "POINT PLEASANT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22509,
    "name": "POINT PRIM",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22510,
    "name": "POPLAR GROVE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22511,
    "name": "PORT HILL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22513,
    "name": "PORTAGE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22514,
    "name": "POWNAL BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22515,
    "name": "PRIEST POND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22516,
    "name": "RED HEAD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22517,
    "name": "RED POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22518,
    "name": "RICE POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22519,
    "name": "RICHMOND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22520,
    "name": "ROCKBARRA",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22521,
    "name": "ROCKY POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22522,
    "name": "ROLLO BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22523,
    "name": "ROSEVILLE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22524,
    "name": "ROWNAL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22525,
    "name": "ROXBURY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22527,
    "name": "RUSTICO BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22528,
    "name": "RUSTICOVILLE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22529,
    "name": "SAVAGE HARBOUR",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22530,
    "name": "SEACOW POND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22531,
    "name": "SEAVIEW (PRINCE)",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22532,
    "name": "SEAVIEW (QUEENS)",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22533,
    "name": "SHERWOOD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22534,
    "name": "SKINNER'S POND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22535,
    "name": "SOURIS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22536,
    "name": "SOURIS EAST",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22537,
    "name": "SOURIS LINE ROAD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22538,
    "name": "SOURIS RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22539,
    "name": "SOURIS WEST",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22540,
    "name": "SOUTH LAKE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22541,
    "name": "SOUTH PINETTE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22542,
    "name": "SOUTH RUSTICO",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22543,
    "name": "SOUTHPORT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22544,
    "name": "SPRING BROOK",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22545,
    "name": "SPRING VALLEY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22546,
    "name": "SPRINGFIELD WEST",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22547,
    "name": "ST. ANDREWS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22548,
    "name": "ST. CATHERINES",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22549,
    "name": "ST. CHARLES",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22550,
    "name": "ST. CHRYSOSTOME",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22551,
    "name": "ST. EDWARDS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22552,
    "name": "ST. ELEANORS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22553,
    "name": "ST. FELIX",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22554,
    "name": "ST. GEORGES",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22555,
    "name": "ST. LOUIS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22556,
    "name": "ST. MARGARETS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22557,
    "name": "ST. MARY'S BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22558,
    "name": "ST. MARY'S ROAD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22559,
    "name": "ST. NICHOLAS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22560,
    "name": "ST. PETERS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22561,
    "name": "ST. PETERS BAY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22562,
    "name": "ST. PETERS HARBOUR",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22563,
    "name": "ST. PETERS LAKE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22564,
    "name": "ST. RAPHAEL",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22565,
    "name": "STANHOPE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22566,
    "name": "STANLEY BRIDGE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22567,
    "name": "STAVERTS SHORE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22568,
    "name": "STURGEON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22569,
    "name": "STURGEON BRIDGE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22570,
    "name": "SUMMERSIDE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22571,
    "name": "TEN MILE HOUSE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22572,
    "name": "THE NARROWS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22573,
    "name": "TIGNISH",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22574,
    "name": "TIGNISH HARBOUR NORTH",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22575,
    "name": "TIGNISH RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22576,
    "name": "TIGNISH RUN",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22577,
    "name": "TIGNISH SHORE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22578,
    "name": "TRACADIE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22579,
    "name": "TRAVELLER'S REST",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22580,
    "name": "TROUT RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22581,
    "name": "TRYON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22582,
    "name": "TYNE VALLEY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22583,
    "name": "VERNON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22584,
    "name": "VERNON BRIDGE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22585,
    "name": "VERNON RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22586,
    "name": "VICTORIA",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22587,
    "name": "VICTORIA WEST",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22588,
    "name": "WATERFORD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22589,
    "name": "WELLINGTON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22592,
    "name": "WEST DEVON",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22593,
    "name": "WEST POINT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22594,
    "name": "WEST RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22595,
    "name": "WEST ST. PETERS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22596,
    "name": "WHIM ROAD",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22597,
    "name": "WHITE SANDS",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22598,
    "name": "WHITES COVE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22599,
    "name": "WILMOT",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22600,
    "name": "WILMOT RIVER",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22601,
    "name": "WILMOT VALLEY",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22602,
    "name": "WINSLOE",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22603,
    "name": "WOOD ISLAND",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22604,
    "name": "WOODSTOCK",
    "province": "Prince Edward Island"
  },
  {
    "codeId": 22605,
    "name": "YORK",
    "province": "Prince Edward Island"
  }
];

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
  89: {
    visible:  ['sailTime', 'haulStartTime', 'haulEndTime', 'landingTime', 'soakDuration', 'lgridCodeId', 'mammalIncident', 'sarIncident', 'lostGear', 'catchWeight', 'trapHauls', 'fmaId', 'departurePort'],
    required: ['fmaId', 'catchWeight', 'trapHauls'],
  },
  // ── MAR (subform 90) ────────────────────────────────────
  90: {
    visible:  ['sailTime', 'haulStartTime', 'haulEndTime', 'landingTime', 'lgridCodeId', 'baitEntries', 'crewNb', 'mammalIncident', 'sarIncident', 'lostGear', 'catchWeight', 'trapHauls', 'fmaId', 'departurePort', 'nbSpcmnBrd', 'hlin', 'hlout'],
    required: ['fmaId', 'catchWeight', 'trapHauls', 'crewNb', 'baitEntries', 'hlinCompany', 'hlinConfirmNo', 'hloutCompany', 'hloutConfirmNo'],
  },
  // ── NL (subform 91) ─────────────────────────────────────
  91: {
    visible:  ['sailTime', 'haulStartTime', 'haulEndTime', 'landingTime', 'soakDuration', 'lgridCodeId', 'mammalIncident', 'sarIncident', 'lostGear', 'catchWeight', 'trapHauls', 'fmaId', 'departurePort', 'portId'],
    required: ['fmaId', 'catchWeight', 'trapHauls', 'portId'],
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