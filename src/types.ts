export interface MatchFormData {
  homeTeam: string;
  awayTeam: string;
  homeRanking: string;
  awayRanking: string;
  homeForm: string[];
  awayForm: string[];
  homeKeyPlayers: string;
  awayKeyPlayers: string;
  homeGoalsFor: string;
  homeGoalsAgainst: string;
  awayGoalsFor: string;
  awayGoalsAgainst: string;
  venue: string;
  competition: string;
  headToHead: string;
  additionalNotes: string;
  isNeutralVenue: boolean;
}

export interface PredictionData {
  score: { home: number; away: number };
  analysis: {
    current_form: string;
    tactical_advantage: string;
    decisive_factor: string;
  };
  confidence: number;
  risk: 'נמוכה' | 'בינונית' | 'גבוהה';
  winner: 'home' | 'away' | 'draw';
}
