import { openAIClient } from '../openai'

const parseUserInputWithGPT = async (
  castContent: string,
) => {

const today = new Date();
today.setHours(today.getHours() + 8);
const todayFormatted = today.toISOString().split('T')[0];

const supportedCriteria = ['like', 'recast', 'like and recast'];
const supportedCriteriaText = supportedCriteria.join(', ');

const supportedRewardTokenTypes = ['USDC', 'DOGE', 'EGG'];

const systemPrompt = `
Given a description of a cast, extract and structure the key information into a JSON object format. The information to identify includes the deadline for participation, the criteria required for eligibility, the reward offered, the quantity of rewards available, the amount of reward token, and the type of reward token. If any information is missing from the cast description, explicitly state it as 'missing'. Ensure the cast content adheres to the following guidelines:
  1. **Deadline**: Must be in 'YYYY-MM-DD' format and set for a future date, including today. If the date provided is in the past or the format is incorrect, mark this field as 'invalid'. Notice today is ${todayFormatted}.
  2. **Criteria**: Participation criteria must be one of the following three values: ${supportedCriteriaText}. The criteria "like or recast" doesn't match the stipulated options. If the criteria provided do not match these options or are missing, state this field as 'missing' or 'invalid'.
  3. **Reward Count**: The number of rewards to be distributed. This must be a positive integer. If this information is not provided or is invalid (e.g., a non-integer value), mark this field as 'missing' or 'invalid'. If the reward field is provided, set this field to 1 by default.
  4. **Reward Token Amount**: The specific quantity of the reward token to be given, applicable when the reward involves a currency or a countable asset. If this detail is not provided or not applicable, explicitly state it as 'missing'.
  5. **Reward Token Type**: The type of reward token being offered (e.g., ${supportedRewardTokenTypes.join(', ')}). This should be specified when the reward involves a digital asset. If this detail is not provided or not applicable, explicitly state it as 'missing'.

Please structure your response as follows, adjusting the fields according to the cast content provided:
\`\`\`json
{
  "deadline": "<deadline or 'missing' or 'invalid'>",
  "criteria": "<criteria or 'missing' or 'invalid'>",
  "reward_count": "<reward_count or 'missing' or 'invalid'>",
  "reward_token_amount": "<reward_token_amount or 'missing'>",
  "reward_token_type": "<reward_token_type or 'missing'>"
}
\`\`\`
Example of a valid cast content response:
\`\`\`json
{
  "deadline": "2024-04-18",
  "criteria": "like",
  "reward_count": 1,
  "reward_token_amount": 100,
  "reward_token_type": "USDC"
}
\`\`\`
Another example:
\`\`\`json
{
  "deadline": "2024-03-26",
  "criteria": "like and recast",
  "reward_count": 10,
  "reward_token_amount": 3,
  "reward_token_type": "DOGE"
}
\`\`\`
Only respond with the JSON object containing the structured information. Do not include any additional information or context.`;


  const userPrompt = `
    user cast content: ${castContent}\n
    `

  const response = await openAIClient.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  })

  return response.choices[0].message.content
}

export { parseUserInputWithGPT }