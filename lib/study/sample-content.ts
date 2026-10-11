// Starter study content created by `npm run seed:demo` so the app can be tried
// immediately. Editors can edit, unpublish or delete it in /admin → Study content.

type Bi = { en: string; gu: string };

interface SampleQuestion {
  text: Bi;
  options: Bi[];
  correctIndex: number;
  explanation: Bi;
}

interface SampleChapter {
  classLevel: "11" | "12";
  order: number;
  title: Bi;
  description: Bi;
  notes: { title: Bi; body: Bi }[];
  quiz: { title: Bi; questions: SampleQuestion[] };
}

const b = (en: string, gu: string): Bi => ({ en, gu });

export const SAMPLE_CHAPTERS: SampleChapter[] = [
  {
    classLevel: "11",
    order: 1,
    title: b("Introduction to Economics", "અર્થશાસ્ત્રનો પરિચય"),
    description: b("Scarcity, choice and the two branches of economics.", "અછત, પસંદગી અને અર્થશાસ્ત્રની બે શાખાઓ."),
    notes: [
      {
        title: b("Scarcity and choice", "અછત અને પસંદગી"),
        body: b(
          "Economics studies how people use limited (scarce) resources to satisfy their unlimited wants.\n\n" +
            "Because resources such as land, labour and capital are limited, every society must choose: what to produce, how to produce it and for whom to produce it. These are called the central problems of an economy.\n\n" +
            "Opportunity cost is the value of the next best alternative given up when a choice is made.\n\n" +
            "Adam Smith is known as the father of economics. His book 'The Wealth of Nations' was published in 1776.",
          "અર્થશાસ્ત્ર એ અભ્યાસ કરે છે કે માણસ પોતાની અમર્યાદિત જરૂરિયાતો સંતોષવા મર્યાદિત (અછતવાળાં) સાધનોનો ઉપયોગ કેવી રીતે કરે છે.\n\n" +
            "જમીન, શ્રમ અને મૂડી જેવાં સાધનો મર્યાદિત હોવાથી દરેક સમાજે પસંદગી કરવી પડે છે: શું ઉત્પાદન કરવું, કેવી રીતે ઉત્પાદન કરવું અને કોના માટે ઉત્પાદન કરવું. આને અર્થતંત્રના કેન્દ્રીય પ્રશ્નો કહે છે.\n\n" +
            "કોઈ પસંદગી કરતી વખતે જે બીજો શ્રેષ્ઠ વિકલ્પ જતો કરવો પડે તેના મૂલ્યને વૈકલ્પિક ખર્ચ (opportunity cost) કહે છે.\n\n" +
            "એડમ સ્મિથને અર્થશાસ્ત્રના પિતા કહેવામાં આવે છે. તેમનું પુસ્તક 'ધ વેલ્થ ઓફ નેશન્સ' 1776માં પ્રકાશિત થયું હતું.",
        ),
      },
      {
        title: b("Microeconomics and macroeconomics", "સૂક્ષ્મ અને સમષ્ટિ અર્થશાસ્ત્ર"),
        body: b(
          "Microeconomics studies individual units of the economy, such as a single consumer, a firm or the price of one good.\n\n" +
            "Macroeconomics studies the economy as a whole: national income, total employment, the general price level (inflation) and economic growth.\n\n" +
            "Example: the demand for tea in one town is a micro topic; the unemployment rate of India is a macro topic.",
          "સૂક્ષ્મ (માઇક્રો) અર્થશાસ્ત્ર અર્થતંત્રના વ્યક્તિગત એકમોનો અભ્યાસ કરે છે, જેમ કે એક ગ્રાહક, એક પેઢી કે એક વસ્તુની કિંમત.\n\n" +
            "સમષ્ટિ (મેક્રો) અર્થશાસ્ત્ર સમગ્ર અર્થતંત્રનો અભ્યાસ કરે છે: રાષ્ટ્રીય આવક, કુલ રોજગાર, સામાન્ય ભાવ સપાટી (મોંઘવારી) અને આર્થિક વૃદ્ધિ.\n\n" +
            "ઉદાહરણ: એક શહેરમાં ચાની માંગ સૂક્ષ્મ વિષય છે; ભારતનો બેરોજગારી દર સમષ્ટિ વિષય છે.",
        ),
      },
    ],
    quiz: {
      title: b("Practice: Introduction to Economics", "પ્રેક્ટિસ: અર્થશાસ્ત્રનો પરિચય"),
      questions: [
        {
          text: b("Who is known as the father of economics?", "અર્થશાસ્ત્રના પિતા કોણ ગણાય છે?"),
          options: [b("Adam Smith", "એડમ સ્મિથ"), b("Alfred Marshall", "આલ્ફ્રેડ માર્શલ"), b("J. M. Keynes", "જે. એમ. કેઇન્સ"), b("Karl Marx", "કાર્લ માર્ક્સ")],
          correctIndex: 0,
          explanation: b("Adam Smith wrote 'The Wealth of Nations' (1776).", "એડમ સ્મિથે 'ધ વેલ્થ ઓફ નેશન્સ' (1776) લખ્યું હતું."),
        },
        {
          text: b("The basic economic problem arises because of…", "મૂળભૂત આર્થિક પ્રશ્ન શાના કારણે ઊભો થાય છે?"),
          options: [b("Scarcity of resources", "સાધનોની અછત"), b("Too much money", "વધુ પડતું નાણું"), b("Population only", "ફક્ત વસ્તી"), b("Government rules", "સરકારી નિયમો")],
          correctIndex: 0,
          explanation: b("Limited resources and unlimited wants force us to choose.", "મર્યાદિત સાધનો અને અમર્યાદિત જરૂરિયાતોને કારણે પસંદગી કરવી પડે છે."),
        },
        {
          text: b("The value of the next best alternative given up is called…", "જતો કરેલો બીજો શ્રેષ્ઠ વિકલ્પનું મૂલ્ય શું કહેવાય?"),
          options: [b("Opportunity cost", "વૈકલ્પિક ખર્ચ"), b("Fixed cost", "સ્થિર ખર્ચ"), b("Price", "કિંમત"), b("Profit", "નફો")],
          correctIndex: 0,
          explanation: b("Opportunity cost measures what is sacrificed when choosing.", "પસંદગી વખતે જે ત્યાગ થાય તે વૈકલ્પિક ખર્ચ છે."),
        },
        {
          text: b("Which of these is a macroeconomic topic?", "નીચેનામાંથી કયો સમષ્ટિ અર્થશાસ્ત્રનો વિષય છે?"),
          options: [b("Price of rice in one shop", "એક દુકાનમાં ચોખાની કિંમત"), b("India's inflation rate", "ભારતનો મોંઘવારી દર"), b("One farmer's income", "એક ખેડૂતની આવક"), b("Demand for one brand of soap", "એક બ્રાન્ડના સાબુની માંગ")],
          correctIndex: 1,
          explanation: b("Inflation concerns the economy as a whole.", "મોંઘવારી સમગ્ર અર્થતંત્રને લગતી બાબત છે."),
        },
      ],
    },
  },
  {
    classLevel: "12",
    order: 1,
    title: b("National Income", "રાષ્ટ્રીય આવક"),
    description: b("Meaning of national income, GDP, GNP, NNP and how they are measured.", "રાષ્ટ્રીય આવકનો અર્થ, GDP, GNP, NNP અને તેની ગણતરીની રીતો."),
    notes: [
      {
        title: b("Meaning of national income", "રાષ્ટ્રીય આવકનો અર્થ"),
        body: b(
          "National income is the money value of all final goods and services produced by the normal residents of a country during one year.\n\n" +
            "Only final goods are counted. Intermediate goods (for example flour used by a bakery) are not counted separately, otherwise the same value would be counted twice (double counting).\n\n" +
            "In India, national income is estimated by the National Statistics Office (NSO) under the Ministry of Statistics and Programme Implementation (MoSPI). India's financial year runs from 1 April to 31 March.",
          "એક વર્ષ દરમિયાન દેશના સામાન્ય રહેવાસીઓ દ્વારા ઉત્પાદિત તમામ અંતિમ વસ્તુઓ અને સેવાઓના નાણાકીય મૂલ્યને રાષ્ટ્રીય આવક કહે છે.\n\n" +
            "ફક્ત અંતિમ વસ્તુઓની જ ગણતરી થાય છે. મધ્યવર્તી વસ્તુઓ (જેમ કે બેકરી વાપરે તે લોટ) અલગથી ગણાતી નથી, નહીંતર એક જ મૂલ્ય બે વાર ગણાય (બેવડી ગણતરી).\n\n" +
            "ભારતમાં રાષ્ટ્રીય આવકનો અંદાજ આંકડાશાસ્ત્ર અને કાર્યક્રમ અમલીકરણ મંત્રાલય (MoSPI) હેઠળનું રાષ્ટ્રીય આંકડાકીય કાર્યાલય (NSO) કાઢે છે. ભારતનું નાણાકીય વર્ષ 1 એપ્રિલથી 31 માર્ચ સુધીનું હોય છે.",
        ),
      },
      {
        title: b("GDP, GNP, NNP and methods of measurement", "GDP, GNP, NNP અને ગણતરીની રીતો"),
        body: b(
          "GDP (Gross Domestic Product): value of final goods and services produced within the domestic territory of a country in a year.\n\n" +
            "GNP (Gross National Product) = GDP + net factor income from abroad (NFIA).\n\n" +
            "NNP (Net National Product) = GNP − depreciation. Depreciation is the wear and tear of capital goods.\n\n" +
            "Three methods are used to measure national income:\n" +
            "1. Value added (product) method – adds the value added by every producing unit.\n" +
            "2. Income method – adds factor incomes: rent, wages, interest and profit.\n" +
            "3. Expenditure method – adds final spending: consumption, investment, government spending and net exports.",
          "GDP (કુલ ઘરેલુ ઉત્પાદન): એક વર્ષમાં દેશની ઘરેલુ સીમામાં ઉત્પાદિત અંતિમ વસ્તુઓ અને સેવાઓનું મૂલ્ય.\n\n" +
            "GNP (કુલ રાષ્ટ્રીય ઉત્પાદન) = GDP + વિદેશમાંથી ચોખ્ખી સાધન આવક (NFIA).\n\n" +
            "NNP (ચોખ્ખું રાષ્ટ્રીય ઉત્પાદન) = GNP − ઘસારો. મૂડી વસ્તુઓના વપરાશથી થતા ઘટાડાને ઘસારો કહે છે.\n\n" +
            "રાષ્ટ્રીય આવક માપવાની ત્રણ રીતો છે:\n" +
            "1. મૂલ્યવૃદ્ધિ (ઉત્પાદન) પદ્ધતિ – દરેક ઉત્પાદક એકમે ઉમેરેલું મૂલ્ય ઉમેરવામાં આવે છે.\n" +
            "2. આવક પદ્ધતિ – સાધન આવકો ઉમેરાય છે: ભાડું, વેતન, વ્યાજ અને નફો.\n" +
            "3. ખર્ચ પદ્ધતિ – અંતિમ ખર્ચ ઉમેરાય છે: વપરાશ, રોકાણ, સરકારી ખર્ચ અને ચોખ્ખી નિકાસ.",
        ),
      },
    ],
    quiz: {
      title: b("Practice: National Income", "પ્રેક્ટિસ: રાષ્ટ્રીય આવક"),
      questions: [
        {
          text: b("GNP is equal to…", "GNP બરાબર…"),
          options: [b("GDP + net factor income from abroad", "GDP + વિદેશમાંથી ચોખ્ખી સાધન આવક"), b("GDP − depreciation", "GDP − ઘસારો"), b("NNP + indirect taxes", "NNP + પરોક્ષ કરવેરા"), b("GDP − exports", "GDP − નિકાસ")],
          correctIndex: 0,
          explanation: b("GNP adds net factor income from abroad (NFIA) to GDP.", "GNP માં GDP ઉપરાંત વિદેશમાંથી ચોખ્ખી સાધન આવક ઉમેરાય છે."),
        },
        {
          text: b("NNP is obtained by subtracting ____ from GNP.", "GNP માંથી ____ બાદ કરવાથી NNP મળે છે."),
          options: [b("Depreciation", "ઘસારો"), b("Subsidies", "સબસિડી"), b("Imports", "આયાત"), b("Taxes", "કરવેરા")],
          correctIndex: 0,
          explanation: b("NNP = GNP − depreciation.", "NNP = GNP − ઘસારો."),
        },
        {
          text: b("Why are intermediate goods not counted separately in national income?", "રાષ્ટ્રીય આવકમાં મધ્યવર્તી વસ્તુઓ અલગથી કેમ ગણાતી નથી?"),
          options: [b("To avoid double counting", "બેવડી ગણતરી ટાળવા"), b("They have no value", "તેમનું કોઈ મૂલ્ય નથી"), b("They are imported", "તે આયાત થાય છે"), b("They are not taxed", "તેના પર કર નથી")],
          correctIndex: 0,
          explanation: b("Their value is already included in the final good.", "તેમનું મૂલ્ય અંતિમ વસ્તુમાં સમાઈ જાય છે."),
        },
        {
          text: b("Which is NOT a method of measuring national income?", "નીચેનામાંથી કઈ રાષ્ટ્રીય આવક માપવાની રીત નથી?"),
          options: [b("Income method", "આવક પદ્ધતિ"), b("Expenditure method", "ખર્ચ પદ્ધતિ"), b("Value added method", "મૂલ્યવૃદ્ધિ પદ્ધતિ"), b("Population method", "વસ્તી પદ્ધતિ")],
          correctIndex: 3,
          explanation: b("The three methods are value added, income and expenditure.", "ત્રણ રીતો છે: મૂલ્યવૃદ્ધિ, આવક અને ખર્ચ."),
        },
        {
          text: b("Which organisation estimates India's national income?", "ભારતની રાષ્ટ્રીય આવકનો અંદાજ કઈ સંસ્થા કાઢે છે?"),
          options: [b("National Statistics Office (NSO)", "રાષ્ટ્રીય આંકડાકીય કાર્યાલય (NSO)"), b("Reserve Bank of India", "ભારતીય રિઝર્વ બેંક"), b("NITI Aayog", "નીતિ આયોગ"), b("SEBI", "સેબી")],
          correctIndex: 0,
          explanation: b("The NSO works under the Ministry of Statistics (MoSPI).", "NSO આંકડાશાસ્ત્ર મંત્રાલય (MoSPI) હેઠળ કાર્ય કરે છે."),
        },
      ],
    },
  },
  {
    classLevel: "12",
    order: 2,
    title: b("Money and Banking", "નાણું અને બેન્કિંગ"),
    description: b("Functions of money and the role of the Reserve Bank of India.", "નાણાનાં કાર્યો અને ભારતીય રિઝર્વ બેંકની ભૂમિકા."),
    notes: [
      {
        title: b("Functions of money", "નાણાનાં કાર્યો"),
        body: b(
          "Money is anything that is generally accepted as a means of payment.\n\n" +
            "Primary functions:\n1. Medium of exchange – it removes the problems of the barter system.\n2. Measure of value (unit of account) – prices of all goods are expressed in money.\n\n" +
            "Secondary functions:\n3. Store of value – savings can be kept in the form of money.\n4. Standard of deferred payments – loans and future payments are settled in money.",
          "સામાન્ય રીતે ચુકવણીના સાધન તરીકે સ્વીકારાતી કોઈ પણ વસ્તુને નાણું કહે છે.\n\n" +
            "પ્રાથમિક કાર્યો:\n1. વિનિમયનું માધ્યમ – તે સાટા પદ્ધતિની મુશ્કેલીઓ દૂર કરે છે.\n2. મૂલ્યનું માપ (હિસાબી એકમ) – બધી વસ્તુઓની કિંમત નાણામાં દર્શાવાય છે.\n\n" +
            "ગૌણ કાર્યો:\n3. મૂલ્યનો સંગ્રહ – બચત નાણાના સ્વરૂપમાં રાખી શકાય છે.\n4. વિલંબિત ચુકવણીનું ધોરણ – લોન અને ભવિષ્યની ચુકવણીઓ નાણામાં થાય છે.",
        ),
      },
      {
        title: b("Reserve Bank of India and the repo rate", "ભારતીય રિઝર્વ બેંક અને રેપો દર"),
        body: b(
          "The Reserve Bank of India (RBI) is India's central bank. It was established on 1 April 1935 and nationalised in 1949.\n\n" +
            "Main functions: issuing currency notes, banker to the government, banker's bank and lender of last resort, controlling credit, and managing foreign exchange reserves.\n\n" +
            "Repo rate is the rate at which the RBI lends short-term money to commercial banks. When the RBI raises the repo rate, borrowing becomes costlier, credit and money supply fall, and this helps control inflation. Cutting the repo rate does the opposite.\n\n" +
            "The repo rate is decided by the Monetary Policy Committee (MPC).",
          "ભારતીય રિઝર્વ બેંક (RBI) ભારતની મધ્યસ્થ બેંક છે. તેની સ્થાપના 1 એપ્રિલ 1935ના રોજ થઈ હતી અને 1949માં તેનું રાષ્ટ્રીયકરણ થયું.\n\n" +
            "મુખ્ય કાર્યો: ચલણી નોટો બહાર પાડવી, સરકારની બેંકર, બેંકોની બેંક અને અંતિમ ધિરાણકર્તા, ધિરાણ નિયંત્રણ અને વિદેશી હૂંડિયામણ અનામતનું સંચાલન.\n\n" +
            "રેપો દર એ દર છે જેના પર RBI વાણિજ્ય બેંકોને ટૂંકા ગાળાનું ધિરાણ આપે છે. RBI રેપો દર વધારે ત્યારે ઉધાર લેવું મોંઘું બને છે, ધિરાણ અને નાણાં પુરવઠો ઘટે છે અને તેથી મોંઘવારી કાબૂમાં આવે છે. રેપો દર ઘટાડવાથી ઊલટી અસર થાય છે.\n\n" +
            "રેપો દર નાણાકીય નીતિ સમિતિ (MPC) નક્કી કરે છે.",
        ),
      },
    ],
    quiz: {
      title: b("Practice: Money and Banking", "પ્રેક્ટિસ: નાણું અને બેન્કિંગ"),
      questions: [
        {
          text: b("Which is a primary function of money?", "નીચેનામાંથી નાણાનું પ્રાથમિક કાર્ય કયું છે?"),
          options: [b("Medium of exchange", "વિનિમયનું માધ્યમ"), b("Store of value", "મૂલ્યનો સંગ્રહ"), b("Standard of deferred payments", "વિલંબિત ચુકવણીનું ધોરણ"), b("Transfer of value", "મૂલ્યનું સ્થાનાંતર")],
          correctIndex: 0,
          explanation: b("Medium of exchange and measure of value are the primary functions.", "વિનિમયનું માધ્યમ અને મૂલ્યનું માપ પ્રાથમિક કાર્યો છે."),
        },
        {
          text: b("When was the Reserve Bank of India established?", "ભારતીય રિઝર્વ બેંકની સ્થાપના ક્યારે થઈ?"),
          options: [b("1 April 1935", "1 એપ્રિલ 1935"), b("15 August 1947", "15 ઓગસ્ટ 1947"), b("26 January 1950", "26 જાન્યુઆરી 1950"), b("1 April 1969", "1 એપ્રિલ 1969")],
          correctIndex: 0,
          explanation: b("The RBI started on 1 April 1935 and was nationalised in 1949.", "RBI ની શરૂઆત 1 એપ્રિલ 1935ના રોજ થઈ અને 1949માં રાષ્ટ્રીયકરણ થયું."),
        },
        {
          text: b("Repo rate is the rate at which…", "રેપો દર એટલે…"),
          options: [b("RBI lends to commercial banks", "RBI વાણિજ્ય બેંકોને ધિરાણ આપે તે દર"), b("Banks lend to farmers", "બેંકો ખેડૂતોને ધિરાણ આપે તે દર"), b("Government borrows abroad", "સરકાર વિદેશથી ઉધાર લે તે દર"), b("People pay income tax", "લોકો આવકવેરો ભરે તે દર")],
          correctIndex: 0,
          explanation: b("It is the RBI's short-term lending rate to banks.", "તે RBI નો બેંકોને ટૂંકા ગાળાના ધિરાણનો દર છે."),
        },
        {
          text: b("To control inflation, the RBI usually…", "મોંઘવારી કાબૂમાં લેવા RBI સામાન્ય રીતે…"),
          options: [b("Raises the repo rate", "રેપો દર વધારે છે"), b("Cuts the repo rate", "રેપો દર ઘટાડે છે"), b("Prints more money", "વધુ નાણું છાપે છે"), b("Removes all taxes", "બધા કરવેરા દૂર કરે છે")],
          correctIndex: 0,
          explanation: b("A higher repo rate makes credit costlier and reduces money supply.", "ઊંચો રેપો દર ધિરાણ મોંઘું બનાવે છે અને નાણાં પુરવઠો ઘટાડે છે."),
        },
        {
          text: b("Who decides the repo rate in India?", "ભારતમાં રેપો દર કોણ નક્કી કરે છે?"),
          options: [b("Monetary Policy Committee", "નાણાકીય નીતિ સમિતિ"), b("Finance Commission", "નાણાં પંચ"), b("Parliament", "સંસદ"), b("State Bank of India", "સ્ટેટ બેંક ઓફ ઇન્ડિયા")],
          correctIndex: 0,
          explanation: b("The RBI's Monetary Policy Committee (MPC) sets the policy repo rate.", "RBI ની નાણાકીય નીતિ સમિતિ (MPC) પોલિસી રેપો દર નક્કી કરે છે."),
        },
      ],
    },
  },
];

/** Class 12 mock test combining the class 12 chapter quizzes. */
export const SAMPLE_TEST = {
  classLevel: "12" as const,
  title: b("Mock Test: National Income and Money & Banking", "મોક ટેસ્ટ: રાષ્ટ્રીય આવક તથા નાણું અને બેન્કિંગ"),
  description: b("10 questions · 15 minutes. Submit before the time ends.", "10 પ્રશ્નો · 15 મિનિટ. સમય પૂરો થાય તે પહેલાં સબમિટ કરો."),
  durationMinutes: 15,
  questions: SAMPLE_CHAPTERS.filter((c) => c.classLevel === "12").flatMap((c) => c.quiz.questions),
};
