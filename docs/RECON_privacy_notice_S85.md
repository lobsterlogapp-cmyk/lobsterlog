# RECON — DFO Privacy Notice (Session 85)

Recon only. No source files changed. Goal: capture the current Privacy Notice
text (EN + FR), flag every line that asserts where data is stored or whether it
is sent, and describe the layout so a 3-section rewrite can drop in without a
structural rebuild.

- Repo: /Users/jonny/Desktop/LobsterLog (branch main)
- Date: 2026-06-29
- Component file: src/screens/PrivacyNoticeModal.tsx
- i18n namespace: dfo  (useTranslation('dfo') → t('privacy.*'))
- EN strings: src/i18n/locales/en/dfo.json  → "privacy" object
- FR strings: src/i18n/locales/fr/dfo.json  → "privacy" object

The screen is the first-launch Decline/Accept Privacy Notice. It renders exactly
12 strings (header title + subtitle, four section title/body pairs, two buttons).
Resolved verbatim from the locale JSON below.

---

## 1. Current user-facing text — EN, in display order

Each item: the i18n key, then the real rendered English string, verbatim.

1. privacy.title
   Privacy Notice

2. privacy.subtitle
   LobsterLog Electronic Logbook

3. privacy.section1Title
   What We Collect

4. privacy.section1Body
   LobsterLog collects fishing activity data that you enter — including trip
   dates, catch weights, gear counts, crew information, and port details — for the
   purpose of generating Department of Fisheries and Oceans (DFO) electronic
   logbook reports as required under the Fisheries Act.

5. privacy.section2Title
   How Your Data Is Stored

6. privacy.section2Body
   Your logbook data is stored locally on this device. When you choose to submit
   an electronic report, that data is transmitted directly to DFO using their
   secure web service. Transmission occurs only when you explicitly tap "Send to
   DFO" — no data is sent automatically.

7. privacy.section3Title
   Third Parties

8. privacy.section3Body
   Your fishing data is never sold, shared, or disclosed to any third party other
   than DFO as required for regulatory logbook compliance. No fishing data is used
   for advertising, analytics, or any commercial purpose.

9. privacy.section4Title
   Your Rights

10. privacy.section4Body
    All data is stored on your device and can be deleted at any time by removing
    the app. You may contact lobsterlog.app@gmail.com with any privacy questions
    or concerns.

11. privacy.declineButton
    Decline

12. privacy.acceptButton
    Accept

---

## 2. Current FR strings — same keys, same display order

1. privacy.title
   Avis de confidentialité

2. privacy.subtitle
   Journal électronique LobsterLog

3. privacy.section1Title
   Ce que nous collectons

4. privacy.section1Body
   LobsterLog collecte les données d'activité de pêche que tu entres — notamment
   les dates de sortie, les poids de captures, le nombre d'engins, les
   informations sur l'équipage et les détails des ports — dans le but de générer
   des rapports de journal électronique pour le ministère des Pêches et des Océans
   (MPO) conformément à la Loi sur les pêches.

5. privacy.section2Title
   Comment vos données sont stockées

6. privacy.section2Body
   Les données de ton journal sont stockées localement sur cet appareil. Lorsque
   tu choisis de soumettre un rapport électronique, ces données sont transmises
   directement au MPO via leur service web sécurisé. La transmission n'a lieu que
   lorsque tu appuies explicitement sur «Envoyer au MPO» — aucune donnée n'est
   envoyée automatiquement.

7. privacy.section3Title
   Tiers

8. privacy.section3Body
   Tes données de pêche ne sont jamais vendues, partagées ou divulguées à un tiers
   autre que le MPO, tel que requis pour la conformité réglementaire du journal de
   bord. Aucune donnée de pêche n'est utilisée à des fins publicitaires,
   analytiques ou commerciales.

9. privacy.section4Title
   Vos droits

10. privacy.section4Body
    Toutes les données sont stockées sur ton appareil et peuvent être supprimées à
    tout moment en désinstallant l'application. Tu peux contacter
    lobsterlog.app@gmail.com pour toute question ou préoccupation concernant la
    confidentialité.

11. privacy.declineButton
    Refuser

12. privacy.acceptButton
    Accepter

---

## 3. Lines asserting WHERE data is stored / WHETHER anything is sent

These are the sentences a cloud-backup feature would make inaccurate. Quoted
verbatim (EN), with key. Each has a matching FR sentence in the same key.

A. Local storage assertion — key: privacy.section2Body
   "Your logbook data is stored locally on this device."
   FR: "Les données de ton journal sont stockées localement sur cet appareil."

B. Transmission-only-to-DFO assertion — key: privacy.section2Body
   "When you choose to submit an electronic report, that data is transmitted
   directly to DFO using their secure web service."
   FR: "...ces données sont transmises directement au MPO via leur service web
   sécurisé."

C. No-automatic-send assertion — key: privacy.section2Body
   "Transmission occurs only when you explicitly tap \"Send to DFO\" — no data is
   sent automatically."
   FR: "La transmission n'a lieu que lorsque tu appuies explicitement sur
   «Envoyer au MPO» — aucune donnée n'est envoyée automatiquement."

D. No third party other than DFO — key: privacy.section3Body
   "Your fishing data is never sold, shared, or disclosed to any third party other
   than DFO as required for regulatory logbook compliance."
   FR: "Tes données de pêche ne sont jamais vendues, partagées ou divulguées à un
   tiers autre que le MPO, tel que requis pour la conformité réglementaire du
   journal de bord."

E. No advertising / analytics / commercial use — key: privacy.section3Body
   "No fishing data is used for advertising, analytics, or any commercial purpose."
   FR: "Aucune donnée de pêche n'est utilisée à des fins publicitaires,
   analytiques ou commerciales."

F. All data on device, deletable by removing app — key: privacy.section4Body
   "All data is stored on your device and can be deleted at any time by removing
   the app."
   FR: "Toutes les données sont stockées sur ton appareil et peuvent être
   supprimées à tout moment en désinstallant l'application."

Note (factual, no change made): assertions A, C, D, and F describe the app as
local-only with the sole exception of DFO. Once the opt-in cloud backup ships,
data also goes to LobsterLog's own servers when the harvester turns backup on —
so these four lines (all in section2Body and section4Body, plus the "other than
DFO" clause in section3Body / item D) are the ones a rewrite must reconcile.

---

## 4. Layout — is it one block or structured sections?

STRUCTURED into discrete sections, not one text block. A 3-section rewrite fits
the existing component with no structural rebuild.

Component shape (src/screens/PrivacyNoticeModal.tsx):

- Full-screen SafeAreaView. Props: { onAccept, onDecline }. Stateless; pulls all
  text from useTranslation('dfo').
- Header (blue bar, centered): privacy.title + privacy.subtitle.
- ScrollView body: FOUR sibling <View style={styles.section}> cards, hardcoded
  (NOT data-driven / not a .map loop). Each card is exactly:
    <Text style={styles.sectionTitle}>{t('privacy.sectionNTitle')}</Text>
    <Text style={styles.body}>{t('privacy.sectionNBody')}</Text>
  for N = 1..4, in order.
- Footer buttonRow: Decline (onDecline) + Accept (onAccept).

What a 3-section rewrite touches:

- To go from 4 sections to 3: remove or merge ONE <View style={styles.section}>
  block in the .tsx, and edit the title/body strings of the 3 kept sections in
  en/dfo.json + fr/dfo.json. Header (title/subtitle) and both buttons are
  reusable as-is. Styles already exist (section, sectionTitle, body) and need no
  change. Because the sections are explicit blocks rather than a loop, this is a
  text/JSON edit plus deleting one JSX block — no component restructure.

---

## 5. Other notes

- Orphan key: privacy.agree exists in BOTH en/dfo.json ("I Understand") and
  fr/dfo.json ("J'ai compris") but is NOT referenced anywhere in src — it is not
  rendered on the Privacy Notice (which uses declineButton + acceptButton). Listed
  so it isn't mistaken for on-screen text.
- Key parity: EN and FR privacy objects have identical key sets (13 keys each:
  the 12 rendered + the orphan agree). No missing translations.
- Unrelated working-tree change observed (NOT touched this session): ios/Podfile.lock
  shows as modified in git status. Not part of this recon.
