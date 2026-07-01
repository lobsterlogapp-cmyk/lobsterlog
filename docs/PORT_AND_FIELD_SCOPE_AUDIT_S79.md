# PORT_AND_FIELD_SCOPE_AUDIT_S79

Read-only audit. Source of truth: Subforms_requirements_234.xlsx (the sheet wins).
Compared against DFO_SUBFORM_FIELD_CONFIG (src/utils/dfoConstants.ts), visible/required arrays.

Methodology / rubric:
- spec Mandatory + not visible = MISSING; + visible,required=no = UNDER-REQUIRING; + visible,required=yes = MATCH
- spec Blocked/blank + visible = OVER-COLLECTING; + not visible = MATCH
- spec Optional = MATCH whether or not visible/required (collecting or stricter-requiring an optional element is permitted)
- Verdicts are on the FIELD CONFIG only. Downstream generator/validator/FMA gating (e.g. LGRID_ID emit-90-only; SAR_IND/MM_INTER_IND/LOST_GEAR_IND enforced at send by validateElogXml + handleSave) is NOT considered here and may mitigate a config-level flag.

## QC / subform 88
sailTime (TRIP.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
haulStartTime (EFFORT.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
haulEndTime (EFFORT.END_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
landingTime (LANDING.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
soakDuration (EFFORT_DETAIL.SOAKED_DUR) | spec=Mandatory | visible=y | required=y | verdict=MATCH
lgridCodeId (EFFORT_DETAIL.LGRID_ID) | spec=Blocked | visible=y | required=n | verdict=OVER-COLLECTING
crewNb (TRIP.CREW_NB) | spec=Mandatory | visible=y | required=y | verdict=MATCH
mammalIncident (EFFORT.MM_INTER_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
sarIncident (EFFORT.SAR_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
lostGear (EFFORT.LOST_GEAR_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
catchWeight (CATCH.KEPT_WT) | spec=Optional | visible=y | required=y | verdict=MATCH
trapHauls (EFFORT_DETAIL.NB_GEAR_HLD) | spec=Mandatory | visible=y | required=y | verdict=MATCH
fmaId (EFFORT.FMA_ID) | spec=Mandatory | visible=y | required=y | verdict=MATCH
departurePort (TRIP.PORT_ID) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
portId (LANDING.PORT_ID) | spec=Mandatory | visible=y | required=y | verdict=MATCH
nbSpcmnBrd (CATCH.NB_SPCMN_BRD) | spec=Blocked | visible=n | required=n | verdict=MATCH
trapSize (EFFORT_DETAIL.TRP_SZ_ID) | spec=Blocked | visible=n | required=n | verdict=MATCH
gearSubtypeId (EFFORT_BY_GEAR.GEAR_SBTYP_ID) | spec=Blocked | visible=n | required=n | verdict=MATCH

## GLF / subform 89
sailTime (TRIP.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
haulStartTime (EFFORT.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
haulEndTime (EFFORT.END_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
landingTime (LANDING.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
soakDuration (EFFORT_DETAIL.SOAKED_DUR) | spec=Mandatory | visible=y | required=y | verdict=MATCH
lgridCodeId (EFFORT_DETAIL.LGRID_ID) | spec=Blocked | visible=y | required=n | verdict=OVER-COLLECTING
crewNb (TRIP.CREW_NB) | spec=Blocked | visible=n | required=n | verdict=MATCH
mammalIncident (EFFORT.MM_INTER_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
sarIncident (EFFORT.SAR_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
lostGear (EFFORT.LOST_GEAR_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
catchWeight (CATCH.KEPT_WT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
trapHauls (EFFORT_DETAIL.NB_GEAR_HLD) | spec=Mandatory | visible=y | required=y | verdict=MATCH
fmaId (EFFORT.FMA_ID) | spec=Mandatory | visible=y | required=y | verdict=MATCH
departurePort (TRIP.PORT_ID) | spec=Blocked | visible=y | required=n | verdict=OVER-COLLECTING
portId (LANDING.PORT_ID) | spec=Mandatory | visible=y | required=y | verdict=MATCH
nbSpcmnBrd (CATCH.NB_SPCMN_BRD) | spec=Blocked | visible=n | required=n | verdict=MATCH
trapSize (EFFORT_DETAIL.TRP_SZ_ID) | spec=Blocked | visible=n | required=n | verdict=MATCH
gearSubtypeId (EFFORT_BY_GEAR.GEAR_SBTYP_ID) | spec=Blocked | visible=n | required=n | verdict=MATCH

## MAR / subform 90
sailTime (TRIP.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
haulStartTime (EFFORT.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
haulEndTime (EFFORT.END_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
landingTime (LANDING.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
soakDuration (EFFORT_DETAIL.SOAKED_DUR) | spec=Blocked | visible=n | required=n | verdict=MATCH
lgridCodeId (EFFORT_DETAIL.LGRID_ID) | spec=Optional | visible=y | required=n | verdict=MATCH
crewNb (TRIP.CREW_NB) | spec=Mandatory | visible=y | required=y | verdict=MATCH
mammalIncident (EFFORT.MM_INTER_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
sarIncident (EFFORT.SAR_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
lostGear (EFFORT.LOST_GEAR_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
catchWeight (CATCH.KEPT_WT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
trapHauls (EFFORT_DETAIL.NB_GEAR_HLD) | spec=Mandatory | visible=y | required=y | verdict=MATCH
fmaId (EFFORT.FMA_ID) | spec=Mandatory | visible=y | required=y | verdict=MATCH
departurePort (TRIP.PORT_ID) | spec=Blocked | visible=y | required=n | verdict=OVER-COLLECTING
portId (LANDING.PORT_ID) | spec=Mandatory | visible=y | required=y | verdict=MATCH
nbSpcmnBrd (CATCH.NB_SPCMN_BRD) | spec=Optional | visible=y | required=n | verdict=MATCH
trapSize (EFFORT_DETAIL.TRP_SZ_ID) | spec=Blocked | visible=n | required=n | verdict=MATCH
gearSubtypeId (EFFORT_BY_GEAR.GEAR_SBTYP_ID) | spec=Blocked | visible=n | required=n | verdict=MATCH

## NL / subform 91
sailTime (TRIP.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
haulStartTime (EFFORT.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
haulEndTime (EFFORT.END_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
landingTime (LANDING.START_DT) | spec=Mandatory | visible=y | required=y | verdict=MATCH
soakDuration (EFFORT_DETAIL.SOAKED_DUR) | spec=Mandatory | visible=y | required=y | verdict=MATCH
lgridCodeId (EFFORT_DETAIL.LGRID_ID) | spec=Blocked | visible=y | required=n | verdict=OVER-COLLECTING
crewNb (TRIP.CREW_NB) | spec=Blocked | visible=n | required=n | verdict=MATCH
mammalIncident (EFFORT.MM_INTER_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
sarIncident (EFFORT.SAR_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
lostGear (EFFORT.LOST_GEAR_IND) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
catchWeight (CATCH.KEPT_WT) | spec=Optional | visible=y | required=y | verdict=MATCH
trapHauls (EFFORT_DETAIL.NB_GEAR_HLD) | spec=Mandatory | visible=y | required=y | verdict=MATCH
fmaId (EFFORT.FMA_ID) | spec=Mandatory | visible=y | required=y | verdict=MATCH
departurePort (TRIP.PORT_ID) | spec=Mandatory | visible=y | required=n | verdict=UNDER-REQUIRING
portId (LANDING.PORT_ID) | spec=Mandatory | visible=y | required=y | verdict=MATCH
nbSpcmnBrd (CATCH.NB_SPCMN_BRD) | spec=Blocked | visible=n | required=n | verdict=MATCH
trapSize (EFFORT_DETAIL.TRP_SZ_ID) | spec=Mandatory | visible=y | required=y | verdict=MATCH
gearSubtypeId (EFFORT_BY_GEAR.GEAR_SBTYP_ID) | spec=Mandatory | visible=y | required=y | verdict=MATCH

## UNMATCHED (mapping ambiguous / not 1:1 - resolve manually)
baitEntries | section gate -> BAIT_USED.BT_TYP_ID + BT_WT (both Mandatory all regions); one key spans multiple elements, not 1:1
hlin | HLIN section-visibility key; whole section (also FMA-gated in form) - not a single element
hlout | HLOUT section-visibility key; whole section (also FMA-gated in form) - not a single element
hlinCompany | -> HLIN.HLIN_CIE_ID, but required-only key; visibility comes from parent 'hlin', so visible y/n can't be read 1:1
hlinConfirmNo | -> HLIN.HLIN_NUM, required-only key; visibility from parent 'hlin' (see above)
hloutCompany | -> HLOUT.HLOUT_CIE_ID, required-only key; visibility from parent 'hlout' (see above)
hloutConfirmNo | -> HLOUT.HLOUT_NUM, required-only key; visibility from parent 'hlout' (see above)

## TALLY
MATCH = 53
OVER-COLLECTING = 5
UNDER-REQUIRING = 14
MISSING = 0
UNMATCHED = 7
mapped fields = 18 x 4 regions = 72 cells
