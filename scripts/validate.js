#!/usr/bin/env node

/**
 * AI-Protocol Configuration Validation Script
 * 
 * Validates all YAML configuration files against JSON Schema 2020-12
 * Uses AJV v8 with ajv-formats for comprehensive validation
 * 
 * Features:
 * - JSON Schema 2020-12 support
 * - AJV v8 with format validation (uri, email, uuid, etc.)
 * - CI-friendly output with proper exit codes
 * - Detailed error reporting
 * - Support for v1 and v2 schemas
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Expected schema URLs (raw GitHub or relative local path)
const SCHEMA_V1_PATTERN = /^(https:\/\/raw\.githubusercontent\.com\/hiddenpath\/ai-protocol\/(main|master|v\d+\.\d+)\/schemas\/v1\.json|(\.\.\/)+schemas\/v1\.json)$/;
const SCHEMA_V2_PATTERN = /^(https:\/\/raw\.githubusercontent\.com\/hiddenpath\/ai-protocol\/(main|master|v\d+\.\d+)\/schemas\/v2\/provider\.json|(\.\.\/)+schemas\/v2\/provider\.json)$/;

// Validation results tracking
const results = {
  passed: 0,
  failed: 0,
  errors: [],
};

/**
 * Initialize AJV with JSON Schema 2020-12 and format support
 */
function createValidator() {
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    validateFormats: true,
    allowUnionTypes: true,
    strictSchema: false,
    strictNumbers: false,
    // Allow 2020-12 features
    strict: false,
  });

  // Add format validators (uri, email, uuid, etc.)
  addFormats(ajv, {
    mode: 'fast',
    formats: ['uri', 'email', 'uuid', 'date-time', 'date', 'time', 'ipv4', 'ipv6', 'hostname'],
  });

  return ajv;
}

/**
 * Load and parse a JSON schema file
 */
function loadSchema(schemaPath, removeMetaSchema = false) {
  try {
    const schemaContent = readFileSync(schemaPath, 'utf-8').replace(/^\uFEFF/, '');
    if (schemaContent.includes('\uFFFD')) {
      throw new Error('Invalid UTF-8 encoding detected in schema (replacement character found).');
    }
    const schema = JSON.parse(schemaContent);

    // Ensure schema uses 2020-12 draft
    if (schema.$schema && !schema.$schema.includes('2020-12')) {
      console.warn(`${colors.yellow}鈿狅笍  Warning: Schema ${schemaPath} may not be using JSON Schema 2020-12${colors.reset}`);
    }

    // Remove $schema field if needed (AJV doesn't need it for validation)
    if (removeMetaSchema && schema.$schema) {
      const { $schema, ...schemaWithoutMeta } = schema;
      return schemaWithoutMeta;
    }

    return schema;
  } catch (error) {
    console.error(`${colors.red}鉂?Failed to load schema ${schemaPath}:${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Load and parse a YAML file
 */
function loadYaml(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
    if (content.includes('\uFFFD')) {
      return {
        error: true,
        message: 'Invalid UTF-8 encoding detected (replacement character found).',
        mark: null,
      };
    }
    return yaml.load(content, {
      schema: yaml.DEFAULT_SAFE_SCHEMA,
      json: true,
    });
  } catch (error) {
    return {
      error: true,
      message: error.message,
      mark: error.mark,
    };
  }
}

/**
 * Format validation error for display
 */
function formatError(error, filePath) {
  const lines = [];

  lines.push(`${colors.red}  鉂?${filePath}${colors.reset}`);

  if (error.instancePath) {
    lines.push(`     Path: ${error.instancePath}`);
  }

  lines.push(`     Error: ${error.message}`);

  if (error.params) {
    const params = Object.entries(error.params)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(', ');
    if (params) {
      lines.push(`     Params: ${params}`);
    }
  }

  if (error.schemaPath) {
    lines.push(`     Schema: ${error.schemaPath}`);
  }

  return lines.join('\n');
}

/**
 * Validate a single file against a schema
 */
function validateFile(filePath, schemaPath, validator, schemaCache, expectedSchemaPattern) {
  // Get or compile schema
  let validate;
  if (schemaCache.has(schemaPath)) {
    validate = schemaCache.get(schemaPath);
  } else {
    // Remove $schema field when loading for AJV compilation
    const schema = loadSchema(schemaPath, true);
    validate = validator.compile(schema);
    schemaCache.set(schemaPath, validate);
  }

  const data = loadYaml(filePath);

  // Check for YAML parsing errors
  if (data.error) {
    results.failed++;
    results.errors.push({
      file: filePath,
      error: `YAML parsing error: ${data.message}`,
      mark: data.mark,
    });
    console.error(`${colors.red}鉂?${filePath}${colors.reset}`);
    console.error(`   YAML Error: ${data.message}`);
    if (data.mark) {
      console.error(`   Line ${data.mark.line + 1}, Column ${data.mark.column + 1}`);
    }
    return false;
  }

  // Remove $schema from data if present (it's metadata, not part of the actual data)
  const dataToValidate = { ...data };
  if (expectedSchemaPattern) {
    if (!dataToValidate.$schema) {
      results.failed++;
      results.errors.push({
        file: filePath,
        error: 'Missing $schema field; expected canonical schema reference.',
      });
      console.error(`${colors.red}✖ ${filePath}${colors.reset}`);
      console.error('   Missing $schema field; expected canonical schema reference.');
      return false;
    }

    if (!expectedSchemaPattern.test(dataToValidate.$schema)) {
      results.failed++;
      results.errors.push({
        file: filePath,
        error: `Invalid $schema value: ${dataToValidate.$schema}`,
      });
      console.error(`${colors.red}✖ ${filePath}${colors.reset}`);
      console.error(`   Invalid $schema value: ${dataToValidate.$schema}`);
      console.error(`   Expected schema matching: ${expectedSchemaPattern}`);
      return false;
    }

    delete dataToValidate.$schema;
  }

  // Validate
  const valid = validate(dataToValidate);

  if (!valid) {
    results.failed++;
    const fileErrors = validate.errors.map(err => ({
      file: filePath,
      error: err,
    }));
    results.errors.push(...fileErrors);

    console.error(`${colors.red}鉂?${filePath}${colors.reset}`);
    validate.errors.forEach(err => {
      console.error(formatError(err, filePath));
    });
    return false;
  }

  results.passed++;
  return true;
}

/**
 * Get all YAML files in a directory
 */
function getYamlFiles(dir) {
  const collected = [];

  const walk = (currentDir) => {
    let entries = [];
    try {
      entries = readdirSync(currentDir);
    } catch (error) {
      return;
    }

    entries.forEach(entry => {
      const fullPath = join(currentDir, entry);
      let stats;
      try {
        stats = statSync(fullPath);
      } catch (error) {
        return;
      }

      if (stats.isDirectory()) {
        if (entry === 'node_modules' || entry.startsWith('.')) {
          return;
        }
        walk(fullPath);
      } else if (stats.isFile() && (entry.endsWith('.yaml') || entry.endsWith('.yml'))) {
        collected.push(fullPath);
      }
    });
  };

  walk(dir);
  return collected;
}

/**
 * Main validation function
 */
function main() {
  const args = process.argv.slice(2);
  const validateProviders = args.includes('--providers') || args.length === 0;
  const validateModels = args.includes('--models') || args.length === 0;
  const validateExamples = args.includes('--examples') || args.length === 0;
  const validateSchemas = args.includes('--schemas') || args.length === 0;

  console.log(`${colors.bold}${colors.cyan}馃攳 AI-Protocol Configuration Validator${colors.reset}`);
  console.log(`${colors.cyan}=====================================${colors.reset}`);
  console.log(`JSON Schema: 2020-12`);
  console.log(`AJV: v8`);
  console.log(`Formats: ajv-formats (uri, email, uuid, etc.)`);
  console.log('');

  const validator = createValidator();

  // Schema cache to avoid recompiling the same schema
  const schemaCache = new Map();

  // Validate v1 providers
  if (validateProviders) {
    console.log(`${colors.blue}馃搵 Validating v1 provider configurations...${colors.reset}`);
    console.log('-------------------------------------------');

    const providerDir = join(ROOT_DIR, 'v1', 'providers');
    const providerFiles = getYamlFiles(providerDir);
    const schemaPath = join(ROOT_DIR, 'schemas', 'v1.json');

    if (providerFiles.length === 0) {
      console.log(`${colors.yellow}鈿狅笍  No provider files found in ${providerDir}${colors.reset}`);
    } else {
      providerFiles.forEach(file => {
        validateFile(file, schemaPath, validator, schemaCache, SCHEMA_V1_PATTERN);
      });
    }
    console.log('');
  }

  // Validate v1 models
  if (validateModels) {
    console.log(`${colors.blue}馃搵 Validating v1 model configurations...${colors.reset}`);
    console.log('----------------------------------------');

    const modelDir = join(ROOT_DIR, 'v1', 'models');
    const modelFiles = getYamlFiles(modelDir);
    const schemaPath = join(ROOT_DIR, 'schemas', 'v1.json');

    if (modelFiles.length === 0) {
      console.log(`${colors.yellow}鈿狅笍  No model files found in ${modelDir}${colors.reset}`);
    } else {
      modelFiles.forEach(file => {
        validateFile(file, schemaPath, validator, schemaCache, SCHEMA_V1_PATTERN);
      });
    }
    console.log('');
  }

  // Validate examples
  if (validateExamples) {
    console.log(`${colors.blue}馃搵 Validating example configurations...${colors.reset}`);
    console.log('---------------------------------------');

    const exampleDir = join(ROOT_DIR, 'examples');
    const exampleFiles = getYamlFiles(exampleDir);
    const schemaPath = join(ROOT_DIR, 'schemas', 'v1.json');

    if (exampleFiles.length === 0) {
      console.log(`${colors.yellow}鈿狅笍  No example files found in ${exampleDir}${colors.reset}`);
    } else {
      exampleFiles.forEach(file => {
        validateFile(file, schemaPath, validator, schemaCache, SCHEMA_V1_PATTERN);
      });
    }
    console.log('');
  }

  // Validate v2-alpha providers (if any)
  if (validateProviders) {
    console.log(`${colors.blue}馃搵 Validating v2-alpha provider configurations...${colors.reset}`);
    console.log('-----------------------------------------------');

    const providerDirV2 = join(ROOT_DIR, 'v2-alpha', 'providers');
    const providerFilesV2 = getYamlFiles(providerDirV2);
    const schemaPathV2 = join(ROOT_DIR, 'schemas', 'v2', 'provider.json');

    if (providerFilesV2.length === 0) {
      console.log(`${colors.yellow}鈿狅笍  No provider files found in ${providerDirV2}${colors.reset}`);
    } else {
      providerFilesV2.forEach(file => {
        validateFile(file, schemaPathV2, validator, schemaCache, SCHEMA_V2_PATTERN);
      });
    }
    console.log('');
  }

  // Validate JSON schemas themselves
  if (validateSchemas) {
    console.log(`${colors.blue}馃搵 Validating JSON schema syntax...${colors.reset}`);
    console.log('---------------------------------------');

    const schemaDir = join(ROOT_DIR, 'schemas');
    const schemaFiles = [
      join(schemaDir, 'v1.json'),
      join(schemaDir, 'v2', 'provider.json'),
      join(schemaDir, 'v2', 'endpoint.json'),
      join(schemaDir, 'v2', 'availability.json'),
      join(schemaDir, 'v2', 'capabilities.json'),
      join(schemaDir, 'v2', 'regions.json'),
    ];

    schemaFiles.forEach(schemaPath => {
      try {
        const schema = loadSchema(schemaPath);
        // Basic JSON structure validation
        if (typeof schema !== 'object' || schema === null) {
          throw new Error('Schema must be an object');
        }
        if (!schema.type && !schema.$ref && !schema.allOf && !schema.anyOf && !schema.oneOf) {
          console.warn(`${colors.yellow}鈿狅笍  ${schemaPath} may be missing type definition${colors.reset}`);
        }
        console.log(`${colors.green}鉁?${schemaPath}${colors.reset}`);
        results.passed++;
      } catch (error) {
        console.error(`${colors.red}鉂?${schemaPath}${colors.reset}`);
        console.error(`   ${error.message}`);
        results.failed++;
      }
    });
    console.log('');
  }

  // Print summary
  console.log(`${colors.bold}馃搳 Validation Summary${colors.reset}`);
  console.log('=====================');
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log('');

  if (results.failed === 0) {
    console.log(`${colors.green}${colors.bold}馃帀 All validations passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}馃挜 Some validations failed. Please fix the errors above.${colors.reset}`);
    process.exit(1);
  }
}

// Run main function
main();
