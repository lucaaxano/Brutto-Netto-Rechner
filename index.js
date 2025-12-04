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
    const {
      year,
      steuerklasse,
      bundesland,
      kirchensteuer,
      jahrgang,
      kinder,
      zusatzbeitrag,
      bruttoListe,
    } = req.body;

    // Validierung
    if (!bruttoListe || !Array.isArray(bruttoListe) || bruttoListe.length === 0) {
      return res.status(400).json({
        error: 'bruttoListe (Array) fehlt oder ist leer.'
      });
    }

    // Basis-Input für alle Berechnungen
    const baseInput = {
      inputAccountingYear: String(year || new Date().getFullYear()),
      inputTaxClass: steuerklasse,
      inputTaxAllowance: 0,
      inputChurchTax: kirchensteuer ? 1 : 0,
      inputState: bundesland,
      inputYearOfBirth: jahrgang,
      inputChildren: kinder || 0,
      inputChildTaxAllowance: 0,
      inputPkvContribution: 0,
      inputEmployerSubsidy: 0,
      inputPensionInsurance: 0,
      inputLevyOne: 0,
      inputLevyTwo: 0,
      inputActivateLevy: 0,
      inputHealthInsurance: zusatzbeitrag || 0,
      inputAdditionalContribution: 0,
      inputPeriod: 2, // monatlich
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
        lohnsteuerMonat: r.outputResWageTaxMonth,
        soliMonat: r.outputResSolzWageTaxMonth,
        kirchensteuerMonat: r.outputResChurchTaxMonth,
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
