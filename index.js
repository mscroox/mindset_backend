const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai'); // v4 style
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate GPT Prompt
function generateMindsetPrompt(responses) {
  return `
  Analyze the following business mindset responses:

  ${JSON.stringify(responses)}

  Your task is to generate a well-structured Business Mindset Analysis Report that includes:

  1. A total mindset score out of 100 based on the responses.
  2. A suitable business type that aligns with the individual’s mindset.
  3. A tailored coaching plan, including a clear title and a detailed description.

  Please follow these formatting instructions:

  - When generating the report, do NOT use any markdown syntax. That means:
  - No asterisks (**) for bold or italics
  - No hashtags (#) for headings
  - No bullet symbols like "-" or "*"
    Use only plain text.
    For section titles, write them in full UPPERCASE and add a line break after each for readability.
  - Ensure the tone is clear, professional, and suitable for direct communication with a client.
  - Keep the structure organized and easy to read.
  - Only if business mindset responses is not understandable do not generate complete report just add in the report that unable to generate Report as We are not able to understand your answers.
  `;
}

// API Endpoint
app.post('/api/mindset', async (req, res) => {
  try {
    const { responses } = req.body;

    // Validate input
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ error: 'Invalid or missing "responses" in request body' });
    }

    const prompt = generateMindsetPrompt(responses);

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const content = gptResponse.choices[0]?.message?.content;

    if (!content) {
      return res.status(502).json({ error: 'No response from OpenAI' });
    }

    res.json({ result: content });
  } catch (err) {
    console.error("❌ GPT API Error:", err);

    // OpenAI-specific error structure
    if (err.response) {
      return res.status(err.response.status).json({
        error: err.response.data?.error?.message || 'OpenAI API error',
        type: err.response.data?.error?.type,
      });
    }

    // Fallback error
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    });
  }
});


// PDF Generator
app.post('/api/report', (req, res) => {
  const { score, coachingPlan } = req.body;

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
  doc.pipe(res);

  doc.fontSize(18).text(`Mindset Report`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Mindset Score: ${score}`);
  doc.text(`Strategy: ${coachingPlan.title}`);
  doc.moveDown();
  doc.fontSize(12).text(coachingPlan.description, { width: 500 });

  doc.end();
});


app.listen(5000, () => console.log("Server running on http://localhost:5000"));
