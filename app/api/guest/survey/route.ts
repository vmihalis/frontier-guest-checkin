import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logConversionEvent, updateFrequentVisitorMetrics } from '@/lib/analytics';
import type { SurveyResponseData } from '@/types/analytics';
import { sendEmail } from '@/lib/email';

/**
 * POST /api/guest/survey
 * Submit guest engagement survey and trigger follow-up actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      guestId,
      visitId,
      surveyType,
      satisfactionScore,
      npsScore,
      hostingInterest,
      amenityRatings,
      improvementSuggestions,
      openFeedback,
      followUpRequested,
      salesContactOk
    } = body;

    if (!guestId) {
      return NextResponse.json(
        { error: 'Guest ID is required' },
        { status: 400 }
      );
    }

    // Create survey response
    const survey = await prisma.engagementSurvey.create({
      data: {
        guestId,
        visitId: visitId || null,
        surveyType: surveyType || 'POST_VISIT',
        satisfactionScore: satisfactionScore || null,
        npsScore: npsScore || null,
        hostingInterest: hostingInterest || null,
        amenityRatings: amenityRatings ? JSON.parse(JSON.stringify(amenityRatings)) : null,
        improvementSuggestions: improvementSuggestions || null,
        openFeedback: openFeedback || null,
        followUpRequested: followUpRequested || false,
        salesContactOk: salesContactOk || false,
        completedAt: new Date()
      }
    });

    // Update guest's overall satisfaction and NPS scores
    if (satisfactionScore || npsScore) {
      await prisma.guest.update({
        where: { id: guestId },
        data: {
          satisfactionScore: satisfactionScore || undefined,
          npsScore: npsScore || undefined,
          conversionInterest: hostingInterest || undefined
        }
      });
    }

    // Update frequent visitor metrics
    await updateFrequentVisitorMetrics(guestId);

    // Log conversion event
    await logConversionEvent(
      guestId,
      'SURVEY_COMPLETED',
      'post_visit_survey',
      'success',
      {
        responses: [
          { question: 'Survey Type', answer: surveyType },
          { question: 'Satisfaction', answer: satisfactionScore || 'Not rated', rating: satisfactionScore },
          { question: 'NPS Score', answer: npsScore || 'Not rated', rating: npsScore },
          { question: 'Hosting Interest', answer: hostingInterest },
          { question: 'Follow-up Requested', answer: followUpRequested ? 'Yes' : 'No' },
          { question: 'Sales Contact OK', answer: salesContactOk ? 'Yes' : 'No' }
        ],
        completedAt: new Date().toISOString()
      } as SurveyResponseData
    );

    // Trigger follow-up actions based on responses
    await processSurveyTriggers(guestId, {
      satisfactionScore,
      npsScore,
      hostingInterest,
      followUpRequested,
      salesContactOk
    });

    return NextResponse.json({
      success: true,
      data: {
        surveyId: survey.id,
        followUpScheduled: followUpRequested || salesContactOk,
        conversionScoreUpdated: true
      }
    });

  } catch (error) {
    console.error('Error submitting survey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/guest/survey
 * Get survey questions or existing responses
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');
    const surveyType = searchParams.get('type') || 'POST_VISIT';

    if (searchParams.get('questions') === 'true') {
      // Return survey questions template
      const questions = getSurveyQuestions(surveyType);
      return NextResponse.json({
        success: true,
        data: { questions }
      });
    }

    if (!guestId) {
      return NextResponse.json(
        { error: 'Guest ID is required for responses' },
        { status: 400 }
      );
    }

    // Get guest's survey responses
    const surveys = await prisma.engagementSurvey.findMany({
      where: { guestId },
      orderBy: { completedAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      success: true,
      data: { surveys }
    });

  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process survey triggers for follow-up actions
 */
async function processSurveyTriggers(
  guestId: string, 
  responses: {
    satisfactionScore?: number;
    npsScore?: number;
    hostingInterest?: number;
    followUpRequested?: boolean;
    salesContactOk?: boolean;
  }
) {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: { frequentVisitor: true }
  });

  if (!guest) return;

  // High interest in hosting (7+ on 1-10 scale)
  if (responses.hostingInterest && responses.hostingInterest >= 7) {
    await logConversionEvent(
      guestId,
      'OUTREACH_EMAIL_SENT',
      'high_interest_survey',
      'scheduled',
      {
        responses: [{ question: 'Hosting Interest', answer: String(responses.hostingInterest), rating: responses.hostingInterest }],
        completedAt: new Date().toISOString()
      } as SurveyResponseData
    );

    // Mark for high-priority outreach
    await prisma.guest.update({
      where: { id: guestId },
      data: {
        lastOutreachAt: new Date(),
        conversionInterest: Math.max(responses.hostingInterest, guest.conversionInterest || 0)
      }
    });
  }

  // NPS Promoter (9-10) with sales contact permission
  if (responses.npsScore && responses.npsScore >= 9 && responses.salesContactOk) {
    await logConversionEvent(
      guestId,
      'FOLLOW_UP_MEETING',
      'nps_promoter',
      'scheduled',
      {
        responses: [{ question: 'NPS Score', answer: String(responses.npsScore), rating: responses.npsScore }],
        completedAt: new Date().toISOString()
      } as SurveyResponseData
    );
  }

  // Low satisfaction (1-2) - focus on experience improvement
  if (responses.satisfactionScore && responses.satisfactionScore <= 2) {
    await logConversionEvent(
      guestId,
      'SURVEY_COMPLETED',
      'low_satisfaction',
      'needs_attention',
      {
        responses: [{ question: 'Satisfaction Score', answer: String(responses.satisfactionScore), rating: responses.satisfactionScore }],
        completedAt: new Date().toISOString()
      } as SurveyResponseData
    );
  }

  // Follow-up requested
  if (responses.followUpRequested) {
    await logConversionEvent(
      guestId,
      'FOLLOW_UP_MEETING',
      'guest_requested',
      'scheduled'
    );
  }
}

/**
 * Get survey questions based on type
 */
function getSurveyQuestions(surveyType: string) {
  const baseQuestions = {
    satisfaction: {
      question: "How satisfied were you with your visit today?",
      type: "rating",
      scale: { min: 1, max: 5, labels: ["Very Unsatisfied", "Unsatisfied", "Neutral", "Satisfied", "Very Satisfied"] }
    },
    nps: {
      question: "How likely are you to recommend this building to a colleague?",
      type: "rating", 
      scale: { min: 0, max: 10, labels: ["Not at all likely", "Extremely likely"] }
    }
  };

  const conversionQuestions = {
    hostingInterest: {
      question: "How interested would you be in hosting your own guests here?",
      type: "rating",
      scale: { min: 1, max: 10, labels: ["Not interested", "Very interested"] }
    },
    amenities: {
      question: "Please rate the building amenities:",
      type: "multi_rating",
      items: ["Reception/Lobby", "Meeting Rooms", "Coffee/Kitchen", "Workspace Areas", "WiFi Quality", "Overall Atmosphere"]
    },
    improvements: {
      question: "What could we improve about your visitor experience?",
      type: "text",
      optional: true
    },
    followUp: {
      question: "Would you like someone to follow up with you about hosting opportunities?",
      type: "boolean"
    },
    contact: {
      question: "May our sales team contact you about workspace solutions?",
      type: "boolean"
    }
  };

  switch (surveyType) {
    case 'CONVERSION_INTEREST':
      return { ...baseQuestions, ...conversionQuestions };
    case 'POST_VISIT':
      return { 
        ...baseQuestions, 
        hostingInterest: conversionQuestions.hostingInterest,
        improvements: conversionQuestions.improvements
      };
    case 'MONTHLY_CHECK_IN':
      return { 
        ...baseQuestions,
        ...conversionQuestions
      };
    default:
      return baseQuestions;
  }
}