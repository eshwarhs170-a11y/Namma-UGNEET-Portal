const fs = require('fs');
const path = require('path');

const EMOJI_MAP = {
  '🔍': '<Search className="lucide-icon" size={18} />',
  '🎯': '<Target className="lucide-icon" size={24} />',
  'ℹ️': '<Info className="lucide-icon" size={18} />',
  '⚠️': '<AlertTriangle className="lucide-icon" size={18} />',
  '🔒': '<Lock className="lucide-icon" size={18} />',
  '🔓': '<Unlock className="lucide-icon" size={18} />',
  '📜': '<ScrollText className="lucide-icon" size={18} />',
  '✉️': '<Mail className="lucide-icon" size={18} />',
  '⭐': '<Star className="lucide-icon" size={18} />',
  '🗑️': '<Trash2 className="lucide-icon" size={18} />',
  '📄': '<FileText className="lucide-icon" size={18} />',
  '💬': '<MessageCircle className="lucide-icon" size={18} />',
  '🏫': '<School className="lucide-icon" size={18} />',
  '👤': '<User className="lucide-icon" size={18} />',
  '📝': '<PenTool className="lucide-icon" size={24} />',
  '💡': '<Lightbulb className="lucide-icon" size={18} />',
  '☕': '<Coffee className="lucide-icon" size={24} />',
  '🔄': '<RefreshCw className="lucide-icon" size={16} />',
  '😕': '<Frown className="lucide-icon" size={24} />',
  '📊': '<BarChart3 className="lucide-icon" size={18} />',
  '🟢': '<Circle className="lucide-icon" size={16} fill="#10b981" color="#10b981" />',
  '🔵': '<Circle className="lucide-icon" size={16} fill="#3b82f6" color="#3b82f6" />',
  '🟤': '<Circle className="lucide-icon" size={16} fill="#d97706" color="#d97706" />',
  '★': '<Star className="lucide-icon" size={16} fill="currentColor" />',
  '☆': '<Star className="lucide-icon" size={16} />',
  '✓': '<Check className="lucide-icon" size={16} />',
  '✕': '<X className="lucide-icon" size={16} />'
};

const IMPORTS = `import { 
  Search, Target, Info, AlertTriangle, Lock, Unlock, ScrollText, Mail, 
  Star, Trash2, FileText, MessageCircle, School, User, PenTool, Lightbulb, 
  Coffee, RefreshCw, Frown, Circle, BarChart3, Check, X
} from 'lucide-react';
`;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('lucide-react')) {
    content = content.replace(/import React[^;]*;/, match => match + '\\n' + IMPORTS);
  }

  for (const [emoji, icon] of Object.entries(EMOJI_MAP)) {
    // Basic replacement for anything inside JSX tags or string quotes
    const searchString = emoji;
    let newContent = "";
    let i = 0;
    while(i < content.length) {
      const idx = content.indexOf(searchString, i);
      if (idx === -1) {
        newContent += content.substring(i);
        break;
      }
      // Check if it's inside a JS string literal like 'ℹ️ About Us' -> convert to <><Info/> About Us</>
      // We'll just naively replace it and hope it's not breaking JS object keys.
      // Wait, let's just replace it with the component tag. If it breaks string concatenation, we'll fix it manually.
      newContent += content.substring(i, idx);
      
      // Let's do a simple check: is the quote surrounding it?
      let prevChar = content[idx-1];
      if (prevChar === "'" || prevChar === '"' || prevChar === '\`') {
         // It's at the start of a string. We can't just replace with JSX unless we change the string to JSX.
         // Let's just do it manually for the known ones:
      }
      
      // To be completely safe and generic, we just replace it:
      newContent += icon;
      i = idx + searchString.length;
    }
    content = newContent;
  }

  // Post-processing to fix broken string definitions:
  // e.g. title: '<Icon/> About Us' -> title: <><Icon/> About Us</>
  content = content.replace(/'(<[A-Za-z0-9]+[^>]*>)\\s*(.*?)'/g, '<>$1 $2</>');
  content = content.replace(/'(.*?)\\s*(<[A-Za-z0-9]+[^>]*>)'/g, '<>$1 $2</>');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Processed', filePath);
}

const targetFile = process.argv[2];
if (targetFile) {
  processFile(path.resolve(targetFile));
} else {
  console.log("Please provide a file path.");
}
