import { openAIClient } from '../openai'

const parseUserInputWithGPT = async (castContent: string) => {
  const today = new Date()
  today.setHours(today.getHours() + 8)
  const todayFormatted = today.toISOString().split('T')[0]

  const supportedCriteria = ['like', 'recast', 'like and recast']
  const supportedCriteriaText = supportedCriteria.join(', ')

  const supportedAwardTokenTypes = ['USDC', 'DOGE', 'EGG']

  const systemPrompt = `
Given a description of a cast, extract and structure the key information into a JSON object format. The information to identify includes the deadline for participation, the criteria required for eligibility, the award offered, the quantity of awards available, the amount of award token, and the type of award token. If any information is missing from the cast description, explicitly state it as 'missing'. Ensure the cast content adheres to the following guidelines:
  1. **Deadline**: Must be in 'YYYY-MM-DD' format and set for a future date, including today. If the date provided is in the past or the format is incorrect, mark this field as 'invalid'. Notice today is ${todayFormatted}.
  2. **Criteria**: Participation criteria must be one of the following three values: ${supportedCriteriaText}. The criteria "like or recast" doesn't match the stipulated options. If the criteria provided do not match these options or are missing, state this field as 'missing' or 'invalid'.
  3. **Total Awardees**: The number of awards to be distributed. This must be a positive integer. If this information is not provided or is invalid (e.g., a non-integer value), mark this field as 'missing' or 'invalid'. If the award field is provided, set this field to 1 by default.
  4. **Total Award**: The specific quantity of the award token to be given, applicable when the award involves a currency or a countable asset. If this detail is not provided or not applicable, explicitly state it as 'missing'.
  5. **Token**: The type of award token being offered (e.g., ${supportedAwardTokenTypes.join(', ')}). This should be specified when the award involves a digital asset. If this detail is not provided or not applicable, explicitly state it as 'missing'.

Please structure your response as follows, adjusting the fields according to the cast content provided:
\`\`\`json
{
  "deadline": "<deadline or 'missing' or 'invalid'>",
  "criteria": "<criteria or 'missing' or 'invalid'>",
  "total_awardees": "<total_awardees or 'missing' or 'invalid'>",
  "total_award": "<total_award or 'missing' or 'invalid'>",
  "token": "<token or 'missing' or 'invalid'>"
}
\`\`\`
Example of a valid cast content response:
\`\`\`json
{
  "deadline": "2024-04-18",
  "criteria": "like",
  "total_awardees": 1,
  "total_award": 100,
  "token": "USDC"
}
\`\`\`
Another example:
\`\`\`json
{
  "deadline": "2024-03-26",
  "criteria": "like and recast",
  "total_awardees": 10,
  "total_award": 3,
  "token": "DOGE"
}
\`\`\`
Only respond with the JSON object containing the structured information. Do not include any additional information or context.`

  const userPrompt = `
    user cast content: ${castContent}\n
    `

  const response = await openAIClient.chat.completions.create({
    model: 'gpt-3.5-turbo',
    response_format: { type: 'json_object' },
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
