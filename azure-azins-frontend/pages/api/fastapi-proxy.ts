import type { NextApiRequest, NextApiResponse } from "next";
import AWS from "aws-sdk";

const lambda = new AWS.Lambda({ region: "us-east-1" });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const payload = {
      text: req.body.text,
      conversationId: req.body.conversationId || "web-session",
      specialist: req.query.agent || "POLICY_ASSISTANT"
    };

    const result = await lambda.invoke({
      FunctionName: "sageinsure-strands-agent",
      Payload: JSON.stringify(payload)
    }).promise();

    if (result.Payload) {
      const response = JSON.parse(result.Payload.toString());
      if (response.body) {
        const body = JSON.parse(response.body);
        res.status(200).json(body);
      } else {
        res.status(200).json(response);
      }
    } else {
      throw new Error("No response from Lambda");
    }
  } catch (error: any) {
    res.status(502).json({
      error: "Lambda function error",
      detail: error.message
    });
  }
}