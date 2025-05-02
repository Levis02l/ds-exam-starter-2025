import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    
    const pathParameters = event?.pathParameters;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing movie ID parameter" }),
      };
    }

    const queryStringParameters = event.queryStringParameters;
    const role = queryStringParameters?.role;

    const queryParams = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: role 
        ? "movieId = :movieId AND #role = :role"
        : "movieId = :movieId",
      ExpressionAttributeValues: role
        ? {
            ":movieId": movieId,
            ":role": role,
          }
        : {
            ":movieId": movieId,
          },
      ExpressionAttributeNames: role ? { "#role": "role" } : undefined,
    };

    const response = await ddbDocClient.send(new QueryCommand(queryParams));
    if (!response.Items || response.Items.length === 0) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          message: role 
            ? `No crew member found for role '${role}' in movie ${movieId}`
            : `No crew members found for movie ${movieId}`
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: response.Items
      }),
    };
  } catch (error: any) {
    console.log("[ERROR]", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 
        message: "Internal server error",
        error: error.message 
      }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
