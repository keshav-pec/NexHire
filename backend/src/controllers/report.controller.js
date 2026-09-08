const Report = require('../models/Report');
const Interview = require('../models/Interview');
const Message = require('../models/Message');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const processGeminiReport = async (interview, transcript, reportId) => {
  try {
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

    // Update the existing placeholder report
    await Report.findByIdAndUpdate(reportId, {
      overallScore: reportJson.overallScore,
      metrics: reportJson.metrics,
      questions: reportJson.questions,
      status: 'completed',
    });

  } catch (err) {
    console.error('Error in background processGeminiReport:', err);
    await Report.findByIdAndUpdate(reportId, {
      status: 'failed',
    });
  }
};

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

    // Save Messages to DB immediately
    const messageDocs = transcript.map(t => ({
      interviewId,
      role: t.role,
      text: t.text,
    }));
    await Message.insertMany(messageDocs);

    // Create a placeholder Report with status generating
    let report = await Report.findOne({ interviewId, userId: req.user.id });
    if (!report) {
      report = await Report.create({
        interviewId,
        userId: req.user.id,
        overallScore: 0,
        status: 'generating',
        metrics: { communication: 0, technical: 0, cultural: 0 },
        questions: [],
      });
    } else {
      report.status = 'generating';
      await report.save();
    }

    // Start background processing
    processGeminiReport(interview, transcript, report._id).catch(console.error);

    // Respond immediately to prevent timeouts
    res.status(202).json({ success: true, message: 'Report generation started', report });

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
