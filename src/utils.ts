export const repairJson = (str: string) => {
  let repaired = str.trim();
  
  // 1. Handle unclosed strings
  let inString = false;
  let escaped = false;
  for (let i = 0; i < repaired.length; i++) {
    if (repaired[i] === '\\' && !escaped) {
      escaped = true;
    } else {
      if (repaired[i] === '"' && !escaped) {
        inString = !inString;
      }
      escaped = false;
    }
  }
  
  if (inString) {
    repaired += '"';
  }
  
  // 2. Handle unclosed braces/brackets
  const stack: string[] = [];
  inString = false;
  escaped = false;
  
  for (let i = 0; i < repaired.length; i++) {
    if (repaired[i] === '\\' && !escaped) {
      escaped = true;
    } else {
      if (repaired[i] === '"' && !escaped) {
        inString = !inString;
      } else if (!inString) {
        if (repaired[i] === '{' || repaired[i] === '[') {
          stack.push(repaired[i]);
        } else if (repaired[i] === '}' || repaired[i] === ']') {
          stack.pop();
        }
      }
      escaped = false;
    }
  }
  
  // Remove trailing commas before closing
  repaired = repaired.replace(/,\s*$/, '');
  
  while (stack.length > 0) {
    const char = stack.pop();
    if (char === '{') repaired += '}';
    else if (char === '[') repaired += ']';
  }
  
  return repaired;
};
