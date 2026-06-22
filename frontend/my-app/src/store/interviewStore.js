import { create } from 'zustand';

const useInterviewStore = create((set) => ({
  sessionToken: null,
  interviewId: null,
  candidateName: '',
  jobTitle: '',
  turns: [],
  currentQuestion: null,
  questionType: null,
  difficultyLevel: 1,
  isComplete: false,
  questionsRemaining: 0,
  isLoading: false,

  startSession: (data) =>
    set({
      sessionToken: data.session_token,
      interviewId: data.interview_id,
      candidateName: data.candidate_name,
      jobTitle: data.job_title,
      currentQuestion: data.first_question,
      questionType: data.question_type,
      difficultyLevel: data.difficulty_level,
      questionsRemaining: data.total_questions_planned,
      turns: [{ role: 'interviewer', content: data.first_question, type: data.question_type }],
      isComplete: false,
    }),

  addAnswer: (answer) =>
    set((state) => ({
      turns: [...state.turns, { role: 'candidate', content: answer }],
    })),

  processResponse: (response) =>
    set((state) => {
      const newTurns = [...state.turns];
      if (response.next_question) {
        newTurns.push({
          role: 'interviewer',
          content: response.next_question,
          type: response.question_type,
          quality: response.answer_quality,
        });
      }
      return {
        turns: newTurns,
        currentQuestion: response.next_question,
        questionType: response.question_type,
        difficultyLevel: response.difficulty_level,
        isComplete: response.interview_complete,
        questionsRemaining: response.questions_remaining,
      };
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  completeInterview: () =>
    set({
      isComplete: true,
      questionsRemaining: 0,
      isLoading: false,
    }),

  reset: () =>
    set({
      sessionToken: null,
      interviewId: null,
      candidateName: '',
      jobTitle: '',
      turns: [],
      currentQuestion: null,
      questionType: null,
      difficultyLevel: 1,
      isComplete: false,
      questionsRemaining: 0,
      isLoading: false,
    }),
}));

export default useInterviewStore;
