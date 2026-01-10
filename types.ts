
export interface ClassroomNotes {
  studentName: string;
  classContent: string;
  highlights: string;
  improvementAreas: string;
  homework: string;
}

export interface FeedbackRecord extends ClassroomNotes {
  id: string;
  timestamp: number;
  generatedText: string;
}

export interface StudentProfile {
  name: string;
  records: FeedbackRecord[];
  lastUpdated: number;
}
