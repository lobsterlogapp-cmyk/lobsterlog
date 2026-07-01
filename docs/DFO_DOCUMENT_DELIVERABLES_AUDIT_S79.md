# DFO ELOG — Document / Written-Deliverable Audit (S79)

Read-only recon. Goal: a checklist of every DOCUMENT / written deliverable the DFO ELOG
qualification requires from the PROVIDER (copyright holder), and HAVE vs MISSING status.

## Sources read
- ELOG_standard/ELOG_Client_Application_Standard_v6.1.pdf (45 pp; §16–§25 + Appendix C are the deliverable-bearing sections)
- ELOGS_F234/FS-NAT-234-11-EN.pdf, ELOG_F222/FS-NAT-222-1-EN.pdf, ELOG_F233/FS-NAT-233-2-EN.pdf (fact sheets)
- ELOGS_F234/DFO instructions_NAT_234.6_ENG.pdf (+222/233 DFO-instruction PDFs, present in the technical packages)

## IMPORTANT CAVEAT — there is NO single definitive document checklist in the Standard
The Standard does not contain one consolidated "required documents" list. Provider deliverables
are scattered across §16–§25. §16 explicitly defers the authoritative process to a SEPARATE
document — the "Client Application Qualification Program" — which is NOT in ~/Desktop/DFO (it
lives on the DFO Extranet "Documents for developers (Toolbox)"). That program doc is where the
canonical, complete deliverables checklist would be. The list below is reconstructed from the
Standard's prose and is therefore best-effort, not a verbatim DFO checklist.
The fact sheets (234/222/233) name NO additional document deliverables — only field/operational
rules — so they add nothing to this list.

## Categories
- a = provider must WRITE/produce it
- b = DFO writes it, but it must be BUNDLED / displayed / accessible in the app
- c = referenced, conditional, non-document obligation, or DFO-issued

## Deliverables
Provider's Instructions (supplier instructions, separate from user guide, EN+FR, offline-accessible) | required by §17 | category a | status HAVE | user confirms EN+FR v1.1; §17 requires it be a document distinct from the user guide and reachable without Internet
User's Guide (features + steps to create/transmit a logbook, EN+FR) | required by §22 | category a | status HAVE | user confirms EN+FR v1.0; §22 applies to all users except service providers
Prerequisites statement (min hardware + application environment for install/usage) | required by §25 | category a | status MISSING | §25 says prerequisites "shall be clearly defined"; no such document in the known-have set
Letter of Interest (for development of an ELOG client application) | required by §23 (also identification §13.1) | category a | status HAVE | user states a Letter of Intent was already submitted; §23 ties court/affidavit obligations to having submitted it
Authenticity & integrity evidence (affidavit-ready description of how the app preserves what the user declared) | required by §23 | category a | status UNCONFIRMED | on-demand court obligation, not a standing pre-submission doc; cannot confirm it is prepared
Data chain-of-custody / data-management explanation (court-ready, incl. data converter if any) | required by §20.2 | category a | status UNCONFIRMED | overlaps §23; "shall be able to explain how it works"; capability, not confirmed as a written artifact
DFO Instructions — accessible offline inside the app | required by §18 | category b | status UNCONFIRMED | PDF exists in the technical packages (DFO instructions_NAT_234.6_ENG/FRE.pdf etc.); §18 requires it be accessible to the user even with no Internet — in-app bundling not confirmed
Privacy Notice statement — displayed at launch | required by §24 + Appendix C | category b | status HAVE | exists as an app screen. NOTE: the Standard does NOT want a separate provider-authored doc — the canonical TEXT is DFO's Appendix C (Standard p.44); the provider must DISPLAY it. Verify in-app wording matches Appendix C
Harvester Attestation — displayed at launch | required by §24 + Appendix C | category b | status HAVE | exists as an app screen; same as above — text comes from Appendix C, not provider-authored. Verify wording matches Appendix C
Fact sheets compliance (one per form version) | required by §19 | category b | status HAVE | DFO-written reference; app must meet all rules. FS-NAT-234-11, FS-NAT-222-1, FS-NAT-233-2 all present locally
Client Application Qualification Program | referenced by §16 | category c | status UNCONFIRMED | DFO-authored; describes the qualification process and (expected) the authoritative document checklist. NOT in ~/Desktop/DFO — obtain from the DFO Extranet Toolbox
App copy or access for DFO verification (free of charge on request) | required by §16 | category c | status HAVE | non-document; app exists and UAT transmission is live, so a copy/access can be furnished
Test environment available to DFO (if app is partially/totally centralized on an external server) | required by §16 | category c | status UNCONFIRMED | conditional; LobsterLog is an on-device app with local storage, so this likely does NOT apply — confirm there is no server-side component that would trigger it
Technical support in both official languages (install + use) | required by §21 | category c | status UNCONFIRMED | capability obligation, not a written deliverable; the Standard does not require a documented support plan
Confirmation of qualification + authorization to deploy | required by §16 | category c | status MISSING | DFO-ISSUED (not provider-produced) but required before deployment; still pending per project status

## Tally
HAVE = 7
MISSING = 2
UNCONFIRMED = 6
TOTAL = 15

## Note on what is NOT a required document
- §20 Security imposes implementation requirements (in-app password/access control, hidden ELOG
  key, HTTPS) but does NOT require a separate written "security statement" — only the §20.2/§23
  ability to explain data management for court (captured above).
- §13.4 Archives / §13.3 Transmission register are app behaviors, not documents.
