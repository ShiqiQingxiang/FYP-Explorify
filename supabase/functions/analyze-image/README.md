# Image Analysis with AWS Rekognition

This Supabase Edge Function analyzes images using AWS Rekognition Custom Labels to verify that a user's submitted image matches the requirements for a specific tourist attraction task.

## Deployment

To deploy this function, use the Supabase CLI:

```bash
supabase functions deploy analyze-image --project-ref your-project-id
```

## Environment Variables

The function requires the following environment variables:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: AWS region (e.g., us-east-1)
- `AWS_ACCOUNT_ID`: Your AWS account ID

Set these using the Supabase dashboard or CLI:

```bash
supabase secrets set AWS_ACCESS_KEY_ID=your_access_key --project-ref your-project-id
supabase secrets set AWS_SECRET_ACCESS_KEY=your_secret_key --project-ref your-project-id
supabase secrets set AWS_REGION=us-east-1 --project-ref your-project-id
supabase secrets set AWS_ACCOUNT_ID=123456789012 --project-ref your-project-id
```

## Usage

Send a POST request to the function with a JSON body containing:

```json
{
  "imageUrl": "https://your-supabase-storage-url/image.jpg",
  "taskId": "uuid-of-tourist-spot",
  "spotName": "Name of the tourist spot"
}
```

The function will return a JSON object with verification results:

```json
{
  "success": true,
  "isCompleted": true,
  "confidence": 95.2,
  "matchedLabels": ["mountain", "lake"],
  "allDetectedLabels": [...]
}
```

## AWS Rekognition Setup

1. Train Custom Labels models for each tourist attraction
2. Start each model before using the function
3. Update the `tourist_spots` table with model names and required labels

## Database Schema

The function expects:

1. A `tourist_spots` table with:
   - `id`: UUID
   - `task_model_name`: Name of the AWS Rekognition model (optional)
   - `task_requirements`: JSONB array of required labels

2. A `user_tasks` table for storing completed tasks 