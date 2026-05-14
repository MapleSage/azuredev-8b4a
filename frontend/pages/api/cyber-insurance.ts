import type { NextApiRequest, NextApiResponse } from "next";

const FASTAPI_ENDPOINT =
  process.env.NEXT_PUBLIC_FASTAPI_ENDPOINT || "http://127.0.0.1:8000";

interface CyberInsuranceRequest {
  action: "store_account" | "get_quote" | "chat";
  accountId?: string;
  region?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action, accountId, region, message }: CyberInsuranceRequest =
      req.body;

    if (action === "chat") {
      const response = await fetch(`${FASTAPI_ENDPOINT}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.authorization || "",
        },
        body: JSON.stringify({
          text: message || "I need help with cyber insurance",
          specialist: "CYBER_SPECIALIST",
          conversationId: `cyber-${Date.now()}`,
        }),
        signal: AbortSignal.timeout(
          Number(process.env.AGENTCORE_CHAT_TIMEOUT_MS || 45000),
        ),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    if (!accountId) {
      return res.status(400).json({ error: "Security profile ID is required" });
    }

    if (action === "store_account") {
      console.log(`Registered cyber evidence packet: ${accountId}, ${region}`);
      return res.status(200).json({
        success: true,
        message: "Security evidence packet registered successfully",
        nextSteps: [
          "Attach questionnaire, posture report, or incident evidence",
          "Review critical and high findings with the broker or underwriter",
          "Generate a guided quote for human review",
        ],
      });
    }

    if (action === "get_quote") {
      const quote = generateEnhancedQuote(accountId);
      return res.status(200).json(quote);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Cyber Insurance API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function generateEnhancedQuote(profileId: string) {
  const findings = getSecurityFindings(profileId);
  const totalCost =
    findings.critical * 1000 +
    findings.high * 500 +
    findings.medium * 100 +
    findings.low * 10 +
    findings.informational;

  const basePremium = 50000;
  const riskMultiplier = 1 + totalCost / 100000;
  const finalPremium = Math.round(basePremium * riskMultiplier);

  return {
    quote: `$${finalPremium.toLocaleString()} annual premium`,
    findings,
    riskAssessment: {
      riskLevel:
        totalCost > 10000 ? "HIGH" : totalCost > 5000 ? "MEDIUM" : "LOW",
      totalRiskScore: totalCost,
      recommendations: generateRecommendations(findings),
    },
    coverage: {
      dataBreachResponse: "$1,000,000",
      businessInterruption: "$500,000",
      cyberExtortion: "$250,000",
      regulatoryFines: "$100,000",
    },
  };
}

function getSecurityFindings(profileId: string) {
  const seed = profileId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    critical: Math.floor((seed % 3) + 1),
    high: Math.floor((seed % 8) + 3),
    medium: Math.floor((seed % 15) + 8),
    low: Math.floor((seed % 25) + 15),
    informational: Math.floor((seed % 40) + 25),
  };
}

function generateRecommendations(findings: any) {
  const recommendations = [];

  if (findings.critical > 0) {
    recommendations.push(
      "Address critical security findings before binding coverage",
    );
  }
  if (findings.high > 5) {
    recommendations.push(
      "Confirm multi-factor authentication and privileged access controls",
    );
  }
  if (findings.medium > 10) {
    recommendations.push(
      "Document logging, monitoring, backup, and incident-response controls",
    );
  }

  recommendations.push(
    "Schedule periodic security assessment and evidence refresh",
  );
  recommendations.push(
    "Prepare employee awareness and breach-response training evidence",
  );

  return recommendations;
}
