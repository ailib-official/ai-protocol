#!/usr/bin/env node
/**
 * AI-Protocol v1 to v2-alpha Provider Configuration Migration Tool
 *
 * 功能：
 * - 转换 v1 provider 配置到 v2-alpha 格式
 * - 将 parameter_mappings 转换为 parameters 类型定义
 * - 添加标准化的 retry_policy 和 rate_limit_headers
 * - 验证转换后的配置
 *
 * 使用方法：
 * node scripts/migrate_v1_to_v2.js <provider_id>
 * node scripts/migrate_v1_to_v2.js --all
 * node scripts/migrate_v1_to_v2.js --list
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

const V1_DIR = join(process.cwd(), 'v1', 'providers');
const V2_DIR = join(process.cwd(), 'v2-alpha', 'providers');
const OUTPUT_DIR = join(process.cwd(), 'v2-alpha', 'providers-migrated');

// 参数类型推断规则
const PARAM_TYPE_INFERENCE = {
  // 字符串型参数
  string: ['model', 'input', 'mode', 'output_format', 'prompt'],
  // 整数型参数
  integer: ['max_tokens', 'length', 'top_n', 'seed', 'steps', 'cfg_scale', 'dimension'],
  // 浮点型参数
  float: ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'repetition_penalty'],
  // 布尔型参数
  boolean: ['stream', 'logprobs'],
  // 数组型参数
  array: ['stop', 'tools', 'functions'],
};

/**
 * 推断参数类型
 */
function inferParamType(paramName) {
  for (const [type, patterns] of Object.entries(PARAM_TYPE_INFERENCE)) {
    for (const pattern of patterns) {
      if (paramName.includes(pattern)) {
        return type;
      }
    }
  }
  return 'string'; // 默认为字符串
}

/**
 * 转换 v1 配置参数到 v2 格式
 */
function convertParameterMappings(v1Doc) {
  const v2Params = {};

  // 如果 v1 没有 parameter_mappings，返回空对象
  if (!v1Doc.parameter_mappings) {
    return v2Params;
  }

  for (const [paramName, paramInfo] of Object.entries(v1Doc.parameter_mappings)) {
    const paramType = inferParamType(paramName);

    const v2Param = {
      type: paramType,
    };

    // 添加常用约束
    switch (paramName) {
      case 'temperature':
        v2Param.type = 'float';
        v2Param.range = [0.0, 2.0];
        v2Param.default = 1.0;
        break;
      case 'max_tokens':
      case 'length':
        v2Param.type = 'integer';
        v2Param.min = 1;
        v2Param.max = 128000;
        v2Param.required = true;
        break;
      case 'top_p':
        v2Param.type = 'float';
        v2Param.range = [0.0, 1.0];
        v2Param.default = 1.0;
        break;
      case 'model':
        v2Param.type = 'string';
        v2Param.required = true;
        break;
      default:
        v2Param.type = paramType;
    }

    v2Params[paramName] = v2Param;
  }

  return v2Params;
}

/**
 * 转换 v1 retry_policy 到 v2 标准格式
 */
function convertRetryPolicy(v1Doc) {
  if (!v1Doc.retry_policy) {
    // 返回标准 retry policy
    return {
      strategy: 'exponential_backoff',
      max_retries: 3,
      min_delay_ms: 1000,
      max_delay_ms: 30000,
      jitter: 'full',
      retry_on_http_status: [429, 500, 502, 503],
    };
  }

  const v2RetryPolicy = { ...v1Doc.retry_policy };

  // 确保有必需字段
  if (!v2RetryPolicy.strategy) {
    v2RetryPolicy.strategy = 'exponential_backoff';
  }
  if (!v2RetryPolicy.max_retries) {
    v2RetryPolicy.max_retries = 3;
  }
  if (!v2RetryPolicy.min_delay_ms) {
    v2RetryPolicy.min_delay_ms = 1000;
  }
  if (!v2RetryPolicy.max_delay_ms) {
    v2RetryPolicy.max_delay_ms = 30000;
  }
  if (!v2RetryPolicy.jitter) {
    v2RetryPolicy.jitter = 'full';
  }
  if (!v2RetryPolicy.retry_on_http_status) {
    v2RetryPolicy.retry_on_http_status = [429, 500, 502, 503];
  }

  return v2RetryPolicy;
}

/**
 * 转换 v1 配置到 v2 格式
 */
function convertV1toV2(v1Content, v1Doc) {
  const v2Doc = {
    id: v1Doc.id,
    name: v1Doc.name,
    version: '2.0',
    status: 'stable',
    category: v1Doc.category || 'ai_provider',
    official_url: v1Doc.official_url,
    support_contact: v1Doc.support_contact,
  };

  // Endpoint
  if (v1Doc.endpoint) {
    v2Doc.endpoint = { ...v1Doc.endpoint };
  }

  // Authentication
  if (v1Doc.auth) {
    v2Doc.auth = { ...v1Doc.auth };
  }

  // 转换 parameters (v1 parameter_mappings -> v2 parameters)
  v2Doc.parameters = convertParameterMappings(v1Doc);

  // Retry policy
  v2Doc.retry_policy = convertRetryPolicy(v1Doc);

  // Rate limit headers
  if (v1Doc.rate_limit_headers) {
    v2Doc.rate_limit_headers = { ...v1Doc.rate_limit_headers };
  } else {
    v2Doc.rate_limit_headers = {};
  }

  // Capabilities
  if (v1Doc.capabilities) {
    v2Doc.capabilities = { ...v1Doc.capabilities };
  }

  // Streaming
  if (v1Doc.streaming) {
    v2Doc.streaming = { ...v1Doc.streaming };
  }

  // Response format
  if (v1Doc.response_format) {
    v2Doc.response_format = v1Doc.response_format;
  }

  // Response paths
  if (v1Doc.response_paths) {
    v2Doc.response_paths = { ...v1Doc.response_paths };
  }

  // Termination
  if (v1Doc.termination) {
    v2Doc.termination = { ...v1Doc.termination };
  }

  // Notes
  if (v1Doc.notes) {
    v2Doc.notes = [...v1Doc.notes, 'Migrated from v1 configuration'];
  } else {
    v2Doc.notes = ['Migrated from v1 configuration'];
  }

  return v2Doc;
}

/**
 * 生成 YAML 文件内容
 */
function generateYAML(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object') {
          yaml += `${spaces}  - ${generateYAML(item, 0).trim()}\n`;
        } else {
          yaml += `${spaces}  - ${JSON.stringify(item)}\n`;
        }
      }
    } else if (typeof value === 'object') {
      yaml += `${spaces}${key}:\n`;
      yaml += generateYAML(value, indent + 1);
    } else {
      yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
    }
  }

  return yaml;
}

/**
 * 迁移单个 provider
 */
function migrateProvider(providerId) {
  console.log(`\n迁移 provider: ${providerId}`);

  const v1File = join(V1_DIR, `${providerId}.yaml`);

  if (!existsSync(v1File)) {
    console.error(`错误: v1 配置文件不存在: ${v1File}`);
    return false;
  }

  try {
    const v1Content = readFileSync(v1File, 'utf-8').replace(/^\uFEFF/, '');
    const v1Doc = parseYAML(v1Content);

    const v2Doc = convertV1toV2(v1Content, v1Doc);
    const v2YAML = generateYAML(v2Doc);

    // 创建输出目录
    mkdirSync(OUTPUT_DIR, { recursive: true });

    const outputFile = join(OUTPUT_DIR, `${providerId}.yaml`);
    writeFileSync(outputFile, v2YAML, 'utf-8');

    console.log(`✓ 转换成功: ${outputFile}`);
    return true;
  } catch (error) {
    console.error(`✗ 转换失败: ${error.message}`);
    return false;
  }
}

/**
 * 简单的 YAML 解析器（用于本脚本）
 */
function parseYAML(content) {
  const lines = content.split('\n');
  const result = {};
  let currentIndent = -1;
  const stack = [{ obj: result, indent: -1 }];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.search(/\S/);
    const [key, ...valueParts] = trimmed.split(':');
    let value = valueParts.join(':').trim();

    if (value === '') {
      const newObj = {};
      result[key] = newObj;
    } else {
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value)) value = Number(value);
      else if (value.startsWith('"') || value.startsWith("'")) {
        value = value.slice(1, -1);
      } else if (value.startsWith('[') && value.endsWith(']')) {
        value = JSON.parse(value);
      }
      result[key] = value;
    }
  }

  return result;
}

/**
 * 列出所有可迁移的 providers
 */
function listProviders() {
  console.log('可迁移的 v1 providers:');
  const files = readdirSync(V1_DIR).filter(f => f.endsWith('.yaml'));
  files.forEach(file => {
    console.log(`  - ${file.replace('.yaml', '')}`);
  });
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
AI-Protocol v1 to v2-alpha Migration Tool

用法:
  node scripts/migrate_v1_to_v2.js <provider_id>      迁移单个 provider
  node scripts/migrate_v1_to_v2.js --all              迁移所有 providers
  node scripts/migrate_v1_to_v2.js --list             列出可迁移的 providers

 examples:
  node scripts/migrate_v1_to_v2.js openai
  node scripts/migrate_v1_to_v2.js --all
`);
    process.exit(0);
  }

  if (args[0] === '--list') {
    listProviders();
    return;
  }

  if (args[0] === '--all') {
    const files = readdirSync(V1_DIR).filter(f => f.endsWith('.yaml'));
    let success = 0;
    let failed = 0;

    for (const file of files) {
      const providerId = file.replace('.yaml', '');
      if (migrateProvider(providerId)) {
        success++;
      } else {
        failed++;
      }
    }

    console.log(`\n迁移完成: ${success} 成功, ${failed} 失败`);
    return;
  }

  // 迁移单个 provider
  const providerId = args[0];
  migrateProvider(providerId);
}

main().catch((e) => {
  console.error('错误:', e.message);
  process.exit(1);
});
