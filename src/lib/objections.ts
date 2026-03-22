export interface Objection {
  id: string;
  trigger: string;
  icon: string;
  rebuttals: string[];
}

export const OBJECTIONS: Objection[] = [
  {
    id: 'geen-tijd',
    trigger: 'Geen tijd / druk',
    icon: '⏰',
    rebuttals: [
      'Dat snap ik helemaal, {naam}. Juist daarom bel ik — we helpen bedrijven die te druk zijn om zelf te kijken naar automatisering. Mag ik u in 60 seconden uitleggen hoe we gemiddeld 8 uur per week terugwinnen?',
      'Begrijpelijk. Mag ik u dan één vraag stellen? Als ik u 5 uur per week kan teruggeven, zou dat dan de moeite waard zijn om 2 minuten naar te luisteren?',
      'Natuurlijk, u bent druk — dat hoor ik vaker bij succesvolle ondernemers. Zal ik u dinsdagochtend om 9 uur kort terugbellen? Dan plan ik dat even in.',
    ],
  },
  {
    id: 'stuur-mail',
    trigger: 'Stuur maar een mail',
    icon: '📧',
    rebuttals: [
      'Dat doe ik graag! Maar zodat ik u de juiste informatie kan sturen: mag ik u één korte vraag stellen over waar u nu de meeste tijd aan verliest?',
      'Absoluut, ik stuur u direct iets toe. Maar een mail kan niet luisteren — mag ik in 30 seconden even peilen wat voor u het meest relevant is? Dan stuur ik precies het juiste.',
      'Prima, dat doe ik. Even voor mijn begrip: bent u meer op zoek naar nieuwe klanten, of vooral naar het automatiseren van bestaand werk? Dan kan ik de mail daar op toespitsen.',
    ],
  },
  {
    id: 'al-een-partij',
    trigger: 'We hebben al iemand',
    icon: '🤝',
    rebuttals: [
      'Goed om te horen dat u daar al mee bezig bent! Mag ik vragen — loopt alles naar wens? We horen regelmatig dat bedrijven niet helemaal tevreden zijn met wat ze nu hebben.',
      'Dat begrijp ik. We werken juist veel samen mét bestaande partijen. Onze specialiteit is het stuk dat de meeste bureaus niet doen: de automatisering ná de marketingcampagne.',
      'Super dat u daarmee bezig bent. Puur uit nieuwsgierigheid: automatiseren ze ook uw interne processen, of is het vooral marketing? Dat is namelijk precies ons speerpunt.',
    ],
  },
  {
    id: 'niet-interessant',
    trigger: 'Niet geïnteresseerd',
    icon: '🚫',
    rebuttals: [
      'Helemaal prima. Mag ik vragen wat de reden is? Dan weet ik of ik u in de toekomst wel of niet mag benaderen.',
      'Dat respecteer ik. Mag ik één ding vragen: mocht u in de komende maanden merken dat u toch uren verliest aan handmatig werk — mag ik dan nog een keer bellen?',
      'Begrijpelijk. Veel van onze huidige klanten zeiden dat ook de eerste keer. Vaak is het een kwestie van timing. Ik noteer uw voorkeur en laat u verder met rust.',
    ],
  },
  {
    id: 'terugbellen',
    trigger: 'Belt u later maar terug',
    icon: '📞',
    rebuttals: [
      'Dat doe ik graag! Wanneer komt het u beter uit — morgenochtend rond 10 uur, of liever donderdagmiddag?',
      'Natuurlijk. Even concreet: welke dag en tijd past u het beste? Dan zet ik het vast in de agenda.',
    ],
  },
  {
    id: 'te-duur',
    trigger: 'Dat is vast te duur',
    icon: '💰',
    rebuttals: [
      'Ik begrijp de reflex. Maar even eerlijk: als u nu 10 uur per week kwijt bent aan handmatig werk, kost dat u ook geld. Onze klanten verdienen de investering gemiddeld in 6 weken terug.',
      'Goede vraag. We beginnen altijd met een gratis adviesgesprek van 15 minuten. Daarin laten we concreet zien wat het u oplevert. Geen verplichtingen. Mag ik dat inplannen?',
      'Begrijpelijk. Mag ik u een voorbeeld geven? Een installatiebedrijf als het uwe bespaarde vorig kwartaal €3.200 per maand door drie processen te automatiseren. Zullen we kijken of dat voor u ook kan?',
    ],
  },
  {
    id: 'beslisser',
    trigger: 'Ik ga er niet over',
    icon: '👔',
    rebuttals: [
      'Begrijpelijk. Wie zou ik dan het beste kunnen spreken hierover? Dan benader ik diegene rechtstreeks.',
      'Snap ik. Zou u bereid zijn om dit kort aan uw leidinggevende voor te leggen? Ik stuur u een samenvatting van 3 regels die u kunt doorsturen.',
    ],
  },
];
