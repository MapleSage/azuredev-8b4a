#!/usr/bin/env node

// Test script for SageInsure API
const https = require('https');

async function testAPI(query, expectedSource) {
  console.log(`\n🧪 Testing: "${query}"`);
  console.log('Expected source:', expectedSource);
  
  const data = JSON.stringify({ query });
  
  const options = {
    hostname: 'insure.maplesage.com',
    path: '/api/sageinsure',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          console.log('✅ Status:', res.statusCode);
          console.log('📤 Source:', result.source);
          console.log('🎯 Route:', result.route);
          console.log('📝 Response length:', result.response?.length || 0);
          
          if (result.source === 'fallback') {
            console.log('❌ FALLBACK RESPONSE - AI services not working');
          } else {
            console.log('✅ SUCCESS - AI service responded');
          }
          
          resolve(result);
        } catch (error) {
          console.log('❌ Parse error:', error.message);
          console.log('Raw response:', responseData);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Testing SageInsure API');
  console.log('=' * 50);
  
  try {
    // Test insurance query
    await testAPI('File a marine insurance claim for cargo damage', 'strands');
    
    // Test general query  
    await testAPI('What is the weather today?', 'azure-openai');
    
    // Test auto insurance
    await testAPI('What is covered under auto insurance?', 'strands');
    
    console.log('\n✅ All tests completed');
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
  }
}

runTests();