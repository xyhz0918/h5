module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run preview -- --host 127.0.0.1 --port 4173",
      startServerReadyPattern: "Local:",
      startServerReadyTimeout: 60000,
      url: ["http://127.0.0.1:4173/"],
      numberOfRuns: 1,
      settings: {
        formFactor: "mobile",
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 2,
          disabled: false
        },
        throttlingMethod: "simulate"
      }
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.45 }],
        "categories:accessibility": ["warn", { minScore: 0.8 }],
        "categories:best-practices": ["warn", { minScore: 0.8 }]
      }
    },
    upload: {
      target: "filesystem",
      outputDir: "./reports/lhci"
    }
  }
};
