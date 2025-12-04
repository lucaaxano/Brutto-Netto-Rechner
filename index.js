const express = require('express');
const cors = require('cors');
const { grossToNet } = require('@finanzfluss/calculators');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Brutto-Netto Berechnung
app.post('/brutto-netto', (req, res) => {
  try {
    const body = req.body;

    // bruttoListe validieren
    const bruttoListe = body.bruttoListe;
    if (!bruttoListe || !Array.isArray(bruttoListe) || bruttoListe.length === 0) {
      return res.status(400).json({
        error: 'bruttoListe (Array) fehlt oder ist leer.'
      });
    }

    // Alle Parameter mit Defaults (0 wenn nicht angegeben)
    // Unterstützt sowohl deutsche Namen als auch Original-Namen
    const baseInput = {
      inputAccountingYear: String(body.year || body.inputAccountingYear || new Date().getFullYear()),
      inputTaxClass: body.steuerklasse ?? body.inputTaxClass ?? 1,
      inputTaxAllowance: body.freibetrag ?? body.inputTaxAllowance ?? 0,
      inputChurchTax: body.kirchensteuer ?? body.inputChurchTax ?? 0,
      inputState: body.bundesland || body.inputState || 'Hamburg',
      inputYearOfBirth: body.jahrgang ?? body.inputYearOfBirth ?? 1990,
      inputChildren: body.kinder ?? body.inputChildren ?? 0,
      inputChildTaxAllowance: body.kinderfreibetrag ?? body.inputChildTaxAllowance ?? 0,
      inputPkvContribution: body.pkvBeitrag ?? body.inputPkvContribution ?? 0,
      inputEmployerSubsidy: body.arbeitgeberzuschuss ?? body.inputEmployerSubsidy ?? 0,
      inputPensionInsurance: body.rentenversicherung ?? body.inputPensionInsurance ?? 0,
      inputLevyOne: body.umlage1 ?? body.inputLevyOne ?? 0,
      inputLevyTwo: body.umlage2 ?? body.inputLevyTwo ?? 0,
      inputActivateLevy: body.umlageAktiv ?? body.inputActivateLevy ?? 0,
      inputHealthInsurance: body.versicherungsart ?? body.inputHealthInsurance ?? 0,  // 0=GKV, 1=PKV, -1=freiwillig
      inputAdditionalContribution: body.zusatzbeitrag ?? body.inputAdditionalContribution ?? 1.7,  // GKV-Zusatzbeitrag in %
      inputPeriod: body.periode ?? body.inputPeriod ?? 2, // 2 = monatlich
    };

    // Berechnung für jedes Brutto in der Liste
    const results = bruttoListe.map((brutto) => {
      const input = {
        ...baseInput,
        inputGrossWage: brutto,
      };

      const r = grossToNet.validateAndCalculate(input);

      return {
        brutto,
        nettoMonat: r.outputResNetWageMonth,
        nettoJahr: r.outputResNetWageYear,
        lohnsteuerMonat: r.outputResIncomeTaxMonth,
        soliMonat: r.outputResSolidaritySurchargeMonth,
        kirchensteuerMonat: r.outputResChurchTaxMonth,
        steuernGesamt: r.outputTotalTaxes,
        krankenversicherungMonat: r.outputResHealthInsuranceMonth,
        pflegeversicherungMonat: r.outputResCareInsuranceMonth,
        rentenversicherungMonat: r.outputResPensionInsuranceMonth,
        arbeitslosenversicherungMonat: r.outputResUnemploymentInsuranceMonth,
        sozialabgabenGesamt: r.outputTotalInsurances,
      };
    });

    res.json({ results });
  } catch (err) {
    console.error('Fehler bei /brutto-netto:', err);
    res.status(500).json({
      error: 'Interner Fehler',
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Brutto-Netto-Rechner läuft auf Port ${PORT}`);
});
