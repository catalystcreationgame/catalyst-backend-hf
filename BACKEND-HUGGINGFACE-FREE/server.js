const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'demo';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Catalyst Backend with Hugging Face is running!',
    hfConfigured: !!HF_API_KEY,
    cloudinaryConfigured: !!(CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)
  });
});

// Upload image to Cloudinary
async function uploadToCloudinary(base64Image) {
  const formData = new FormData();
  formData.append('file', 'data:image/png;base64,' + base64Image);
  formData.append('upload_preset', 'ml_default');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData
    }
  );

  const result = await response.json();
  return result.secure_url;
}

// Generate image with Stable Diffusion XL
async function generateImage(prompt) {
  console.log('Calling Hugging Face Stable Diffusion XL...');

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
          num_inference_steps: 30,
          guidance_scale: 7.5
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hugging Face error: ${response.status} - ${errorText}`);
  }

  const imageBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString('base64');

  return base64;
}

// Evaluate lab item with CLIP
async function evaluateWithCLIP(imageBase64, labItem) {
  console.log('Evaluating with CLIP...');

  const response = await fetch(
    'https://api-inference.huggingface.co/models/openai/clip-vit-large-patch14',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: imageBase64,
        parameters: {
          candidate_labels: [
            `a laboratory ${labItem}`,
            `a realistic ${labItem} used in scientific research`,
            `a scientific instrument ${labItem}`,
            `laboratory equipment`,
            `something unrelated to ${labItem}`
          ]
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`CLIP evaluation failed: ${response.status}`);
  }

  const result = await response.json();
  console.log('CLIP result:', result);

  // Calculate score from CLIP confidence scores
  const labItemScore1 = result[0]?.score || 0;
  const labItemScore2 = result[1]?.score || 0;
  const labItemScore3 = result[2]?.score || 0;
  const unrelatedScore = result[4]?.score || 0;

  // Average the lab item scores and subtract unrelated score
  const avgLabScore = (labItemScore1 + labItemScore2 + labItemScore3) / 3;
  const finalScore = Math.max(0, Math.min(100, Math.round((avgLabScore - unrelatedScore * 0.5) * 100)));

  let explanation = '';
  if (finalScore >= 70) {
    explanation = `The ${labItem} appears to be prominently featured in the image with high confidence (${Math.round(avgLabScore * 100)}%). The AI model recognizes clear laboratory equipment characteristics.`;
  } else if (finalScore >= 40) {
    explanation = `The ${labItem} may be present in the image with moderate confidence (${Math.round(avgLabScore * 100)}%). Some laboratory equipment features are detected but not prominently featured.`;
  } else {
    explanation = `The ${labItem} is not clearly visible or present in the image (confidence: ${Math.round(avgLabScore * 100)}%). The image may be more artistic or abstract rather than showing realistic laboratory equipment.`;
  }

  return { score: finalScore, explanation };
}

// Main endpoint
app.post('/api/generate-and-evaluate', async (req, res) => {
  try {
    const { prompt, labItem, teamName } = req.body;

    if (!prompt || !labItem || !teamName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: prompt, labItem, or teamName'
      });
    }

    console.log(`\n[${ new Date().toISOString()}] Processing request for ${teamName}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`Lab Item: ${labItem}`);

    // Step 1: Generate image with Stable Diffusion XL
    console.log('Step 1/3: Generating image...');
    const imageBase64 = await generateImage(prompt);
    console.log(`Image generated: ${imageBase64.length} bytes`);

    // Step 2: Upload to Cloudinary for permanent URL
    console.log('Step 2/3: Uploading to Cloudinary...');
    let imageUrl;
    try {
      imageUrl = await uploadToCloudinary(imageBase64);
      console.log(`Uploaded to: ${imageUrl}`);
    } catch (uploadError) {
      console.log('Cloudinary upload failed, using base64:', uploadError.message);
      // Fallback to base64 if Cloudinary fails
      imageUrl = `data:image/png;base64,${imageBase64}`;
    }

    // Step 3: Evaluate with CLIP
    console.log('Step 3/3: Evaluating lab item accuracy...');
    const evaluation = await evaluateWithCLIP(imageBase64, labItem);
    console.log(`Score: ${evaluation.score}%`);
    console.log(`Explanation: ${evaluation.explanation}`);

    res.json({
      success: true,
      imageUrl: imageUrl,
      score: evaluation.score,
      explanation: evaluation.explanation,
      teamName: teamName,
      labItem: labItem,
      model: 'Stable Diffusion XL + CLIP'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred'
    });
  }
});

// Test endpoint
app.post('/api/test', (req, res) => {
  console.log('Test request:', req.body);
  res.json({ 
    success: true, 
    message: 'Backend is working!',
    hfConfigured: !!HF_API_KEY
  });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, () => {
  console.log(`\n🚀 Catalyst Backend with Hugging Face`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Hugging Face API: ${HF_API_KEY ? 'Configured ✓' : 'Missing ✗'}`);
  console.log(`   Cloudinary: ${(CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) ? 'Configured ✓' : 'Not configured (will use base64)'}`);
  console.log(`\n   Models:`);
  console.log(`   - Image Generation: Stable Diffusion XL`);
  console.log(`   - Evaluation: CLIP (Vision-Language Model)`);
  console.log(`\n   Ready to generate images! 🎨\n`);
});
