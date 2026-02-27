#!/usr/bin/env node
/**
 * AI-Protocol 参数验证脚本
 *
 * 功能：
 * - 检查所有 provider 配置是否存在
 * - 验证 parameter_mappings 完整性
 * - 检查 temperature 范围是否为 [0.0, 2.0]
 * - 检查 max_tokens 是否标记为 required
 * - 检查 rate_limit_headers 是否配置
 * - 验证 retry_policy 是否配置
 * - 生成验证报告
 *
 * 使用方法：
 * node scripts/validate_parameters.js
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import yaml from 'js-yaml';

const ROOT_DIR = resolve(process.cwd());
const V1_DIR = join(ROOT_DIR, 'v1', 'providers');
const V2_DIR = join(ROOT_DIR, 'v2-alpha', 'providers');
const V2_DIR_ALT = join(ROOT_DIR, 'v2', 'providers');

// 验证结果收集
const results = {
  providers_v1: { count: 0, validated: 0, names: {} },
  providers_v2: { count: 0, validated: 0, names: {} },
  issues: [],
  summary: {}
};

// 辅助函数：读取YAML文件
function loadYaml(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
    return yaml.load(content, { schema: yaml.DEFAULT_SAFE_SCHEMA, json: true });
  } catch (e) {
    console.error(`Failed to load ${filePath}: ${e.message}`);
    return null;
  }
}

// 辅助函数：列出YAML文件
function listYamlFiles(dir) {
  if (!existsSync(dir)) {
    console.log(`  目录不存在: ${dir}`);
    return [];
  }
  return readdirSync(dir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map(f => join(dir, f));
}

// 验证单个provider配置
function validateProvider(providerId, config, isV2) {
  const issues = [];
  
  // 检查参数完整性
  if (!config.parameters || typeof config.parameters !== 'object') {
    issues.push('Missing parameters section');
  } else {
    // 检查temperature范围
    if (isV2) {
      if (!config.parameters.temperature) {
        issues.push('Missing temperature parameter');
      } else {
        const temp = config.parameters.temperature;
        if (temp.range && (
          temp.range[0] !== 0.0 || temp.range[1] !== 2.0
        )) {
          issues.push(`Temperature range is ${temp.range.join(', ')}, should be [0.0, 2.0]`);
        }
      }
    }
    
    // 检查max_tokens必需性（仅v2-alpha）
    if (isV2) {
      if (!config.parameters.max_tokens && !config.parameters.maxOutputTokens && !config.parameters.max_new_tokens) {
        issues.push('Missing max_tokens parameter');
      } else {
        const mt = config.parameters.max_tokens;
        const mtAlias = config.parameters.maxOutputTokens || config.parameters.max_new_tokens;
        const hasRequired = mt?.required === true || mtAlias?.required === true;
        
        if (!hasRequired) {
          issues.push('max_tokens should be marked as required');
        }
      }
    }
  }
  
  // 检查速率限制头部
  if (!config.rate_limit_headers || typeof config.rate_limit_headers !== 'object') {
    issues.push('Missing rate_limit_headers section');
  }
  
  // 检查重试策略
  if (!config.retry_policy || typeof config.retry_policy !== 'object') {
    issues.push('Missing retry_policy section');
  } else {
    if (!config.retry_policy.strategy) {
      issues.push('Missing retry_policy.strategy');
    }
    if (config.retry_policy.strategy !== 'exponential_backoff') {
      issues.push(`Retry strategy is "${config.retry_policy.strategy}", should be "exponential_backoff"`);
    }
  }
  
  // v1额外检查
  if (!isV2) {
    if (!config.parameter_mappings || typeof config.parameter_mappings !== 'object') {
      issues.push('Missing parameter_mappings section');
    } else {
      const requiredMappings = ['temperature', 'max_tokens', 'top_p', 'stream'];
      const missingMappings = requiredMappings.filter(m => !config.parameter_mappings[m]);
      if (missingMappings.length > 0) {
        issues.push(`Missing parameter_mappings for: ${missingMappings.join(', ')}`);
      }
    }
  }
  
  return issues;
}

// 主函数
function main() {
  console.log('='.repeat(80));
  console.log('AI-Protocol 参数验证脚本');
  console.log('='.repeat(80));
  console.log('');
  
  // 确定 v2 目录
  let v2Dir = V2_DIR;
  if (!existsSync(V2_DIR) && existsSync(V2_DIR_ALT)) {
    v2Dir = V2_DIR_ALT;
    console.log(`  使用 v2 目录: ${v2Dir}`);
  }
  
  // 验证 v1 providers
  console.log('验证 v1 providers...');
  const v1Files = listYamlFiles(V1_DIR);
  results.providers_v1.count = v1Files.length;
  
  for (const file of v1Files) {
    const doc = loadYaml(file);
    if (!doc || !doc.id) {
      results.issues.push(`${file.substring("/home/alex/ai-protocol/".length)}: Invalid YAML or missing id`);
      continue;
    }
    
    const issues = validateProvider(doc.id, doc, false);
    results.providers_v1.names[doc.id] = true;  // Track provider name
    if (issues.length === 0) {
      results.providers_v1.validated++;
    } else {
      results.issues.push(`${doc.id}: ${issues.join('; ')}`);
  }
  
  console.log(`  总数: ${results.providers_v1.count}`);
  console.log(`  验证通过: ${results.providers_v1.validated}`);
  if (results.providers_v1.count > 0) {
    const passRate1 = (results.providers_v1.validated / results.providers_v1.count * 100).toFixed(2);
    console.log(`  通过率: ${passRate1}%`);
  }
  console.log(`  问题数: ${results.providers_v1.count - results.providers_v1.validated}`);
  console.log('');
  
  // 验证 v2-alpha providers
  console.log('验证 v2-alpha providers...');
  const v2Files = listYamlFiles(v2Dir);
  results.providers_v2.count = v2Files.length;
  
  for (const file of v2Files) {
    const doc = loadYaml(file);
    if (!doc || !doc.id) {
      results.issues.push(`${file.substring("/home/alex/alex/ai-protocol/".length)}: Invalid YAML or missing id`);
      continue;
    }
    
    const issues = validateProvider(doc.id, doc, true);
    results.providers_v2.names[doc.id] = true;  // Track provider name
    if (issues.length === 0) {
      results.providers_v2.validated++;
    } else {
      results.issues.push(`${doc.id} [V2]: ${issues.join('; ')}`);
  }
  
  console.log(`  总数: ${results.providers_v2.count}`);
  console.log(`  验证通过: ${results.providers_v2.validated}`);
  if (results.providers_v2.count > 0) {
    const passRate2 = (results.providers_v2.validated / results.providers_v2.count * 100).toFixed(2);
    console.log(`  通过率: ${passRate2}%`);
  }
  console.log(`  问题数: ${results.providers_v2.count - results.providers_v2.validated}`);
  console.log('');
  
  // 生成汇总
  const totalCount = results.providers_v1.count + results.providers_v2.count;
  const totalValidated = results.providers_v1.validated + results.providers_v2.validated;
  const passRate = totalCount > 0 ? (totalValidated / totalCount * 100).toFixed(2) : '0';
  
  results.summary = {
    total_providers: totalCount,
    total_validated: totalValidated,
    pass_rate: parseFloat(passRate),
    issues_count: results.issues.length
  };
  
  console.log('='.repeat(80));
  console.log('验证汇总');
  console.log('='.repeat(80));
  console.log(`  总 Provider 数: ${results.summary.total_providers}`);
  console.log(`  验证通过: ${results.summary.total_validated}`);
  console.log(`  通过率: ${results.summary.pass_rate}%`);
  console.log(`  问题数: ${results.summary.issues_count}`);
  console.log('');
  
  // 如果有问题，列出
  if (results.issues.length > 0) {
    console.log('发现的问题:');
    console.log('-'.repeat(60));
    results.issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  } else {
    console.log('✅ 所有配置验证通过！');
  }
  console.log('');
  console.log('='.repeat(80));
  
  // 检查文档覆盖率
  const docCoverage = checkDocumentationCoverage();
  
  // 退出码：有问题时非0
  const exitCode = results.summary.issues_count > 0 ? 1 : 0;
  process.exit(exitCode);
}

/**
 * 检查文档覆盖率
 * 检查每个 provider 是否有对应的研究文档
 */
function checkDocumentationCoverage() {
  console.log('\n' + '='.repeat(80));
  console.log('文档覆盖率检查');
  console.log('='.repeat(80));
  
  const docsDir = join('/home/alex/.sisyphus', 'discovered-manifests');
  const researchDocs = {};
  let docCount = 0;
  
  // 读取所有研究文档
  if (existsSync(docsDir)) {
    const files = readdirSync(docsDir).filter(f => f.endsWith('.yaml'));
    files.forEach(file => {
      const content = readFileSync(join(docsDir, file), 'utf-8');
      const match = content.match(/provider_id:\s*(.+)/i);
      if (match) {
        researchDocs[match[1].trim().toLowerCase()] = file;
        docCount++;
      }
    });
    
    console.log(` 找到研究文档: ${docCount} 个`);
  } else {
    console.log(`  警告: 研究文档目录不存在: ${docsDir}`);
  }
  
  // 检查 v1 providers 的文档覆盖
  const v1Docs = {};
  const v1Missing = [];
  const v1Providers = Object.keys(results.providers_v1.names);
  
  v1Providers.forEach(provider => {
    const providerLower = provider.toLowerCase();
    if (researchDocs[providerLower]) {
      v1Docs[provider] = researchDocs[providerLower];
    } else {
      v1Missing.push(provider);
    }
  });
  
  console.log('');
  console.log('v1 Providers 文档覆盖率:');
  console.log(`  总数: ${results.providers_v1.count}`);
  console.log(`  有文档: ${results.providers_v1.count - v1Missing.length}`);
  console.log(`  缺失: ${v1Missing.length}`);
  
  if (v1Missing.length > 0) {
    console.log('');
    console.log('  缺少研究文档的 providers:');
    v1Missing.forEach(p => console.log(`    - ${p}`));
  }
  
  const v1Coverage = ((results.providers_v1.count - v1Missing.length) / results.providers_v1.count * 100).toFixed(2);
  console.log(`  覆盖率: ${v1Coverage}%`);
  
  // 检查 v2-alpha providers 的文档覆盖
  const v2Docs = {};
  const v2Missing = [];
  const v2Providers = Object.keys(results.providers_v2.names);
  
  v2Providers.forEach(provider => {
    const providerLower = provider.toLowerCase();
    if (researchDocs[providerLower]) {
      v2Docs[provider] = researchDocs[providerLower];
    } else {
      v2Missing.push(provider);
    }
  });
  
  console.log('');
  console.log('v2-alpha Providers 文档覆盖率:');
  console.log(`  总数: ${results.providers_v2.count}`);
  console.log(`  有文档: ${results.providers_v2.count - v2Missing.length}`);
  console.log(`  缺失: ${v2Missing.length}`);
  
  if (v2Missing.length > 0) {
    console.log('');
    console.log('  缺少研究文档的 providers:');
    v2Missing.forEach(p => console.log(`    - ${p}`));
  }
  
  const v2Coverage = ((results.providers_v2.count - v2Missing.length) / results.providers_v2.count * 100).toFixed(2);
  console.log(`  覆盖率: ${v2Coverage}%`);
  
  // 汇总
  const totalMissing = v1Missing.length + v2Missing.length;
  const totalCount = results.providers_v1.count + results.providers_v2.count;
  const totalWithDocs = totalCount - totalMissing;
  const overallCoverage = (totalWithDocs / totalCount * 100).toFixed(2);
  
  console.log('');
  console.log('总体文档覆盖率:');
  console.log(`  全部 Providers: ${totalCount}`);
  console.log(`  有文档: ${totalWithDocs}`);
  console.log(`  缺失: ${totalMissing}`);
  console.log(`  覆盖率: ${overallCoverage}%`);
  
  return {
    v1: { count: results.providers_v1.count, withDocs: results.providers_v1.count - v1Missing.length, coverage: v1Coverage },
    v2: { count: results.providers_v2.count, withDocs: results.providers_v2.count - v2Missing.length, coverage: v2Coverage },
    overall: { count: totalCount, withDocs: totalWithDocs, coverage: overallCoverage }
  };
}

main().catch((e) => {
  console.error('验证失败:', e);
  console.error(e.stack);
  process.exit(1);
});
