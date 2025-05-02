import { Handler } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({ region: process.env.REGION });
const QUEUE_B_URL = process.env.QUEUE_B_URL;

export const handler: Handler = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    // SNS -> Lambda 事件格式: event.Records
    for (const record of event.Records || []) {
      let message = record.Sns ? JSON.parse(record.Sns.Message) : {};
      // 如果缺少email字段，则推送到Queue B
      if (!message.email) {
        if (QUEUE_B_URL) {
          await sqsClient.send(
            new SendMessageCommand({
              QueueUrl: QUEUE_B_URL,
              MessageBody: JSON.stringify(message),
            })
          );
          console.log("Message sent to Queue B", message);
        } else {
          console.error("QUEUE_B_URL is not set in environment variables");
        }
      }
    }
  } catch (error: any) {
    console.error("LambdaY error:", error);
    throw new Error(JSON.stringify(error));
  }
};
