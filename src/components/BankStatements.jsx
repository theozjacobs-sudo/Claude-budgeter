import { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js - use unpkg which is more reliable
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const STORAGE_KEY = 'budget-planner-transactions';
const FIXED_EXPENSES_KEY = 'budget-planner-fixed-expenses';
const LEARNED_CATEGORIES_KEY = 'budget-planner-learned-categories';
const INCOME_KEY = 'budget-planner-income';

// Default income (bi-weekly salary)
const DEFAULT_INCOME = {
  biweekly: 2522.97,
  payFrequency: 'biweekly', // biweekly, weekly, monthly
};

// Default fixed expenses - distinct colors for better visibility
const DEFAULT_FIXED_EXPENSES = [
  { id: 1, name: 'Rent', amount: 2425, color: '#6366f1' },       // Indigo
  { id: 2, name: 'Utilities', amount: 80, color: '#f59e0b' },    // Amber
  { id: 3, name: 'Internet', amount: 20, color: '#10b981' },     // Emerald
  { id: 4, name: 'Phone', amount: 45, color: '#3b82f6' },        // Blue
  { id: 5, name: 'Insurance', amount: 150, color: '#ef4444' },   // Red
];

// Load learned categories from localStorage
function getLearnedCategories() {
  try {
    const saved = localStorage.getItem(LEARNED_CATEGORIES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Save a learned category mapping (saves both exact and core merchant name)
function learnCategory(description, category) {
  const learned = getLearnedCategories();
  // Save exact description
  const key = description.toLowerCase().trim();
  learned[key] = category;

  // Also save the core merchant name for fuzzy matching
  const { coreName } = extractCoreMerchantName(description);
  if (coreName && coreName !== key && coreName.length >= 3) {
    learned[coreName] = category;
  }

  localStorage.setItem(LEARNED_CATEGORIES_KEY, JSON.stringify(learned));
}

// Category definitions with keywords for auto-categorization
// Includes international terms (Italian, Spanish, French, German)
const CATEGORIES = {
  'Groceries': [
    'grocery', 'safeway', 'trader joe', 'whole foods', 'kroger', 'walmart', 'target', 'costco', 'aldi', 'publix', 'wegmans', 'heb', 'food', 'market',
    // International
    'supermercato', 'supermarket', 'mercado', 'carrefour', 'lidl', 'tesco', 'sainsbury', 'coop', 'esselunga', 'conad', 'simply', 'eurospin'
  ],
  'Coffee & Bakery': [
    'coffee', 'starbucks', 'dunkin', 'peets', 'blue bottle', 'philz', 'intelligentsia', 'la colombe', 'tim hortons',
    'bakery', 'bakehouse', 'patisserie', 'boulangerie', 'pasticceria', 'panetteria', 'bagel', 'donut', 'doughnut', 'croissant',
    'cafe', 'caffè', 'caffe', 'espresso'
  ],
  'Dining': [
    'restaurant', 'mcdonald', 'chipotle', 'doordash', 'uber eats', 'grubhub', 'seamless', 'postmates', 'pizza', 'burger', 'taco', 'sushi', 'thai', 'indian', 'chinese', 'mexican',
    // Italian
    'trattoria', 'ristorante', 'osteria', 'pizzeria', 'locanda', 'taverna', 'gelateria', 'rosticceria',
    // Other international
    'brasserie', 'bistro', 'gasthaus', 'cerveceria', 'tapas', 'lido'
  ],
  'Clubs': [
    'nightclub', 'club', 'lounge', 'discotheque', 'disco', 'velvet', 'marquee', 'lavo', 'tao', '1oak', 'avenue', 'up&down',
    'house of yes', 'elsewhere', 'avant gardner', 'good room', 'nowadays', 'superior ingredients', 'basement', 'mirage'
  ],
  'Bikes & Scooters': [
    'citibike', 'citi bike', 'citibik', 'lime', 'bird', 'spin', 'veo', 'link', 'helbiz', 'revel', 'scoot', 'jump', 'lyft bike', 'uber bike', 'divvy', 'capital bikeshare', 'bluebikes', 'bay wheels'
  ],
  'Transport': [
    'uber', 'lyft', 'gas', 'shell', 'chevron', 'exxon', 'bp', 'parking', 'transit', 'metro', 'subway', 'bart', 'caltrain', 'amtrak',
    // International
    'eni', 'agip', 'total', 'repsol', 'autostrada', 'trenitalia', 'italo', 'flixbus', 'renfe', 'sncf'
  ],
  'Shopping': [
    'amazon', 'ebay', 'etsy', 'clothing', 'shoes', 'nordstrom', 'macys', 'gap', 'old navy', 'zara', 'h&m', 'uniqlo', 'best buy', 'apple store',
    // Art/crafts
    'artwork', 'gallery', 'arte', 'artisan'
  ],
  'Entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'hbo', 'movie', 'theater', 'concert', 'ticket', 'game', 'steam', 'playstation', 'xbox', 'cinema', 'museo', 'museum'],
  'Health': [
    'pharmacy', 'cvs', 'walgreens', 'doctor', 'medical', 'hospital', 'dental', 'vision', 'gym', 'fitness',
    // International
    'farmacia', 'apotheke', 'pharmacie', 'clinica', 'ospedale'
  ],
  'Bills': ['electric', 'water', 'gas bill', 'internet', 'phone', 'verizon', 'at&t', 't-mobile', 'comcast', 'insurance', 'comune', 'municipality', 'ayuntamiento'],
  'Subscriptions': ['subscription', 'monthly', 'annual', 'membership', 'patreon', 'substack'],
  'Bars': [
    'bar', 'pub', 'brewery', 'tavern', 'wine', 'liquor', 'beer', 'cocktail',
    // International
    'enoteca', 'birreria', 'cantina', 'bodega'
  ],
  'Travel': [
    'airline', 'hotel', 'airbnb', 'vrbo', 'booking', 'expedia', 'flight', 'united', 'delta', 'american airlines', 'southwest',
    // International accommodations
    'hostel', 'hostelworld', 'b&b', 'albergo', 'pensione', 'agriturismo', 'resort', 'motel',
    // Travel sites
    'kayak', 'skyscanner', 'tripadvisor', 'hotels.com', 'ryanair', 'easyjet', 'lufthansa', 'alitalia'
  ],
  // Credit card payments - not actual expenses, just paying off the card
  'Payment': [
    'payment thank you', 'payment-thank you', 'payment thank', 'autopay', 'auto pay', 'automatic payment', 'balance payment', 'statement credit', 'rewards redemption', 'cashback', 'cash back reward'
  ],
  'Other': []
};

const CATEGORY_COLORS = {
  'Groceries': '#22c55e',
  'Coffee & Bakery': '#d97706', // Amber/brown for coffee
  'Dining': '#f97316',
  'Clubs': '#a855f7', // Purple for nightlife
  'Bikes & Scooters': '#10b981',
  'Transport': '#3b82f6',
  'Shopping': '#ec4899',
  'Entertainment': '#8b5cf6',
  'Health': '#14b8a6',
  'Bills': '#64748b',
  'Subscriptions': '#6366f1',
  'Bars': '#eab308',
  'Travel': '#06b6d4',
  'Payment': '#4ade80',
  'Rent': '#475569', // Slate gray for rent
  'Other': '#9ca3af',
  'Rent + Utils': '#475569', // Slate gray for fixed expenses
};

// Fixed monthly expenses
const FIXED_MONTHLY_EXPENSE = 2525;

// Categories to exclude from expense calculations (not real spending)
const EXCLUDED_FROM_EXPENSES = ['Payment'];

// Smart categorization hints based on common merchant prefixes/patterns
const SMART_HINTS = {
  // Square merchants (SQ *) - usually food/retail
  'sq *': { likely: ['Dining', 'Groceries', 'Shopping'], hint: 'Square POS - likely food or retail' },
  'sq*': { likely: ['Dining', 'Groceries', 'Shopping'], hint: 'Square POS' },
  // Toast POS (TST*) - restaurants
  'tst*': { likely: ['Dining'], hint: 'Toast POS - restaurant' },
  'tst *': { likely: ['Dining'], hint: 'Toast POS - restaurant' },
  // Clover POS
  'clover*': { likely: ['Dining', 'Shopping'], hint: 'Clover POS' },
  // Common delivery
  'doordash': { likely: ['Dining'], hint: 'Food delivery' },
  'uber eats': { likely: ['Dining'], hint: 'Food delivery' },
  'grubhub': { likely: ['Dining'], hint: 'Food delivery' },
  'seamless': { likely: ['Dining'], hint: 'Food delivery' },
  'postmates': { likely: ['Dining'], hint: 'Food delivery' },
  'caviar': { likely: ['Dining'], hint: 'Food delivery' },
};

// Extract core merchant name by removing location, prefixes, and suffixes
function extractCoreMerchantName(description) {
  let name = description.toLowerCase().trim();

  // Remove common POS prefixes but keep them for pattern matching
  const prefixMatch = name.match(/^(sq \*|sq\*|tst\*|tst \*|clover\*)\s*/i);
  const prefix = prefixMatch ? prefixMatch[1] : '';
  if (prefix) {
    name = name.slice(prefix.length).trim();
  }

  // Remove location patterns (city, state abbreviations at end)
  // Patterns: "New York NY", "BROOKLYN NY", "Long Valley NJ", "CA", "800-123-4567"
  name = name
    .replace(/\s+\d{3}[-.]?\d{3}[-.]?\d{4}\s*$/i, '') // phone numbers
    .replace(/\s+[A-Z]{2}\s*$/i, '') // state abbreviations at end
    .replace(/\s+(new york|brooklyn|manhattan|queens|bronx|los angeles|san francisco|chicago|boston|seattle|austin|denver|miami|atlanta)\s*[a-z]{0,2}\s*$/i, '') // common cities
    .replace(/\s+[a-z]+\s+[a-z]{2}\s*$/i, '') // "City ST" pattern
    .replace(/\s*#\d+\s*$/i, '') // store numbers like #123
    .replace(/\s+\d+\s*$/i, '') // trailing numbers
    .replace(/\s+/g, ' ')
    .trim();

  return { coreName: name, prefix };
}

// Get smart hint for a description
function getSmartHint(description) {
  const lower = description.toLowerCase();
  for (const [pattern, hint] of Object.entries(SMART_HINTS)) {
    if (lower.includes(pattern)) {
      return hint;
    }
  }
  return null;
}

function categorizeTransaction(description) {
  const lower = description.toLowerCase().trim();
  const { coreName } = extractCoreMerchantName(description);

  // First, check if we have a learned category for this exact description
  const learned = getLearnedCategories();
  if (learned[lower]) {
    return learned[lower];
  }

  // Check for core merchant name match (fuzzy matching)
  if (learned[coreName] && coreName !== lower) {
    return learned[coreName];
  }

  // Check if any learned core name is contained in this description's core name
  for (const [learnedDesc, category] of Object.entries(learned)) {
    const { coreName: learnedCore } = extractCoreMerchantName(learnedDesc);
    // Match if core names are similar (one contains the other, min 5 chars)
    if (learnedCore.length >= 5 && coreName.length >= 5) {
      if (coreName.includes(learnedCore) || learnedCore.includes(coreName)) {
        return category;
      }
    }
  }

  // Fall back to default keyword matching
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category;
    }
  }
  return 'Other';
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Try to detect header row and column positions
  const header = lines[0].toLowerCase();
  const transactions = [];

  // Common CSV formats: Date, Description, Amount or Date, Description, Debit, Credit
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle quoted CSV fields
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    if (fields.length >= 3) {
      // Try to find date, description, and amount
      let date = null;
      let description = '';
      let amount = 0;

      for (const field of fields) {
        // Check if it's a date
        if (!date && /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(field)) {
          date = field;
        }
        // Check if it's an amount (negative for expenses)
        else if (/^-?\$?[\d,]+\.?\d*$/.test(field.replace(/[()]/g, ''))) {
          const numStr = field.replace(/[$,()]/g, '');
          const num = parseFloat(numStr);
          if (!isNaN(num)) {
            // Negative or in parentheses = expense
            amount = field.includes('(') || field.includes('-') ? -Math.abs(num) : num;
          }
        }
        // Otherwise it's probably the description
        else if (field.length > 2 && !date) {
          description = field;
        } else if (field.length > description.length) {
          description = field;
        }
      }

      if (date && description && amount !== 0) {
        transactions.push({
          id: Date.now() + i,
          date,
          description,
          amount,
          category: categorizeTransaction(description),
        });
      }
    }
  }

  return transactions;
}

// Parse Chase-style PDF bank statements
async function parsePDF(arrayBuffer) {
  const transactions = [];

  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Extract text with position info for better parsing
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Group text items by approximate Y position (same line)
      const lineMap = new Map();
      textContent.items.forEach(item => {
        // Round Y to group items on same line (within 5 units)
        const y = Math.round(item.transform[5] / 5) * 5;
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y).push({
          text: item.str,
          x: item.transform[4]
        });
      });

      // Sort lines by Y (top to bottom = descending Y)
      const sortedLines = Array.from(lineMap.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([y, items]) => {
          // Sort items on each line by X position (left to right)
          return items.sort((a, b) => a.x - b.x).map(i => i.text).join(' ');
        });

      // Parse each line for transactions
      for (const line of sortedLines) {
        // Skip empty lines or headers
        if (!line.trim()) continue;
        if (/ACCOUNT ACTIVITY|PAYMENTS AND OTHER|PURCHASE|Date of|Transaction|Merchant Name/i.test(line)) continue;

        // Chase format: MM/DD DESCRIPTION AMOUNT
        // Amount is typically at the end, could be negative or have comma
        const match = line.match(/^(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-]?[\d,]+\.\d{2})$/);
        if (match) {
          const [, date, rawDesc, amountStr] = match;

          // Clean description
          let description = rawDesc
            .replace(/\d{1,2}\/\d{1,2}\s+EURO\s+[\d.,]+\s*X\s*[\d.]+\s*\(EXCHG RATE\)/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

          if (description.length < 3) continue;

          const amount = parseFloat(amountStr.replace(',', ''));
          if (isNaN(amount) || amount === 0) continue;

          // Check for duplicate
          const exists = transactions.some(t =>
            t.date === date && t.description === description
          );

          if (!exists) {
            transactions.push({
              id: Date.now() + Math.random(),
              date,
              description,
              amount: -Math.abs(amount), // Purchases are expenses
              category: categorizeTransaction(description),
            });
          }
        }
      }
    }

    // If no transactions found, try simpler text extraction
    if (transactions.length === 0) {
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
      }

      // Try to find patterns like: 09/23 MERCHANT NAME 20.07
      const regex = /(\d{1,2}\/\d{1,2})\s+([A-Z][A-Z0-9\s\*\'\.\-&]+?)\s+([\d,]+\.\d{2})/g;
      let match;
      while ((match = regex.exec(fullText)) !== null) {
        const [, date, rawDesc, amountStr] = match;
        const description = rawDesc.trim();

        if (description.length < 3) continue;
        if (/^(PURCHASE|PAYMENT|CREDIT|ACCOUNT)/i.test(description)) continue;

        const amount = parseFloat(amountStr.replace(',', ''));
        if (isNaN(amount) || amount === 0) continue;

        const exists = transactions.some(t =>
          t.date === date && Math.abs(Math.abs(t.amount) - amount) < 0.01
        );

        if (!exists) {
          transactions.push({
            id: Date.now() + Math.random(),
            date,
            description,
            amount: -Math.abs(amount),
            category: categorizeTransaction(description),
          });
        }
      }
    }

    console.log(`PDF parsed: found ${transactions.length} transactions`);

  } catch (error) {
    console.error('PDF parsing error:', error);
    alert('Error parsing PDF: ' + error.message + '\n\nTry downloading your statement as CSV instead.');
  }

  return transactions;
}

function FileUpload({ onUpload, monthlyStats }) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileCount, setFileCount] = useState(0);

  // Process a single file and return its transactions
  const processFile = (file) => {
    return new Promise((resolve) => {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(parseCSV(e.target.result));
        reader.readAsText(file);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onload = async (e) => resolve(await parsePDF(e.target.result));
        reader.readAsArrayBuffer(file);
      } else {
        resolve([]);
      }
    });
  };

  // Handle multiple files
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    setLoading(true);
    setFileCount(files.length);

    try {
      const allTransactions = [];
      for (const file of files) {
        if (file.name.endsWith('.csv') || file.name.endsWith('.pdf')) {
          const transactions = await processFile(file);
          allTransactions.push(...transactions);
        }
      }

      if (allTransactions.length > 0) {
        onUpload(allTransactions);
      } else {
        alert('No transactions found in the uploaded files');
      }
    } catch (error) {
      console.error('File processing error:', error);
    }

    setLoading(false);
    setFileCount(0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleChange = (e) => {
    handleFiles(Array.from(e.target.files));
    e.target.value = ''; // Reset so same file can be uploaded again
  };

  // Sort months chronologically
  const sortedMonths = Object.entries(monthlyStats || {}).sort((a, b) => {
    const [aMonth, aYear] = a[0].split(" '");
    const [bMonth, bYear] = b[0].split(" '");
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
    return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
  });

  return (
    <div className="space-y-3">
      <div
        className={`glass-card rounded-2xl p-6 text-center border-2 border-dashed transition-all ${
          dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/20'
        } ${loading ? 'opacity-70 pointer-events-none' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="text-3xl mb-3">{loading ? '⏳' : '📄'}</div>
        <h3 className="text-lg font-semibold text-white mb-2">
          {loading ? `Processing ${fileCount} file${fileCount > 1 ? 's' : ''}...` : 'Upload Bank Statements'}
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          {loading ? 'Parsing your statements' : 'Drag & drop CSV or PDF files (multiple supported)'}
        </p>
        {!loading && (
          <label className="inline-block bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-xl cursor-pointer hover:shadow-lg hover:scale-105 transition-all">
            Choose Files
            <input
              type="file"
              accept=".csv,.pdf"
              multiple
              onChange={handleChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Months Uploaded Tracker */}
      {sortedMonths.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Months Uploaded</h4>
          <div className="flex flex-wrap gap-2">
            {sortedMonths.map(([month, stats]) => (
              <div
                key={month}
                className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg px-3 py-1.5"
              >
                <span className="text-sm text-indigo-300 font-medium">{month}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {stats.count} txns · ${stats.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionList({ transactions, onUpdateCategory, onDelete, onRefresh }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter(t => t.category === filter);

  const expenses = filtered.filter(t => t.amount < 0 && !EXCLUDED_FROM_EXPENSES.includes(t.category));

  // Open Google search or Maps for a merchant
  const lookupMerchant = (description) => {
    // Clean description for search
    const cleanDesc = description
      .replace(/[#*]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Open Google Maps search (good for businesses)
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(cleanDesc)}`, '_blank');
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-white">Transactions ({expenses.length})</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
            title="Re-apply learned categories to all transactions"
          >
            ↻ Refresh
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-sm"
          >
            <option value="all">All Categories</option>
            {Object.keys(CATEGORIES).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {expenses.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No transactions to show</p>
        ) : (
          expenses.map(t => {
            const hint = t.category === 'Other' ? getSmartHint(t.description) : null;
            return (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 group">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[t.category] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-300 truncate">{t.description}</span>
                  <button
                    onClick={() => lookupMerchant(t.description)}
                    className="text-gray-500 hover:text-indigo-400 text-xs shrink-0"
                    title="Look up on Google Maps"
                  >
                    🔍
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t.date}</span>
                  {hint && (
                    <span className="text-xs text-amber-400/70" title={hint.hint}>
                      💡 Likely: {hint.likely[0]}
                    </span>
                  )}
                </div>
              </div>
              <select
                value={t.category}
                onChange={(e) => onUpdateCategory(t.id, e.target.value)}
                className="text-xs rounded-lg px-2 py-1 bg-white/5 border-none"
              >
                {Object.keys(CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="text-red-400 font-medium text-sm w-16 text-right">
                ${Math.abs(t.amount).toFixed(2)}
              </div>
              <button
                onClick={() => onDelete(t.id)}
                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          );
          })
        )}
      </div>
    </div>
  );
}

// Review and accept/change smart suggestions for "Other" category transactions
function SuggestionsReview({ transactions, onUpdateCategory }) {
  // Find all "Other" transactions that have smart hints
  const suggestions = useMemo(() => {
    return transactions
      .filter(t => t.amount < 0 && t.category === 'Other')
      .map(t => {
        const hint = getSmartHint(t.description);
        return hint ? { ...t, suggestedCategory: hint.likely[0], hint: hint.hint } : null;
      })
      .filter(Boolean);
  }, [transactions]);

  // Track user's chosen category for each suggestion (starts with the suggested one)
  const [choices, setChoices] = useState({});

  // Initialize choices when suggestions change
  useEffect(() => {
    const initial = {};
    suggestions.forEach(s => {
      if (!choices[s.id]) {
        initial[s.id] = s.suggestedCategory;
      }
    });
    if (Object.keys(initial).length > 0) {
      setChoices(prev => ({ ...prev, ...initial }));
    }
  }, [suggestions]);

  const handleChoiceChange = (id, category) => {
    setChoices(prev => ({ ...prev, [id]: category }));
  };

  const handleAcceptOne = (id) => {
    const category = choices[id];
    if (category) {
      onUpdateCategory(id, category);
    }
  };

  const handleAcceptAll = () => {
    suggestions.forEach(s => {
      const category = choices[s.id] || s.suggestedCategory;
      onUpdateCategory(s.id, category);
    });
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="glass-card rounded-2xl p-5 border border-amber-500/30">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span className="text-amber-400">💡</span>
            Review Suggestions ({suggestions.length})
          </h3>
          <p className="text-xs text-gray-400 mt-1">Quick review uncategorized transactions with smart hints</p>
        </div>
        <button
          onClick={handleAcceptAll}
          className="bg-amber-500/20 border border-amber-500/50 text-amber-400 hover:bg-amber-500/30 px-4 py-2 rounded-xl transition-all text-sm font-medium"
        >
          ✓ Accept All ({suggestions.length})
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {suggestions.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-300 truncate">{s.description}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">{s.date}</span>
                <span className="text-amber-400/70">{s.hint}</span>
              </div>
            </div>
            <div className="text-red-400 font-medium text-sm w-16 text-right">
              ${Math.abs(s.amount).toFixed(2)}
            </div>
            <select
              value={choices[s.id] || s.suggestedCategory}
              onChange={(e) => handleChoiceChange(s.id, e.target.value)}
              className="text-xs rounded-lg px-2 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300"
            >
              {Object.keys(CATEGORIES).filter(c => c !== 'Other' && c !== 'Payment').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={() => handleAcceptOne(s.id)}
              className="text-emerald-400 hover:text-emerald-300 text-sm px-2 py-1 rounded hover:bg-emerald-500/20"
              title="Accept this suggestion"
            >
              ✓
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper to extract month key from date string (MM/DD or MM/DD/YYYY)
function getMonthKey(dateStr) {
  if (!dateStr) return 'Unknown';
  const parts = dateStr.split('/');
  if (parts.length >= 2) {
    const month = parseInt(parts[0], 10);
    let year;

    if (parts.length >= 3) {
      // Year is provided
      year = parts[2];
    } else {
      // Infer year: if month is in the future, assume last year
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();

      // If transaction month is greater than current month, it's likely from last year
      if (month > currentMonth) {
        year = (currentYear - 1).toString();
      } else {
        year = currentYear.toString();
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]} '${year.slice(-2)}`;
  }
  return 'Unknown';
}

// Get unique months from transactions
function getUniqueMonths(transactions) {
  const months = new Set();
  transactions.forEach(t => {
    months.add(getMonthKey(t.date));
  });
  return Array.from(months).sort((a, b) => {
    // Sort by date (most recent first)
    const [aMonth, aYear] = a.split(" '");
    const [bMonth, bYear] = b.split(" '");
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (aYear !== bYear) return parseInt(bYear) - parseInt(aYear);
    return monthOrder.indexOf(bMonth) - monthOrder.indexOf(aMonth);
  });
}

// Helper to get week key from date string (week of year)
function getWeekKey(dateStr) {
  if (!dateStr) return 'Unknown';
  const parts = dateStr.split('/');
  if (parts.length >= 2) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    let year;

    if (parts.length >= 3) {
      year = parseInt(parts[2], 10);
      if (year < 100) year += 2000; // Convert 2-digit year
    } else {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      year = month > currentMonth ? currentYear - 1 : currentYear;
    }

    const date = new Date(year, month - 1, day);

    // Get the start of the week (Sunday)
    const dayOfWeek = date.getDay();
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - dayOfWeek);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weekMonth = weekStart.getMonth();
    const weekDay = weekStart.getDate();
    const weekYear = weekStart.getFullYear().toString().slice(-2);

    return `${monthNames[weekMonth]} ${weekDay} '${weekYear}`;
  }
  return 'Unknown';
}

// Weekly Spending Chart Component
function WeeklySpendingChart({ transactions }) {
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [includeRent, setIncludeRent] = useState(true);

  // Group transactions by week
  const weeklyData = useMemo(() => {
    const weekMap = new Map();

    // Helper to check if a week contains the 22nd
    const weekContains22nd = (weekStr) => {
      const parts = weekStr.split(' ');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames.indexOf(parts[0]);
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2].replace("'", '')) + 2000;

      const weekStart = new Date(year, month, day);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Check if 22nd falls within this week
      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        if (d.getDate() === 22) {
          return true;
        }
      }
      return false;
    };

    transactions
      .filter(t => t.amount < 0 && !EXCLUDED_FROM_EXPENSES.includes(t.category))
      .forEach(t => {
        const week = getWeekKey(t.date);
        if (!weekMap.has(week)) {
          weekMap.set(week, {});
        }
        const weekData = weekMap.get(week);
        const category = t.category || 'Other';
        weekData[category] = (weekData[category] || 0) + Math.abs(t.amount);
      });

    // Add rent to weeks containing the 22nd (if enabled)
    if (includeRent) {
      weekMap.forEach((weekData, week) => {
        if (weekContains22nd(week)) {
          weekData['Rent'] = (weekData['Rent'] || 0) + 2425;
        }
      });
    }

    // Convert to array format for chart
    return Array.from(weekMap.entries())
      .map(([week, categories]) => ({
        name: week,
        ...categories,
        total: Object.values(categories).reduce((sum, val) => sum + val, 0)
      }))
      .sort((a, b) => {
        // Parse dates for sorting
        const parseWeek = (weekStr) => {
          const parts = weekStr.split(' ');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = monthNames.indexOf(parts[0]);
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2].replace("'", '')) + 2000;
          return new Date(year, month, day).getTime();
        };
        return parseWeek(a.name) - parseWeek(b.name);
      });
  }, [transactions, includeRent]);

  // Get all unique categories
  const allCategories = useMemo(() => {
    const cats = new Set();
    weeklyData.forEach(week => {
      Object.keys(week).forEach(key => {
        if (key !== 'name' && key !== 'total') cats.add(key);
      });
    });
    return Array.from(cats).sort();
  }, [weeklyData]);

  // Initialize selected categories
  useEffect(() => {
    if (selectedCategories.size === 0 && allCategories.length > 0) {
      setSelectedCategories(new Set(allCategories));
    }
  }, [allCategories]);

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cat)) {
        newSet.delete(cat);
      } else {
        newSet.add(cat);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedCategories(new Set(allCategories));
  };

  const clearAll = () => {
    setSelectedCategories(new Set());
  };

  // Calculate average weekly spending
  const averageSpending = weeklyData.length > 0
    ? weeklyData.reduce((sum, week) => sum + week.total, 0) / weeklyData.length
    : 0;

  if (weeklyData.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-white">Weekly Spending</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIncludeRent(!includeRent)}
            className={`text-xs px-2 py-1 rounded-lg ${
              includeRent
                ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            {includeRent ? '✓' : ''} Rent
          </button>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-500/10"
          >
            {showCategories ? 'Hide' : 'Show'} Categories
          </button>
          {showCategories && (
            <>
              <button
                onClick={selectAll}
                className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-500/10"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-white/5"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {showCategories ? 'Click categories to show/hide breakdown' : 'Scroll to see all weeks'}
        {includeRent && ' • Rent ($2,425) on weeks with 22nd'}
        {' • '}Green line shows average
      </p>

      <div className="overflow-x-auto pb-2">
        <div style={{ minWidth: `${weeklyData.length * 60}px` }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={v => `$${v}`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
                    return (
                      <div className="glass-card rounded-lg p-3 text-sm border border-white/20">
                        <p className="text-white font-bold mb-2">{label}</p>
                        {showCategories ? (
                          <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
                            {payload.map((entry, index) => (
                              <div key={index} className="flex justify-between gap-3">
                                <span className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-gray-300">{entry.name}</span>
                                </span>
                                <span className="text-white font-medium">${Math.round(entry.value)}</span>
                              </div>
                            ))}
                            <div className="pt-2 mt-2 border-t border-white/20 flex justify-between font-bold">
                              <span className="text-gray-300">Total</span>
                              <span className="text-white">${Math.round(total)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between font-bold">
                            <span className="text-gray-300">Total Spent</span>
                            <span className="text-white">${Math.round(total)}</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {showCategories ? (
                allCategories.map(cat => (
                  selectedCategories.has(cat) && (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      stackId="a"
                      fill={CATEGORY_COLORS[cat] || '#6b7280'}
                    />
                  )
                ))
              ) : (
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              )}
              <ReferenceLine
                y={averageSpending}
                stroke="#22c55e"
                strokeDasharray="3 3"
                strokeWidth={2}
                label={{
                  value: `Avg: $${Math.round(averageSpending)}`,
                  fill: '#22c55e',
                  fontSize: 11,
                  position: 'right'
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showCategories && (
        <div className="flex flex-wrap gap-2 mt-3 justify-center">
          {allCategories.map(cat => {
            const isSelected = selectedCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-white/5 text-gray-500 border border-transparent'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] || '#6b7280' }}
                />
                {cat}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Custom tooltip for monthly spending chart
function MonthlySpendingTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

    return (
      <div className="glass-card rounded-lg p-3 text-sm border border-white/20">
        <p className="text-white font-bold mb-2">{label}</p>
        <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-300">{entry.name}</span>
              </span>
              <span className="text-white font-medium">${entry.value}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 mt-2 border-t border-white/20 flex justify-between font-bold">
          <span className="text-gray-300">Total</span>
          <span className="text-emerald-400">${total}</span>
        </div>
      </div>
    );
  }
  return null;
}

// Monthly spending bar chart component
function MonthlySpendingChart({ transactions }) {
  const [selectedCategories, setSelectedCategories] = useState(() => {
    // Start with all categories selected except Rent + Utils
    const allCategories = new Set(Object.keys(CATEGORY_COLORS));
    allCategories.delete('Rent + Utils'); // Start with this deselected
    return allCategories;
  });

  const monthlyData = useMemo(() => {
    const byMonth = {};
    transactions
      .filter(t => t.amount < 0 && !EXCLUDED_FROM_EXPENSES.includes(t.category))
      .forEach(t => {
        const month = getMonthKey(t.date);
        if (!byMonth[month]) {
          byMonth[month] = { month, total: 0, categories: {} };
        }
        byMonth[month].total += Math.abs(t.amount);
        byMonth[month].categories[t.category] = (byMonth[month].categories[t.category] || 0) + Math.abs(t.amount);
      });

    return Object.values(byMonth)
      .map(m => ({
        name: m.month,
        total: Math.round(m.total),
        'Rent + Utils': FIXED_MONTHLY_EXPENSE, // Add fixed expense to every month
        ...Object.fromEntries(
          Object.entries(m.categories).map(([k, v]) => [k, Math.round(v)])
        )
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.name.split(" '");
        const [bMonth, bYear] = b.name.split(" '");
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
        return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
      });
  }, [transactions]);

  if (monthlyData.length === 0) return null;

  // Put "Rent + Utils" first, then all other categories
  const allCategories = ['Rent + Utils', ...Object.keys(CATEGORY_COLORS).filter(c => c !== 'Rent + Utils')];

  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedCategories(new Set(allCategories));
  };

  const clearAll = () => {
    setSelectedCategories(new Set());
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-white">Monthly Spending</h3>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-500/10"
          >
            Select All
          </button>
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-white/5"
          >
            Clear All
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-3">Click categories to show/hide • Toggle "Rent + Utils" ($2,525/mo) to see total spending</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={monthlyData}>
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={v => `$${v}`} />
          <Tooltip content={<MonthlySpendingTooltip />} />
          {allCategories.map(cat => (
            selectedCategories.has(cat) && (
              <Bar
                key={cat}
                dataKey={cat}
                stackId="a"
                fill={CATEGORY_COLORS[cat]}
                radius={cat === allCategories[allCategories.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            )
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        {allCategories.map(cat => {
          const isSelected = selectedCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                isSelected
                  ? 'bg-white/10 hover:bg-white/15'
                  : 'bg-white/5 hover:bg-white/10 opacity-40'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all ${isSelected ? 'scale-100' : 'scale-75'}`}
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              <span className={`${isSelected ? 'text-gray-300' : 'text-gray-500 line-through'}`}>
                {cat}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpendingChart({ transactions, selectedMonth }) {
  const [showAllCategories, setShowAllCategories] = useState(false);

  const categoryTotals = useMemo(() => {
    const totals = {};
    transactions
      .filter(t => t.amount < 0 && !EXCLUDED_FROM_EXPENSES.includes(t.category))
      .forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
      });

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        color: CATEGORY_COLORS[name],
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalSpent = categoryTotals.reduce((sum, c) => sum + c.value, 0);
  const displayCategories = showAllCategories ? categoryTotals : categoryTotals.slice(0, 6);

  if (categoryTotals.length === 0) {
    return null;
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold text-white mb-4">
        Spending by Category {selectedMonth && selectedMonth !== 'all' && <span className="text-indigo-400">- {selectedMonth}</span>}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={categoryTotals}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {categoryTotals.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
              labelStyle={{ color: 'white' }}
              itemStyle={{ color: '#e5e7eb' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2">
          {displayCategories.map(cat => (
            <div key={cat.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="flex-1 text-sm text-gray-300">{cat.name}</span>
              <span className="text-sm font-medium text-white">${cat.value.toFixed(0)}</span>
              <span className="text-xs text-gray-500 w-12 text-right">
                {((cat.value / totalSpent) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
          {categoryTotals.length > 6 && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="text-xs text-indigo-400 hover:text-indigo-300 pt-2 transition-colors"
            >
              {showAllCategories ? '▲ Show less' : `▼ +${categoryTotals.length - 6} more categories`}
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
        <span className="text-gray-400">Total Spending</span>
        <span className="text-xl font-bold text-red-400">${totalSpent.toFixed(2)}</span>
      </div>
    </div>
  );
}

// Dedicated Bike & Scooter spending tracker
function BikeScooterTracker({ transactions }) {
  const bikeData = useMemo(() => {
    const bikeTransactions = transactions.filter(
      t => t.amount < 0 && t.category === 'Bikes & Scooters'
    );

    if (bikeTransactions.length === 0) return null;

    const total = bikeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const count = bikeTransactions.length;
    const avgRide = total / count;

    // Group by month
    const byMonth = {};
    bikeTransactions.forEach(t => {
      const month = getMonthKey(t.date);
      byMonth[month] = (byMonth[month] || 0) + Math.abs(t.amount);
    });

    const monthlyData = Object.entries(byMonth)
      .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split(" '");
        const [bMonth, bYear] = b.month.split(" '");
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
        return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
      });

    return { total, count, avgRide, monthlyData, transactions: bikeTransactions };
  }, [transactions]);

  if (!bikeData) return null;

  return (
    <div className="glass-card rounded-2xl p-5 border border-emerald-500/30">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🚲</span>
        <h3 className="font-semibold text-white">Bikes & Scooters</h3>
        <span className="text-xs text-gray-500 ml-auto">Citibike, Lime, etc.</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-emerald-400">${bikeData.total.toFixed(0)}</div>
          <div className="text-xs text-gray-400">Total Spent</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-emerald-400">{bikeData.count}</div>
          <div className="text-xs text-gray-400">Rides</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-emerald-400">${bikeData.avgRide.toFixed(2)}</div>
          <div className="text-xs text-gray-400">Avg/Ride</div>
        </div>
      </div>

      {bikeData.monthlyData.length > 1 && (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={bikeData.monthlyData}>
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ background: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(value) => [`$${value}`, 'Spent']}
              labelStyle={{ color: 'white' }}
              itemStyle={{ color: '#e5e7eb' }}
            />
            <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
        {bikeData.transactions.slice(0, 5).map(t => (
          <div key={t.id} className="flex justify-between text-xs">
            <span className="text-gray-400">{t.date} - {t.description}</span>
            <span className="text-emerald-400">${Math.abs(t.amount).toFixed(2)}</span>
          </div>
        ))}
        {bikeData.transactions.length > 5 && (
          <div className="text-xs text-gray-500">+{bikeData.transactions.length - 5} more rides</div>
        )}
      </div>
    </div>
  );
}

function SpendingInsights({ transactions }) {
  const insights = useMemo(() => {
    const expenses = transactions.filter(t => t.amount < 0 && !EXCLUDED_FROM_EXPENSES.includes(t.category));
    if (expenses.length === 0) return null;

    const total = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avgTransaction = total / expenses.length;

    // Find biggest expense
    const biggest = expenses.reduce((max, t) =>
      Math.abs(t.amount) > Math.abs(max.amount) ? t : max
    );

    // Category breakdown
    const categoryTotals = {};
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
    });
    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];

    // Daily spending
    const dailySpend = total / 30; // Rough estimate

    return { total, avgTransaction, biggest, topCategory, dailySpend, count: expenses.length };
  }, [transactions]);

  if (!insights) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-lg font-bold text-red-400">${insights.total.toFixed(0)}</div>
        <div className="text-xs text-gray-400">Total Spent</div>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-lg font-bold text-indigo-400">${insights.avgTransaction.toFixed(0)}</div>
        <div className="text-xs text-gray-400">Avg Transaction</div>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-lg font-bold text-yellow-400">${insights.dailySpend.toFixed(0)}</div>
        <div className="text-xs text-gray-400">Daily Average</div>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-lg font-bold text-emerald-400">{insights.count}</div>
        <div className="text-xs text-gray-400">Transactions</div>
      </div>
    </div>
  );
}

function FixedExpensesSection({ expenses, onUpdate, discretionarySpending = 0 }) {
  const totalFixed = expenses.reduce((sum, e) => sum + e.amount, 0);
  const [editing, setEditing] = useState(false);
  const [newExpense, setNewExpense] = useState({ name: '', amount: '' });
  const monthlyBudget = 6400;

  const handleAmountChange = (id, value) => {
    const num = parseFloat(value) || 0;
    onUpdate(expenses.map(e => e.id === id ? { ...e, amount: num } : e));
  };

  const handleAddExpense = () => {
    if (newExpense.name && newExpense.amount) {
      const colors = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#06b6d4', '#ec4899'];
      onUpdate([
        ...expenses,
        {
          id: Date.now(),
          name: newExpense.name,
          amount: parseFloat(newExpense.amount) || 0,
          color: colors[expenses.length % colors.length],
        }
      ]);
      setNewExpense({ name: '', amount: '' });
    }
  };

  const handleRemove = (id) => {
    onUpdate(expenses.filter(e => e.id !== id));
  };

  // Data for Fixed vs Discretionary comparison
  const comparisonData = [
    { name: 'Fixed', amount: totalFixed, color: '#6366f1' },
    { name: 'Discretionary', amount: discretionarySpending || (monthlyBudget - totalFixed), color: '#f97316' },
  ];

  const totalSpent = totalFixed + (discretionarySpending || 0);
  const fixedPercent = discretionarySpending > 0 ? Math.round((totalFixed / totalSpent) * 100) : Math.round((totalFixed / monthlyBudget) * 100);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-white">Fixed vs Discretionary Spending</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-500/10"
        >
          {editing ? 'Done' : 'Edit Fixed'}
        </button>
      </div>

      {/* Fixed vs Discretionary Bar Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={comparisonData} layout="vertical" barSize={35}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              contentStyle={{ background: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(value) => [`$${value.toLocaleString()}`, '']}
              labelStyle={{ color: 'white' }}
            />
            <Bar dataKey="amount" radius={[4, 4, 4, 4]}>
              {comparisonData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend & Totals */}
        <div className="flex justify-around mt-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-sm text-gray-300">Fixed</span>
            </div>
            <div className="text-lg font-bold text-indigo-400">${totalFixed.toLocaleString()}</div>
            <div className="text-xs text-gray-500">{fixedPercent}% of {discretionarySpending > 0 ? 'spending' : 'budget'}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm text-gray-300">Discretionary</span>
            </div>
            <div className="text-lg font-bold text-orange-400">
              ${(discretionarySpending || (monthlyBudget - totalFixed)).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">{100 - fixedPercent}% of {discretionarySpending > 0 ? 'spending' : 'budget'}</div>
          </div>
        </div>
      </div>

      {/* Fixed Expenses Breakdown */}
      <div className="border-t border-white/10 pt-4">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Fixed Expenses Breakdown</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pie Chart */}
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={expenses.map(e => ({ name: e.name, value: e.amount, color: e.color }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                paddingAngle={2}
              >
                {expenses.map((e, index) => (
                  <Cell key={`cell-${index}`} fill={e.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                formatter={(value) => [`$${value}`, '']}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Expense list */}
          <div className="space-y-2">
            {expenses.map(e => (
              <div key={e.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                <span className="flex-1 text-sm text-gray-300">{e.name}</span>
                {editing ? (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={e.amount}
                      onChange={(ev) => handleAmountChange(e.id, ev.target.value)}
                      className="w-16 rounded-lg px-2 py-1 text-sm text-right"
                    />
                    <button
                      onClick={() => handleRemove(e.id)}
                      className="text-red-400 hover:text-red-300 ml-1"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-white">${e.amount}</span>
                )}
              </div>
            ))}

            {/* Add new expense */}
            {editing && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/10 mt-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={newExpense.name}
                  onChange={(ev) => setNewExpense(p => ({ ...p, name: ev.target.value }))}
                  className="flex-1 rounded-lg px-2 py-1 text-sm"
                />
                <span className="text-gray-500">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={newExpense.amount}
                  onChange={(ev) => setNewExpense(p => ({ ...p, amount: ev.target.value }))}
                  className="w-14 rounded-lg px-2 py-1 text-sm text-right"
                />
                <button
                  onClick={handleAddExpense}
                  className="bg-indigo-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-indigo-400"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Income vs Spending tracking component
function IncomeVsSpending({ income, onUpdateIncome, totalSpending, fixedExpenses }) {
  const [editing, setEditing] = useState(false);

  // Calculate monthly income based on pay frequency
  const monthlyIncome = useMemo(() => {
    switch (income.payFrequency) {
      case 'weekly': return income.biweekly * 52 / 12;
      case 'biweekly': return income.biweekly * 26 / 12;
      case 'monthly': return income.biweekly;
      default: return income.biweekly * 26 / 12;
    }
  }, [income]);

  const totalFixed = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalMonthlySpending = totalSpending + totalFixed;
  const balance = monthlyIncome - totalMonthlySpending;
  const savingsRate = monthlyIncome > 0 ? Math.round((balance / monthlyIncome) * 100) : 0;

  const chartData = [
    { name: 'Income', amount: Math.round(monthlyIncome), color: '#22c55e' },
    { name: 'Spending', amount: Math.round(totalMonthlySpending), color: '#ef4444' },
  ];

  const handleSalaryChange = (value) => {
    const num = parseFloat(value) || 0;
    onUpdateIncome({ ...income, biweekly: num });
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-white">Income vs Spending</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-500/10"
        >
          {editing ? 'Done' : 'Edit Income'}
        </button>
      </div>

      {/* Income Settings (when editing) */}
      {editing && (
        <div className="mb-4 p-3 rounded-lg bg-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400 w-24">Pay Amount:</label>
            <span className="text-gray-500">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={income.biweekly}
              onChange={(e) => handleSalaryChange(e.target.value)}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400 w-24">Frequency:</label>
            <select
              value={income.payFrequency}
              onChange={(e) => onUpdateIncome({ ...income, payFrequency: e.target.value })}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="text-xs text-gray-500">
            Monthly income: ${monthlyIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      )}

      {/* Bar Chart Comparison */}
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={chartData} layout="vertical" barSize={30}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            contentStyle={{ background: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            formatter={(value) => [`$${value.toLocaleString()}`, '']}
          />
          <Bar dataKey="amount" radius={[4, 4, 4, 4]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-400">Income</span>
          </div>
          <div className="text-lg font-bold text-emerald-400">
            ${monthlyIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-gray-400">Spending</span>
          </div>
          <div className="text-lg font-bold text-red-400">
            ${totalMonthlySpending.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className={`w-2.5 h-2.5 rounded-full ${balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">Balance</span>
          </div>
          <div className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {balance >= 0 ? '+' : ''}${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Savings Rate */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Monthly Savings Rate</span>
          <span className={`text-lg font-bold ${savingsRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {savingsRate}%
          </span>
        </div>
        <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${savingsRate >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(Math.abs(savingsRate), 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {balance >= 0
            ? `You're saving $${balance.toFixed(0)}/month`
            : `You're overspending by $${Math.abs(balance).toFixed(0)}/month`}
        </p>
      </div>
    </div>
  );
}

function LearnedCategoriesInfo() {
  const [learned, setLearned] = useState(() => getLearnedCategories());
  const [expanded, setExpanded] = useState(false);

  const count = Object.keys(learned).length;

  const handleClear = () => {
    if (confirm('Clear all learned categories? Future uploads will use default categorization.')) {
      localStorage.removeItem(LEARNED_CATEGORIES_KEY);
      setLearned({});
    }
  };

  if (count === 0) return null;

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
        >
          <span className="text-indigo-400">🧠</span>
          <span>{count} learned merchant{count !== 1 ? 's' : ''}</span>
          <span className="text-xs">{expanded ? '▼' : '▶'}</span>
        </button>
        <button
          onClick={handleClear}
          className="text-xs text-gray-500 hover:text-red-400"
        >
          Clear
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
          {Object.entries(learned).map(([desc, cat]) => (
            <div key={desc} className="flex items-center justify-between text-xs">
              <span className="text-gray-400 truncate flex-1 mr-2">{desc}</span>
              <span
                className="px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: CATEGORY_COLORS[cat] || '#6b7280' }}
              >
                {cat}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopSpendingWarnings({ transactions, monthlyBudget = 6400 }) {
  const categoryTotals = useMemo(() => {
    const totals = {};
    transactions
      .filter(t => t.amount < 0 && !EXCLUDED_FROM_EXPENSES.includes(t.category))
      .forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
      });
    return totals;
  }, [transactions]);

  // Define budget targets (rough percentages of monthly budget)
  const budgetTargets = {
    'Groceries': monthlyBudget * 0.12,
    'Dining': monthlyBudget * 0.08,
    'Bars': monthlyBudget * 0.04,
    'Shopping': monthlyBudget * 0.08,
    'Entertainment': monthlyBudget * 0.05,
    'Transport': monthlyBudget * 0.06,
  };

  const warnings = Object.entries(categoryTotals)
    .filter(([cat, amount]) => budgetTargets[cat] && amount > budgetTargets[cat])
    .map(([cat, amount]) => ({
      category: cat,
      spent: amount,
      budget: budgetTargets[cat],
      over: amount - budgetTargets[cat],
      pct: ((amount / budgetTargets[cat]) * 100).toFixed(0),
    }))
    .sort((a, b) => b.over - a.over);

  if (warnings.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
      <h3 className="font-semibold text-red-300 mb-3">Overspending Alerts</h3>
      <div className="space-y-2">
        {warnings.map(w => (
          <div key={w.category} className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{w.category}</span>
            <span className="text-red-400">
              ${w.spent.toFixed(0)} / ${w.budget.toFixed(0)} ({w.pct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BankStatements() {
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [fixedExpenses, setFixedExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(FIXED_EXPENSES_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_FIXED_EXPENSES;
    } catch {
      return DEFAULT_FIXED_EXPENSES;
    }
  });

  const [income, setIncome] = useState(() => {
    try {
      const saved = localStorage.getItem(INCOME_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_INCOME;
    } catch {
      return DEFAULT_INCOME;
    }
  });

  const [selectedMonth, setSelectedMonth] = useState('all');

  // Save income to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(INCOME_KEY, JSON.stringify(income));
  }, [income]);

  // Get unique months for filter dropdown
  const availableMonths = useMemo(() => getUniqueMonths(transactions), [transactions]);

  // Filter transactions by selected month
  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => getMonthKey(t.date) === selectedMonth);
  }, [transactions, selectedMonth]);

  // Save fixed expenses to localStorage
  useEffect(() => {
    localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(fixedExpenses));
  }, [fixedExpenses]);

  // Store previous state for undo functionality
  const [previousTransactions, setPreviousTransactions] = useState(null);
  const [lastUploadCount, setLastUploadCount] = useState(0);

  const handleUpload = (newTransactions) => {
    setTransactions(prev => {
      // Save current state for undo
      setPreviousTransactions(prev);
      setLastUploadCount(newTransactions.length);

      const updated = [...prev, ...newTransactions];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleUndo = () => {
    if (previousTransactions !== null) {
      setTransactions(previousTransactions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(previousTransactions));
      setPreviousTransactions(null);
      setLastUploadCount(0);
    }
  };

  const handleUpdateCategory = (id, category) => {
    setTransactions(prev => {
      const transaction = prev.find(t => t.id === id);
      if (!transaction) return prev;

      // Learn this categorization for future uploads
      learnCategory(transaction.description, category);

      // Update this transaction AND all others with matching merchant name
      const descLower = transaction.description.toLowerCase().trim();
      const updated = prev.map(t => {
        // Update the clicked transaction
        if (t.id === id) return { ...t, category };
        // Also update other transactions with the same merchant (case-insensitive)
        if (t.description.toLowerCase().trim() === descLower) {
          return { ...t, category };
        }
        return t;
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleDelete = (id) => {
    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAll = () => {
    if (confirm('Clear all transactions?')) {
      setTransactions([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Normalize description for duplicate detection
  const normalizeDesc = (desc) => {
    return desc.toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
      .slice(0, 20); // First 20 chars only
  };

  // Find duplicate count (fuzzy matching: date + normalized description + amount)
  const duplicateCount = useMemo(() => {
    const seen = new Set();
    let dupes = 0;
    transactions.forEach(t => {
      // Create a fuzzy key: date + first 20 alphanumeric chars of description + amount
      const key = `${t.date}|${normalizeDesc(t.description)}|${t.amount.toFixed(2)}`;
      if (seen.has(key)) {
        dupes++;
      } else {
        seen.add(key);
      }
    });
    return dupes;
  }, [transactions]);

  // Remove duplicate transactions (keeps first occurrence)
  const handleRemoveDuplicates = () => {
    if (duplicateCount === 0) return;

    const seen = new Set();
    const unique = transactions.filter(t => {
      const key = `${t.date}|${normalizeDesc(t.description)}|${t.amount.toFixed(2)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    setTransactions(unique);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  };

  // Get monthly transaction counts for the upload tracker
  const monthlyStats = useMemo(() => {
    const stats = {};
    transactions.forEach(t => {
      const month = getMonthKey(t.date);
      if (!stats[month]) {
        stats[month] = { count: 0, total: 0 };
      }
      stats[month].count++;
      if (t.amount < 0) {
        stats[month].total += Math.abs(t.amount);
      }
    });
    return stats;
  }, [transactions]);

  // Re-categorize all transactions using current learned categories
  const handleRefresh = () => {
    setTransactions(prev => {
      const updated = prev.map(t => ({
        ...t,
        category: categorizeTransaction(t.description)
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-xl font-bold text-white">Bank Statement Analysis</h1>
        <div className="flex items-center gap-2">
          {availableMonths.length > 1 && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl px-3 py-1.5 text-sm"
            >
              <option value="all">All Months</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          )}
          {previousTransactions !== null && (
            <button
              onClick={handleUndo}
              className="text-xs text-amber-400 hover:text-amber-300 px-3 py-1 rounded-lg hover:bg-amber-500/10 border border-amber-500/30"
            >
              ↶ Undo Upload ({lastUploadCount})
            </button>
          )}
          {duplicateCount > 0 && (
            <button
              onClick={handleRemoveDuplicates}
              className="text-xs text-orange-400 hover:text-orange-300 px-3 py-1 rounded-lg hover:bg-orange-500/10 border border-orange-500/30"
            >
              Remove {duplicateCount} Duplicate{duplicateCount > 1 ? 's' : ''}
            </button>
          )}
          {transactions.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-lg hover:bg-red-500/10"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Fixed Expenses Section - pass actual discretionary spending from transactions */}
      <FixedExpensesSection
        expenses={fixedExpenses}
        onUpdate={setFixedExpenses}
        discretionarySpending={
          transactions.length > 0
            ? Math.abs(transactions
                .filter(t => t.amount < 0 && !EXCLUDED_FROM_EXPENSES.includes(t.category))
                .reduce((sum, t) => sum + t.amount, 0))
            : 0
        }
      />

      {/* Income vs Spending tracking */}
      <IncomeVsSpending
        income={income}
        onUpdateIncome={setIncome}
        totalSpending={
          transactions.length > 0
            ? Math.abs(transactions
                .filter(t => t.amount < 0 && !EXCLUDED_FROM_EXPENSES.includes(t.category))
                .reduce((sum, t) => sum + t.amount, 0))
            : 0
        }
        fixedExpenses={fixedExpenses}
      />

      <FileUpload onUpload={handleUpload} monthlyStats={monthlyStats} />

      {transactions.length > 0 && (
        <>
          {/* Monthly spending overview bar chart - shows all months */}
          <MonthlySpendingChart transactions={transactions} />

          {/* Weekly spending chart */}
          <WeeklySpendingChart transactions={transactions} />

          {/* Bike & Scooter dedicated tracker */}
          <BikeScooterTracker transactions={transactions} />

          {/* Show insights for filtered month */}
          <SpendingInsights transactions={filteredTransactions} />
          <TopSpendingWarnings transactions={filteredTransactions} />
          <SpendingChart transactions={filteredTransactions} selectedMonth={selectedMonth} />

          {/* Quick review suggestions for uncategorized transactions */}
          <SuggestionsReview
            transactions={transactions}
            onUpdateCategory={handleUpdateCategory}
          />

          <TransactionList
            transactions={filteredTransactions}
            onUpdateCategory={handleUpdateCategory}
            onDelete={handleDelete}
            onRefresh={handleRefresh}
          />

          {/* Clear All Button - prominent at bottom */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleClearAll}
              className="bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 px-6 py-2 rounded-xl transition-all"
            >
              Clear All Transactions
            </button>
          </div>
        </>
      )}

      <LearnedCategoriesInfo />

      <div className="text-center text-xs text-gray-400 space-y-1">
        <p>Your data stays in your browser - nothing is sent to any server</p>
        <p>Tip: Download CSV from your bank's website, usually under "Statements" or "Activity"</p>
      </div>
    </div>
  );
}
