import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nowInLA } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const now = nowInLA();
    let periodStart: Date;
    const periodEnd = new Date(endDate || now);

    // Calculate period start based on type
    if (startDate) {
      periodStart = new Date(startDate);
    } else {
      switch (period) {
        case 'weekly':
          periodStart = new Date(now);
          periodStart.setDate(periodStart.getDate() - 7);
          break;
        case 'monthly':
          periodStart = new Date(now);
          periodStart.setMonth(periodStart.getMonth() - 1);
          break;
        default: // daily
          periodStart = new Date(now);
          periodStart.setHours(0, 0, 0, 0);
          break;
      }
    }

    // Previous period for comparison
    const periodLength = periodEnd.getTime() - periodStart.getTime();
    const previousPeriodEnd = new Date(periodStart);
    const previousPeriodStart = new Date(periodStart.getTime() - periodLength);

    // Current period statistics
    const [
      totalVisits,
      uniqueGuests,
      newGuests,
      totalInvitations,
      qrActivations,
      overrideCount,
      blacklistAdditions,
      discountsSent,
      topHosts,
      countryStats,
      contactMethodStats
    ] = await Promise.all([
      // Total visits in period
      prisma.visit.count({
        where: {
          checkedInAt: {
            not: null,
            gte: periodStart,
            lte: periodEnd
          }
        }
      }),

      // Unique guests who visited
      prisma.guest.count({
        where: {
          visits: {
            some: {
              checkedInAt: {
                not: null,
                gte: periodStart,
                lte: periodEnd
              }
            }
          }
        }
      }),

      // New guest registrations
      prisma.guest.count({
        where: {
          createdAt: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      }),

      // Invitations created
      prisma.invitation.count({
        where: {
          createdAt: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      }),

      // QR activations
      prisma.invitation.count({
        where: {
          qrIssuedAt: {
            not: null,
            gte: periodStart,
            lte: periodEnd
          }
        }
      }),

      // Override usage
      prisma.visit.count({
        where: {
          overrideReason: { not: null },
          createdAt: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      }),

      // New blacklist additions
      prisma.guest.count({
        where: {
          blacklistedAt: {
            not: null,
            gte: periodStart,
            lte: periodEnd
          }
        }
      }),

      // Discount emails sent
      prisma.discount.count({
        where: {
          triggeredAt: {
            gte: periodStart,
            lte: periodEnd
          },
          emailSent: true
        }
      }),


      // Top hosts by visit count
      prisma.user.findMany({
        where: {
          hostedVisits: {
            some: {
              checkedInAt: {
                not: null,
                gte: periodStart,
                lte: periodEnd
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          hostedVisits: {
            where: {
              checkedInAt: {
                not: null,
                gte: periodStart,
                lte: periodEnd
              }
            },
            select: { id: true }
          }
        },
        orderBy: {
          hostedVisits: { _count: 'desc' }
        },
        take: 5
      }),

      // Country statistics
      prisma.guest.groupBy({
        by: ['country'],
        where: {
          visits: {
            some: {
              checkedInAt: {
                not: null,
                gte: periodStart,
                lte: periodEnd
              }
            }
          }
        },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10
      }),

      // Contact method preferences
      prisma.guest.groupBy({
        by: ['contactMethod'],
        where: {
          visits: {
            some: {
              checkedInAt: {
                not: null,
                gte: periodStart,
                lte: periodEnd
              }
            }
          }
        },
        _count: { contactMethod: true }
      })
    ]);

    // Previous period statistics for comparison
    const [
      prevTotalVisits,
      prevUniqueGuests,
      prevNewGuests,
      prevInvitations,
      prevActivations
    ] = await Promise.all([
      prisma.visit.count({
        where: {
          checkedInAt: {
            not: null,
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      }),
      prisma.guest.count({
        where: {
          visits: {
            some: {
              checkedInAt: {
                not: null,
                gte: previousPeriodStart,
                lte: previousPeriodEnd
              }
            }
          }
        }
      }),
      prisma.guest.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      }),
      prisma.invitation.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      }),
      prisma.invitation.count({
        where: {
          qrIssuedAt: {
            not: null,
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      })
    ]);

    // Calculate conversion rates
    const invitationToActivationRate = totalInvitations > 0 ? 
      Math.round((qrActivations / totalInvitations) * 100) : 0;
    const activationToVisitRate = qrActivations > 0 ? 
      Math.round((totalVisits / qrActivations) * 100) : 0;

    // Calculate changes from previous period
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const report = {
      period: {
        type: period,
        startDate: periodStart,
        endDate: periodEnd,
        label: `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`
      },
      metrics: {
        totalVisits: {
          value: totalVisits,
          change: calculateChange(totalVisits, prevTotalVisits),
          previous: prevTotalVisits
        },
        uniqueGuests: {
          value: uniqueGuests,
          change: calculateChange(uniqueGuests, prevUniqueGuests),
          previous: prevUniqueGuests
        },
        newGuests: {
          value: newGuests,
          change: calculateChange(newGuests, prevNewGuests),
          previous: prevNewGuests
        },
        totalInvitations: {
          value: totalInvitations,
          change: calculateChange(totalInvitations, prevInvitations),
          previous: prevInvitations
        },
        qrActivations: {
          value: qrActivations,
          change: calculateChange(qrActivations, prevActivations),
          previous: prevActivations
        },
        overrideCount,
        blacklistAdditions,
        discountsSent
      },
      conversions: {
        invitationToActivation: invitationToActivationRate,
        activationToVisit: activationToVisitRate,
        overallConversion: totalInvitations > 0 ? 
          Math.round((totalVisits / totalInvitations) * 100) : 0
      },
      topHosts: topHosts.map(host => ({
        id: host.id,
        name: host.name,
        email: host.email,
        visitCount: host.hostedVisits.length
      })),
      demographics: {
        countries: countryStats.map(stat => ({
          country: stat.country || 'Unknown',
          count: stat._count.country
        })),
        contactMethods: contactMethodStats.map(stat => ({
          method: stat.contactMethod || 'Unknown',
          count: stat._count.contactMethod
        }))
      },
      systemHealth: {
        overrideRate: totalVisits > 0 ? Math.round((overrideCount / totalVisits) * 100) : 0,
        blacklistGrowth: blacklistAdditions,
        emailDeliveryRate: discountsSent > 0 ? 100 : 0 // Simplified for now
      },
      generatedAt: now
    };

    return NextResponse.json(report);

  } catch (error) {
    console.error('Error generating executive report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}