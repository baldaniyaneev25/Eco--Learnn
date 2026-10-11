// World Bank WDI indicators the platform is allowed to import, with the
// student-facing explanation shown on the Indian Economy Dashboard.

export interface IndicatorDef {
  code: string;
  name: string;
  nameGu: string;
  unit: string;
  description: string;
  descriptionGu: string;
}

export const WORLD_BANK_INDICATORS: IndicatorDef[] = [
  {
    code: "FP.CPI.TOTL.ZG",
    name: "Inflation, consumer prices",
    nameGu: "ગ્રાહક ભાવ આધારિત મોંઘવારી",
    unit: "% change, annual",
    description:
      "Annual percentage change in the cost to the average consumer of a basket of goods and services (calendar year).",
    descriptionGu: "સરેરાશ ગ્રાહક માટે વસ્તુઓ અને સેવાઓની ટોપલીના ખર્ચમાં વાર્ષિક ટકાવારી ફેરફાર (કેલેન્ડર વર્ષ).",
  },
  {
    code: "NY.GDP.MKTP.KD.ZG",
    name: "GDP growth",
    nameGu: "જીડીપી વૃદ્ધિ દર",
    unit: "% change, annual",
    description: "Annual growth of real GDP at market prices, based on constant local currency.",
    descriptionGu: "સ્થિર સ્થાનિક ચલણના આધારે બજાર કિંમતે વાસ્તવિક જીડીપીનો વાર્ષિક વૃદ્ધિ દર.",
  },
  {
    code: "SL.UEM.TOTL.ZS",
    name: "Unemployment (modelled ILO estimate)",
    nameGu: "બેરોજગારી દર (ILO મોડેલ અંદાજ)",
    unit: "% of labour force",
    description:
      "Share of the labour force without work but available for and seeking employment. This is an ILO model estimate, not India's official PLFS figure.",
    descriptionGu:
      "કામ વિનાના પરંતુ રોજગાર શોધતા શ્રમબળનો હિસ્સો. આ ILO મોડેલ અંદાજ છે, ભારતનો સત્તાવાર PLFS આંકડો નથી.",
  },
  {
    code: "NY.GDP.PCAP.CD",
    name: "GDP per capita",
    nameGu: "માથાદીઠ જીડીપી",
    unit: "current US$",
    description: "Gross domestic product divided by midyear population, in current US dollars.",
    descriptionGu: "મધ્ય-વર્ષની વસ્તી વડે ભાગેલ કુલ ઘરેલુ ઉત્પાદન, વર્તમાન યુએસ ડોલરમાં.",
  },
  {
    code: "BN.CAB.XOKA.GD.ZS",
    name: "Current account balance",
    nameGu: "ચાલુ ખાતાની બાકી",
    unit: "% of GDP",
    description: "Net exports of goods and services, net primary income and net secondary income, as a share of GDP.",
    descriptionGu: "જીડીપીના હિસ્સા તરીકે વસ્તુઓ અને સેવાઓની ચોખ્ખી નિકાસ તથા ચોખ્ખી આવક.",
  },
];

export function findWorldBankIndicator(code: string): IndicatorDef | undefined {
  return WORLD_BANK_INDICATORS.find((i) => i.code === code);
}
