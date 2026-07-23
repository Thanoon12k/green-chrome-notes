/* =========================================================
   AI Notes — Groq API Wrapper
   ========================================================= */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const GroqAPI = {
  async call(messages, apiKey, model = 'llama-3.1-8b-instant') {
    if (!apiKey) throw new Error('No Groq API key. Please open Settings and add your key.');
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens: 512, temperature: 0.4 })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Groq API error: ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  },

  async analyzeNote({ content, url, pageTitle, type, apiKey, model, existingGroups }) {
    const groupList = (existingGroups || []).map(g => g.name).join(', ') || 'Research, Ideas, Links, Code Snippets, Images';
    const prompt = `You are an AI notes organizer. Analyze the following content captured from a browser tab.

Content type: ${type || 'text'}
Page title: ${pageTitle || 'Unknown'}
URL: ${url || 'Unknown'}
Content: ${(content || '').slice(0, 1200)}

Return ONLY valid JSON (no explanation) in this exact format:
{
  "caption": "One clear sentence summarizing this content",
  "tags": ["tag1", "tag2", "tag3"],
  "group": "Best matching group from: ${groupList}"
}

Rules:
- caption: 1 sentence, max 100 chars, informative
- tags: 2-4 short lowercase tags, relevant keywords
- group: pick the single best group from the list above`;

    const text = await this.call(
      [{ role: 'user', content: prompt }],
      apiKey, model
    );

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {}

    return {
      caption: `Note from ${pageTitle || url || 'web'}`,
      tags: ['saved', 'web'],
      group: 'Research'
    };
  }
};

if (typeof window !== 'undefined') window.GroqAPI = GroqAPI;
