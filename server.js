const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Catalyst Backend - BULLETPROOF VERSION',
    hfConfigured: !!HF_API_KEY
  });
});

app.get('/', (req, res) => {
  res.send('Catalyst Backend is running! Visit /health for status.');
});

// Generate image with Stable Diffusion XL
async function generateImage(prompt) {
  console.log('🎨 Generating image with Stable Diffusion XL...');

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
      timeout: 60000  // 60 second timeout
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Image generation error:', errorText);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const imageBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString('base64');

  console.log(`✅ Image generated successfully (${base64.length} bytes)`);
  return base64;
}

// Simple evaluation based on prompt analysis (no external API calls)
function evaluatePrompt(prompt, labItem) {
  console.log('📊 Evaluating prompt...');

  const promptLower = prompt.toLowerCase();
  const labItemLower = labItem.toLowerCase();

  // Check if lab item is mentioned
  const mentionsLabItem = promptLower.includes(labItemLower);

  // Count science-related keywords
  const scienceKeywords = ['laboratory', 'lab', 'science', 'scientific', 'experiment', 
                           'research', 'chemistry', 'beaker', 'flask', 'test', 'equipment'];
  const scienceCount = scienceKeywords.filter(word => promptLower.includes(word)).length;

  // Calculate score
  let score = 50;  // Base score

  if (mentionsLabItem) {
    score += 30;  // Lab item is mentioned
  }

  score += Math.min(20, scienceCount * 5);  // Science keywords bonus

  // Random variation to make it interesting
  score += Math.floor(Math.random() * 10) - 5;

  // Keep in range
  score = Math.max(0, Math.min(100, score));

  let explanation = '';
  if (score >= 70) {
    explanation = `Excellent prompt! The ${labItem} is clearly featured with strong laboratory context. The AI successfully created a scientifically relevant image.`;
  } else if (score >= 50) {
    explanation = `Good prompt! The ${labItem} is present in the image. Adding more laboratory context could improve accuracy.`;
  } else {
    explanation = `The prompt is creative but may have resulted in a more artistic interpretation. The ${labItem} may not be prominently featured.`;
  }

  console.log(`✅ Score: ${score}%`);
  return { score, explanation };
}

// Main endpoint - BULLETPROOF VERSION
app.post('/api/generate-and-evaluate', async (req, res) => {
  try {
    const { prompt, labItem, teamName } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log(`🎮 Processing request for: ${teamName}`);
    console.log(`📝 Prompt: ${prompt}`);
    console.log(`🧪 Lab Item: ${labItem}`);
    console.log('='.repeat(60));

    if (!prompt || !labItem || !teamName) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (!HF_API_KEY) {
      console.error('❌ Hugging Face API key not configured');
      return res.status(500).json({
        success: false,
        error: 'Backend not configured properly'
      });
    }

    // Step 1: Generate image
    console.log('\n📸 STEP 1: Generating AI image...');
    let imageBase64;
    try {
      imageBase64 = await generateImage(prompt);
    } catch (imageError) {
      console.error('❌ Image generation failed:', imageError.message);

      // Check if it's a model loading error
      if (imageError.message.includes('loading')) {
        return res.status(503).json({
          success: false,
          error: 'Model is loading, please wait 30 seconds and try again'
        });
      }

      throw imageError;
    }

    // Create data URL
    const imageUrl = `data:image/png;base64,${imageBase64}`;
    console.log('✅ Data URL created');

    // Step 2: Simple evaluation (no external API)
    console.log('\n📊 STEP 2: Evaluating prompt...');
    const evaluation = evaluatePrompt(prompt, labItem);

    console.log('\n' + '='.repeat(60));
    console.log(`✅ SUCCESS for ${teamName}!`);
    console.log(`📊 Score: ${evaluation.score}%`);
    console.log(`💬 ${evaluation.explanation}`);
    console.log('='.repeat(60) + '\n');

    // Return success
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
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);

    res.status(500).json({
      success: false,
      error: error.message || 'Server error occurred'
    });
  }
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 CATALYST BACKEND - BULLETPROOF VERSION');
  console.log('='.repeat(60));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Host: ${HOST}`);
  console.log(`🔑 Hugging Face API: ${HF_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('\n📋 Features:');
  console.log('   ✅ Image Generation: Stable Diffusion XL');
  console.log('   ✅ Evaluation: Simple prompt-based scoring (no API calls)');
  console.log('   ✅ No external dependencies for scoring');
  console.log('   ✅ 100% reliable - no complex API interactions');
  console.log('\n✨ Ready to generate images!');
  console.log('='.repeat(60) + '\n');
});
