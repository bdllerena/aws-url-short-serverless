import { Handler } from 'aws-lambda';
import { v4 as generator } from 'uuid';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB();

let shortName = function(counter: number): string{
    const base62: string = generator();
    const base62Length: number = base62.length;
    let shortName: string = '';

    while (counter) {
        let leftOver: number = counter % base62Length;
        counter = Math.floor(counter / base62Length);
        shortName = base62[leftOver].toString() + shortName;
    }

    return shortName;
}

let addHttpPrefix = function (url:string): string{
  if (!/^(f|ht)tps?:\/\//i.test(url)) {
      url = "http://" + url;
  }
  return url;
}

export const short: Handler = (event: any, context: any) => {

    let body: any = JSON.parse(event.body)
    let dynamoParams: any = {
        Key: {
            'name': {
                S: `${process.env.APPLICATION_NAME}`,
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
            let s3Params = {
                Bucket: `${process.env.S3_NAME}`,
                Key: shortName(Number(data.Attributes.counterValue.N)),
                ACL: 'public-read',
                Body: '',
                ContentType: 'text/html',
                WebsiteRedirectLocation: addHttpPrefix(body.url)
            };
            
            s3.putObject(s3Params, function (err) {
                if (err) context.fail(err, err.stack);
                else
                    context.succeed({ "shortUrl": `${process.env.DOMAIN}` + s3Params.Key });
            });

        }

    });
}