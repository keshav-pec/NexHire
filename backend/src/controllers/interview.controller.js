const Interview = require('../models/Interview');
const Report = require('../models/Report');

/**
 * POST /api/interviews
 * Create a new interview session for the authenticated user.
 */
const createInterview = async (req, res, next) => {
  try {
    const { company, role, skills } = req.body;

    if (!company || !role) {
      return res.status(400).json({ success: false, message: 'Company and role are required' });
    }

    const interview = await Interview.create({
      userId: req.user.id,
      company,
      role,
      skills: skills || '',
    });

    return res.status(201).json({ success: true, interview });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/interviews
 * List all interview sessions for the authenticated user (most recent first).
 */
const getInterviews = async (req, res, next) => {
  try {
    const interviews = await Interview.find({ userId: req.user.id })
      .sort({ startedAt: -1 })
      .limit(50)
      .lean();

    const interviewIds = interviews.map(i => i._id);
    const reports = await Report.find({ interviewId: { $in: interviewIds } }).lean();

    const reportMap = reports.reduce((acc, report) => {
      acc[report.interviewId.toString()] = report;
      return acc;
    }, {});

    const enrichedInterviews = interviews.map(interview => {
      const report = reportMap[interview._id.toString()];
      return {
        ...interview,
        score: report ? report.overallScore : null,
        feedback: report ? report.status : interview.status,
      };
    });

    return res.status(200).json({ success: true, interviews: enrichedInterviews });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/interviews/:id
 * Update the status/endedAt of an interview session.
 */
const updateInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, endedAt, durationSeconds } = req.body;

    const interview = await Interview.findOne({ _id: id, userId: req.user.id });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (status) interview.status = status;
    if (endedAt) interview.endedAt = new Date(endedAt);
    if (durationSeconds != null) interview.durationSeconds = durationSeconds;

    await interview.save();

    return res.status(200).json({ success: true, interview });
  } catch (err) {
    next(err);
  }
};

module.exports = { createInterview, getInterviews, updateInterview };
