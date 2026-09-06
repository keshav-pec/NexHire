const Report = require('../models/Report');
const Interview = require('../models/Interview');
const Message = require('../models/Message');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateReport = async (req, res, next) => {
  try {
    const { interviewId } = req.params;
    const { transcript } = req.body; // Array of { role, text }

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ success: false, message: 'Transcript is required' });
    }

    const interview = await Interview.findOne({ _id: interviewId, userId: req.user.id });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Insert messages into DB in bulk, calculating tone for user messages would be done here or in Gemini prompt
    // Wait, the user asked to save the "entire interview info about the conversation and tone at the end".
    // We will ask Gemini to analyze tone and give us a QnA report in one go!
    // But since the QnA report focuses on the candidate's answers, we can ask for tone per question or just in the summary.
    // Let's formulate a prompt to generate the report JSON.
    const prompt = `
You are an expert technical recruiter and interviewer. You have just completed a mock interview with a candidate.
The target company is ${interview.company}, the role is ${interview.role}, and the candidate's skills are: ${interview.skills}.

Here is the transcript of the interview:
${transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n\n')}

Analyze this transcript and generate a detailed JSON report evaluating the candidate's performance.
CRITICAL INSTRUCTION: You MUST extract EVERY SINGLE distinct question asked by the AI (interviewer) and create a separate item in the "questions" array for each one, paired with the candidate's response. Do NOT summarize the entire interview into a single question object. If the AI asked 5 questions, there MUST be 5 question objects in the array.
Include the tone of the candidate's response in the "summary" field for each question.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: "OBJECT",
          properties: {
            overallScore: { type: "INTEGER", description: "Score from 0 to 100" },
            metrics: {
              type: "OBJECT",
              properties: {
                communication: { type: "INTEGER", description: "Score from 0 to 100" },
                technical: { type: "INTEGER", description: "Score from 0 to 100" },
                cultural: { type: "INTEGER", description: "Score from 0 to 100" }
              },
              required: ["communication", "technical", "cultural"]
            },
            questions: {
              type: "ARRAY",
              description: "Array of individual questions asked during the interview. MUST have one entry for EACH distinct question the AI asked.",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "INTEGER" },
                  score: { type: "NUMBER", description: "Score out of 10" },
                  rating: { type: "STRING", description: "E.g., Excellent, Outstanding, Good, Fair, Poor" },
                  questionText: { type: "STRING", description: "The specific question asked by the interviewer" },
                  summary: { type: "STRING", description: "Summary of the candidate's answer and their tone" },
                  feedback: { type: "STRING", description: "Actionable feedback for this specific answer" },
                  percentage: { type: "INTEGER", description: "Score out of 100" }
                },
                required: ["id", "score", "rating", "questionText", "summary", "feedback", "percentage"]
              }
            }
          },
          required: ["overallScore", "metrics", "questions"]
        }
      }
    });

    const reportJson = JSON.parse(response.text);

    // Save Messages to DB
    const messageDocs = transcript.map(t => ({
      interviewId,
      role: t.role,
      text: t.text,
      // For simplicity we embed tone in the summary of the report, but we can leave tone empty here or populate it if we wanted.
    }));
    await Message.insertMany(messageDocs);

    // Create Report
    const report = await Report.create({
      interviewId,
      userId: req.user.id,
      overallScore: reportJson.overallScore,
      metrics: reportJson.metrics,
      questions: reportJson.questions,
    });

    res.status(200).json({ success: true, report });

  } catch (err) {
    console.error('Error generating report:', err);
    next(err);
  }
};

const getReport = async (req, res, next) => {
  try {
    const { interviewId } = req.params;
    const report = await Report.findOne({ interviewId, userId: req.user.id }).populate('interviewId');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.status(200).json({ success: true, report });
  } catch (err) {
    next(err);
  }
};

module.exports = { generateReport, getReport };
