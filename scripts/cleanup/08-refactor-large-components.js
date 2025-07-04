#!/usr/bin/env node

/**
 * Script to help refactor large components into smaller, manageable pieces
 * Target: Components > 300 lines should be broken down
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const COMPONENT_PATTERNS = [
  'client/src/components/**/*.tsx',
  'client/src/pages/**/*.tsx',
  '!**/*.test.tsx',
  '!**/*.spec.tsx'
];

const MAX_LINES = 300;

function analyzeComponent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Basic analysis
  const stats = {
    totalLines: lines.length,
    imports: 0,
    functions: [],
    components: [],
    hooks: [],
    complexity: 0
  };
  
  // Analyze imports
  lines.forEach((line, index) => {
    if (line.trim().startsWith('import ')) {
      stats.imports++;
    }
    
    // Find function declarations
    const funcMatch = line.match(/(?:export\s+)?(?:const|function)\s+(\w+)\s*(?:=|:|\()/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      
      // Categorize
      if (funcName.startsWith('use')) {
        stats.hooks.push({ name: funcName, line: index + 1 });
      } else if (funcName[0] === funcName[0].toUpperCase()) {
        stats.components.push({ name: funcName, line: index + 1 });
      } else {
        stats.functions.push({ name: funcName, line: index + 1 });
      }
    }
    
    // Rough complexity estimate
    if (line.includes('if ') || line.includes('for ') || line.includes('while ')) {
      stats.complexity++;
    }
  });
  
  return stats;
}

function suggestRefactoring(filePath, stats) {
  const suggestions = [];
  const fileName = path.basename(filePath, '.tsx');
  
  // If file is too large, suggest breaking it down
  if (stats.totalLines > MAX_LINES) {
    suggestions.push({
      type: 'split',
      reason: `File has ${stats.totalLines} lines (max recommended: ${MAX_LINES})`,
      recommendation: 'Consider splitting into smaller components'
    });
    
    // Suggest extracting hooks
    if (stats.hooks.length > 2) {
      suggestions.push({
        type: 'extract-hooks',
        items: stats.hooks,
        recommendation: `Extract ${stats.hooks.length} custom hooks to separate files`
      });
    }
    
    // Suggest extracting sub-components
    if (stats.components.length > 1) {
      const subComponents = stats.components.filter(c => c.name !== fileName);
      if (subComponents.length > 0) {
        suggestions.push({
          type: 'extract-components',
          items: subComponents,
          recommendation: `Extract ${subComponents.length} sub-components to separate files`
        });
      }
    }
    
    // Suggest extracting utility functions
    if (stats.functions.length > 5) {
      suggestions.push({
        type: 'extract-utils',
        items: stats.functions,
        recommendation: `Extract ${stats.functions.length} utility functions to a utils file`
      });
    }
    
    // High complexity
    if (stats.complexity > 20) {
      suggestions.push({
        type: 'reduce-complexity',
        complexity: stats.complexity,
        recommendation: 'Consider simplifying logic or extracting complex calculations'
      });
    }
  }
  
  return suggestions;
}

function generateRefactoringPlan(filePath, stats, suggestions) {
  const fileName = path.basename(filePath, '.tsx');
  const dirName = path.dirname(filePath);
  
  const plan = {
    originalFile: filePath,
    stats: stats,
    suggestions: suggestions,
    proposedStructure: []
  };
  
  // Main component file
  plan.proposedStructure.push({
    path: filePath,
    description: `Main ${fileName} component (< 300 lines)`,
    contains: ['Main component logic', 'Component state', 'Main render']
  });
  
  // Hooks directory
  if (stats.hooks.length > 0) {
    stats.hooks.forEach(hook => {
      plan.proposedStructure.push({
        path: path.join(dirName, 'hooks', `${hook.name}.ts`),
        description: `Custom hook: ${hook.name}`,
        contains: ['Hook logic', 'Hook tests']
      });
    });
  }
  
  // Sub-components
  const subComponents = stats.components.filter(c => c.name !== fileName);
  if (subComponents.length > 0) {
    subComponents.forEach(comp => {
      plan.proposedStructure.push({
        path: path.join(dirName, fileName, `${comp.name}.tsx`),
        description: `Sub-component: ${comp.name}`,
        contains: ['Component logic', 'Component styles']
      });
    });
  }
  
  // Utils
  if (stats.functions.length > 5) {
    plan.proposedStructure.push({
      path: path.join(dirName, 'utils', `${fileName}.utils.ts`),
      description: 'Utility functions',
      contains: stats.functions.map(f => f.name)
    });
  }
  
  return plan;
}

function main() {
  console.log('🔍 Analyzing large components for refactoring...\n');
  
  const largeComponents = [];
  
  // Find all components
  COMPONENT_PATTERNS.forEach(pattern => {
    const files = glob.sync(pattern);
    files.forEach(file => {
      const stats = analyzeComponent(file);
      
      if (stats.totalLines > MAX_LINES) {
        const suggestions = suggestRefactoring(file, stats);
        const plan = generateRefactoringPlan(file, stats, suggestions);
        
        largeComponents.push({
          file: file,
          stats: stats,
          suggestions: suggestions,
          plan: plan
        });
      }
    });
  });
  
  // Print results
  console.log(`📊 Found ${largeComponents.length} components that need refactoring:\n`);
  
  largeComponents.forEach((component, index) => {
    const relPath = path.relative(process.cwd(), component.file);
    console.log(`${index + 1}. ${relPath} (${component.stats.totalLines} lines)`);
    console.log('   📈 Stats:');
    console.log(`      - Components: ${component.stats.components.length}`);
    console.log(`      - Hooks: ${component.stats.hooks.length}`);
    console.log(`      - Functions: ${component.stats.functions.length}`);
    console.log(`      - Complexity: ${component.stats.complexity}`);
    
    console.log('   💡 Suggestions:');
    component.suggestions.forEach(suggestion => {
      console.log(`      - ${suggestion.recommendation}`);
    });
    
    console.log('');
  });
  
  // Save detailed refactoring plan
  const outputPath = path.join(process.cwd(), 'refactoring-plan.json');
  fs.writeFileSync(outputPath, JSON.stringify(largeComponents, null, 2));
  
  console.log(`\n📄 Detailed refactoring plan saved to: ${outputPath}`);
  
  // Generate example refactoring for the largest component
  if (largeComponents.length > 0) {
    const largest = largeComponents.reduce((prev, curr) => 
      curr.stats.totalLines > prev.stats.totalLines ? curr : prev
    );
    
    console.log('\n📝 Example Refactoring Structure for:', path.basename(largest.file));
    console.log('   Proposed file structure:');
    largest.plan.proposedStructure.forEach(item => {
      console.log(`   - ${path.relative(process.cwd(), item.path)}`);
      console.log(`     ${item.description}`);
    });
  }
}

// Run the script
main();