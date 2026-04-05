export const COLUMN_DETECTION_SYSTEM_PROMPT = `You are a CSV column detection expert for a personal finance application.

Your task is to analyze CSV headers and sample data to identify the type of each column and detect the data formats used.

Column Types:
- date: Transaction date
- amount: Transaction amount (can be positive or negative)
- description: Transaction description or memo
- category: Transaction category (if present)
- payee: Merchant, vendor, or payee name
- notes: Additional notes or references
- unknown: Cannot determine type

For each column, provide:
1. The detected type
2. Confidence score (0-1)
3. Suggested field mapping for our database

Also detect:
- Date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
- Amount format (decimal separator, thousands separator, sign convention)

Return ONLY valid JSON matching this structure:
{
  "columns": [
    {
      "index": 0,
      "name": "Date",
      "detectedType": "date",
      "confidence": 0.98,
      "suggestedMapping": "date"
    }
  ],
  "dateFormat": "DD/MM/YYYY",
  "amountFormat": {
    "decimalSeparator": ".",
    "thousandsSeparator": ",",
    "isNegativeExpense": false
  }
}`;

export function createColumnDetectionPrompt(params: {
  headers: string[];
  sampleRows: string[][];
  context?: string;
}): string {
  const { headers, sampleRows, context } = params;
  
  let prompt = `Analyze this CSV data:\n\n`;
  
  if (context) {
    prompt += `Context: ${context}\n\n`;
  }
  
  prompt += `Headers: ${JSON.stringify(headers)}\n\n`;
  prompt += `Sample Rows (first ${sampleRows.length}):\n`;
  sampleRows.forEach((row, idx) => {
    prompt += `${idx + 1}. ${JSON.stringify(row)}\n`;
  });
  
  prompt += `\n\nAnalyze these columns and return the detection result in JSON format.`;
  
  return prompt;
}

export const DUPLICATE_DETECTION_SYSTEM_PROMPT = `You are a transaction duplicate detection expert.

Your task is to identify potential duplicate transactions by comparing new transactions with existing ones.

Match Types:
- exact: Perfect match on date, amount, and payee
- fuzzy: Very similar payee names, same date and amount
- semantic: Semantically similar transactions (e.g., "Amazon" vs "Amazon.com", "Starbucks #1234" vs "Starbucks #5678")

For each new transaction, identify potential duplicates and provide:
1. Similarity score (0-1)
2. Match type
3. Matched fields
4. Brief reasoning
5. Recommendation (skip/import/review)

Guidelines:
- Same date + same amount + similar payee (>0.8 similarity) = likely duplicate
- Transactions >30 days apart are rarely duplicates
- Round amounts (e.g., $100.00) are more likely to be different transactions
- Consider merchant name variations (e.g., "AMZN MKTP", "Amazon Marketplace")

Return ONLY valid JSON matching this structure:
{
  "results": [
    {
      "csvRowIndex": 0,
      "duplicates": [
        {
          "existingTransactionId": "abc123",
          "similarity": 0.95,
          "matchType": "semantic",
          "matchedFields": ["date", "amount", "payee"],
          "reasoning": "Same date and amount, payee 'Amazon.com' matches 'AMZN MKTP'"
        }
      ],
      "recommendation": "skip"
    }
  ]
}`;

export function createDuplicateDetectionPrompt(params: {
  newTransactions: Array<{
    date: string;
    amount: number;
    payee: string;
    description?: string;
  }>;
  existingTransactions: Array<{
    id: string;
    date: string;
    amount: number;
    payee: string;
    description?: string;
  }>;
}): string {
  const { newTransactions, existingTransactions } = params;
  
  let prompt = `Compare these new transactions against existing ones:\n\n`;
  
  prompt += `New Transactions:\n`;
  newTransactions.forEach((tx, idx) => {
    prompt += `${idx}. Date: ${tx.date}, Amount: ${tx.amount}, Payee: ${tx.payee}`;
    if (tx.description) prompt += `, Description: ${tx.description}`;
    prompt += `\n`;
  });
  
  prompt += `\n\nExisting Transactions (potential duplicates):\n`;
  existingTransactions.forEach((tx) => {
    prompt += `ID: ${tx.id}, Date: ${tx.date}, Amount: ${tx.amount}, Payee: ${tx.payee}`;
    if (tx.description) prompt += `, Description: ${tx.description}`;
    prompt += `\n`;
  });
  
  prompt += `\n\nIdentify potential duplicates and return the result in JSON format.`;
  
  return prompt;
}

export const CATEGORIZATION_SYSTEM_PROMPT = `You are a transaction categorization expert for a personal finance application.

Your task is to suggest appropriate categories for transactions based on the payee, description, amount, and learned patterns from past transactions.

Categorization Guidelines:
1. Use few-shot examples as the primary learning source
2. Common patterns:
   - Supermarkets, grocery stores → Groceries
   - Restaurants, cafes → Dining Out
   - Gas stations → Transportation
   - Utility companies → Utilities
   - Salary deposits → Income/Salary
   - Rent payments → Housing/Rent
3. Consider amount patterns (e.g., recurring same amounts are likely subscriptions)
4. For unclear transactions, provide multiple suggestions with lower confidence
5. NEVER create new categories - only use provided categories

For each transaction, provide:
1. Top 1-3 category suggestions
2. Confidence score for each (0-1)
3. Brief reasoning

Return ONLY valid JSON matching this structure:
{
  "results": [
    {
      "csvRowIndex": 0,
      "suggestions": [
        {
          "categoryId": "cat123",
          "categoryName": "Groceries",
          "confidence": 0.92,
          "reasoning": "Payee 'Whole Foods' is a supermarket"
        },
        {
          "categoryId": "cat456",
          "categoryName": "Dining Out",
          "confidence": 0.15,
          "reasoning": "Some grocery stores have prepared food sections"
        }
      ],
      "topSuggestion": {
        "categoryId": "cat123",
        "categoryName": "Groceries",
        "confidence": 0.92,
        "reasoning": "Payee 'Whole Foods' is a supermarket"
      }
    }
  ]
}`;

export function createCategorizationPrompt(params: {
  transactions: Array<{
    csvRowIndex: number;
    date: string;
    amount: number;
    payee: string;
    description?: string;
    notes?: string;
  }>;
  availableCategories: Array<{
    id: string;
    name: string;
  }>;
  fewShotExamples?: Array<{
    payee: string;
    description?: string;
    categoryId: string;
    categoryName: string;
  }>;
}): string {
  const { transactions, availableCategories, fewShotExamples } = params;
  
  let prompt = `Categorize these transactions:\n\n`;
  
  prompt += `Available Categories:\n`;
  availableCategories.forEach((cat) => {
    prompt += `- ${cat.id}: ${cat.name}\n`;
  });
  
  if (fewShotExamples && fewShotExamples.length > 0) {
    prompt += `\n\nLearned Patterns (use these as reference):\n`;
    fewShotExamples.forEach((example) => {
      prompt += `- Payee: "${example.payee}"`;
      if (example.description) prompt += `, Description: "${example.description}"`;
      prompt += ` → Category: ${example.categoryName} (${example.categoryId})\n`;
    });
  }
  
  prompt += `\n\nTransactions to Categorize:\n`;
  transactions.forEach((tx) => {
    prompt += `${tx.csvRowIndex}. Date: ${tx.date}, Amount: ${tx.amount}, Payee: "${tx.payee}"`;
    if (tx.description) prompt += `, Description: "${tx.description}"`;
    if (tx.notes) prompt += `, Notes: "${tx.notes}"`;
    prompt += `\n`;
  });
  
  prompt += `\n\nProvide category suggestions and return the result in JSON format.`;
  
  return prompt;
}
