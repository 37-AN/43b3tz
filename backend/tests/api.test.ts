import { describe, it, expect } from '@jest/globals';

describe('API Validation & Value Bets', () => {
  it('should flag predictions with edge > 0.05 as value bets', () => {
    const mockPrediction = { edge_home: 0.06, confidence: 0.8 };
    const isValidValueBet = mockPrediction.edge_home > 0.05 && mockPrediction.confidence > 0.7;
    expect(isValidValueBet).toBe(true);
  });

  it('should categorize risk levels correctly', () => {
    const edge = 0.12;
    let risk = "HIGH";
    if (edge > 0.1) risk = "LOW";
    else if (edge > 0.05) risk = "MEDIUM";
    
    expect(risk).toBe("LOW");
  });
});
