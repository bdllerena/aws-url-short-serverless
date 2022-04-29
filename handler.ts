import { Handler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import * as AWS from 'aws-sdk';

AWS.config.region = 'us-east-1';
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB();


const domain: string = "http://cmcloudlab544.info/";
const application: string = "url_shortner";

let shortName = function(counter: number): string{
    const base62: string = uuidv4();
    const base62Length = base62.length;
    let shortName: string = '';

    while (counter) {
        let leftOver: number = counter % base62Length;
        counter = Math.floor(counter / base62Length);
        shortName = base62[leftOver].toString() + shortName;
    }

    return shortName;
}

export const short: Handler = (event: any, context: any) => {

    let body: any = JSON.parse(event.body)
    let dynamoParams: any = {
        Key: {
            'name': {
                S: application
            }
        },
        TableName: `${process.env.DYNAMO_ATOMIC}`,
        UpdateExpression: 'SET counterValue = counterValue  + :increment',
        ExpressionAttributeValues: {
            ":increment": { N: "1" }
        },
        ReturnValues: "ALL_NEW"
    };

    dynamodb.updateItem(dynamoParams, function (err, data) {
        if (err) context.fail(err, err.stack);
        else {
            var s3Params = {
                Bucket: `${process.env.S3_BUCKET}`,
                Key: shortName(Number(data.Attributes.counterValue.N)),
                ACL: 'public-read',
                Body: '',
                ContentType: 'text/html',
                WebsiteRedirectLocation: body.url
            };

            // put our zero-length object to our S3 bucket
            s3.putObject(s3Params, function (err, data) {
                if (err) context.fail(err, err.stack);
                else
                    context.succeed({ "shortUrl": domain + s3Params.Key });
            });

        }

    });
}