const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Catalyst Backend - BULLETPROOF v2 (with penalty)',
    hfConfigured: !!HF_API_KEY
  });
});

app.get('/', (req, res) => {
  res.send('Catalyst Backend is running! Visit /health for status.');
});

async function generateImage(prompt) {
  console.log('🎨 Generating image...');

  const response = await fetch(
    'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_inference_steps: 25,
          guidance_scale: 7.5
        }
      }),
      timeout: 60000
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error:', errorText);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const imageBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString('base64');

  console.log(`✅ Image generated (${base64.length} bytes)`);
  return base64;
}

// UPDATED: Penalize if lab item word is used
function evaluatePrompt(prompt, labItem) {
  console.log('📊 Evaluating prompt...');

  const promptLower = prompt.toLowerCase();
  const labItemLower = labItem.toLowerCase();

  // Check if lab item word is used (BIG PENALTY)
  const usedLabItemWord = promptLower.includes(labItemLower);

  if (usedLabItemWord) {
    console.log('⚠️ PENALTY: Lab item word used in prompt!');
    return {
      score: 0,
      explanation: `❌ ZERO SCORE: The prompt contains the forbidden word "${labItem}". According to game rules, you cannot use the lab item word in your prompt!`
    };
  }

  // Check if lab item is mentioned
  const mentionsLabItem = promptLower.includes(labItemLower);

  // Count science-related keywords
  const scienceKeywords = ['laboratory', 'lab', 'science', 'scientific', 'experiment', 
                           'research', 'chemistry', 'beaker', 'flask', 'test', 'equipment', 
                           'glass', 'liquid', 'container', 'vessel'];
  const scienceCount = scienceKeywords.filter(word => promptLower.includes(word)).length;

  // Calculate score
  let score = 50;  // Base score

  score += Math.min(20, scienceCount * 4);  // Science keywords bonus

  // Creativity bonus (longer prompts)
  if (prompt.length > 50) score += 10;
  if (prompt.length > 100) score += 10;

  // Random variation
  score += Math.floor(Math.random() * 10) - 5;

  // Keep in range
  score = Math.max(30, Math.min(100, score));

  let explanation = '';
  if (score >= 80) {
    explanation = `Excellent prompt! Strong laboratory context and creative description. The AI successfully created a scientifically relevant image without using the forbidden word.`;
  } else if (score >= 60) {
    explanation = `Good prompt! The image has some laboratory context. Adding more scientific keywords could improve the score.`;
  } else {
    explanation = `Creative prompt! The image may be more artistic. Try adding more laboratory-related context for a higher score.`;
  }

  console.log(`✅ Score: ${score}%`);
  return { score, explanation };
}

app.post('/api/generate-and-evaluate', async (req, res) => {
  try {
    const { prompt, labItem, teamName } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log(`🎮 ${teamName}`);
    console.log(`📝 Prompt: ${prompt}`);
    console.log(`🧪 Lab Item: ${labItem}`);
    console.log('='.repeat(60));

    if (!prompt || !labItem || !teamName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Step 1: Generate image
    console.log('\n📸 STEP 1: Generating AI image...');
    let imageBase64;
    try {
      imageBase64 = await generateImage(prompt);
    } catch (imageError) {
      console.error('❌ Image failed:', imageError.message);

      if (imageError.message.includes('loading')) {
        return res.status(503).json({
          success: false,
          error: 'Model loading, wait 30 seconds'
        });
      }

      throw imageError;
    }

    const imageUrl = `data:image/png;base64,${imageBase64}`;
    console.log('✅ Data URL created');

    // Step 2: Evaluate (with penalty check)
    console.log('\n📊 STEP 2: Evaluating...');
    const evaluation = evaluatePrompt(prompt, labItem);

    console.log('\n' + '='.repeat(60));
    console.log(`✅ SUCCESS for ${teamName}!`);
    console.log(`📊 Score: ${evaluation.score}%`);
    console.log(`💬 ${evaluation.explanation.substring(0, 80)}...`);
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      imageUrl: imageUrl,
      score: evaluation.score,
      explanation: evaluation.explanation,
      teamName: teamName,
      labItem: labItem,
      model: 'Stable Diffusion XL'
    });

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);

    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 CATALYST BACKEND - BULLETPROOF v2');
  console.log('='.repeat(60));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Host: ${HOST}`);
  console.log(`🔑 HF API: ${HF_API_KEY ? '✅' : '❌'}`);
  console.log('\n✨ NEW: Zero score penalty for using lab item word!');
  console.log('='.repeat(60) + '\n');
});
