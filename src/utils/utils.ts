import { Response } from 'express';
import OpenAI from 'openai';

export async function streamChatCompletion(
  openai: OpenAI, 
  anonymizedPrompt: string, 
  res: Response, 
  originalToAnonymizedMap?: Map<string, string>
) {
  console.log(`Prompt: ${anonymizedPrompt}`);

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: anonymizedPrompt }],
    stream: true,
  });

  // Accumulated content for batch processing if we have mappings
  let accumulatedContent = '';
  
  // Initialize tracking variables
  if (!res.locals.sentLength) {
    res.locals.sentLength = 0;
  }

  for await (const chunk of stream) {
    let content = chunk.choices[0]?.delta?.content || '';
    
    // If we have a mapping of anonymized values, store content for later replacement
    if (originalToAnonymizedMap && originalToAnonymizedMap.size > 0) {
      // Add the new content to our accumulated buffer
      accumulatedContent += content;
      
      // Replace anonymized values with original values in accumulated content
      const deanonymizedContent = replaceAnonymizedValues(accumulatedContent, originalToAnonymizedMap);
      
      // Only send the difference (what's new after deanonymization)
      const diff = deanonymizedContent.slice(res.locals.sentLength);
      if (diff) {
        res.write(`data: ${diff}\n\n`);
        res.locals.sentLength = deanonymizedContent.length;
      }
    } else {
      // Original behavior if no mapping provided
      res.write(`data: ${content}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

function replaceAnonymizedValues(text: string, originalToAnonymizedMap: Map<string, string>): string {
  let result = text;
  
  // First, sort the anonymized values by length (descending) to replace longer patterns first
  const replacements = [...originalToAnonymizedMap.entries()]
    .sort((a, b) => b[1].length - a[1].length);
  
  // Special handling for [PERSON] token which often gets split across chunks
  // Look for any occurrence of "[" followed by partial "PERSON]" text
  result = result.replace(/\[(P|PE|PER|PERS|PERSO|PERSON)?(\])?/g, (match) => {
    // Find the original person name from the map
    const personEntry = replacements.find(([_, anon]) => anon === '[PERSON]');
    if (personEntry) {
      if (match === '[PERSON]') {
        return personEntry[0]; // Full match - return the complete original
      } else if (match === '[') {
        return personEntry[0]; // Just the opening bracket - replace with full name
      } else {
        // Partial match - handle appropriately
        return personEntry[0];
      }
    }
    return match; // If no match found in the map, return unchanged
  });
  
  // Handle regular replacements for other types of anonymized data
  for (const [original, anonymized] of replacements) {
    // Skip [PERSON] as we already handled it
    if (anonymized === '[PERSON]') continue;
    
    // Escape special regex characters
    const escapedAnonymized = anonymized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create a regex that can match the anonymized value
    result = result.replace(new RegExp(escapedAnonymized, 'g'), original);
  }
  
  return result;
}