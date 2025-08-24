import OpenAI from 'openai'

interface TitleGenerationOptions {
  maxTokens?: number
  temperature?: number
}

export const generateThreadTitle = async (
  firstMessage: string,
  options: TitleGenerationOptions = {}
): Promise<string> => {
  const { maxTokens = 10, temperature = 0.7 } = options

  if (!process.env.OPENAI_API_KEY) {
    return 'チャット'
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const prompt = `以下のメッセージの内容から、短い日本語のタイトルを生成してください。タイトルは5文字以内にして、内容を簡潔に表現してください。

メッセージ: "${firstMessage.substring(0, 200)}"

タイトル:`

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature,
      stop: ['\n']
    })

    const generatedTitle = response.choices[0]?.message?.content?.trim()

    if (generatedTitle && generatedTitle.length > 0) {
      return generatedTitle.length > 10 ? generatedTitle.substring(0, 10) : generatedTitle
    }

    return 'チャット'
  } catch (error) {
    console.error('Error generating thread title:', error)
    return 'チャット'
  }
}
